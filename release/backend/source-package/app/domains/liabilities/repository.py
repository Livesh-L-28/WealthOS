"""WealthOS Liability & Debt Management Repository."""

import uuid
from datetime import date
from typing import Sequence

from sqlalchemy import delete, desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domains.liabilities.models import (
    CreditCardStatement,
    Liability,
    LoanPaymentSchedule,
)


class LiabilityRepository:
    """Data access repository for liabilities, loan schedules, and credit cards."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_liability(self, liability: Liability) -> Liability:
        """Persist a new liability entity."""
        self.session.add(liability)
        await self.session.flush()
        return liability

    async def get_liability(self, tenant_id: uuid.UUID, liability_id: uuid.UUID) -> Liability | None:
        """Fetch liability by ID with tenant isolation."""
        stmt = (
            select(Liability)
            .where(Liability.tenant_id == tenant_id, Liability.id == liability_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_liabilities(
        self, tenant_id: uuid.UUID, is_active: bool | None = None
    ) -> Sequence[Liability]:
        """Fetch all liabilities for a tenant."""
        stmt = select(Liability).where(Liability.tenant_id == tenant_id)
        if is_active is not None:
            stmt = stmt.where(Liability.is_active == is_active)
        stmt = stmt.order_by(desc(Liability.created_at))
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def update_liability(self, liability: Liability) -> Liability:
        """Update an existing liability."""
        await self.session.flush()
        return liability

    async def delete_liability(self, liability: Liability) -> None:
        """Delete a liability."""
        await self.session.delete(liability)
        await self.session.flush()

    async def create_schedules(
        self, schedules: list[LoanPaymentSchedule]
    ) -> list[LoanPaymentSchedule]:
        """Persist a batch of payment installments."""
        self.session.add_all(schedules)
        await self.session.flush()
        return schedules

    async def get_schedules(
        self, tenant_id: uuid.UUID, liability_id: uuid.UUID
    ) -> Sequence[LoanPaymentSchedule]:
        """Fetch all installments for a liability ordered by installment number."""
        stmt = (
            select(LoanPaymentSchedule)
            .where(
                LoanPaymentSchedule.tenant_id == tenant_id,
                LoanPaymentSchedule.liability_id == liability_id,
            )
            .order_by(LoanPaymentSchedule.installment_number.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_schedule_by_id(
        self, tenant_id: uuid.UUID, schedule_id: uuid.UUID
    ) -> LoanPaymentSchedule | None:
        """Fetch a specific payment schedule installment."""
        stmt = select(LoanPaymentSchedule).where(
            LoanPaymentSchedule.tenant_id == tenant_id,
            LoanPaymentSchedule.id == schedule_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_schedule_by_installment(
        self, tenant_id: uuid.UUID, liability_id: uuid.UUID, installment_number: int
    ) -> LoanPaymentSchedule | None:
        """Fetch schedule by liability and installment number."""
        stmt = select(LoanPaymentSchedule).where(
            LoanPaymentSchedule.tenant_id == tenant_id,
            LoanPaymentSchedule.liability_id == liability_id,
            LoanPaymentSchedule.installment_number == installment_number,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def update_schedule(self, schedule: LoanPaymentSchedule) -> LoanPaymentSchedule:
        """Update a payment installment."""
        await self.session.flush()
        return schedule

    async def delete_schedules_for_liability(
        self, tenant_id: uuid.UUID, liability_id: uuid.UUID
    ) -> None:
        """Delete all existing schedules for a liability."""
        stmt = delete(LoanPaymentSchedule).where(
            LoanPaymentSchedule.tenant_id == tenant_id,
            LoanPaymentSchedule.liability_id == liability_id,
        )
        await self.session.execute(stmt)
        await self.session.flush()

    async def get_upcoming_schedules(
        self, tenant_id: uuid.UUID, limit: int = 10
    ) -> Sequence[LoanPaymentSchedule]:
        """Fetch upcoming or due installments across all liabilities."""
        stmt = (
            select(LoanPaymentSchedule)
            .where(
                LoanPaymentSchedule.tenant_id == tenant_id,
                LoanPaymentSchedule.payment_status.in_(["UPCOMING", "DUE", "OVERDUE"]),
            )
            .order_by(LoanPaymentSchedule.due_date.asc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create_credit_card_statement(
        self, stmt_obj: CreditCardStatement
    ) -> CreditCardStatement:
        """Persist a credit card statement."""
        self.session.add(stmt_obj)
        await self.session.flush()
        return stmt_obj

    async def list_credit_card_statements(
        self, tenant_id: uuid.UUID, liability_id: uuid.UUID
    ) -> Sequence[CreditCardStatement]:
        """Fetch statements for a credit card."""
        stmt = (
            select(CreditCardStatement)
            .where(
                CreditCardStatement.tenant_id == tenant_id,
                CreditCardStatement.liability_id == liability_id,
            )
            .order_by(desc(CreditCardStatement.statement_date))
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_credit_card_statement(
        self, tenant_id: uuid.UUID, statement_id: uuid.UUID
    ) -> CreditCardStatement | None:
        """Fetch a specific credit card statement."""
        stmt = select(CreditCardStatement).where(
            CreditCardStatement.tenant_id == tenant_id,
            CreditCardStatement.id == statement_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
