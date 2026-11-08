"""WealthOS Financial Control Centre Repository with RLS Enforcement."""

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.accounting.models.account import Account
from app.domains.accounting.models.journal_entry import JournalEntry
from app.domains.accounting.models.journal_line import JournalLine
from app.domains.accounting.models.reconciliation_record import ReconciliationRecord
from app.domains.reconciliation.models import (
    DataQualityMetric,
    ReconciliationAuditEvent,
    ReconciliationSession,
)


class ReconciliationRepository:
    """Repository handling all reconciliation data operations scoped to tenant."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_record_by_id(
        self, tenant_id: uuid.UUID, record_id: uuid.UUID
    ) -> ReconciliationRecord | None:
        """Fetch a single reconciliation record verifying tenant ownership."""
        stmt = select(ReconciliationRecord).where(
            ReconciliationRecord.tenant_id == tenant_id,
            ReconciliationRecord.id == record_id,
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def list_records(
        self,
        tenant_id: uuid.UUID,
        status: str | None = None,
        severity: str | None = None,
        resolution_status: str | None = None,
        account_id: uuid.UUID | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Sequence[ReconciliationRecord]:
        """List reconciliation records with optional filters."""
        stmt = (
            select(ReconciliationRecord)
            .where(ReconciliationRecord.tenant_id == tenant_id)
            .order_by(ReconciliationRecord.created_at.desc())
        )
        if status:
            stmt = stmt.where(ReconciliationRecord.status == status)
        if severity:
            stmt = stmt.where(ReconciliationRecord.severity == severity)
        if resolution_status:
            stmt = stmt.where(ReconciliationRecord.resolution_status == resolution_status)
        if account_id:
            stmt = stmt.where(ReconciliationRecord.account_id == account_id)

        stmt = stmt.limit(limit).offset(offset)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create_record(self, record: ReconciliationRecord) -> ReconciliationRecord:
        """Persist a new reconciliation record."""
        self.session.add(record)
        await self.session.flush()
        return record

    async def create_audit_event(
        self,
        tenant_id: uuid.UUID,
        record_id: uuid.UUID,
        action: str,
        actor_id: uuid.UUID | None,
        notes: str | None,
        metadata: dict[str, Any] | None = None,
    ) -> ReconciliationAuditEvent:
        """Record an immutable discrepancy resolution action in audit trail."""
        event = ReconciliationAuditEvent(
            tenant_id=tenant_id,
            reconciliation_record_id=record_id,
            action=action,
            actor_id=actor_id,
            notes=notes,
            metadata_payload=metadata or {},
        )
        self.session.add(event)
        await self.session.flush()
        return event

    async def list_audit_events(
        self, tenant_id: uuid.UUID, record_id: uuid.UUID
    ) -> Sequence[ReconciliationAuditEvent]:
        """Fetch audit trail for a reconciliation discrepancy."""
        stmt = (
            select(ReconciliationAuditEvent)
            .where(
                ReconciliationAuditEvent.tenant_id == tenant_id,
                ReconciliationAuditEvent.reconciliation_record_id == record_id,
            )
            .order_by(ReconciliationAuditEvent.created_at.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_or_create_session(
        self, tenant_id: uuid.UUID, document_id: uuid.UUID | None = None
    ) -> ReconciliationSession:
        """Create a new reconciliation session."""
        session = ReconciliationSession(
            tenant_id=tenant_id,
            document_id=document_id,
            status="IN_PROGRESS",
        )
        self.session.add(session)
        await self.session.flush()
        return session

    async def list_sessions(
        self, tenant_id: uuid.UUID, limit: int = 20
    ) -> Sequence[ReconciliationSession]:
        """List historical reconciliation sessions."""
        stmt = (
            select(ReconciliationSession)
            .where(ReconciliationSession.tenant_id == tenant_id)
            .order_by(ReconciliationSession.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_data_quality_metrics(
        self, tenant_id: uuid.UUID
    ) -> Sequence[DataQualityMetric]:
        """Fetch all data freshness metrics for a tenant."""
        stmt = (
            select(DataQualityMetric)
            .where(DataQualityMetric.tenant_id == tenant_id)
            .order_by(DataQualityMetric.source_name.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def upsert_data_quality_metric(
        self,
        tenant_id: uuid.UUID,
        source_name: str,
        account_id: uuid.UUID | None,
        status: str,
        unreconciled_count: int = 0,
        discrepancy_count: int = 0,
    ) -> DataQualityMetric:
        """Update or insert freshness indicator for an account/source."""
        stmt = select(DataQualityMetric).where(
            DataQualityMetric.tenant_id == tenant_id,
            DataQualityMetric.source_name == source_name,
            DataQualityMetric.account_id == account_id,
        )
        result = await self.session.execute(stmt)
        metric = result.scalars().first()
        now = datetime.now(UTC)

        if metric:
            metric.status = status
            metric.last_sync_at = now
            metric.unreconciled_count = unreconciled_count
            metric.discrepancy_count = discrepancy_count
            metric.freshness_seconds = 0
            metric.updated_at = now
        else:
            metric = DataQualityMetric(
                tenant_id=tenant_id,
                source_name=source_name,
                account_id=account_id,
                status=status,
                last_sync_at=now,
                unreconciled_count=unreconciled_count,
                discrepancy_count=discrepancy_count,
                freshness_seconds=0,
            )
            self.session.add(metric)

        await self.session.flush()
        return metric

    async def verify_ledger_integrity(
        self, tenant_id: uuid.UUID
    ) -> tuple[Decimal, Decimal, Decimal, int, int]:
        """Compute General Ledger debit/credit balance totals and check invariants."""
        # 1. Total debits and credits across all posted lines
        stmt = (
            select(
                func.coalesce(func.sum(JournalLine.debit_amount), Decimal("0.0000")),
                func.coalesce(func.sum(JournalLine.credit_amount), Decimal("0.0000")),
            )
            .join(JournalEntry, JournalLine.journal_entry_id == JournalEntry.id)
            .where(
                JournalEntry.tenant_id == tenant_id,
                JournalEntry.status == "POSTED",
            )
        )
        res = await self.session.execute(stmt)
        row = res.first()
        total_debits = row[0] if row else Decimal("0.0000")
        total_credits = row[1] if row else Decimal("0.0000")
        variance = abs(total_debits - total_credits)

        # 2. Count any unbalanced individual posted entries
        unbalanced_stmt = (
            select(func.count(JournalEntry.id))
            .where(
                JournalEntry.tenant_id == tenant_id,
                JournalEntry.status == "POSTED",
                JournalEntry.total_debit != JournalEntry.total_credit,
            )
        )
        unbalanced_res = await self.session.execute(unbalanced_stmt)
        unbalanced_count = unbalanced_res.scalar() or 0

        # 3. Unposted draft entries
        unposted_stmt = (
            select(func.count(JournalEntry.id))
            .where(
                JournalEntry.tenant_id == tenant_id,
                JournalEntry.status == "DRAFT",
            )
        )
        unposted_res = await self.session.execute(unposted_stmt)
        unposted_count = unposted_res.scalar() or 0

        return total_debits, total_credits, variance, unbalanced_count, unposted_count
