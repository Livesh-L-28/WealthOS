"""WealthOS Financial Planning & Forecasting Pydantic Schemas."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class GoalBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(default="SAVINGS", max_length=50)
    target_amount: Decimal = Field(..., gt=0)
    current_amount: Decimal = Field(default=Decimal("0.0000"), ge=0)
    currency: str = Field(default="INR", max_length=3)
    target_date: date
    monthly_contribution: Decimal = Field(default=Decimal("0.0000"), ge=0)
    inflation_rate: Decimal = Field(default=Decimal("0.0600"), ge=0, le=1)
    expected_return_rate: Decimal = Field(default=Decimal("0.1000"), ge=0, le=1)
    priority: str = Field(default="MEDIUM", max_length=20)
    linked_account_id: uuid.UUID | None = None


class GoalCreate(GoalBase):
    pass


class GoalUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    category: str | None = Field(None, max_length=50)
    target_amount: Decimal | None = Field(None, gt=0)
    current_amount: Decimal | None = Field(None, ge=0)
    currency: str | None = Field(None, max_length=3)
    target_date: date | None = None
    status: str | None = Field(None, max_length=20)
    monthly_contribution: Decimal | None = Field(None, ge=0)
    inflation_rate: Decimal | None = Field(None, ge=0, le=1)
    expected_return_rate: Decimal | None = Field(None, ge=0, le=1)
    priority: str | None = Field(None, max_length=20)
    linked_account_id: uuid.UUID | None = None


class GoalFeasibilityResponse(BaseModel):
    goal_id: uuid.UUID
    name: str
    target_amount_nominal: Decimal
    inflation_adjusted_target: Decimal
    years_to_target: Decimal
    projected_wealth_at_target: Decimal
    funding_gap: Decimal
    required_monthly_contribution: Decimal
    current_monthly_contribution: Decimal
    feasibility_status: str  # ON_TRACK, NEEDS_ADJUSTMENT, AT_RISK
    status_reason: str


class GoalResponse(GoalBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    status: str
    progress_percentage: Decimal
    feasibility: GoalFeasibilityResponse | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GoalContributionCreate(BaseModel):
    amount: Decimal = Field(..., gt=0)
    contribution_date: date | None = None
    transaction_id: uuid.UUID | None = None
    currency: str = Field(default="INR", max_length=3)


class GoalContributionResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    goal_id: uuid.UUID
    transaction_id: uuid.UUID | None
    contribution_date: date
    amount: Decimal
    currency: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RetirementProfileCreate(BaseModel):
    current_age: int = Field(..., ge=18, le=100)
    retirement_age: int = Field(..., ge=19, le=100)
    life_expectancy: int = Field(default=85, ge=50, le=120)
    monthly_expenses_current: Decimal = Field(..., gt=0)
    inflation_rate: Decimal = Field(default=Decimal("0.0600"), ge=0, le=1)
    pre_retirement_return: Decimal = Field(default=Decimal("0.1000"), ge=0, le=1)
    post_retirement_return: Decimal = Field(default=Decimal("0.0700"), ge=0, le=1)
    existing_corpus: Decimal = Field(default=Decimal("0.0000"), ge=0)
    monthly_contribution: Decimal = Field(default=Decimal("0.0000"), ge=0)


class RetirementProfileUpdate(BaseModel):
    current_age: int | None = Field(None, ge=18, le=100)
    retirement_age: int | None = Field(None, ge=19, le=100)
    life_expectancy: int | None = Field(None, ge=50, le=120)
    monthly_expenses_current: Decimal | None = Field(None, gt=0)
    inflation_rate: Decimal | None = Field(None, ge=0, le=1)
    pre_retirement_return: Decimal | None = Field(None, ge=0, le=1)
    post_retirement_return: Decimal | None = Field(None, ge=0, le=1)
    existing_corpus: Decimal | None = Field(None, ge=0)
    monthly_contribution: Decimal | None = Field(None, ge=0)


class RetirementProjectionResponse(BaseModel):
    current_age: int
    retirement_age: int
    life_expectancy: int
    years_to_retirement: int
    years_in_retirement: int
    monthly_expense_at_retirement: Decimal
    annual_expense_at_retirement: Decimal
    real_return_post_retirement: Decimal
    target_corpus_required: Decimal
    projected_corpus_at_retirement: Decimal
    corpus_from_existing_savings: Decimal
    corpus_from_future_contributions: Decimal
    funding_gap: Decimal
    required_monthly_contribution: Decimal
    current_monthly_contribution: Decimal
    feasibility_status: str  # ON_TRACK, NEEDS_ADJUSTMENT, AT_RISK
    readiness_percentage: Decimal


class EmergencyFundAnalysisResponse(BaseModel):
    liquid_cash_assets: Decimal
    essential_monthly_expenses: Decimal
    current_coverage_months: Decimal
    target_coverage_months: Decimal
    target_emergency_fund_amount: Decimal
    funding_gap: Decimal
    status: str  # OPTIMAL, ADEQUATE, VULNERABLE, CRITICAL
    status_summary: str


class CashFlowForecastRequest(BaseModel):
    horizon_months: int = Field(default=12, ge=1, le=60)
    include_goal_contributions: bool = True
    include_loan_emis: bool = True


class CashFlowMonthlyProjection(BaseModel):
    month: str
    month_index: int
    projected_income: Decimal
    projected_operating_expenses: Decimal
    projected_debt_service: Decimal
    projected_goal_savings: Decimal
    net_cash_flow: Decimal
    projected_closing_cash: Decimal


class CashFlowForecastResponse(BaseModel):
    horizon_months: int
    baseline_liquid_cash: Decimal
    monthly_projections: list[CashFlowMonthlyProjection]
    lowest_cash_balance: Decimal
    lowest_cash_month: str
    total_projected_savings: Decimal


class ScenarioSimulationRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    monthly_income_delta_percent: Decimal = Field(default=Decimal("0.0000"), ge=-100, le=500)
    monthly_expense_delta: Decimal = Field(default=Decimal("0.0000"))
    lump_sum_debt_prepayment: Decimal = Field(default=Decimal("0.0000"), ge=0)
    investment_return_shock_percent: Decimal = Field(default=Decimal("0.0000"), ge=-50, le=50)
    additional_monthly_investment: Decimal = Field(default=Decimal("0.0000"), ge=0)
    horizon_months: int = Field(default=36, ge=6, le=120)


class ScenarioSimulationResponse(BaseModel):
    scenario_id: uuid.UUID | None = None
    name: str
    baseline_summary: dict[str, Any]
    simulated_summary: dict[str, Any]
    net_worth_delta_at_horizon: Decimal
    monthly_cash_flow_delta: Decimal
    debt_freedom_acceleration_months: int
    retirement_readiness_delta_percent: Decimal
    key_takeaways: list[str]
