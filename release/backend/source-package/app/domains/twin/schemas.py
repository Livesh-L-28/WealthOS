"""WealthOS Personal Financial Digital Twin Schemas."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class TwinMetricsBreakdown(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_assets: Decimal = Decimal("0.0000")
    total_liabilities: Decimal = Decimal("0.0000")
    liquid_cash: Decimal = Decimal("0.0000")
    investment_portfolio_value: Decimal = Decimal("0.0000")
    active_goals_count: int = 0
    active_liabilities_count: int = 0
    savings_rate_pct: Decimal = Decimal("0.00")
    emergency_fund_months: Decimal = Decimal("0.00")


class TwinSnapshotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    user_id: uuid.UUID
    snapshot_date: date
    net_worth: Decimal
    liquid_net_worth: Decimal
    monthly_income: Decimal
    monthly_expenses: Decimal
    monthly_savings: Decimal
    debt_obligations: Decimal
    risk_health_score: Decimal
    data_freshness_status: str
    metrics: dict[str, Any]
    source_references: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class TwinRefreshRequest(BaseModel):
    force_recompute: bool = Field(default=False, description="Force recompute even if existing snapshot is recent")
