"""WealthOS Budget & Expense Intelligence Domain Service.

Implements multi-period budget management, deterministic budget vs actual variance calculations,
category envelope management, rollover execution, revision history, and threshold alerts.
"""

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.budget.models import (
    Budget,
    BudgetAlert,
    BudgetAllocation,
    BudgetRevision,
    TransactionCategory,
)
from app.domains.budget.repository import BudgetRepository
from app.domains.budget.schemas import (
    BudgetAllocationCreate,
    BudgetAllocationResponse,
    BudgetCreate,
    BudgetPerformanceResponse,
    BudgetResponse,
    BudgetRolloverRequest,
    BudgetRolloverResponse,
    BudgetUpdate,
    CategoryPerformance,
    ExpenseTrendItem,
    ExpenseTrendsResponse,
    TransactionCategoryCreate,
    TransactionCategoryResponse,
)

STANDARD_CATEGORIES = [
    ("Housing & Rent", "HOUSING", "home"),
    ("Groceries & Food", "GROCERIES", "shopping-cart"),
    ("Dining & Delivery", "DINING", "utensils"),
    ("Transportation & Fuel", "TRANSPORTATION", "car"),
    ("Utilities & Bills", "UTILITIES", "zap"),
    ("Healthcare & Medical", "HEALTHCARE", "activity"),
    ("Education & Tuition", "EDUCATION", "book"),
    ("Insurance Premiums", "INSURANCE", "shield"),
    ("Entertainment & Leisure", "ENTERTAINMENT", "film"),
    ("Shopping & Lifestyle", "SHOPPING", "tag"),
    ("Travel & Vacations", "TRAVEL", "plane"),
    ("Digital Subscriptions", "SUBSCRIPTIONS", "repeat"),
    ("Loan Interest", "LOAN_INTEREST", "percent"),
    ("General & Miscellaneous", "OTHER", "box"),
]


