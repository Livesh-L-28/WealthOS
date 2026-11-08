"""WealthOS Personal Financial Digital Twin Repository."""

import uuid
from datetime import date

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.twin.models import FinancialTwinSnapshot


class TwinRepository:
    """Repository handling persistence of Financial Twin snapshots."""

    @staticmethod
    async def get_latest_snapshot(
        session: AsyncSession, tenant_id: uuid.UUID, user_id: uuid.UUID
    ) -> FinancialTwinSnapshot | None:
        """Fetch the most recent snapshot for a given user in a tenant."""
        stmt = (
            select(FinancialTwinSnapshot)
            .where(
                FinancialTwinSnapshot.tenant_id == tenant_id,
                FinancialTwinSnapshot.user_id == user_id,
            )
            .order_by(
                desc(FinancialTwinSnapshot.snapshot_date),
                desc(FinancialTwinSnapshot.created_at),
            )
            .limit(1)
        )
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def list_snapshots(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        limit: int = 30,
    ) -> list[FinancialTwinSnapshot]:
        """List historical snapshots for trend analysis."""
        stmt = (
            select(FinancialTwinSnapshot)
            .where(
                FinancialTwinSnapshot.tenant_id == tenant_id,
                FinancialTwinSnapshot.user_id == user_id,
            )
            .order_by(desc(FinancialTwinSnapshot.snapshot_date))
            .limit(limit)
        )
        res = await session.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def save_snapshot(
        session: AsyncSession, snapshot: FinancialTwinSnapshot
    ) -> FinancialTwinSnapshot:
        """Persist a new twin snapshot."""
        session.add(snapshot)
        await session.flush()
        return snapshot
