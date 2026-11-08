"""WealthOS Professional Investment Accounting Schemas."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class FinancialInstrumentCreate(BaseModel):
    """Payload to register an instrument in the securities master."""

    symbol: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=2, max_length=255)
    isin: str | None = Field(None, max_length=20)
    instrument_type: str = Field(
        default="EQUITY",
        pattern="^(EQUITY|MUTUAL_FUND|ETF|BOND|GOLD_ETF|COMMODITY|CRYPTO)$",
    )
    exchange: str = Field(default="NSE", max_length=20)
    currency: str = Field(default="INR", max_length=3)
    current_price: Decimal = Field(default=Decimal("0.0000"), ge=0, max_digits=18, decimal_places=4)


class FinancialInstrumentResponse(BaseModel):
    """Serialized financial instrument model."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    symbol: str
    name: str
    isin: str | None
    instrument_type: str
    exchange: str
    currency: str
    current_price: Decimal
    price_updated_at: datetime


class InvestmentBuyRequest(BaseModel):
    """Payload for recording an acquisition / purchase trade."""

    account_id: uuid.UUID
    instrument_id: uuid.UUID
    trade_date: date = Field(default_factory=date.today)
    quantity: Decimal = Field(..., gt=0, max_digits=18, decimal_places=4)
    unit_price: Decimal = Field(..., gt=0, max_digits=18, decimal_places=4)
    fee_amount: Decimal = Field(default=Decimal("0.0000"), ge=0, max_digits=18, decimal_places=4)
    tax_amount: Decimal = Field(default=Decimal("0.0000"), ge=0, max_digits=18, decimal_places=4)
    currency: str = Field(default="INR", max_length=3)
    notes: str | None = None


class InvestmentSellRequest(BaseModel):
    """Payload for executing a disposal / sale trade with FIFO lot allocation."""

    account_id: uuid.UUID
    instrument_id: uuid.UUID
    trade_date: date = Field(default_factory=date.today)
    quantity: Decimal = Field(..., gt=0, max_digits=18, decimal_places=4)
    unit_price: Decimal = Field(..., gt=0, max_digits=18, decimal_places=4)
    fee_amount: Decimal = Field(default=Decimal("0.0000"), ge=0, max_digits=18, decimal_places=4)
    tax_amount: Decimal = Field(default=Decimal("0.0000"), ge=0, max_digits=18, decimal_places=4)
    currency: str = Field(default="INR", max_length=3)
    notes: str | None = None


class InvestmentTransactionResponse(BaseModel):
    """Serialized investment trade event with FIFO P&L breakdown."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    account_id: uuid.UUID
    instrument_id: uuid.UUID
    transaction_type: str
    trade_date: date
    quantity: Decimal
    unit_price: Decimal
    gross_amount: Decimal
    fee_amount: Decimal
    tax_amount: Decimal
    net_amount: Decimal
    currency: str
    realized_pnl: Decimal | None
    allocated_cost_basis: Decimal | None
    notes: str | None
    created_at: datetime


class HoldingLotResponse(BaseModel):
    """Discrete acquisition lot tracking remaining cost basis."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    account_id: uuid.UUID
    instrument_id: uuid.UUID
    purchase_date: date
    quantity: Decimal
    purchase_price: Decimal
    cost_basis: Decimal
    remaining_quantity: Decimal
    currency: str
    lot_status: str


class CorporateActionSplitRequest(BaseModel):
    """Payload for stock split corporate action (e.g. 2:1 split)."""

    instrument_id: uuid.UUID
    ratio_numerator: Decimal = Field(..., gt=0)  # e.g. 2
    ratio_denominator: Decimal = Field(default=Decimal("1.0"), gt=0)
    record_date: date = Field(default_factory=date.today)
    description: str | None = None


class CorporateActionResponse(BaseModel):
    """Serialized corporate action event."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    instrument_id: uuid.UUID
    action_type: str
    record_date: date
    ratio_numerator: Decimal
    ratio_denominator: Decimal
    description: str | None
    created_at: datetime


class DividendRecordRequest(BaseModel):
    """Payload for recording received or declared dividend income."""

    account_id: uuid.UUID
    instrument_id: uuid.UUID
    payment_date: date = Field(default_factory=date.today)
    gross_amount: Decimal = Field(..., gt=0, max_digits=18, decimal_places=4)
    tax_withheld: Decimal = Field(default=Decimal("0.0000"), ge=0, max_digits=18, decimal_places=4)
    currency: str = Field(default="INR", max_length=3)
    declaration_date: date | None = None


class PassiveIncomeResponse(BaseModel):
    """Serialized dividend or interest income record."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    account_id: uuid.UUID
    instrument_id: uuid.UUID | None
    income_type: str
    gross_amount: Decimal
    tax_withheld: Decimal
    net_amount: Decimal
    currency: str
    status: str
    payment_date: date
    created_at: datetime


class HoldingSummary(BaseModel):
    """Consolidated position per financial instrument."""

    instrument_id: uuid.UUID
    symbol: str
    name: str
    instrument_type: str
    total_quantity: Decimal
    average_cost_price: Decimal
    current_price: Decimal
    current_market_value: Decimal
    total_cost_basis: Decimal
    unrealized_pnl: Decimal
    unrealized_pnl_percent: Decimal


class PortfolioSummaryResponse(BaseModel):
    """Executive investment portfolio summary."""

    total_portfolio_value: Decimal
    total_invested_capital: Decimal
    total_unrealized_pnl: Decimal
    total_realized_pnl: Decimal
    total_dividend_income: Decimal
    overall_xirr_percent: Decimal
    holdings: list[HoldingSummary]
    asset_allocation: dict[str, Decimal]
    last_valuation_at: datetime
