"""WealthOS Liability & Debt Management Acceptance Test Suite.

Validates all Phase 5 capabilities:
1. Deterministic reducing-balance EMI calculation.
2. Amortization schedule generation with principal/interest split.
3. Installment payment recording and principal decrement.
4. Prepayment simulator (interest savings and tenure reduction).
5. Debt Avalanche vs Debt Snowball strategy optimization.
6. Credit card statement tracking and revolving utilization metrics.
7. Portfolio summary calculations (weighted average interest rate).
8. Multi-tenant RLS isolation.
9. Live HTTP REST API endpoints.
"""

import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenant_context import set_db_tenant_context
from app.domains.liabilities.models import Liability, LoanPaymentSchedule
from app.domains.liabilities.schemas import (
    CreditCardStatementCreate,
    DebtStrategyComparisonRequest,
    LiabilityCreate,
    PrepaymentSimulationRequest,
    RecordPaymentRequest,
)
from app.domains.liabilities.service import LiabilityService, quantize_currency


@pytest.mark.asyncio
async def test_emi_calculation_reducing_balance(db_session: AsyncSession):
    """Requirement 1: Verify exact reducing-balance EMI formula and edge cases."""
    # Standard loan: P = 1,000,000, R = 12% per annum, n = 12 months
    # r = 12 / 1200 = 0.01
    # EMI = 1,000,000 * 0.01 * (1.01)^12 / ((1.01)^12 - 1) = 88,848.7887 -> 88848.7887
    emi = LiabilityService.calculate_emi(
        principal=Decimal("1000000.0000"),
        annual_interest_rate_percent=Decimal("12.0000"),
        tenure_months=12,
    )
    assert emi == Decimal("88848.7887")

    # Zero-interest loan: P = 120,000, R = 0%, n = 12 -> EMI = 10,000.0000
    zero_emi = LiabilityService.calculate_emi(
        principal=Decimal("120000.0000"),
        annual_interest_rate_percent=Decimal("0.0000"),
        tenure_months=12,
    )
    assert zero_emi == Decimal("10000.0000")

    # Edge cases: 0 tenure
    edge_emi = LiabilityService.calculate_emi(
        principal=Decimal("50000.0000"),
        annual_interest_rate_percent=Decimal("10.0000"),
        tenure_months=0,
    )
    assert edge_emi == Decimal("0.0000")


