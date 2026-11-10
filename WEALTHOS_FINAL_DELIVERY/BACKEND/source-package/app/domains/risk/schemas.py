"""WealthOS Financial Risk Intelligence Pydantic Schemas."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class RiskSignalItem(BaseModel):
    code: str
    category: str
    severity: str  # INFORMATIONAL, LOW, MODERATE, HIGH, CRITICAL
    title: str
    description: str
    evidence: dict[str, Any]


class RiskAssessmentResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    assessment_date: date
    health_score: Decimal
    liquidity_ratio: Decimal
    debt_service_ratio: Decimal
    emergency_coverage_months: Decimal
    portfolio_concentration_score: Decimal
    data_quality_score: Decimal
    risk_signals: list[RiskSignalItem]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RiskAlertResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    alert_key: str
    risk_category: str
    severity: str
    title: str
    description: str
    evidence: dict[str, Any]
    status: str
    resolution_notes: str | None = None
    triggered_at: datetime
    resolved_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class AlertStatusUpdate(BaseModel):
    status: str = Field(..., description="'ACKNOWLEDGED', 'RESOLVED', 'SNOOZED'")
    resolution_notes: str | None = None


class HealthPillarScore(BaseModel):
    pillar_name: str
    score: Decimal
    weight_percent: Decimal
    weighted_contribution: Decimal
    status: str
    remediation_advice: str


class FinancialHealthScoreResponse(BaseModel):
    health_score: Decimal
    health_category: str  # EXCELLENT, GOOD, FAIR, NEEDS_ATTENTION, AT_RISK
    pillars: list[HealthPillarScore]
    active_alert_count: int
    critical_alert_count: int
