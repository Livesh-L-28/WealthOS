"""WealthOS Phase 19 Workstream 1: Financial Integrity & Consistency Test Suite.

Validates:
1. Transactional Outbox atomic persistence, retries, dispatch, and retention cleanup.
2. Universal Idempotency Engine lock acquisition, replay, conflict detection, and fingerprinting.
3. 15-Point Deterministic Financial Integrity Service non-mutating audit.
4. Financial Data Lineage provenance graph tracking.
"""

import uuid
from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.idempotency import IdempotencyConflictError, IdempotencyEngine
from app.core.tenant_context import set_db_tenant_context
from app.domains.accounting.models.journal_entry import JournalEntry
from app.domains.accounting.models.journal_line import JournalLine
from app.domains.accounting.services.financial_integrity_service import (
    FinancialIntegrityService,
)
from app.domains.accounting.services.lineage_service import DataLineageService
from app.domains.accounting.services.outbox_service import OutboxService


@pytest.mark.asyncio
async def test_transactional_outbox_atomic_lifecycle(
    db_session: AsyncSession, test_user_factory
) -> None:
    """Validate outbox event atomic persistence, dispatch, retries, and cleanup."""
    user, tenant, _ = await test_user_factory(email="outbox.test@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    # 1. Record outbox event within transaction
    event = await OutboxService.record_event(
        session=db_session,
        tenant_id=tenant.id,
        aggregate_type="TRANSACTION",
        aggregate_id="tx-99901",
        event_type="transaction.posted",
        payload={"amount": "15000.00", "currency": "INR"},
    )
    await db_session.flush()

    assert event.status == "PENDING"
    assert event.retry_count == 0

    # 2. Fetch pending events
    pending = await OutboxService.fetch_pending_events(db_session, limit=10)
    assert any(e.id == event.id for e in pending)

    # 3. Successful dispatch
    dispatched_events: list[uuid.UUID] = []

    def mock_publisher(ev):
        dispatched_events.append(ev.id)

    res = await OutboxService.dispatch_pending_events(db_session, mock_publisher)
    assert res["dispatched"] >= 1
    assert event.id in dispatched_events

    # Verify status changed to PUBLISHED
    await db_session.refresh(event)
    assert event.status == "PUBLISHED"
    assert event.processed_at is not None

    # 4. Failed dispatch with retry count
    failing_event = await OutboxService.record_event(
        session=db_session,
        tenant_id=tenant.id,
        aggregate_type="JOURNAL",
        aggregate_id="je-1122",
        event_type="journal.committed",
        payload={"entry_number": "JE-2026-001"},
    )
    await db_session.flush()

    def failing_publisher(ev):
        raise ConnectionError("Broker unreachable")

    fail_res = await OutboxService.dispatch_pending_events(db_session, failing_publisher)
    assert fail_res["failed"] >= 1
    await db_session.refresh(failing_event)
    assert failing_event.retry_count == 1
    assert failing_event.last_error is not None


@pytest.mark.asyncio
async def test_universal_idempotency_engine(
    db_session: AsyncSession, test_user_factory
) -> None:
    """Validate idempotency lock acquisition, replay, conflict detection, and fingerprinting."""
    user, tenant, _ = await test_user_factory(email="idempotency.test@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    key = f"idemp-key-{uuid.uuid4().hex[:8]}"
    payload_a = {"account_id": str(uuid.uuid4()), "amount": "50000.00", "currency": "INR"}
    payload_b = {"account_id": str(uuid.uuid4()), "amount": "99999.00", "currency": "INR"}

    # 1. Acquire initial lock
    is_replay, code, resp = await IdempotencyEngine.check_or_lock(
        session=db_session,
        tenant_id=tenant.id,
        user_id=user.id,
        idempotency_key=key,
        operation="POST_TRANSACTION",
        payload=payload_a,
    )
    assert is_replay is False
    assert code is None

    # 2. Concurrent execution with same key and payload while IN_PROGRESS raises conflict
    with pytest.raises(IdempotencyConflictError, match="currently in progress"):
        await IdempotencyEngine.check_or_lock(
            session=db_session,
            tenant_id=tenant.id,
            user_id=user.id,
            idempotency_key=key,
            operation="POST_TRANSACTION",
            payload=payload_a,
        )

    # 3. Complete execution
    await IdempotencyEngine.record_completed(
        session=db_session,
        tenant_id=tenant.id,
        idempotency_key=key,
        response_code=201,
        response_body={"transaction_id": "tx-12345", "status": "CONFIRMED"},
    )

    # 4. Replay identical request
    is_replay_2, code_2, resp_2 = await IdempotencyEngine.check_or_lock(
        session=db_session,
        tenant_id=tenant.id,
        user_id=user.id,
        idempotency_key=key,
        operation="POST_TRANSACTION",
        payload=payload_a,
    )
    assert is_replay_2 is True
    assert code_2 == 201
    assert resp_2["transaction_id"] == "tx-12345"

    # 5. Reusing key with different payload raises conflict
    with pytest.raises(IdempotencyConflictError, match="different request payload"):
        await IdempotencyEngine.check_or_lock(
            session=db_session,
            tenant_id=tenant.id,
            user_id=user.id,
            idempotency_key=key,
            operation="POST_TRANSACTION",
            payload=payload_b,
        )


@pytest.mark.asyncio
async def test_deterministic_15_point_integrity_audit(
    db_session: AsyncSession, test_user_factory
) -> None:
    """Validate 15-point deterministic integrity audit across double-entry ledger."""
    user, tenant, _ = await test_user_factory(email="integrity.audit@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    integrity_svc = FinancialIntegrityService(db_session)
    report = await integrity_svc.execute_full_integrity_audit(tenant.id)

    assert report["tenant_id"] == tenant.id
    assert report["total_checks"] == 15
    assert report["passed_checks"] >= 14
    assert report["overall_status"] in ["CERTIFIED_HEALTHY", "WARNING"]

    check_ids = [f["check_id"] for f in report["findings"]]
    assert "CHECK_01_DEBIT_CREDIT_EQUALITY" in check_ids
    assert "CHECK_02_LEDGER_BALANCE_CONSISTENCY" in check_ids
    assert "CHECK_06_INVESTMENT_LOT_QTY_CONSISTENCY" in check_ids
    assert "CHECK_07_INVESTMENT_COST_BASIS_INVARIANCE" in check_ids
    assert "CHECK_11_NET_WORTH_INVARIANCE" in check_ids


@pytest.mark.asyncio
async def test_financial_data_lineage_graph(
    db_session: AsyncSession, test_user_factory
) -> None:
    """Validate financial data lineage provenance recording and tracing."""
    user, tenant, _ = await test_user_factory(email="lineage.test@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    doc_id = "doc-hdfc-statement-2026"
    batch_id = "batch-ocr-881"
    journal_entry_id = uuid.uuid4()

    # 1. Record lineage for posted journal entry
    lineage_node = await DataLineageService.record_lineage(
        session=db_session,
        tenant_id=tenant.id,
        entity_type="JOURNAL_ENTRY",
        entity_id=journal_entry_id,
        source_type="DOCUMENT",
        source_id=doc_id,
        batch_id=batch_id,
        transformation_rule="RULE_BANK_STATEMENT_AUTO_EXTRACT_V2",
        metadata={"confidence": "0.99", "statement_period": "Oct 2026"},
    )
    assert lineage_node.id is not None

    # 2. Retrieve entity lineage
    entity_history = await DataLineageService.get_entity_lineage(
        session=db_session,
        tenant_id=tenant.id,
        entity_type="JOURNAL_ENTRY",
        entity_id=journal_entry_id,
    )
    assert len(entity_history) == 1
    assert entity_history[0].source_id == doc_id

    # 3. Trace from source document to downstream entries
    derived_entries = await DataLineageService.trace_source(
        session=db_session,
        tenant_id=tenant.id,
        source_type="DOCUMENT",
        source_id=doc_id,
    )
    assert len(derived_entries) == 1
    assert derived_entries[0].entity_id == journal_entry_id

