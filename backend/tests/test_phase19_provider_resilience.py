"""WealthOS Phase 19 Workstream 7: Provider Synchronization Resilience Tests.

Validates incremental cursor state machine checkpoints, deduplication,
exponential jitter backoff, and broker-to-ledger portfolio holdings drift reconciliation.
"""

import uuid
from datetime import UTC, datetime

import pytest

from app.domains.integrations.sync_state_machine import (
    SyncJobCheckpoint,
    SyncStateMachine,
    SyncStatus,
)


def test_sync_state_machine_checkpoint_lifecycle():
    """Verify state transitions: PENDING -> IN_PROGRESS -> CHECKPOINTED -> COMPLETED."""
    tenant_id = uuid.uuid4()
    job = SyncStateMachine.create_job(tenant_id=tenant_id, provider="ZERODHA")
    assert job.status == SyncStatus.PENDING

    # 1. Start
    started = SyncStateMachine.start_job(job.job_id)
    assert started.status == SyncStatus.IN_PROGRESS

    # 2. Ingest records with deduplication
    rec1 = {"symbol": "INFY", "trade_date": "2026-11-01", "quantity": 100, "price": 1850.00, "ref_id": "TX101"}
    rec2 = {"symbol": "HDFCBANK", "trade_date": "2026-11-02", "quantity": 50, "price": 1720.00, "ref_id": "TX102"}
    rec_dup = {"symbol": "INFY", "trade_date": "2026-11-01", "quantity": 100, "price": 1850.00, "ref_id": "TX101"}

    assert SyncStateMachine.record_item_or_skip(job.job_id, rec1) is True   # Processed
    assert SyncStateMachine.record_item_or_skip(job.job_id, rec2) is True   # Processed
    assert SyncStateMachine.record_item_or_skip(job.job_id, rec_dup) is False # Skipped duplicate

    # 3. Checkpoint
    checkpoint_time = datetime.now(UTC)
    cp = SyncStateMachine.checkpoint(job.job_id, cursor_timestamp=checkpoint_time, cursor_offset=2)
    assert cp.status == SyncStatus.CHECKPOINTED
    assert cp.items_processed == 2
    assert cp.duplicates_skipped == 1

    # 4. Complete
    completed = SyncStateMachine.complete_job(job.job_id)
    assert completed.status == SyncStatus.COMPLETED


def test_sync_exponential_backoff_jitter():
    """Verify exponential backoff calculation stays within theoretical boundaries."""
    tenant_id = uuid.uuid4()
    job = SyncStateMachine.create_job(tenant_id=tenant_id, provider="UPSTOX")

    # Fail attempt 1
    cp1, delay1 = SyncStateMachine.fail_job(job.job_id, "503 Service Unavailable")
    assert cp1.retry_count == 1
    assert 0.0 <= delay1 <= 2.0  # base=1.0 * 2^1 = 2.0

    # Fail attempt 2
    cp2, delay2 = SyncStateMachine.fail_job(job.job_id, "429 Rate Limited")
    assert cp2.retry_count == 2
    assert 0.0 <= delay2 <= 4.0  # base=1.0 * 2^2 = 4.0


def test_holding_drift_reconciliation():
    """Verify automated comparison between broker external feed and internal FIFO ledger."""
    # Case A: Exact Match
    provider_exact = [
        {"symbol": "TCS", "quantity": 25.0000},
        {"symbol": "INFY", "quantity": 100.0000},
    ]
    ledger_exact = [
        {"symbol": "TCS", "quantity": 25.0000},
        {"symbol": "INFY", "quantity": 100.0000},
    ]
    rec_exact = SyncStateMachine.reconcile_holdings_drift(provider_exact, ledger_exact)
    assert rec_exact["is_reconciled"] is True
    assert rec_exact["discrepancy_count"] == 0
    assert rec_exact["matched_instruments"] == 2

    # Case B: Quantity Mismatch & Missing in Ledger
    provider_drift = [
        {"symbol": "TCS", "quantity": 25.0000},
        {"symbol": "RELIANCE", "quantity": 50.0000}, # Provider has 50
        {"symbol": "SBIN", "quantity": 10.0000},     # Missing in ledger
    ]
    ledger_drift = [
        {"symbol": "TCS", "quantity": 25.0000},
        {"symbol": "RELIANCE", "quantity": 40.0000}, # Ledger has 40 (drift of 10)
    ]
    rec_drift = SyncStateMachine.reconcile_holdings_drift(provider_drift, ledger_drift)
    assert rec_drift["is_reconciled"] is False
    assert rec_drift["discrepancy_count"] == 2

    types = {d["symbol"]: d["type"] for d in rec_drift["discrepancies"]}
    assert types["RELIANCE"] == "QUANTITY_MISMATCH"
    assert types["SBIN"] == "MISSING_IN_LEDGER"
