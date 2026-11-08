"""WealthOS Budget & Expense Intelligence Pydantic Schemas."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class TransactionCategoryCreate(BaseModel):
    """Payload to register a custom or system expense category."""

    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=50)
    category_type: str = Field(
        default="EXPENSE", pattern="^(INCOME|EXPENSE|TRANSFER|INVESTMENT)$"
    )
    parent_id: uuid.UUID | None = None
    icon: str | None = None


class TransactionCategoryResponse(BaseModel):
    """Serialized category entity."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    code: str
    category_type: str
    parent_id: uuid.UUID | None
    icon: str | None
    is_system: bool
    is_active: bool


class BudgetAllocationCreate(BaseModel):
    """Category allocation within a budget."""

    category_id: uuid.UUID
    allocated_amount: Decimal = Field(..., gt=0, max_digits=18, decimal_places=4)
    currency: str = Field(default="INR", max_length=3)


class BudgetAllocationResponse(BaseModel):
    """Serialized budget allocation envelope."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    budget_id: uuid.UUID
    category_id: uuid.UUID
    allocated_amount: Decimal
    spent_amount: Decimal
    rollover_amount: Decimal
    currency: str
    category_name: str | None = None
    category_code: str | None = None


class BudgetCreate(BaseModel):
    """Payload to establish a new budget plan."""

    name: str = Field(..., min_length=1, max_length=255)
    period_type: str = Field(
        default="MONTHLY", pattern="^(MONTHLY|QUARTERLY|ANNUAL|CUSTOM)$"
    )
    start_date: date
    end_date: date
    total_amount: Decimal = Field(..., gt=0, max_digits=18, decimal_places=4)
    currency: str = Field(default="INR", max_length=3)
    allocations: list[BudgetAllocationCreate] = Field(default_factory=list)


class BudgetUpdate(BaseModel):
    """Payload to revise an existing budget limit."""

    name: str | None = None
    total_amount: Decimal | None = Field(None, gt=0, max_digits=18, decimal_places=4)
    revision_reason: str | None = None
    is_active: bool | None = None


class BudgetRevisionResponse(BaseModel):
    """Historical audit record of budget adjustments."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    budget_id: uuid.UUID
    revision_number: int
    previous_amount: Decimal
    revised_amount: Decimal
    reason: str | None
    created_at: datetime


class BudgetAlertResponse(BaseModel):
    """Active threshold alert state."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    budget_id: uuid.UUID
    allocation_id: uuid.UUID | None
    threshold_percent: Decimal
    current_percent: Decimal
    spent_amount: Decimal
    allocated_amount: Decimal
    alert_status: str
    triggered_at: datetime


class BudgetResponse(BaseModel):
    """Serialized full budget model."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    period_type: str
    start_date: date
    end_date: date
    total_amount: Decimal
    currency: str
    is_active: bool
    allocations: list[BudgetAllocationResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class CategoryPerformance(BaseModel):
    """Category-level budget vs actual performance breakdown."""

    category_id: uuid.UUID
    category_name: str
    category_code: str
    allocated_amount: Decimal
    actual_spent: Decimal
    remaining_budget: Decimal
    variance: Decimal  # Positive = under budget, Negative = over budget
    spending_percentage: Decimal
    status: str  # 'SAFE', 'WARNING' (>75%), 'CRITICAL' (>90%), 'EXCEEDED' (>100%)


class BudgetPerformanceResponse(BaseModel):
    """Executive deterministic budget versus actual report."""

    budget_id: uuid.UUID
    budget_name: str
    period_type: str
    start_date: date
    end_date: date
    currency: str
    total_budgeted: Decimal
    total_actual_spent: Decimal
    total_remaining: Decimal
    total_variance: Decimal  # Positive = under budget, Negative = over budget
    spending_percentage: Decimal
    categories_over_budget_count: int
    categories: list[CategoryPerformance]
    active_alerts: list[BudgetAlertResponse]


class BudgetRolloverRequest(BaseModel):
    """Request to roll surplus or deficit over into a target budget."""

    source_budget_id: uuid.UUID
    target_budget_id: uuid.UUID
    apply_to_allocations: bool = True


class BudgetRolloverResponse(BaseModel):
    """Result of budget rollover execution."""

    source_budget_id: uuid.UUID
    target_budget_id: uuid.UUID
    total_rollover_amount: Decimal
    allocations_rolled_over: int
    executed_at: datetime


class ExpenseTrendItem(BaseModel):
    """Temporal or category-based spending summary."""

    period_label: str  # e.g. "2026-01"
    total_expense: Decimal
    category_breakdown: dict[str, Decimal]


class ExpenseTrendsResponse(BaseModel):
    """Multi-month expense analytics."""

    currency: str
    trends: list[ExpenseTrendItem]
    top_merchants: list[dict[str, Any]]
    unusual_expenses: list[dict[str, Any]]

