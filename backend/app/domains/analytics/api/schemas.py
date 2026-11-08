"""WealthOS Standard Analytics API Schemas & Serialization Contracts."""

from datetime import date, datetime
from decimal import Decimal
from typing import Any
from pydantic import BaseModel, ConfigDict, Field

from app.domains.analytics.domain.metric_enums import (
    DataStatus,
    FreshnessStatus,
    MetricDomain,
    TimeGrain,
)


class MetricMetadataSchema(BaseModel):
    """Metadata describing the financial metric."""

    key: str
    name: str
    domain: MetricDomain
    unit: str
    currency: str = "INR"


class PeriodMetadataSchema(BaseModel):
    """Time-series reporting interval metadata."""

    start: date
    end: date
    granularity: TimeGrain


class DataPointSchema(BaseModel):
    """Single point in a financial time series preserving exact Decimal precision."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    date: str = Field(..., description="ISO date or label (YYYY-MM-DD or formatted milestone)")
    value: Decimal | None = Field(None, description="Exact numeric valuation; null represents missing")
    available: bool = Field(True, description="Whether data point is recorded or missing")
    status: DataStatus = Field(DataStatus.ACTUAL, description="Certainty: actual, projected, estimated, scenario")


class SeriesSchema(BaseModel):
    """Named series containing chronological data points."""

    name: str
    status: DataStatus = DataStatus.ACTUAL
    color: str | None = None
    points: list[DataPointSchema] = Field(default_factory=list)


class MetricSummarySchema(BaseModel):
    """Aggregated period summary and comparison deltas."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    current_value: Decimal
    previous_value: Decimal | None = None
    absolute_change: Decimal | None = None
    percentage_change: Decimal | None = None
    savings_rate: Decimal | None = None
    utilization_rate: Decimal | None = None


class ProvenanceSchema(BaseModel):
    """Audit provenance and recency tracking."""

    calculated_at: datetime
    source_version: str = "wos-accounting-v1"
    freshness: FreshnessStatus = FreshnessStatus.CURRENT
    valuation_timestamp: str | None = None


class AnalyticsResponseEnvelope(BaseModel):
    """Standardized response contract for all WealthOS analytical chart endpoints."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    metric: MetricMetadataSchema
    period: PeriodMetadataSchema
    series: list[SeriesSchema]
    summary: MetricSummarySchema
    provenance: ProvenanceSchema
    warnings: list[str] = Field(default_factory=list)


class AnalyticsFilterParams(BaseModel):
    """Validated query parameters for analytical endpoints."""

    start_date: date | None = None
    end_date: date | None = None
    period: str | None = "1M"  # 1M, 3M, 6M, 1Y, ALL
    granularity: TimeGrain = TimeGrain.MONTH
    currency: str = "INR"
    comparison_period: str | None = None
    household_id: str | None = None
    include_projected: bool = True