@pytest.mark.asyncio
async def test_liability_creation_and_amortization_schedule(
    db_session: AsyncSession, test_user_factory
):
    """Requirements 2, 3: Create loan, auto-generate schedule, verify balance reconciliation."""
    user, tenant, _ = await test_user_factory(email="loan.schedule@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = LiabilityService(db_session)
    start_d = date(2026, 1, 1)

    liability = await service.create_liability(
        tenant.id,
        LiabilityCreate(
            name="Personal Home Renovation Loan",
            liability_type="PERSONAL_LOAN",
            lender_name="HDFC Bank",
            initial_principal=Decimal("120000.0000"),
            interest_rate=Decimal("12.0000"),
            tenure_months=12,
            start_date=start_d,
        ),
    )

    assert liability.id is not None
    assert liability.current_principal == Decimal("120000.0000")
    assert liability.emi_amount > Decimal("10000.0000")
    assert liability.maturity_date == date(2027, 1, 1)

    # Fetch amortization schedule
    schedules = await service.get_schedules(tenant.id, liability.id)
    assert len(schedules) == 12

    # Verify mathematical invariant across all installments
    total_principal_paid = Decimal("0.0000")
    for s in schedules:
        assert s.principal_component + s.interest_component == s.expected_payment
        total_principal_paid += s.principal_component

    # Final installment must leave remaining principal at exactly 0.0000
    assert schedules[-1].remaining_principal == Decimal("0.0000")
    assert total_principal_paid == Decimal("120000.0000")


@pytest.mark.asyncio
async def test_record_payment_and_principal_reduction(
    db_session: AsyncSession, test_user_factory
):
    """Requirement 4: Record installment payment, update status and principal."""
    user, tenant, _ = await test_user_factory(email="loan.payment@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = LiabilityService(db_session)
    liability = await service.create_liability(
        tenant.id,
        LiabilityCreate(
            name="Auto Loan",
            liability_type="VEHICLE_LOAN",
            lender_name="SBI",
            initial_principal=Decimal("500000.0000"),
            interest_rate=Decimal("9.0000"),
            tenure_months=36,
            start_date=date(2026, 1, 1),
        ),
    )

    schedules = await service.get_schedules(tenant.id, liability.id)
    first_sched = schedules[0]
    expected_reduction = first_sched.principal_component

    # Record payment
    updated_sched = await service.record_payment(
        tenant.id,
        liability.id,
        first_sched.id,
        RecordPaymentRequest(
            paid_date=date(2026, 2, 1),
            actual_paid_amount=first_sched.expected_payment,
        ),
    )

    assert updated_sched.payment_status == "PAID"
    assert updated_sched.paid_date == date(2026, 2, 1)

    # Verify liability current principal decreased
    updated_liability = await service.get_liability(tenant.id, liability.id)
    assert updated_liability.current_principal == quantize_currency(
        Decimal("500000.0000") - expected_reduction
    )


@pytest.mark.asyncio
async def test_prepayment_simulation(db_session: AsyncSession, test_user_factory):
    """Requirement 5: Simulate early prepayment interest savings and tenure reduction."""
    user, tenant, _ = await test_user_factory(email="loan.prepay@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = LiabilityService(db_session)
    liability = await service.create_liability(
        tenant.id,
        LiabilityCreate(
            name="Home Mortgage",
            liability_type="HOME_LOAN",
            lender_name="ICICI Bank",
            initial_principal=Decimal("2000000.0000"),
            interest_rate=Decimal("8.5000"),
            tenure_months=120,
            start_date=date(2026, 1, 1),
        ),
    )

    # 1. Prepayment with extra monthly payment of $5,000
    sim_extra = service.simulate_prepayment(
        liability=liability,
        extra_monthly_payment=Decimal("5000.0000"),
        lump_sum_amount=Decimal("0.0000"),
        lump_sum_month=1,
    )

    assert sim_extra.months_saved > 0
    assert sim_extra.interest_saved > Decimal("10000.0000")
    assert sim_extra.new_tenure_months < sim_extra.original_tenure_months

    # 2. Prepayment with lump sum of $200,000 at month 12
    sim_lump = service.simulate_prepayment(
        liability=liability,
        extra_monthly_payment=Decimal("0.0000"),
        lump_sum_amount=Decimal("200000.0000"),
        lump_sum_month=12,
    )

    assert sim_lump.months_saved > 0
    assert sim_lump.interest_saved > Decimal("50000.0000")


@pytest.mark.asyncio
async def test_debt_strategy_avalanche_vs_snowball(
    db_session: AsyncSession, test_user_factory
):
    """Requirement 6: Compare Avalanche vs Snowball debt payoff strategies."""
    user, tenant, _ = await test_user_factory(email="debt.strategies@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = LiabilityService(db_session)

    # High interest debt (Credit Card: 24% APR, 50,000 principal)
    await service.create_liability(
        tenant.id,
        LiabilityCreate(
            name="Credit Card Debt",
            liability_type="CREDIT_CARD",
            lender_name="Axis Bank",
            initial_principal=Decimal("50000.0000"),
            current_principal=Decimal("50000.0000"),
            interest_rate=Decimal("24.0000"),
            tenure_months=24,
            emi_amount=Decimal("3000.0000"),
            start_date=date(2026, 1, 1),
        ),
    )

    # Medium interest debt (Personal Loan: 14% APR, 100,000 principal)
    await service.create_liability(
        tenant.id,
        LiabilityCreate(
            name="Personal Loan",
            liability_type="PERSONAL_LOAN",
            lender_name="HDFC",
            initial_principal=Decimal("100000.0000"),
            current_principal=Decimal("100000.0000"),
            interest_rate=Decimal("14.0000"),
            tenure_months=24,
            emi_amount=Decimal("5000.0000"),
            start_date=date(2026, 1, 1),
        ),
    )

    # Low interest debt (Car Loan: 8% APR, 200,000 principal)
    await service.create_liability(
        tenant.id,
        LiabilityCreate(
            name="Auto Loan",
            liability_type="VEHICLE_LOAN",
            lender_name="SBI",
            initial_principal=Decimal("200000.0000"),
            current_principal=Decimal("200000.0000"),
            interest_rate=Decimal("8.0000"),
            tenure_months=36,
            emi_amount=Decimal("6000.0000"),
            start_date=date(2026, 1, 1),
        ),
    )

    # Compare strategies with extra 10,000 monthly budget
    comparison = await service.compare_debt_strategies(
        tenant.id, extra_monthly_budget=Decimal("10000.0000")
    )

    # Both Avalanche and Snowball must finish faster and pay less interest than Minimum Only
    assert comparison.avalanche.months_to_debt_free < comparison.minimum_only.months_to_debt_free
    assert comparison.snowball.months_to_debt_free < comparison.minimum_only.months_to_debt_free
    assert comparison.avalanche.total_interest_paid < comparison.minimum_only.total_interest_paid
    assert comparison.snowball.total_interest_paid < comparison.minimum_only.total_interest_paid

    # Avalanche must save >= interest compared to Snowball (mathematically proven)
    assert comparison.avalanche.total_interest_paid <= comparison.snowball.total_interest_paid
    assert comparison.avalanche_interest_savings >= comparison.snowball_interest_savings
    assert comparison.recommended_strategy == "AVALANCHE"


@pytest.mark.asyncio
async def test_credit_card_statements_and_portfolio_summary(
    db_session: AsyncSession, test_user_factory
):
    """Requirements 7, 8: Credit card statement utilization and portfolio summary."""
    user, tenant, _ = await test_user_factory(email="cc.summary@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = LiabilityService(db_session)

    # 1. Create Credit Card liability
    card = await service.create_liability(
        tenant.id,
        LiabilityCreate(
            name="Sapphire Reserve Card",
            liability_type="CREDIT_CARD",
            lender_name="Chase",
            initial_principal=Decimal("0.0000"),
            current_principal=Decimal("0.0000"),
            interest_rate=Decimal("22.5000"),
            tenure_months=12,
            emi_amount=Decimal("0.0000"),
            start_date=date(2026, 1, 1),
        ),
    )

    # 2. Add statement with 30% utilization
    stmt = await service.create_credit_card_statement(
        tenant.id,
        CreditCardStatementCreate(
            liability_id=card.id,
            statement_date=date(2026, 1, 20),
            due_date=date(2026, 2, 10),
            statement_balance=Decimal("30000.0000"),
            minimum_due=Decimal("1500.0000"),
            credit_limit=Decimal("100000.0000"),
            available_credit=Decimal("70000.0000"),
        ),
    )

    assert stmt.statement_balance == Decimal("30000.0000")
    assert stmt.available_credit == Decimal("70000.0000")

    # Verify liability current principal updated to latest statement balance
    refreshed_card = await service.get_liability(tenant.id, card.id)
    assert refreshed_card.current_principal == Decimal("30000.0000")

    # 3. Add a loan and verify portfolio summary
    await service.create_liability(
        tenant.id,
        LiabilityCreate(
            name="Personal Loan",
            liability_type="PERSONAL_LOAN",
            lender_name="HDFC",
            initial_principal=Decimal("70000.0000"),
            interest_rate=Decimal("10.0000"),
            tenure_months=12,
            start_date=date(2026, 1, 1),
        ),
    )

    summary = await service.get_portfolio_summary(tenant.id)
    assert summary.total_liabilities == 2
    # Total principal: 30,000 (card) + 70,000 (loan) = 100,000
    assert summary.total_outstanding_principal == Decimal("100000.0000")
    # Weighted rate: (30,000 * 22.5 + 70,000 * 10.0) / 100,000 = (675000 + 700000) / 100,000 = 13.75%
    assert summary.weighted_average_interest_rate == Decimal("13.75")
    assert len(summary.upcoming_installments) > 0


@pytest.mark.asyncio
async def test_tenant_isolation_liabilities(
    db_session: AsyncSession, test_user_factory
):
    """Requirement 9: Cross-tenant data isolation enforcement."""
    user_a, tenant_a, _ = await test_user_factory(email="tenant.a.debt@example.com")
    user_b, tenant_b, _ = await test_user_factory(email="tenant.b.debt@example.com")

    # Tenant A creates liability
    await set_db_tenant_context(db_session, tenant_a.id, user_id=user_a.id)
    service_a = LiabilityService(db_session)
    loan_a = await service_a.create_liability(
        tenant_a.id,
        LiabilityCreate(
            name="Tenant A Confidential Debt",
            liability_type="PERSONAL_LOAN",
            lender_name="Private Lender",
            initial_principal=Decimal("500000.0000"),
            interest_rate=Decimal("12.0000"),
            tenure_months=12,
            start_date=date(2026, 1, 1),
        ),
    )

    # Tenant B tries to query Tenant A's liability
    await set_db_tenant_context(db_session, tenant_b.id, user_id=user_b.id)
    service_b = LiabilityService(db_session)
    queried_by_b = await service_b.get_liability(tenant_b.id, loan_a.id)
    assert queried_by_b is None

    # Tenant B list liabilities returns empty
    b_liabilities = await service_b.list_liabilities(tenant_b.id)
    assert len(b_liabilities) == 0


@pytest.mark.asyncio
async def test_http_api_liabilities_lifecycle(
    client: AsyncClient, test_user_factory
):
    """Requirement 10: Complete REST API test via HTTP client."""
    user, tenant, token = await test_user_factory(email="api.liabilities@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create liability via API
    resp_create = await client.post(
        "/api/v1/liabilities",
        json={
            "name": "API Vehicle Loan",
            "liability_type": "VEHICLE_LOAN",
            "lender_name": "Axis Bank",
            "initial_principal": "300000.0000",
            "interest_rate": "9.5000",
            "tenure_months": 24,
            "start_date": "2026-03-01",
        },
        headers=headers,
    )
    assert resp_create.status_code == 201
    data = resp_create.json()
    liability_id = data["id"]
    assert data["name"] == "API Vehicle Loan"
    assert Decimal(data["emi_amount"]) > Decimal("0")

    # 2. List liabilities
    resp_list = await client.get("/api/v1/liabilities", headers=headers)
    assert resp_list.status_code == 200
    assert len(resp_list.json()) >= 1

    # 3. Get amortization schedule
    resp_sched = await client.get(
        f"/api/v1/liabilities/{liability_id}/schedules", headers=headers
    )
    assert resp_sched.status_code == 200
    schedules = resp_sched.json()
    assert len(schedules) == 24
    first_sched_id = schedules[0]["id"]

    # 4. Record payment on installment 1
    resp_pay = await client.post(
        f"/api/v1/liabilities/{liability_id}/schedules/{first_sched_id}/pay",
        json={
            "paid_date": "2026-04-01",
            "actual_paid_amount": schedules[0]["expected_payment"],
        },
        headers=headers,
    )
    assert resp_pay.status_code == 200
    assert resp_pay.json()["payment_status"] == "PAID"

    # 5. Prepayment simulation via API
    resp_sim = await client.post(
        f"/api/v1/liabilities/{liability_id}/simulate-prepayment",
        json={
            "extra_monthly_payment": "2000.0000",
            "lump_sum_amount": "50000.0000",
            "lump_sum_month": 6,
        },
        headers=headers,
    )
    assert resp_sim.status_code == 200
    sim_data = resp_sim.json()
    assert sim_data["months_saved"] > 0
    assert Decimal(sim_data["interest_saved"]) > Decimal("0")

    # 6. Debt strategy comparison via API
    resp_strat = await client.post(
        "/api/v1/liabilities/strategies/compare",
        json={"extra_monthly_budget": "5000.0000"},
        headers=headers,
    )
    assert resp_strat.status_code == 200
    strat_data = resp_strat.json()
    assert strat_data["avalanche"]["strategy"] == "AVALANCHE"

    # 7. Portfolio summary via API
    resp_sum = await client.get("/api/v1/liabilities/summary", headers=headers)
    assert resp_sum.status_code == 200
    assert resp_sum.json()["total_liabilities"] >= 1
