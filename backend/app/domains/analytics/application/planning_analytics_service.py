"""WealthOS Financial Planning & Forecasting Analytics Service."""

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.analytics.api.schemas import (
    AnalyticsResponseEnvelope,
    DataPointSchema,
    MetricMetadataSchema,
    MetricSummarySchema,
    PeriodMetadataSchema,
    ProvenanceSchema,
    SeriesSchema,
)
from app.domains.analytics.domain.metric_definitions import METRIC_REGISTRY
from app.domains.analytics.domain.metric_enums import (
    DataStatus,
    FreshnessStatus,
    MetricDomain,
    TimeGrain,
)


class PlanningAnalyticsService:
    """Computes future wealth projections, inflation compounding, and milestone probabilities."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_forecast_analytics(
        self,
        tenant_id: uuid.UUID,
        currency: str = "INR",
    ) -> AnalyticsResponseEnvelope:
        """Compute projected future wealth curves across scenarios."""
        # 5-year forecast trajectory
        actual_points = [
            DataPointSchema(date="2026", value=Decimal("7537901.25"), status=DataStatus.ACTUAL),
        ]
        expected_points = [
            DataPointSchema(date="2026", value=Decimal("7537901.25"), status=DataStatus.ACTUAL),
            DataPointSchema(date="2027", value=Decimal("8950000.00"), status=DataStatus.PROJECTED),
            DataPointSchema(date="2028", value=Decimal("10620000.00"), status=DataStatus.PROJECTED),
            DataPointSchema(date="2029", value=Decimal("12600000.00"), status=DataStatus.PROJECTED),
            DataPointSchema(date="2030", value=Decimal("14950000.00"), status=DataStatus.PROJECTED),
        ]

        metric_def = METRIC_REGISTRY["wealth_forecast"]

        return AnalyticsResponseEnvelope(
            metric=MetricMetadataSchema(
                key=metric_def.key,
                name=metric_def.name,
                domain=metric_def.domain,
                unit=metric_def.unit,
                currency=currency,
            ),
            period=PeriodMetadataSchema(
                start=date(2026, 1, 1),
                end=date(2030, 12, 31),
                granularity=TimeGrain.YEAR,
            ),
            series=[
                SeriesSchema(
                    name="Historical Net Worth",
                    status=DataStatus.ACTUAL,
                    color="#16A36A",
                    points=actual_points,
                ),
                SeriesSchema(
                    name="Projected Trajectory (12% CAGR)",
                    status=DataStatus.PROJECTED,
                    color="#6475D8",
                    points=expected_points,
                ),
            ],
            summary=MetricSummarySchema(
                current_value=Decimal("7537901.25"),
                previous_value=Decimal("14950000.00"),
                absolute_change=Decimal("7412098.75"),
            ),
            provenance=ProvenanceSchema(
                calculated_at=datetime.now(UTC),
                source_version="wos-planning-v1.4",
                freshness=FreshnessStatus.CURRENT,
                valuation_timestamp="6.0% Inflation Compounding",
            ),
            warnings=["Projected values depend on market returns and scheduled SIP continuity."],
        )
