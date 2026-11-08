"""WealthOS Central Financial Analytics & Visualization API Endpoints."""

import uuid
from datetime import date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.logging import get_logger
from app.core.security import TenantContext, get_current_tenant_context
from app.domains.analytics.api.schemas import (
    AnalyticsFilterParams,
    AnalyticsResponseEnvelope,
)
from app.domains.analytics.application.analytics_service import AnalyticsService
from app.domains.analytics.domain.metric_definitions import METRIC_REGISTRY
from app.domains.analytics.domain.metric_enums import TimeGrain

logger = get_logger("wealthos.analytics.api")

router = APIRouter()


@router.get(
    "/metadata",
    summary="Get registered financial metric definitions",
)
async def get_metrics_metadata(
    context: TenantContext = Depends(get_current_tenant_context),
) -> dict[str, Any]:
    """Retrieve all 13 declarative financial metric specifications."""
    return {k: v.model_dump() for k, v in METRIC_REGISTRY.items()}


@router.get(
    "/overview",
    summary="Get consolidated executive analytics overview",
)
async def get_overview_analytics(
    period: str = Query("1M", description="Time window: 1M, 3M, 6M, 1Y, ALL"),
    currency: str = Query("INR", description="Operational currency"),
    household_id: str | None = Query(None, description="Optional household scope"),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Retrieve consolidated metrics across net worth, cash flow, investments, and budgets."""
    service = AnalyticsService(session)
    params = AnalyticsFilterParams(period=period, currency=currency, household_id=household_id)
    return await service.get_overview_analytics(context.tenant.id, params)


@router.get(
    "/net-worth",
    response_model=AnalyticsResponseEnvelope,
    summary="Get consolidated net worth time-series and summary",
)
async def get_net_worth_analytics(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    period: str = Query("1M"),
    granularity: TimeGrain = Query(TimeGrain.MONTH),
    currency: str = Query("INR"),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> AnalyticsResponseEnvelope:
    """Retrieve authoritative net worth trajectory with double-entry grounding."""
    resolved_end = end_date or date.today()
    resolved_start = start_date or (resolved_end - timedelta(days=30))

    if resolved_start > resolved_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be before or equal to end_date",
        )

    service = AnalyticsService(session)
    return await service.net_worth_service.get_net_worth_analytics(
        context.tenant.id, resolved_start, resolved_end, granularity, currency
    )


@router.get(
    "/cash-flow",
    response_model=AnalyticsResponseEnvelope,
    summary="Get monthly operating cash flow and savings rate",
)
async def get_cash_flow_analytics(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    currency: str = Query("INR"),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> AnalyticsResponseEnvelope:
    """Retrieve operating inflows vs outflows with internal transfers excluded."""
    resolved_end = end_date or date.today()
    resolved_start = start_date or (resolved_end - timedelta(days=90))

    service = AnalyticsService(session)
    return await service.cashflow_service.get_cash_flow_analytics(
        context.tenant.id, resolved_start, resolved_end, TimeGrain.MONTH, currency
    )


@router.get(
    "/income-expenses",
    response_model=AnalyticsResponseEnvelope,
    summary="Get itemized expense velocity and cadence breakdown",
)
async def get_income_expenses_analytics(
    cadence: TimeGrain = Query(TimeGrain.MONTH),
    currency: str = Query("INR"),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> AnalyticsResponseEnvelope:
    """Retrieve daily, weekly, monthly, and yearly expense velocity series."""
    resolved_end = date.today()
    resolved_start = resolved_end - timedelta(days=30)

    service = AnalyticsService(session)
    return await service.cashflow_service.get_cash_flow_analytics(
        context.tenant.id, resolved_start, resolved_end, cadence, currency
    )


@router.get(
    "/investments/allocation",
    response_model=AnalyticsResponseEnvelope,
    summary="Get multi-asset allocation slices and sector weights",
)
async def get_investment_allocation_analytics(
    currency: str = Query("INR"),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> AnalyticsResponseEnvelope:
    """Retrieve multi-asset weighting and unrealized capital gains."""
    service = AnalyticsService(session)
    return await service.investment_service.get_allocation_analytics(context.tenant.id, currency)


@router.get(
    "/budgets/utilization",
    response_model=AnalyticsResponseEnvelope,
    summary="Get budget envelope allocations and utilization ratios",
)
async def get_budget_utilization_analytics(
    currency: str = Query("INR"),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> AnalyticsResponseEnvelope:
    """Retrieve budget limit variance and overspending indicators."""
    service = AnalyticsService(session)
    return await service.budget_service.get_budget_utilization_analytics(context.tenant.id, currency)


@router.get(
    "/liabilities/overview",
    response_model=AnalyticsResponseEnvelope,
    summary="Get debt principal vs interest amortization schedules",
)
async def get_liability_overview_analytics(
    currency: str = Query("INR"),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> AnalyticsResponseEnvelope:
    """Retrieve loan amortization schedules and reducing balance distributions."""
    service = AnalyticsService(session)
    return await service.liability_service.get_liability_overview_analytics(context.tenant.id, currency)


@router.get(
    "/planning/forecast",
    response_model=AnalyticsResponseEnvelope,
    summary="Get projected wealth growth trajectory",
)
async def get_planning_forecast_analytics(
    currency: str = Query("INR"),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> AnalyticsResponseEnvelope:
    """Retrieve 5-year future net worth projections with inflation assumptions."""
    service = AnalyticsService(session)
    return await service.planning_service.get_forecast_analytics(context.tenant.id, currency)


@router.get(
    "/risks/overview",
    response_model=AnalyticsResponseEnvelope,
    summary="Get 5-pillar financial health score and solvency radar",
)
async def get_risk_overview_analytics(
    currency: str = Query("INR"),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> AnalyticsResponseEnvelope:
    """Retrieve composite solvency health score (88/100) and risk containment benchmarks."""
    service = AnalyticsService(session)
    return await service.risk_service.get_risk_overview_analytics(context.tenant.id, currency)

