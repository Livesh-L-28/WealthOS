"""WealthOS Financial Provider Synchronization Resilience Engine.

Implements an incremental cursor checkpoint state machine, deduplication,
full jitter exponential backoff, and holding drift reconciliation against the general ledger.
"""

from __future__ import annotations

import hashlib
import random
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from decimal import Decimal
from enum import Enum
from typing import Any

from app.core.logging import get_logger

logger = get_logger("wealthos.sync_state_machine")


class SyncStatus(str, Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    CHECKPOINTED = "CHECKPOINTED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


@dataclass
class SyncJobCheckpoint:
    """Stateful checkpoint tracking incremental provider sync progress."""

    job_id: str
    tenant_id: uuid.UUID
    provider: str
    status: SyncStatus
    cursor_timestamp: datetime
    cursor_offset: int = 0
    items_processed: int = 0
    duplicates_skipped: int = 0
    ingested_hashes: set[str] = field(default_factory=set)
    retry_count: int = 0
    max_retries: int = 5
    last_error: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = field(default_factory=lambda: datetime.now(UTC))


# In-memory active sync checkpoint registry
_SYNC_CHECKPOINTS: dict[str, SyncJobCheckpoint] = {}


class SyncStateMachine:
    """Resilient Financial Synchronization State Machine."""

    @staticmethod
    def compute_fingerprint(record: dict[str, Any]) -> str:
        """Compute deterministic SHA-256 fingerprint for deduplication."""
        canonical_str = f"{record.get('symbol', '')}|{record.get('trade_date', '')}|{record.get('quantity', '')}|{record.get('price', '')}|{record.get('ref_id', '')}"
        return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()

    @staticmethod
    def compute_backoff_delay(
        attempt: int,
        base_seconds: float = 1.0,
        max_seconds: float = 60.0,
        full_jitter: bool = True,
    ) -> float:
        """Calculate exponential backoff delay with full jitter (AWS Architecture Standard).
        
        Formula: sleep = random_between(0, min(max_seconds, base_seconds * 2 ** attempt))
        """
        temp = min(max_seconds, base_seconds * (2 ** attempt))
        if full_jitter:
            return round(random.uniform(0.0, temp), 3)
        return round(temp, 3)

    @classmethod
    def create_job(
        self,
        tenant_id: uuid.UUID,
        provider: str,
        initial_cursor: datetime | None = None,
    ) -> SyncJobCheckpoint:
        """Initialize a new sync job checkpoint."""
        job_id = f"sync_{provider.lower()}_{uuid.uuid4().hex[:8]}"
        checkpoint = SyncJobCheckpoint(
            job_id=job_id,
            tenant_id=tenant_id,
            provider=provider,
            status=SyncStatus.PENDING,
            cursor_timestamp=initial_cursor or datetime.now(UTC),
        )
        _SYNC_CHECKPOINTS[job_id] = checkpoint
        logger.info(f"Initialized sync job {job_id} for provider {provider}")
        return checkpoint

    @classmethod
    def start_job(cls, job_id: str) -> SyncJobCheckpoint:
        """Transition job to IN_PROGRESS."""
        if job_id not in _SYNC_CHECKPOINTS:
            raise ValueError(f"Job {job_id} not found.")
        cp = _SYNC_CHECKPOINTS[job_id]
        cp.status = SyncStatus.IN_PROGRESS
        cp.updated_at = datetime.now(UTC)
        return cp

    @classmethod
    def record_item_or_skip(
        cls,
        job_id: str,
        item: dict[str, Any],
    ) -> bool:
        """Deduplicate ingested record. Returns True if new (processed), False if duplicate (skipped)."""
        if job_id not in _SYNC_CHECKPOINTS:
            raise ValueError(f"Job {job_id} not found.")
        cp = _SYNC_CHECKPOINTS[job_id]

        fp = cls.compute_fingerprint(item)
        if fp in cp.ingested_hashes:
            cp.duplicates_skipped += 1
            return False  # Duplicate

        cp.ingested_hashes.add(fp)
        cp.items_processed += 1
        return True  # New item

    @classmethod
    def checkpoint(
        cls,
        job_id: str,
        cursor_timestamp: datetime,
        cursor_offset: int,
    ) -> SyncJobCheckpoint:
        """Save interim cursor checkpoint."""
        if job_id not in _SYNC_CHECKPOINTS:
            raise ValueError(f"Job {job_id} not found.")
        cp = _SYNC_CHECKPOINTS[job_id]
        cp.status = SyncStatus.CHECKPOINTED
        cp.cursor_timestamp = cursor_timestamp
        cp.cursor_offset = cursor_offset
        cp.updated_at = datetime.now(UTC)
        logger.info(
            f"Checkpointed job {job_id}: items={cp.items_processed}, "
            f"skipped_dupes={cp.duplicates_skipped}, offset={cursor_offset}"
        )
        return cp

    @classmethod
    def complete_job(cls, job_id: str) -> SyncJobCheckpoint:
        """Mark job as successfully completed."""
        if job_id not in _SYNC_CHECKPOINTS:
            raise ValueError(f"Job {job_id} not found.")
        cp = _SYNC_CHECKPOINTS[job_id]
        cp.status = SyncStatus.COMPLETED
        cp.updated_at = datetime.now(UTC)
        logger.info(f"Completed sync job {job_id} ({cp.items_processed} items)")
        return cp

    @classmethod
    def fail_job(cls, job_id: str, error_msg: str) -> tuple[SyncJobCheckpoint, float]:
        """Mark job failed and compute retry delay."""
        if job_id not in _SYNC_CHECKPOINTS:
            raise ValueError(f"Job {job_id} not found.")
        cp = _SYNC_CHECKPOINTS[job_id]
        cp.retry_count += 1
        cp.last_error = error_msg
        cp.status = SyncStatus.FAILED
        cp.updated_at = datetime.now(UTC)

        delay = cls.compute_backoff_delay(cp.retry_count)
        logger.warning(
            f"Sync job {job_id} failed (attempt {cp.retry_count}/{cp.max_retries}): {error_msg}. "
            f"Next retry in {delay}s."
        )
        return cp, delay

    @staticmethod
    def reconcile_holdings_drift(
        provider_holdings: list[dict[str, Any]],
        ledger_holdings: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Compare external broker holdings against internal FIFO ledger holdings.
        
        Returns reconciliation outcome, drift statistics, and discrepancies.
        """
        ledger_map = {item["symbol"].upper(): Decimal(str(item["quantity"])) for item in ledger_holdings}
        provider_map = {item["symbol"].upper(): Decimal(str(item["quantity"])) for item in provider_holdings}

        all_symbols = set(ledger_map.keys()) | set(provider_map.keys())
        discrepancies = []
        matched = 0

        for sym in all_symbols:
            led_qty = ledger_map.get(sym, Decimal("0.0000"))
            prov_qty = provider_map.get(sym, Decimal("0.0000"))
            diff = abs(prov_qty - led_qty)

            if diff > Decimal("0.0001"):
                discrepancies.append({
                    "symbol": sym,
                    "ledger_quantity": float(led_qty),
                    "provider_quantity": float(prov_qty),
                    "variance": float(diff),
                    "type": "MISSING_IN_LEDGER" if led_qty == 0 else (
                        "MISSING_IN_PROVIDER" if prov_qty == 0 else "QUANTITY_MISMATCH"
                    ),
                })
            else:
                matched += 1

        is_reconciled = len(discrepancies) == 0
        return {
            "total_instruments_checked": len(all_symbols),
            "matched_instruments": matched,
            "discrepancy_count": len(discrepancies),
            "is_reconciled": is_reconciled,
            "discrepancies": discrepancies,
            "reconciled_at": datetime.now(UTC).isoformat(),
        }

