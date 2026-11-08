"""WealthOS Financial Risk Intelligence Acceptance Test Suite.

Validates all Phase 9 capabilities:
1. Multi-signal risk evaluations across liquidity, debt burden, and maturities.
2. Evidence generation attaching underlying records and ratios.
3. Transparent 5-pillar Financial Health Score formulation (0-100).
4. Alert deduplication by idempotent (tenant_id, alert_key).
5. Alert state transitions (ACTIVE -> ACKNOWLEDGED -> RESOLVED).
6. Multi-tenant RLS isolation.
7. Live HTTP REST API endpoints under /api/v1/risk/*.
"""

import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenant_context import set_db_tenant_context
from app.domains.cash.models import FinancialAccount
from app.domains.liabilities.models import Liability
from app.domains.risk.schemas import AlertStatusUpdate
from app.domains.risk.service import RiskService


@pytest.mark.asyncio
async def test_emergency_liquidity_risk_signal(
    db_session: AsyncSession, test_user_factory
):
    """Requirement 1 & 2: Emergency reserve deficit triggers RISK_EMERGENCY_LOW with numerical evidence."""
    user, tenant, _ = await test_user_factory(email="risk.emergency@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)
    service = RiskService(db_session)

    # 1. Provision a liquid account with low balance: ₹30,000
    acc = FinancialAccount(
        tenant_id=tenant.id,
        institution_id=None,
        account_name="Depleted Savings",
        account_type="SAVINGS",
        account_number_mask="9999",
        currency="INR",
        current_balance=Decimal("30000.0000"),
        available_balance=Decimal("30000.0000"),
        is_active=True,
    )
    # 2. Provision loan with high EMI: ₹40,000
    liab = Liability(
        tenant_id=tenant.id,
        name="Heavy Loan",
        liability_type="PERSONAL_LOAN",
        lender_name="NBFC Lending",
        initial_principal=Decimal("500000.0000"),
        current_principal=Decimal("450000.0000"),
        interest_rate=Decimal("15.0000"),
        tenure_months=24,
        emi_amount=Decimal("40000.0000"),
        start_date=date.today(),
        maturity_date=date.today() + timedelta(days=720),
        currency="INR",
        is_active=True,
    )
    db_session.add_all([acc, liab])
    await db_session.flush()

    # Evaluate signals
    assessment = await service.run_assessment(tenant.id)
    assert assessment.health_score < Decimal("85.00")

    # Verify RISK_EMERGENCY_LOW is triggered
    sig_codes = [s["code"] if isinstance(s, dict) else s.code for s in assessment.risk_signals]
    assert "RISK_EMERGENCY_LOW" in sig_codes

    # Verify alert was created in repository
    alerts = await service.list_alerts(tenant.id, status="ACTIVE")
    em_alerts = [a for a in alerts if a.alert_key == "liquidity:risk_emergency_low"]
    assert len(em_alerts) == 1
    assert em_alerts[0].severity in ["HIGH", "CRITICAL"]
    assert "coverage_months" in em_alerts[0].evidence


@pytest.mark.asyncio
async def test_debt_burden_risk_signal(
    db_session: AsyncSession, test_user_factory
):
    """Requirement 1 & 2: High debt-to-income triggers RISK_DEBT_BURDEN with exact evidence."""
    user, tenant, _ = await test_user_factory(email="risk.debt@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)
    service = RiskService(db_session)

    # Provision high monthly EMI loan: ₹85,000 (which is >50% of ₹150,000 baseline income)
    liab = Liability(
        tenant_id=tenant.id,
        name="Massive Home Loan",
        liability_type="MORTGAGE",
        lender_name="State Bank",
        initial_principal=Decimal("8000000.0000"),
        current_principal=Decimal("7800000.0000"),
        interest_rate=Decimal("9.0000"),
        tenure_months=240,
        emi_amount=Decimal("85000.0000"),
        start_date=date.today(),
        maturity_date=date.today() + timedelta(days=7200),
        currency="INR",
        is_active=True,
    )
    db_session.add(liab)
    await db_session.flush()

    assessment = await service.run_assessment(tenant.id)
    sig_codes = [s["code"] if isinstance(s, dict) else s.code for s in assessment.risk_signals]
    assert "RISK_DEBT_BURDEN" in sig_codes

    alerts = await service.list_alerts(tenant.id, status="ACTIVE")
    debt_alerts = [a for a in alerts if a.alert_key == "liabilities:risk_debt_burden"]
    assert len(debt_alerts) == 1
    assert debt_alerts[0].severity == "HIGH"
    assert "debt_service_ratio" in debt_alerts[0].evidence


@pytest.mark.asyncio
async def test_financial_health_score_breakdown():
    """Requirement 3: Verify 5-pillar weights sum to 100% and score calculation logic."""
    service = RiskService(None)  # Pure unit calculation

    score_resp = service.compute_health_score(
        coverage_months=Decimal("6.50"),
        debt_service_ratio=Decimal("0.1500"),
        portfolio_concentration_score=Decimal("90.00"),
        data_quality_score=Decimal("100.00"),
        active_alert_count=0,
        critical_alert_count=0,
    )

    assert score_resp.health_score >= Decimal("90.00")
    assert score_resp.health_category == "EXCELLENT"
    assert len(score_resp.pillars) == 5

    # Verify weights sum exactly to 100%
    total_weights = sum((p.weight_percent for p in score_resp.pillars), Decimal("0"))
    assert total_weights == Decimal("100.00")

    # Verify weighted contributions sum to health_score
    total_weighted = sum((p.weighted_contribution for p in score_resp.pillars), Decimal("0"))
    assert abs(total_weighted - score_resp.health_score) <= Decimal("0.05")


@pytest.mark.asyncio
async def test_alert_deduplication_and_lifecycle(
    db_session: AsyncSession, test_user_factory
):
    """Requirements 4 & 5: Deduplication by alert_key and state transition to RESOLVED."""
    user, tenant, _ = await test_user_factory(email="risk.lifecycle@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)
    service = RiskService(db_session)

    # 1. First trigger
    await service.repo.upsert_alert(
        tenant_id=tenant.id,
        alert_key="liquidity:risk_emergency_low",
        risk_category="LIQUIDITY",
        severity="HIGH",
        title="Emergency Fund Low",
        description="First alert description",
        evidence={"coverage": "2.1"},
    )
    alerts_1 = await service.list_alerts(tenant.id)
    assert len(alerts_1) == 1
    alert_id = alerts_1[0].id
    assert alerts_1[0].status == "ACTIVE"

    # 2. Re-trigger with updated evidence -> MUST NOT DUPLICATE!
    await service.repo.upsert_alert(
        tenant_id=tenant.id,
        alert_key="liquidity:risk_emergency_low",
        risk_category="LIQUIDITY",
        severity="CRITICAL",
        title="Emergency Fund Low (Updated)",
        description="Updated alert description",
        evidence={"coverage": "1.2"},
    )
    alerts_2 = await service.list_alerts(tenant.id)
    assert len(alerts_2) == 1
    assert alerts_2[0].id == alert_id  # Same entity!
    assert alerts_2[0].severity == "CRITICAL"

    # 3. Transition: ACKNOWLEDGE
    ack = await service.update_alert_status(
        tenant.id, alert_id, AlertStatusUpdate(status="ACKNOWLEDGED")
    )
    assert ack.status == "ACKNOWLEDGED"

    # 4. Transition: RESOLVE
    res = await service.update_alert_status(
        tenant.id,
        alert_id,
        AlertStatusUpdate(
            status="RESOLVED", resolution_notes="Deposited bonus into emergency fund"
        ),
    )
    assert res.status == "RESOLVED"
    assert res.resolved_at is not None
    assert res.resolution_notes == "Deposited bonus into emergency fund"


@pytest.mark.asyncio
async def test_risk_tenant_isolation(
    db_session: AsyncSession, test_user_factory
):
    """Requirement 6: Cross-tenant isolation of risk alerts and assessments."""
    user_a, tenant_a, _ = await test_user_factory(email="risk.tenanta@example.com")
    user_b, tenant_b, _ = await test_user_factory(email="risk.tenantb@example.com")

    # Tenant A creates an alert
    await set_db_tenant_context(db_session, tenant_a.id, user_id=user_a.id)
    service_a = RiskService(db_session)
    alert_a = await service_a.repo.upsert_alert(
        tenant_id=tenant_a.id,
        alert_key="custom:test_alert_a",
        risk_category="LIABILITIES",
        severity="HIGH",
        title="Tenant A Private Alert",
        description="Private",
        evidence={},
    )

    # Tenant B lists alerts -> MUST NOT SEE Tenant A's alert
    await set_db_tenant_context(db_session, tenant_b.id, user_id=user_b.id)
    service_b = RiskService(db_session)
    b_alerts = await service_b.list_alerts(tenant_b.id)
    assert all(a.id != alert_a.id for a in b_alerts)

    # Tenant B tries to resolve Tenant A's alert directly
    res = await service_b.update_alert_status(
        tenant_b.id, alert_a.id, AlertStatusUpdate(status="RESOLVED")
    )
    assert res is None


@pytest.mark.asyncio
async def test_live_risk_http_api(client: AsyncClient, test_user_factory):
    """Requirement 7: Live HTTP API verification for risk assessments and alerts."""
    user, tenant, token = await test_user_factory(email="api.risk@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Trigger on-demand assessment
    resp_assess = await client.post("/api/v1/risk/assess", headers=headers)
    assert resp_assess.status_code == 201, resp_assess.text
    assess_data = resp_assess.json()
    assert "health_score" in assess_data
    assert "risk_signals" in assess_data

    # 2. Get latest assessment
    resp_latest = await client.get("/api/v1/risk/assessments/latest", headers=headers)
    assert resp_latest.status_code == 200
    assert resp_latest.json()["id"] == assess_data["id"]

    # 3. Get health score breakdown
    resp_score = await client.get("/api/v1/risk/health-score", headers=headers)
    assert resp_score.status_code == 200
    score_data = resp_score.json()
    assert "pillars" in score_data
    assert len(score_data["pillars"]) == 5

    # 4. List alerts
    resp_alerts = await client.get("/api/v1/risk/alerts", headers=headers)
    assert resp_alerts.status_code == 200
    alerts_list = resp_alerts.json()
    if alerts_list:
        alert_id = alerts_list[0]["id"]
        # 5. Update alert status
        resp_upd = await client.put(
            f"/api/v1/risk/alerts/{alert_id}/status",
            headers=headers,
            json={"status": "ACKNOWLEDGED", "resolution_notes": "Reviewed by user"},
        )
        assert resp_upd.status_code == 200
        assert resp_upd.json()["status"] == "ACKNOWLEDGED"
