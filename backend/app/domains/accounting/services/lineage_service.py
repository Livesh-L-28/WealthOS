"""WealthOS Financial Data Lineage Service.

Tracks end-to-end data provenance for all financial postings:
Source File / Broker Batch -> Extraction -> Approval -> Journal Posting -> Subsequent Reversals.
"""

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.accounting.models.lineage import FinancialDataLineage

logger = get_logger("wealthos.accounting.lineage")


class DataLineageService:
    """Provides cryptographic and auditable tracking of data provenance."""

    @staticmethod
    async def record_lineage(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        entity_type: str,
        entity_id: uuid.UUID,
        source_type: str,
        source_id: str | None = None,
        batch_id: str | None = None,
        transformation_rule: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> FinancialDataLineage:
        """Create an immutable provenance record for a financial entity."""
        node = FinancialDataLineage(
            tenant_id=tenant_id,
            entity_type=entity_type.upper().strip(),
            entity_id=entity_id,
            source_type=source_type.upper().strip(),
            source_id=str(source_id) if source_id else None,
            batch_id=str(batch_id) if batch_id else None,
            transformation_rule=transformation_rule,
            metadata_=metadata or {},
        )
        session.add(node)
        await session.flush()
        return node

    @staticmethod
    async def get_entity_lineage(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        entity_type: str,
        entity_id: uuid.UUID,
    ) -> list[FinancialDataLineage]:
        """Retrieve complete lineage history for an entity."""
        stmt = (
            select(FinancialDataLineage)
            .where(
                FinancialDataLineage.tenant_id == tenant_id,
                FinancialDataLineage.entity_type == entity_type.upper().strip(),
                FinancialDataLineage.entity_id == entity_id,
            )
            .order_by(FinancialDataLineage.created_at.asc())
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def trace_source(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        source_type: str,
        source_id: str,
    ) -> list[FinancialDataLineage]:
        """Find all downstream entities derived from an original document or provider batch."""
        stmt = (
            select(FinancialDataLineage)
            .where(
                FinancialDataLineage.tenant_id == tenant_id,
                FinancialDataLineage.source_type == source_type.upper().strip(),
                FinancialDataLineage.source_id == str(source_id),
            )
            .order_by(FinancialDataLineage.created_at.asc())
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())

