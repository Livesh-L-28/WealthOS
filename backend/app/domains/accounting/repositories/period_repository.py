"""WealthOS Accounting Period Repository."""

import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.accounting.domain.accounting_rules import PeriodStatus
from app.domains.accounting.models.accounting_period import AccountingPeriod


class PeriodRepository:
    """Database persistence and retrieval for accounting periods."""

    @staticmethod
    async def get_by_id(
        session: AsyncSession,
        period_id: uuid.UUID,
        tenant_id: uuid.UUID | None = None,
    ) -> AccountingPeriod | None:
        """Fetch accounting period by ID."""
        stmt = select(AccountingPeriod).where(AccountingPeriod.id == period_id)
        if tenant_id is not None:
            stmt = stmt.where(AccountingPeriod.tenant_id == tenant_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_period_for_date(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        entry_date: date,
    ) -> AccountingPeriod | None:
        """Fetch the accounting period covering the given date."""
        stmt = select(AccountingPeriod).where(
            AccountingPeriod.tenant_id == tenant_id,
            AccountingPeriod.start_date <= entry_date,
            AccountingPeriod.end_date >= entry_date,
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def is_date_in_closed_period(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        entry_date: date,
    ) -> bool:
        """Return True if the date falls inside a explicitly CLOSED period."""
        stmt = select(AccountingPeriod.id).where(
            AccountingPeriod.tenant_id == tenant_id,
            AccountingPeriod.start_date <= entry_date,
            AccountingPeriod.end_date >= entry_date,
            AccountingPeriod.status == PeriodStatus.CLOSED.value,
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none() is not None

    @staticmethod
    async def list_periods(
        session: AsyncSession,
        tenant_id: uuid.UUID,
    ) -> list[AccountingPeriod]:
        """List all accounting periods for tenant, ordered by start_date descending."""
        stmt = (
            select(AccountingPeriod)
            .where(AccountingPeriod.tenant_id == tenant_id)
            .order_by(AccountingPeriod.start_date.desc())
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def create(
        session: AsyncSession,
        period: AccountingPeriod,
    ) -> AccountingPeriod:
        """Persist a new accounting period."""
        session.add(period)
        await session.flush()
        return period
