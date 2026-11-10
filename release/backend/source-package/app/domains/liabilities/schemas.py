"""WealthOS Liability & Debt Management Pydantic Schemas."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class LiabilityBase(BaseModel):
    """Base fields for personal debt and liabilities."""

    name: str = Field(..., max_length=255)
    liability_type: str = Field(
        ...,
        description="MORTGAGE, HOME_LOAN, VEHICLE_LOAN, PERSONAL_LOAN, EDUCATION_LOAN, CREDIT_LINE, CREDIT_CARD, OTHER",
    )
    lender_name: str = Field(..., max_length=255)
    initial_principal: Decimal = Field(..., ge=0)
    current_principal: Decimal | None = None
    interest_rate: Decimal = Field(..., ge=0, description="Annual nominal interest rate in percent, e.g. 8.5 for 8.5%")
    tenure_months: int = Field(..., gt=0)
    start_date: date
    maturity_date: date | None = None
    emi_amount: Decimal | None = None
    currency: str = Field(default="INR", max_length=3)
    gl_account_id: uuid.UUID | None = None
    is_active: bool = True


class LiabilityCreate(LiabilityBase):
    """Payload to create a new liability."""

    pass


class LiabilityUpdate(BaseModel):
    """Payload to update an existing liability."""

    name: str | None = None
    lender_name: str | None = None
    current_principal: Decimal | None = None
    interest_rate: Decimal | None = None
    tenure_months: int | None = None
    emi_amount: Decimal | None = None
    is_active: bool | None = None
    gl_account_id: uuid.UUID | None = None


class LiabilityResponse(BaseModel):
    """Response schema for liability entity."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    liability_type: str
    lender_name: str
    initial_principal: Decimal
    current_principal: Decimal
    interest_rate: Decimal
    tenure_months: int
    emi_amount: Decimal
    start_date: date
    maturity_date: date
    currency: str
    gl_account_id: uuid.UUID | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class LoanPaymentScheduleResponse(BaseModel):
    """Amortization payment schedule installment response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    liability_id: uuid.UUID
    installment_number: int
    due_date: date
    expected_payment: Decimal
    principal_component: Decimal
    interest_component: Decimal
    fee_component: Decimal
    remaining_principal: Decimal
    payment_status: str
    paid_date: date | None = None
    actual_paid_amount: Decimal | None = None
    transaction_id: uuid.UUID | None = None
    created_at: datetime


class RecordPaymentRequest(BaseModel):
    """Request payload to record an installment payment."""

    paid_date: date
    actual_paid_amount: Decimal = Field(..., gt=0)
    transaction_id: uuid.UUID | None = None
    post_to_gl: bool = False
    cash_account_id: uuid.UUID | None = None


class CreditCardStatementCreate(BaseModel):
    """Payload to register a credit card statement."""

    liability_id: uuid.UUID
    statement_date: date
    due_date: date
    statement_balance: Decimal = Field(..., ge=0)
    minimum_due: Decimal = Field(..., ge=0)
    credit_limit: Decimal = Field(..., gt=0)
    available_credit: Decimal | None = None
    finance_charges: Decimal = Field(default=Decimal("0.0000"), ge=0)
    status: str = "UNPAID"


class CreditCardStatementResponse(BaseModel):
    """Credit card billing statement response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    liability_id: uuid.UUID
    statement_date: date
    due_date: date
    statement_balance: Decimal
    minimum_due: Decimal
    credit_limit: Decimal
    available_credit: Decimal
    finance_charges: Decimal
    status: str
    utilization_percentage: Decimal
    created_at: datetime


class PrepaymentSimulationRequest(BaseModel):
    """Parameters to simulate early debt prepayment."""

    extra_monthly_payment: Decimal = Field(default=Decimal("0.0000"), ge=0)
    lump_sum_amount: Decimal = Field(default=Decimal("0.0000"), ge=0)
    lump_sum_month: int = Field(default=1, ge=1)


class PrepaymentSimulationResponse(BaseModel):
    """Simulation results of debt prepayment."""

    original_tenure_months: int
    original_total_interest: Decimal
    original_total_payment: Decimal
    new_tenure_months: int
    months_saved: int
    new_total_interest: Decimal
    interest_saved: Decimal
    new_payoff_date: date


class DebtStrategyComparisonRequest(BaseModel):
    """Request to compare Avalanche vs Snowball debt payoff strategies."""

    extra_monthly_budget: Decimal = Field(default=Decimal("0.0000"), ge=0)


class DebtStrategyPlanItem(BaseModel):
    """Payoff projection for an individual debt in a strategy plan."""

    liability_id: uuid.UUID
    liability_name: str
    current_balance: Decimal
    interest_rate: Decimal
    payoff_month: int
    payoff_date: date
    total_interest_paid: Decimal


class DebtStrategyPlan(BaseModel):
    """Aggregate projection for a repayment strategy."""

    strategy: str  # AVALANCHE, SNOWBALL, MINIMUM_ONLY
    total_interest_paid: Decimal
    total_principal_paid: Decimal
    total_cost: Decimal
    months_to_debt_free: int
    debt_free_date: date
    debts: list[DebtStrategyPlanItem]


class DebtStrategyComparisonResponse(BaseModel):
    """Comparison report across Avalanche, Snowball, and Minimum payments."""

    extra_monthly_budget: Decimal
    minimum_only: DebtStrategyPlan
    avalanche: DebtStrategyPlan
    snowball: DebtStrategyPlan
    avalanche_interest_savings: Decimal
    snowball_interest_savings: Decimal
    recommended_strategy: str


class LiabilitySummaryResponse(BaseModel):
    """High-level summary of active debt portfolio."""

    total_liabilities: int
    total_outstanding_principal: Decimal
    total_monthly_emi: Decimal
    weighted_average_interest_rate: Decimal
    upcoming_installments: list[LoanPaymentScheduleResponse]
