"""WealthOS Double-Entry Journal Entry Repository."""

import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domains.accounting.models.idempotency_record import AccountingIdempotencyRecord
from app.domains.accounting.models.journal_entry import JournalEntry
from app.domains.accounting.models.journal_line import JournalLine


class JournalRepository:
    """Database persistence and retrieval for double-entry journals."""

    @staticmethod
    async def get_by_id(
        session: AsyncSession,
        entry_id: uuid.UUID,
        tenant_id: uuid.UUID | None = None,
        for_update: bool = False,
        populate_lines: bool = True,
    ) -> JournalEntry | None:
        """Fetch journal entry by ID with optional tenant scope and row locking."""
        stmt = select(JournalEntry).where(JournalEntry.id == entry_id)
        if tenant_id is not None:
            stmt = stmt.where(JournalEntry.tenant_id == tenant_id)
        if populate_lines:
            stmt = stmt.options(selectinload(JournalEntry.lines).selectinload(JournalLine.account))
        if for_update:
            stmt = stmt.with_for_update()

        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_entry_number(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        entry_number: str,
    ) -> JournalEntry | None:
        """Fetch journal entry by entry number within a tenant."""
        stmt = (
            select(JournalEntry)
            .where(
                JournalEntry.tenant_id == tenant_id,
                JournalEntry.entry_number == entry_number.strip(),
            )
            .options(selectinload(JournalEntry.lines).selectinload(JournalLine.account))
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def generate_entry_number(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        prefix: str = "JRN",
    ) -> str:
        """Generate the next unique entry number for a tenant."""
        stmt = select(func.count(JournalEntry.id)).where(JournalEntry.tenant_id == tenant_id)
        result = await session.execute(stmt)
        count = result.scalar_one()
        seq = count + 1

        while True:
            candidate = f"{prefix}-{seq:06d}"
            check_stmt = select(JournalEntry.id).where(
                JournalEntry.tenant_id == tenant_id,
                JournalEntry.entry_number == candidate,
            )
            existing = await session.execute(check_stmt)
            if existing.scalar_one_or_none() is None:
                return candidate
            seq += 1

    @staticmethod
    async def get_idempotency_record(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        idempotency_key: str,
    ) -> AccountingIdempotencyRecord | None:
        """Fetch existing idempotency record by key."""
        stmt = select(AccountingIdempotencyRecord).where(
            AccountingIdempotencyRecord.tenant_id == tenant_id,
            AccountingIdempotencyRecord.idempotency_key == idempotency_key,
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def create_idempotency_record(
        session: AsyncSession,
        record: AccountingIdempotencyRecord,
    ) -> AccountingIdempotencyRecord:
        """Persist an idempotency record."""
        session.add(record)
        await session.flush()
        return record

    @staticmethod
    async def create(session: AsyncSession, entry: JournalEntry) -> JournalEntry:
        """Persist a new journal entry and lines."""
        session.add(entry)
        await session.flush()
        return entry

    @staticmethod
    async def delete_draft(session: AsyncSession, entry: JournalEntry) -> None:
        """Delete an unposted DRAFT journal entry."""
        await session.delete(entry)
        await session.flush()

    @staticmethod
    async def list_entries(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        status: str | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[JournalEntry]:
        """List journal entries ordered by entry_date descending and created_at descending."""
        stmt = (
            select(JournalEntry)
            .where(JournalEntry.tenant_id == tenant_id)
            .options(selectinload(JournalEntry.lines).selectinload(JournalLine.account))
        )
        if status is not None:
            stmt = stmt.where(JournalEntry.status == status)
        if start_date is not None:
            stmt = stmt.where(JournalEntry.entry_date >= start_date)
        if end_date is not None:
            stmt = stmt.where(JournalEntry.entry_date <= end_date)

        stmt = stmt.order_by(JournalEntry.entry_date.desc(), JournalEntry.created_at.desc())
        stmt = stmt.limit(limit).offset(offset)

        result = await session.execute(stmt)
        return list(result.scalars().all())
