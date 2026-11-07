"""WealthOS Accounting Period Application Service."""

import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.accounting.domain.accounting_rules import PeriodStatus
from app.domains.accounting.models.accounting_period import AccountingPeriod
from app.domains.accounting.repositories.period_repository import PeriodRepository
from app.domains.accounting.schemas.period import (
    ClosePeriodRequest,
    CreatePeriodRequest,
    ReopenPeriodRequest,
)
from app.domains.audit.service import record_security_event

logger = get_logger("wealthos.accounting.periods")


class PeriodService:
    """Service managing accounting period lifecycle and closures."""

    @staticmethod
    async def create_period(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        payload: CreatePeriodRequest,
    ) -> AccountingPeriod:
        """Open a new accounting period."""
        if payload.start_date > payload.end_date:
            raise ValueError(
                f"start_date ({payload.start_date}) cannot be after end_date ({payload.end_date})"
            )

        period = AccountingPeriod(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            period_name=payload.period_name.strip(),
            start_date=payload.start_date,
            end_date=payload.end_date,
            status=PeriodStatus.OPEN.value,
            closed_at=None,
            closed_by=None,
        )
        return await PeriodRepository.create(session, period)

    @staticmethod
    async def close_period(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        period_id: uuid.UUID,
        payload: ClosePeriodRequest | None = None,
        user_id: uuid.UUID | None = None,
        correlation_id: str | None = None,
    ) -> AccountingPeriod:
        """Close an open accounting period, preventing any subsequent transaction postings."""
        period = await PeriodRepository.get_by_id(session, period_id, tenant_id)
        if not period:
            raise ValueError(f"Accounting period '{period_id}' not found.")

        if period.status == PeriodStatus.CLOSED.value:
            return period

        now = datetime.now(UTC)
        period.status = PeriodStatus.CLOSED.value
        period.closed_at = now
        period.closed_by = user_id

        await record_security_event(
            session=session,
            event_type="accounting.period_closed",
            status="success",
            tenant_id=tenant_id,
            user_id=user_id,
            correlation_id=correlation_id,
            details={
                "period_id": str(period.id),
                "period_name": period.period_name,
                "start_date": period.start_date.isoformat(),
                "end_date": period.end_date.isoformat(),
                "reason": payload.reason if payload else None,
            },
        )
        await session.flush()
        logger.info(f"Closed accounting period {period.period_name} for tenant {tenant_id}")
        return period

    @staticmethod
    async def reopen_period(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        period_id: uuid.UUID,
        payload: ReopenPeriodRequest,
        user_id: uuid.UUID | None = None,
        correlation_id: str | None = None,
    ) -> AccountingPeriod:
        """Reopen a closed period (governed by admin authorization and audit logging)."""
        period = await PeriodRepository.get_by_id(session, period_id, tenant_id)
        if not period:
            raise ValueError(f"Accounting period '{period_id}' not found.")

        if period.status == PeriodStatus.OPEN.value:
            return period

        period.status = PeriodStatus.OPEN.value
        period.closed_at = None
        period.closed_by = None

        await record_security_event(
            session=session,
            event_type="accounting.period_reopened",
            status="success",
            tenant_id=tenant_id,
            user_id=user_id,
            correlation_id=correlation_id,
            details={
                "period_id": str(period.id),
                "period_name": period.period_name,
                "reopen_reason": payload.reason,
            },
        )
        await session.flush()
        logger.warning(
            f"Reopened accounting period {period.period_name} for tenant {tenant_id}. Reason: {payload.reason}"
        )
        return period

    @staticmethod
    async def list_periods(
        session: AsyncSession,
        tenant_id: uuid.UUID,
    ) -> list[AccountingPeriod]:
        """List all accounting periods for tenant."""
        return await PeriodRepository.list_periods(session, tenant_id)
