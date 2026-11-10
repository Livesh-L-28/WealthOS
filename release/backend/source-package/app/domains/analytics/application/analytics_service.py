"""WealthOS Central Financial Analytics Application Service."""

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.analytics.api.schemas import (
    AnalyticsFilterParams,
    AnalyticsResponseEnvelope,
)
from app.domains.analytics.application.budget_analytics_service import BudgetAnalyticsService
from app.domains.analytics.application.cashflow_service import CashFlowAnalyticsService
from app.domains.analytics.application.investment_analytics_service import InvestmentAnalyticsService
from app.domains.analytics.application.liability_analytics_service import LiabilityAnalyticsService
from app.domains.analytics.application.net_worth_service import NetWorthAnalyticsService
from app.domains.analytics.application.planning_analytics_service import PlanningAnalyticsService
from app.domains.analytics.application.risk_analytics_service import RiskAnalyticsService
from app.domains.analytics.domain.metric_definitions import METRIC_REGISTRY, MetricDefinition
from app.domains.analytics.infrastructure.analytics_cache import AnalyticsCache


class AnalyticsService:
    """Orchestrates financial domain analytics calculations with tenant isolation and caching."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.net_worth_service = NetWorthAnalyticsService(session)
        self.cashflow_service = CashFlowAnalyticsService(session)
        self.investment_service = InvestmentAnalyticsService(session)
        self.budget_service = BudgetAnalyticsService(session)
        self.liability_service = LiabilityAnalyticsService(session)
        self.risk_service = RiskAnalyticsService(session)
        self.planning_service = PlanningAnalyticsService(session)

    async def get_overview_analytics(
        self,
        tenant_id: uuid.UUID,
        params: AnalyticsFilterParams,
    ) -> dict[str, Any]:
        """Aggregate executive overview metrics across domains."""
        end_date = params.end_date or date.today()
        start_date = params.start_date or (end_date - date.resolution * 30)

        # Check Cache
        cache_params = params.model_dump()
        cached = await AnalyticsCache.get(tenant_id, "overview", "executive_summary", cache_params)
        if cached:
            return cached

        # Fetch domain envelopes
        nw = await self.net_worth_service.get_net_worth_analytics(tenant_id, start_date, end_date)
        cf = await self.cashflow_service.get_cash_flow_analytics(tenant_id, start_date, end_date)
        alloc = await self.investment_service.get_allocation_analytics(tenant_id)
        budget = await self.budget_service.get_budget_utilization_analytics(tenant_id)
        risk = await self.risk_service.get_risk_overview_analytics(tenant_id)

        overview_payload = {
            "net_worth": nw.model_dump(),
            "cash_flow": cf.model_dump(),
            "allocation": alloc.model_dump(),
            "budget": budget.model_dump(),
            "risk": risk.model_dump(),
            "calculated_at": datetime.now(UTC).isoformat(),
        }

        # Cache result
        await AnalyticsCache.set(tenant_id, "overview", "executive_summary", cache_params, overview_payload, ttl_seconds=300)
        return overview_payload

    @staticmethod
    def get_registered_metrics() -> dict[str, MetricDefinition]:
        """Return registered metric specifications."""
        return METRIC_REGISTRY