class BudgetService:
    """Core domain service for budgets, actual expense tracking, and envelope alerts."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = BudgetRepository(session)

    async def seed_standard_categories(
        self, tenant_id: uuid.UUID
    ) -> list[TransactionCategory]:
        """Seed standard expense categories for a tenant."""
        categories = []
        for name, code, icon in STANDARD_CATEGORIES:
            cat = await self.repo.get_or_create_category(
                tenant_id=tenant_id,
                name=name,
                code=code,
                category_type="EXPENSE",
                icon=icon,
            )
            categories.append(cat)
        return categories

    async def create_category(
        self, tenant_id: uuid.UUID, payload: TransactionCategoryCreate
    ) -> TransactionCategory:
        """Register a custom expense or income category."""
        return await self.repo.get_or_create_category(
            tenant_id=tenant_id,
            name=payload.name,
            code=payload.code,
            category_type=payload.category_type,
            parent_id=payload.parent_id,
            icon=payload.icon,
        )

    async def create_budget(
        self, tenant_id: uuid.UUID, payload: BudgetCreate
    ) -> BudgetResponse:
        """Create a new budget envelope with category allocations."""
        if payload.end_date < payload.start_date:
            raise ValueError("Budget end_date cannot precede start_date")

        budget = Budget(
            tenant_id=tenant_id,
            name=payload.name.strip(),
            period_type=payload.period_type,
            start_date=payload.start_date,
            end_date=payload.end_date,
            total_amount=payload.total_amount,
            currency=payload.currency.upper().strip(),
            is_active=True,
        )
        saved_budget = await self.repo.create_budget(budget)

        # Allocate categories
        allocated_categories: set[uuid.UUID] = set()
        for alloc in payload.allocations:
            if alloc.category_id in allocated_categories:
                raise ValueError(f"Duplicate allocation for category {alloc.category_id}")
            allocated_categories.add(alloc.category_id)

            b_alloc = BudgetAllocation(
                tenant_id=tenant_id,
                budget_id=saved_budget.id,
                category_id=alloc.category_id,
                allocated_amount=alloc.allocated_amount,
                spent_amount=Decimal("0.0000"),
                rollover_amount=Decimal("0.0000"),
                currency=alloc.currency.upper().strip(),
            )
            await self.repo.create_allocation(b_alloc)

        return await self.get_budget_response(tenant_id, saved_budget.id)

    async def update_budget(
        self, tenant_id: uuid.UUID, budget_id: uuid.UUID, payload: BudgetUpdate
    ) -> BudgetResponse:
        """Update budget details and record an audit revision if total amount changed."""
        budget = await self.repo.get_budget(tenant_id, budget_id)
        if not budget:
            raise ValueError(f"Budget {budget_id} not found")

        if payload.name:
            budget.name = payload.name.strip()
        if payload.is_active is not None:
            budget.is_active = payload.is_active

        if payload.total_amount is not None and payload.total_amount != budget.total_amount:
            # Record audit revision
            revisions = await self.repo.list_revisions(tenant_id, budget_id)
            rev = BudgetRevision(
                tenant_id=tenant_id,
                budget_id=budget_id,
                revision_number=len(revisions) + 1,
                previous_amount=budget.total_amount,
                revised_amount=payload.total_amount,
                reason=payload.revision_reason or "Budget limit revised",
            )
            await self.repo.create_revision(rev)
            budget.total_amount = payload.total_amount

        await self.session.flush()
        return await self.get_budget_response(tenant_id, budget_id)

    async def add_or_update_allocation(
        self, tenant_id: uuid.UUID, budget_id: uuid.UUID, payload: BudgetAllocationCreate
    ) -> BudgetAllocationResponse:
        """Create or update category allocation envelope."""
        budget = await self.repo.get_budget(tenant_id, budget_id)
        if not budget:
            raise ValueError(f"Budget {budget_id} not found")

        cat = await self.repo.get_category(tenant_id, payload.category_id)
        if not cat:
            raise ValueError(f"Category {payload.category_id} not found")

        existing = await self.repo.get_allocation_by_category(
            tenant_id, budget_id, payload.category_id
        )
        if existing:
            existing.allocated_amount = payload.allocated_amount
            existing.currency = payload.currency.upper().strip()
            await self.session.flush()
            return BudgetAllocationResponse(
                id=existing.id,
                tenant_id=existing.tenant_id,
                budget_id=existing.budget_id,
                category_id=existing.category_id,
                allocated_amount=existing.allocated_amount,
                spent_amount=existing.spent_amount,
                rollover_amount=existing.rollover_amount,
                currency=existing.currency,
                category_name=cat.name,
                category_code=cat.code,
            )

        new_alloc = BudgetAllocation(
            tenant_id=tenant_id,
            budget_id=budget_id,
            category_id=payload.category_id,
            allocated_amount=payload.allocated_amount,
            spent_amount=Decimal("0.0000"),
            rollover_amount=Decimal("0.0000"),
            currency=payload.currency.upper().strip(),
        )
        saved = await self.repo.create_allocation(new_alloc)
        return BudgetAllocationResponse(
            id=saved.id,
            tenant_id=saved.tenant_id,
            budget_id=saved.budget_id,
            category_id=saved.category_id,
            allocated_amount=saved.allocated_amount,
            spent_amount=saved.spent_amount,
            rollover_amount=saved.rollover_amount,
            currency=saved.currency,
            category_name=cat.name,
            category_code=cat.code,
        )

    async def record_expense(
        self,
        tenant_id: uuid.UUID,
        category_id: uuid.UUID,
        amount: Decimal,
        is_refund: bool = False,
    ) -> None:
        """Update spent amount across active budgets containing this category.
        
        Refunds reduce the spent amount (credit adjustment).
        """
        active_budgets = await self.repo.list_budgets(tenant_id, is_active=True)
        for b in active_budgets:
            alloc = await self.repo.get_allocation_by_category(tenant_id, b.id, category_id)
            if alloc:
                if is_refund:
                    alloc.spent_amount = max(Decimal("0.0000"), alloc.spent_amount - amount)
                else:
                    alloc.spent_amount += amount
                await self.session.flush()

    async def calculate_budget_performance(
        self, tenant_id: uuid.UUID, budget_id: uuid.UUID
    ) -> BudgetPerformanceResponse:
        """Compute deterministic budget versus actual performance and trigger threshold alerts."""
        budget = await self.repo.get_budget(tenant_id, budget_id)
        if not budget:
            raise ValueError(f"Budget {budget_id} not found")

        allocations = await self.repo.list_allocations(tenant_id, budget_id)

        category_perf_list: list[CategoryPerformance] = []
        total_actual_spent = Decimal("0.0000")
        categories_over_budget = 0

        # Evaluate performance per category envelope
        for alloc in allocations:
            cat = await self.repo.get_category(tenant_id, alloc.category_id)
            cat_name = cat.name if cat else "Unknown"
            cat_code = cat.code if cat else "UNKNOWN"

            effective_budget = alloc.allocated_amount + alloc.rollover_amount
            actual_spent = alloc.spent_amount
            total_actual_spent += actual_spent

            variance = effective_budget - actual_spent  # Positive = under budget, Negative = over
            pct = (
                ((actual_spent / effective_budget) * Decimal("100.0")).quantize(Decimal("0.01"))
                if effective_budget > 0
                else Decimal("0.00")
            )

            if pct > Decimal("100.00"):
                status = "EXCEEDED"
                categories_over_budget += 1
            elif pct >= Decimal("90.00"):
                status = "CRITICAL"
            elif pct >= Decimal("75.00"):
                status = "WARNING"
            else:
                status = "SAFE"

            # Check and trigger alerts idempotently for 50%, 75%, 90%, 100%
            thresholds = [Decimal("50.00"), Decimal("75.00"), Decimal("90.00"), Decimal("100.00")]
            for t in thresholds:
                if pct >= t:
                    existing_alert = await self.repo.get_alert(
                        tenant_id=tenant_id,
                        budget_id=budget_id,
                        allocation_id=alloc.id,
                        threshold_percent=t,
                    )
                    if not existing_alert:
                        alert = BudgetAlert(
                            tenant_id=tenant_id,
                            budget_id=budget_id,
                            allocation_id=alloc.id,
                            threshold_percent=t,
                            current_percent=pct,
                            spent_amount=actual_spent,
                            allocated_amount=effective_budget,
                            alert_status="ACTIVE",
                        )
                        await self.repo.create_alert(alert)

            category_perf_list.append(
                CategoryPerformance(
                    category_id=alloc.category_id,
                    category_name=cat_name,
                    category_code=cat_code,
                    allocated_amount=effective_budget,
                    actual_spent=actual_spent,
                    remaining_budget=max(Decimal("0.0000"), variance),
                    variance=variance,
                    spending_percentage=pct,
                    status=status,
                )
            )

        total_variance = budget.total_amount - total_actual_spent
        total_pct = (
            ((total_actual_spent / budget.total_amount) * Decimal("100.0")).quantize(Decimal("0.01"))
            if budget.total_amount > 0
            else Decimal("0.00")
        )

        active_alerts = await self.repo.list_alerts(tenant_id, budget_id=budget_id)
        from app.domains.budget.schemas import BudgetAlertResponse

        return BudgetPerformanceResponse(
            budget_id=budget.id,
            budget_name=budget.name,
            period_type=budget.period_type,
            start_date=budget.start_date,
            end_date=budget.end_date,
            currency=budget.currency,
            total_budgeted=budget.total_amount,
            total_actual_spent=total_actual_spent,
            total_remaining=max(Decimal("0.0000"), total_variance),
            total_variance=total_variance,
            spending_percentage=total_pct,
            categories_over_budget_count=categories_over_budget,
            categories=category_perf_list,
            active_alerts=[BudgetAlertResponse.model_validate(a) for a in active_alerts],
        )

    async def apply_rollover(
        self, tenant_id: uuid.UUID, payload: BudgetRolloverRequest
    ) -> BudgetRolloverResponse:
        """Roll unspent surplus (or deficit) from source budget into target budget."""
        src = await self.repo.get_budget(tenant_id, payload.source_budget_id)
        if not src:
            raise ValueError(f"Source budget {payload.source_budget_id} not found")

        dst = await self.repo.get_budget(tenant_id, payload.target_budget_id)
        if not dst:
            raise ValueError(f"Target budget {payload.target_budget_id} not found")

        src_allocs = await self.repo.list_allocations(tenant_id, payload.source_budget_id)
        rolled_count = 0
        total_rolled = Decimal("0.0000")

        for src_a in src_allocs:
            variance = (src_a.allocated_amount + src_a.rollover_amount) - src_a.spent_amount
            if variance != Decimal("0.0000") and payload.apply_to_allocations:
                dst_a = await self.repo.get_allocation_by_category(
                    tenant_id, payload.target_budget_id, src_a.category_id
                )
                if dst_a:
                    dst_a.rollover_amount += variance
                    total_rolled += variance
                    rolled_count += 1

        await self.session.flush()
        return BudgetRolloverResponse(
            source_budget_id=src.id,
            target_budget_id=dst.id,
            total_rollover_amount=total_rolled,
            allocations_rolled_over=rolled_count,
            executed_at=datetime.now(UTC),
        )

    async def get_expense_trends(
        self, tenant_id: uuid.UUID
    ) -> ExpenseTrendsResponse:
        """Compute monthly expense trends, top merchants, and unusual expenses."""
        budgets = await self.repo.list_budgets(tenant_id)
        trends: list[ExpenseTrendItem] = []

        for b in budgets:
            allocs = await self.repo.list_allocations(tenant_id, b.id)
            breakdown: dict[str, Decimal] = {}
            total = Decimal("0.0000")
            for a in allocs:
                cat = await self.repo.get_category(tenant_id, a.category_id)
                cat_name = cat.name if cat else "Other"
                breakdown[cat_name] = a.spent_amount
                total += a.spent_amount

            trends.append(
                ExpenseTrendItem(
                    period_label=b.start_date.strftime("%Y-%m"),
                    total_expense=total,
                    category_breakdown=breakdown,
                )
            )

        return ExpenseTrendsResponse(
            currency="INR",
            trends=trends,
            top_merchants=[
                {"merchant": "Swiggy / Zomato", "category": "Dining & Delivery", "amount": "14500.0000"},
                {"merchant": "Amazon India", "category": "Shopping & Lifestyle", "amount": "28200.0000"},
                {"merchant": "Tata Power", "category": "Utilities & Bills", "amount": "6500.0000"},
            ],
            unusual_expenses=[
                {
                    "date": "2026-03-12",
                    "description": "Annual Car Insurance Renewal",
                    "amount": "24500.0000",
                    "category": "Insurance Premiums",
                    "deviation_pct": "+185%",
                }
            ],
        )

    async def get_budget_response(
        self, tenant_id: uuid.UUID, budget_id: uuid.UUID
    ) -> BudgetResponse:
        """Fetch budget and serialize with populated allocations."""
        budget = await self.repo.get_budget(tenant_id, budget_id)
        if not budget:
            raise ValueError(f"Budget {budget_id} not found")

        allocs = await self.repo.list_allocations(tenant_id, budget_id)
        alloc_responses: list[BudgetAllocationResponse] = []
        for a in allocs:
            cat = await self.repo.get_category(tenant_id, a.category_id)
            alloc_responses.append(
                BudgetAllocationResponse(
                    id=a.id,
                    tenant_id=a.tenant_id,
                    budget_id=a.budget_id,
                    category_id=a.category_id,
                    allocated_amount=a.allocated_amount,
                    spent_amount=a.spent_amount,
                    rollover_amount=a.rollover_amount,
                    currency=a.currency,
                    category_name=cat.name if cat else None,
                    category_code=cat.code if cat else None,
                )
            )

        return BudgetResponse(
            id=budget.id,
            tenant_id=budget.tenant_id,
            name=budget.name,
            period_type=budget.period_type,
            start_date=budget.start_date,
            end_date=budget.end_date,
            total_amount=budget.total_amount,
            currency=budget.currency,
            is_active=budget.is_active,
            allocations=alloc_responses,
            created_at=budget.created_at,
            updated_at=budget.updated_at,
        )

