"""WealthOS India Tax Readiness Repository."""

import uuid
from typing import Sequence

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.tax.models import TaxComputation, TaxProfile


class TaxRepository:
    """Data access repository for tax profiles and tax computations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_profile(self, tenant_id: uuid.UUID, financial_year: str) -> TaxProfile | None:
        stmt = select(TaxProfile).where(
            TaxProfile.tenant_id == tenant_id,
            TaxProfile.financial_year == financial_year,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def save_profile(self, profile: TaxProfile) -> TaxProfile:
        self.session.add(profile)
        await self.session.flush()
        return profile

    async def save_computation(self, comp: TaxComputation) -> TaxComputation:
        self.session.add(comp)
        await self.session.flush()
        return comp

    async def get_latest_computation(
        self, tenant_id: uuid.UUID, profile_id: uuid.UUID
    ) -> TaxComputation | None:
        stmt = (
            select(TaxComputation)
            .where(
                TaxComputation.tenant_id == tenant_id,
                TaxComputation.profile_id == profile_id,
            )
            .order_by(desc(TaxComputation.created_at))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_computations(
        self, tenant_id: uuid.UUID, financial_year: str
    ) -> Sequence[TaxComputation]:
        stmt = (
            select(TaxComputation)
            .where(
                TaxComputation.tenant_id == tenant_id,
                TaxComputation.financial_year == financial_year,
            )
            .order_by(desc(TaxComputation.created_at))
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
