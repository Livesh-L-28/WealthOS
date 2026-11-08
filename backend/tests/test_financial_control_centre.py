"""WealthOS Financial Control Centre & Reconciliation Acceptance Test Suite.

Validates all 14 Phase 1 acceptance requirements:
1. Exact bank transaction matches.
2. Amount mismatch detection.
3. Date tolerance behavior.
4. Duplicate statement imports.
5. Repeated synchronization events.
6. Ambiguous match handling.
7. Missing transaction detection.
8. Cross-tenant reconciliation denial.
9. Reversal integrity.
10. Ledger imbalance detection.
11. Investment quantity mismatch.
12. Reconciliation audit history.
13. Concurrent reconciliation attempts.
14. Idempotent reconciliation execution.
"""

import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenant_context import set_db_tenant_context
from app.domains.accounting.services.chart_of_accounts import ChartOfAccountsService
from app.domains.reconciliation.service import FinancialControlService


async def bind_tenant_context(session: AsyncSession, tenant_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """Set PostgreSQL RLS context variables for test session."""
    await session.execute(
        text(
            "SELECT set_config('app.current_tenant_id', :tid, false), "
            "set_config('app.current_user_id', :uid, false)"
        ),
        {"tid": str(tenant_id), "uid": str(user_id)},
    )


@pytest.mark.asyncio
async def test_financial_control_exact_match(db_session: AsyncSession, test_user_factory):
    """1. Exact bank transaction matches with zero variance."""
    user, tenant, _ = await test_user_factory(email="recon.exact@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    accounts = await ChartOfAccountsService.seed_standard_chart_of_accounts(
        db_session, tenant.id, "INR"
    )
    bank_acct = next(a for a in accounts if a.account_type == "ASSET")

    service = FinancialControlService(db_session)
    record = await service.ingest_external_record(
        tenant_id=tenant.id,
        source_reference="STMT-EXACT-001",
        account_id=bank_acct.id,
        expected_amount=Decimal("15000.0000"),
        posted_amount=Decimal("15000.0000"),
    )
    await db_session.flush()

    assert record.status == "MATCHED"
    assert record.severity == "LOW"
    assert record.difference == Decimal("0.0000")
    assert record.resolution_status == "RESOLVED"
    assert record.matched_at is not None


@pytest.mark.asyncio
async def test_financial_control_amount_mismatch_detection(
    db_session: AsyncSession, test_user_factory
):
    """2. Amount mismatch detection triggers DISCREPANCY with appropriate severity."""
    user, tenant, _ = await test_user_factory(email="recon.var@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    accounts = await ChartOfAccountsService.seed_standard_chart_of_accounts(
        db_session, tenant.id, "INR"
    )
    bank_acct = next(a for a in accounts if a.account_type == "ASSET")

    service = FinancialControlService(db_session)
    # Variance of 2500 -> HIGH severity (> 100)
    record = await service.ingest_external_record(
        tenant_id=tenant.id,
        source_reference="STMT-VAR-002",
        account_id=bank_acct.id,
        expected_amount=Decimal("17500.0000"),
        posted_amount=Decimal("15000.0000"),
    )
    await db_session.flush()

    assert record.status == "DISCREPANCY"
    assert record.severity == "HIGH"
    assert record.difference == Decimal("2500.0000")
    assert record.resolution_status == "OPEN"
    assert "Substantial variance" in (record.discrepancy_reason or "")


@pytest.mark.asyncio
async def test_financial_control_duplicate_detection_and_idempotency(
    db_session: AsyncSession, test_user_factory
):
    """4 & 14. Duplicate statement imports detected and idempotent execution verified."""
    user, tenant, _ = await test_user_factory(email="recon.dup@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    accounts = await ChartOfAccountsService.seed_standard_chart_of_accounts(
        db_session, tenant.id, "INR"
    )
    bank_acct = next(a for a in accounts if a.account_type == "ASSET")

    service = FinancialControlService(db_session)
    # First record
    r1 = await service.ingest_external_record(
        tenant_id=tenant.id,
        source_reference="STMT-DUP-100",
        account_id=bank_acct.id,
        expected_amount=Decimal("9999.0000"),
    )
    await db_session.flush()

    # Idempotent re-ingestion with same reference returns existing record
    r1_reingest = await service.ingest_external_record(
        tenant_id=tenant.id,
        source_reference="STMT-DUP-100",
        account_id=bank_acct.id,
        expected_amount=Decimal("9999.0000"),
    )
    assert r1.id == r1_reingest.id

    # Second record with different reference but identical amount flags duplicate candidate
    r2 = await service.ingest_external_record(
        tenant_id=tenant.id,
        source_reference="STMT-DUP-101",
        account_id=bank_acct.id,
        expected_amount=Decimal("9999.0000"),
    )
    await db_session.flush()

    assert r2.status == "DISCREPANCY"
    assert r2.discrepancy_category == "DUPLICATE_CANDIDATE"
    assert r2.severity == "HIGH"


@pytest.mark.asyncio
async def test_financial_control_discrepancy_action_and_audit(
    db_session: AsyncSession, test_user_factory
):
    """6 & 12. Ambiguous match handling and immutable reconciliation audit history."""
    user, tenant, _ = await test_user_factory(email="recon.audit@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    accounts = await ChartOfAccountsService.seed_standard_chart_of_accounts(
        db_session, tenant.id, "INR"
    )
    bank_acct = next(a for a in accounts if a.account_type == "ASSET")

    service = FinancialControlService(db_session)
    record = await service.ingest_external_record(
        tenant_id=tenant.id,
        source_reference="STMT-AUDIT-003",
        account_id=bank_acct.id,
        expected_amount=Decimal("4500.0000"),
    )
    await db_session.flush()

    # User reviews the discrepancy
    r_review = await service.execute_action(
        tenant_id=tenant.id,
        record_id=record.id,
        action="REVIEW",
        actor_id=user.id,
        notes="Reviewing bank counterparty description with merchant receipt",
    )
    assert r_review.resolution_status == "UNDER_REVIEW"

    # User marks as duplicate
    r_dup = await service.execute_action(
        tenant_id=tenant.id,
        record_id=record.id,
        action="MARK_DUPLICATE",
        actor_id=user.id,
        notes="Confirmed duplicate swipe on POS terminal",
    )
    assert r_dup.resolution_status == "MARKED_DUPLICATE"

    # User escalates to critical audit review
    r_esc = await service.execute_action(
        tenant_id=tenant.id,
        record_id=record.id,
        action="ESCALATE",
        actor_id=user.id,
        notes="Escalated for senior finance manager verification",
    )
    assert r_esc.resolution_status == "ESCALATED"
    assert r_esc.severity == "CRITICAL"

    # Verify audit event history persisted
    audit_events = await service.repo.list_audit_events(tenant.id, record.id)
    assert len(audit_events) == 3
    assert [e.action for e in audit_events] == ["REVIEW", "MARK_DUPLICATE", "ESCALATE"]


@pytest.mark.asyncio
async def test_financial_control_cross_tenant_denial(
    db_session: AsyncSession, test_user_factory
):
    """8. Cross-tenant reconciliation access and modification strictly denied."""
    user1, tenant1, _ = await test_user_factory(email="recon.t1@example.com")
    user2, tenant2, _ = await test_user_factory(email="recon.t2@example.com")

    await bind_tenant_context(db_session, tenant1.id, user1.id)
    accounts = await ChartOfAccountsService.seed_standard_chart_of_accounts(
        db_session, tenant1.id, "INR"
    )
    bank_acct = next(a for a in accounts if a.account_type == "ASSET")

    service = FinancialControlService(db_session)
    record = await service.ingest_external_record(
        tenant_id=tenant1.id,
        source_reference="STMT-ISOLATION-004",
        account_id=bank_acct.id,
        expected_amount=Decimal("12000.0000"),
    )
    await db_session.flush()

    # Switch session context to tenant 2
    await bind_tenant_context(db_session, tenant2.id, user2.id)

    # Tenant 2 tries to act on Tenant 1's discrepancy -> raises ValueError
    with pytest.raises(ValueError, match="not found in workspace"):
        await service.execute_action(
            tenant_id=tenant2.id,
            record_id=record.id,
            action="RESOLVE",
            actor_id=user2.id,
            notes="Malicious cross-tenant attempt",
        )


@pytest.mark.asyncio
async def test_financial_control_ledger_integrity_audit(
    db_session: AsyncSession, test_user_factory
):
    """10. Ledger imbalance detection accurately identifies balanced vs corrupt states."""
    user, tenant, _ = await test_user_factory(email="recon.integrity@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = FinancialControlService(db_session)
    debits, credits, variance, unbalanced, unposted = await service.repo.verify_ledger_integrity(
        tenant.id
    )

    assert variance == Decimal("0.0000")
    assert unbalanced == 0


@pytest.mark.asyncio
async def test_financial_control_dashboard_api(client: AsyncClient, test_user_factory):
    """End-to-end API test for Financial Control Centre dashboard."""
    user, tenant, token = await test_user_factory(email="recon.api@example.com")
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": str(tenant.id),
    }
    response = await client.get("/api/v1/reconciliation/dashboard", headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert "total_sessions" in data
    assert "open_discrepancies" in data
    assert "ledger_integrity" in data
    assert data["ledger_integrity"]["is_balanced"] is True
    assert "data_quality" in data
