"""WealthOS Reconciliation Repository."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.accounting.models.reconciliation_record import ReconciliationRecord


class ReconciliationRepository:
    """Database persistence and retrieval for external reconciliation records."""

    @staticmethod
    async def get_by_id(
        session: AsyncSession,
        record_id: uuid.UUID,
        tenant_id: uuid.UUID | None = None,
    ) -> ReconciliationRecord | None:
        """Fetch reconciliation record by ID."""
        stmt = select(ReconciliationRecord).where(ReconciliationRecord.id == record_id)
        if tenant_id is not None:
            stmt = stmt.where(ReconciliationRecord.tenant_id == tenant_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def create(
        session: AsyncSession,
        record: ReconciliationRecord,
    ) -> ReconciliationRecord:
        """Persist a new reconciliation record."""
        session.add(record)
        await session.flush()
        return record

    @staticmethod
    async def list_records(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        status: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[ReconciliationRecord]:
        """List reconciliation records for tenant ordered by created_at descending."""
        stmt = select(ReconciliationRecord).where(ReconciliationRecord.tenant_id == tenant_id)
        if status is not None:
            stmt = stmt.where(ReconciliationRecord.status == status)

        stmt = stmt.order_by(ReconciliationRecord.created_at.desc())
        stmt = stmt.limit(limit).offset(offset)

        result = await session.execute(stmt)
        return list(result.scalars().all())
