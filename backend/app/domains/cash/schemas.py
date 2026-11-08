"""WealthOS Cash Management & Liquidity Schemas."""

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class FinancialAccountCreate(BaseModel):
    """Payload for linking a new financial bank or cash account."""

    account_name: str = Field(..., min_length=2, max_length=255)
    account_number_mask: str = Field(..., max_length=20)
    account_type: str = Field(..., pattern="^(SAVINGS|CURRENT|CREDIT_CARD|CASH|DEMAT|LOAN)$")
    currency: str = Field(default="INR", max_length=3)
    current_balance: Decimal = Field(default=Decimal("0.0000"), max_digits=18, decimal_places=4)
    available_balance: Decimal | None = Field(None, max_digits=18, decimal_places=4)
    institution_id: uuid.UUID | None = None
    gl_account_id: uuid.UUID | None = None


class FinancialAccountResponse(BaseModel):
    """Serialized financial account model."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    account_name: str
    account_number_mask: str
    account_type: str
    currency: str
    current_balance: Decimal
    available_balance: Decimal | None
    gl_account_id: uuid.UUID | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AccountTransferCreate(BaseModel):
    """Payload for executing an owned account-to-account transfer."""

    source_account_id: uuid.UUID
    destination_account_id: uuid.UUID
    amount: Decimal = Field(..., gt=0, max_digits=18, decimal_places=4)
    currency: str = Field(default="INR", max_length=3)
    exchange_rate: Decimal = Field(default=Decimal("1.00000000"), gt=0)
    fee_amount: Decimal = Field(default=Decimal("0.0000"), ge=0, max_digits=18, decimal_places=4)
    transfer_date: datetime = Field(default_factory=lambda: datetime.now(UTC))


class AccountTransferResponse(BaseModel):
    """Serialized account transfer record."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    source_account_id: uuid.UUID
    destination_account_id: uuid.UUID
    amount: Decimal
    currency: str
    exchange_rate: Decimal
    fee_amount: Decimal
    status: str
    transfer_date: datetime
    created_at: datetime


class RecurringRuleCreate(BaseModel):
    """Payload for registering a recurring transaction rule."""

    account_id: uuid.UUID
    name: str = Field(..., min_length=2, max_length=255)
    expected_amount: Decimal = Field(..., gt=0, max_digits=18, decimal_places=4)
    currency: str = Field(default="INR", max_length=3)
    direction: str = Field(..., pattern="^(INFLOW|OUTFLOW)$")
    recurrence_interval: str = Field(
        default="MONTHLY",
        pattern="^(DAILY|WEEKLY|BIWEEKLY|MONTHLY|QUARTERLY|ANNUAL)$",
    )
    next_due_date: date


class RecurringRuleResponse(BaseModel):
    """Serialized recurring transaction rule."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    account_id: uuid.UUID
    name: str
    expected_amount: Decimal
    currency: str
    direction: str
    recurrence_interval: str
    next_due_date: date
    is_active: bool
    created_at: datetime


class CashPositionSummary(BaseModel):
    """Consolidated multi-account cash and liquidity overview."""

    total_liquid_cash: Decimal
    currency: str
    accounts: list[FinancialAccountResponse]
    currency_breakdown: dict[str, Decimal]
    last_synced_at: datetime


class ForecastItem(BaseModel):
    """Individual projected period in a cash forecast."""

    date_label: str
    inflow: Decimal
    outflow: Decimal
    net_cash_flow: Decimal
    closing_cash: Decimal
    classification: str = Field(
        ..., pattern="^(ACTUAL|CONFIRMED|SCHEDULED|EXPECTED|ESTIMATED)$"
    )


class CashFlowForecastResponse(BaseModel):
    """Deterministic multi-horizon cash flow projection."""

    horizon_days: int
    baseline_date: date
    opening_cash: Decimal
    total_inflow: Decimal
    total_outflow: Decimal
    net_change: Decimal
    closing_cash: Decimal
    minimum_projected_cash: Decimal
    assumptions: dict[str, Any]
    items: list[ForecastItem]


class LiquidityAnalyticsResponse(BaseModel):
    """Advanced liquidity and risk metrics."""

    total_liquid_reserves: Decimal
    monthly_essential_burn: Decimal
    emergency_fund_coverage_months: Decimal
    upcoming_obligations_30d: Decimal
    short_term_surplus: Decimal
    minimum_safety_threshold: Decimal
    is_liquidity_sufficient: bool


class ScenarioSimulationRequest(BaseModel):
    """Parameters for what-if cash scenario simulation."""

    scenario_name: str = Field(..., min_length=2, max_length=255)
    horizon_months: int = Field(default=12, ge=1, le=60)
    income_change_percent: Decimal = Field(default=Decimal("0.0"))
    monthly_expense_increase: Decimal = Field(default=Decimal("0.0"), ge=0)
    one_time_expense: Decimal = Field(default=Decimal("0.0"), ge=0)
    new_emi_amount: Decimal = Field(default=Decimal("0.0"), ge=0)
    emi_tenure_months: int = Field(default=0, ge=0)


class ScenarioSimulationResponse(BaseModel):
    """Outcomes comparing baseline vs simulated cash trajectory."""

    scenario_name: str
    baseline_closing_cash: Decimal
    simulated_closing_cash: Decimal
    cash_variance: Decimal
    minimum_simulated_cash: Decimal
    emergency_coverage_impact_months: Decimal
    baseline_trajectory: list[ForecastItem]
    simulated_trajectory: list[ForecastItem]
