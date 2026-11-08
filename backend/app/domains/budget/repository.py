"""WealthOS Budget & Expense Intelligence Repository."""

import uuid
from collections.abc import Sequence
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.budget.models import (
    Budget,
    BudgetAlert,
    BudgetAllocation,
    BudgetRevision,
    TransactionCategory,
)
from app.domains.cash.models import AccountTransfer


class BudgetRepository:
    """Tenant-scoped persistence and queries for budgets and expenses."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_or_create_category(
        self,
        tenant_id: uuid.UUID,
        name: str,
        code: str,
        category_type: str = "EXPENSE",
        parent_id: uuid.UUID | None = None,
        icon: str | None = None,
    ) -> TransactionCategory:
        """Fetch existing category by code or create a new one."""
        stmt = select(TransactionCategory).where(
            TransactionCategory.tenant_id == tenant_id,
            TransactionCategory.code == code.upper().strip(),
        )
        result = await self.session.execute(stmt)
        cat = result.scalars().first()
        if cat:
            return cat

        cat = TransactionCategory(
            tenant_id=tenant_id,
            name=name.strip(),
            code=code.upper().strip(),
            category_type=category_type,
            parent_id=parent_id,
            icon=icon,
            is_system=False,
            is_active=True,
        )
        self.session.add(cat)
        await self.session.flush()
        return cat

    async def get_category(
        self, tenant_id: uuid.UUID, category_id: uuid.UUID
    ) -> TransactionCategory | None:
        """Fetch category by ID."""
        stmt = select(TransactionCategory).where(
            TransactionCategory.tenant_id == tenant_id,
            TransactionCategory.id == category_id,
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def list_categories(
        self, tenant_id: uuid.UUID, category_type: str | None = None
    ) -> Sequence[TransactionCategory]:
        """List active categories for a tenant."""
        stmt = (
            select(TransactionCategory)
            .where(
                TransactionCategory.tenant_id == tenant_id,
                TransactionCategory.is_active == True,
            )
            .order_by(TransactionCategory.name.asc())
        )
        if category_type:
            stmt = stmt.where(TransactionCategory.category_type == category_type)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create_budget(self, budget: Budget) -> Budget:
        """Persist a new budget."""
        self.session.add(budget)
        await self.session.flush()
        return budget

    async def get_budget(
        self, tenant_id: uuid.UUID, budget_id: uuid.UUID
    ) -> Budget | None:
        """Fetch budget with allocations."""
        stmt = select(Budget).where(
            Budget.tenant_id == tenant_id,
            Budget.id == budget_id,
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def list_budgets(
        self, tenant_id: uuid.UUID, is_active: bool | None = None
    ) -> Sequence[Budget]:
        """List budgets for tenant."""
        stmt = (
            select(Budget)
            .where(Budget.tenant_id == tenant_id)
            .order_by(Budget.start_date.desc(), Budget.created_at.desc())
        )
        if is_active is not None:
            stmt = stmt.where(Budget.is_active == is_active)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create_allocation(self, alloc: BudgetAllocation) -> BudgetAllocation:
        """Persist or update a category allocation."""
        self.session.add(alloc)
        await self.session.flush()
        return alloc

    async def list_allocations(
        self, tenant_id: uuid.UUID, budget_id: uuid.UUID
    ) -> Sequence[BudgetAllocation]:
        """List allocations for a budget."""
        stmt = (
            select(BudgetAllocation)
            .where(
                BudgetAllocation.tenant_id == tenant_id,
                BudgetAllocation.budget_id == budget_id,
            )
            .order_by(BudgetAllocation.allocated_amount.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_allocation_by_category(
        self, tenant_id: uuid.UUID, budget_id: uuid.UUID, category_id: uuid.UUID
    ) -> BudgetAllocation | None:
        """Retrieve allocation by category."""
        stmt = select(BudgetAllocation).where(
            BudgetAllocation.tenant_id == tenant_id,
            BudgetAllocation.budget_id == budget_id,
            BudgetAllocation.category_id == category_id,
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def create_revision(self, rev: BudgetRevision) -> BudgetRevision:
        """Persist budget revision log."""
        self.session.add(rev)
        await self.session.flush()
        return rev

    async def list_revisions(
        self, tenant_id: uuid.UUID, budget_id: uuid.UUID
    ) -> Sequence[BudgetRevision]:
        """List revisions for a budget."""
        stmt = (
            select(BudgetRevision)
            .where(
                BudgetRevision.tenant_id == tenant_id,
                BudgetRevision.budget_id == budget_id,
            )
            .order_by(BudgetRevision.revision_number.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create_alert(self, alert: BudgetAlert) -> BudgetAlert:
        """Persist budget threshold alert."""
        self.session.add(alert)
        await self.session.flush()
        return alert

    async def list_alerts(
        self,
        tenant_id: uuid.UUID,
        budget_id: uuid.UUID | None = None,
        limit: int = 50,
    ) -> Sequence[BudgetAlert]:
        """List triggered budget alerts."""
        stmt = (
            select(BudgetAlert)
            .where(BudgetAlert.tenant_id == tenant_id)
            .order_by(BudgetAlert.triggered_at.desc())
            .limit(limit)
        )
        if budget_id:
            stmt = stmt.where(BudgetAlert.budget_id == budget_id)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_alert(
        self,
        tenant_id: uuid.UUID,
        budget_id: uuid.UUID,
        allocation_id: uuid.UUID | None,
        threshold_percent: Decimal,
    ) -> BudgetAlert | None:
        """Check if an alert for this threshold already exists (idempotency)."""
        stmt = select(BudgetAlert).where(
            BudgetAlert.tenant_id == tenant_id,
            BudgetAlert.budget_id == budget_id,
            BudgetAlert.threshold_percent == threshold_percent,
        )
        if allocation_id:
            stmt = stmt.where(BudgetAlert.allocation_id == allocation_id)
        result = await self.session.execute(stmt)
        return result.scalars().first()
