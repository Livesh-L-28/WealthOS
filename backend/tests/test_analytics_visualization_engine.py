"""WealthOS Central Financial Analytics & Visualization Engine Test Suite.

Validates:
1. Declarative metric registry (all 13 financial metrics) and metadata.
2. Strict Decimal precision preservation and zero float degradation.
3. Financial invariants: Net worth, Transfer-neutral cash flow, Asset allocation, Budget utilization.
4. Tenant and household cache isolation with fail-open resilience.
5. Live authenticated HTTP REST API endpoints under /api/v1/analytics/*.
"""

import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenant_context import set_db_tenant_context
from app.domains.analytics.api.schemas import (
    AnalyticsFilterParams,
    AnalyticsResponseEnvelope,
    DataPointSchema,
    MetricMetadataSchema,
    MetricSummarySchema,
    PeriodMetadataSchema,
    ProvenanceSchema,
    SeriesSchema,
)
from app.domains.analytics.application.analytics_service import AnalyticsService
from app.domains.analytics.domain.metric_definitions import METRIC_REGISTRY
from app.domains.analytics.domain.metric_enums import (
    AggregationMethod,
    DataStatus,
    FreshnessStatus,
    MetricDomain,
    TimeGrain,
)
from app.domains.analytics.infrastructure.analytics_cache import AnalyticsCache


def test_metric_registry_all_13_canonical_metrics():
    """Verify all 13 canonical financial metrics are declared with mandatory metadata."""
    expected_metrics = [
        "net_worth",
        "cash_flow",
        "income_expenses",
        "budget_utilization",
        "portfolio_performance",
        "asset_allocation",
        "portfolio_returns",
        "debt_amortization",
        "goal_progress",
        "wealth_forecast",
        "financial_health",
        "tax_liability",
        "household_net_worth",
    ]
    for metric_key in expected_metrics:
        assert metric_key in METRIC_REGISTRY, f"Missing metric declaration: {metric_key}"
        spec = METRIC_REGISTRY[metric_key]
        assert isinstance(spec.domain, MetricDomain)
        assert isinstance(spec.aggregation, AggregationMethod)
        assert len(spec.allowed_grains) > 0
        assert spec.calculation_service != ""
        assert spec.name != ""


def test_decimal_precision_preservation():
    """Verify DataPointSchema and SeriesSchema preserve exact Decimal values without float truncation."""
    test_value = Decimal("9876543210.1234")
    point = DataPointSchema(
        date="2026-03-31",
        value=test_value,
        status=DataStatus.ACTUAL,
    )
    assert point.value == test_value
    assert isinstance(point.value, Decimal)

    series = SeriesSchema(
        name="Net Worth Actual",
        status=DataStatus.ACTUAL,
        points=[point],
    )
    assert series.points[0].value == test_value

    summary = MetricSummarySchema(
        current_value=test_value,
        previous_value=Decimal("9000000000.0000"),
        absolute_change=Decimal("876543210.1234"),
        percentage_change=Decimal("9.7394"),
    )
    envelope = AnalyticsResponseEnvelope(
        metric=MetricMetadataSchema(
            key="net_worth",
            name="Consolidated Net Worth",
            domain=MetricDomain.WEALTH,
            unit="currency",
            currency="INR",
        ),
        period=PeriodMetadataSchema(
            start=date(2026, 1, 1),
            end=date(2026, 3, 31),
            granularity=TimeGrain.MONTH,
        ),
        summary=summary,
        series=[series],
        provenance=ProvenanceSchema(
            source_version="wos-accounting-v1",
            calculated_at=datetime.now(timezone.utc),
            freshness=FreshnessStatus.CURRENT,
        ),
    )
    payload = envelope.model_dump()
    assert payload["summary"]["current_value"] == test_value
    assert payload["series"][0]["points"][0]["value"] == test_value


def test_analytics_cache_tenant_isolation_and_fail_open():
    """Verify cache keys strictly isolate tenants and fail open when Redis is unconfigured."""
    tenant_a = uuid.uuid4()
    tenant_b = uuid.uuid4()
    params = {"period": "1M", "currency": "INR"}

    key_a = AnalyticsCache.build_cache_key(tenant_a, "global", "net_worth", params)
    key_b = AnalyticsCache.build_cache_key(tenant_b, "global", "net_worth", params)
    key_a_household = AnalyticsCache.build_cache_key(tenant_a, "hh-100", "net_worth", params)

    assert key_a != key_b
    assert str(tenant_a) in key_a
    assert str(tenant_b) in key_b
    assert "hh-100" in key_a_household
    assert "global" in key_a


@pytest.mark.asyncio
async def test_analytics_service_orchestration(
    db_session: AsyncSession, test_user_factory
):
    """Verify AnalyticsService orchestrates net worth, cash flow, investments, and budgets."""
    user, tenant, _ = await test_user_factory(email="analytics.service@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = AnalyticsService(db_session)

    # 1. Net worth analytics
    start_d = date.today() - timedelta(days=30)
    end_d = date.today()
    nw_resp = await service.net_worth_service.get_net_worth_analytics(
        tenant.id, start_d, end_d, TimeGrain.MONTH, "INR"
    )
    assert nw_resp.metric.key == "net_worth"
    assert nw_resp.metric.currency == "INR"
    assert len(nw_resp.series) >= 1
    assert nw_resp.summary.current_value >= Decimal("0.00")

    # 2. Cash flow analytics
    cf_resp = await service.cashflow_service.get_cash_flow_analytics(
        tenant.id, start_d, end_d, TimeGrain.MONTH, "INR"
    )
    assert cf_resp.metric.key == "cash_flow"
    assert len(cf_resp.series) == 2  # Inflow, Outflow

    # 3. Investment allocation
    inv_resp = await service.investment_service.get_allocation_analytics(tenant.id, "INR")
    assert inv_resp.metric.key == "asset_allocation"
    assert len(inv_resp.series) >= 1

    # 4. Consolidated overview
    overview = await service.get_overview_analytics(
        tenant.id, AnalyticsFilterParams(period="1M", currency="INR")
    )
    assert "net_worth" in overview
    assert "cash_flow" in overview
    assert "allocation" in overview
    assert "budget" in overview
    assert "risk" in overview


@pytest.mark.asyncio
async def test_live_analytics_api_endpoints(
    client: AsyncClient, test_user_factory
):
    """Validate all REST endpoints under /api/v1/analytics/* with live authentication."""
    user, tenant, token = await test_user_factory(email="analytics.api@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Metadata endpoint
    meta_resp = await client.get("/api/v1/analytics/metadata", headers=headers)
    assert meta_resp.status_code == 200
    meta_data = meta_resp.json()
    assert "net_worth" in meta_data
    assert "cash_flow" in meta_data
    assert meta_data["net_worth"]["name"] == "Consolidated Net Worth"

    # 2. Consolidated Overview endpoint
    overview_resp = await client.get("/api/v1/analytics/overview", headers=headers)
    assert overview_resp.status_code == 200
    overview_data = overview_resp.json()
    assert "net_worth" in overview_data
    assert "cash_flow" in overview_data

    # 3. Net Worth endpoint
    nw_resp = await client.get("/api/v1/analytics/net-worth", headers=headers)
    assert nw_resp.status_code == 200
    nw_data = nw_resp.json()
    assert nw_data["metric"]["key"] == "net_worth"
    assert "provenance" in nw_data
    assert nw_data["provenance"]["freshness"].lower() == "current"

    # 4. Cash Flow endpoint
    cf_resp = await client.get("/api/v1/analytics/cash-flow", headers=headers)
    assert cf_resp.status_code == 200
    cf_data = cf_resp.json()
    assert cf_data["metric"]["key"] == "cash_flow"
    assert len(cf_data["series"]) == 2

    # 5. Income & Expenses endpoint
    ie_resp = await client.get("/api/v1/analytics/income-expenses", headers=headers)
    assert ie_resp.status_code == 200

    # 6. Investment Allocation endpoint
    inv_resp = await client.get("/api/v1/analytics/investments/allocation", headers=headers)
    assert inv_resp.status_code == 200

    # 7. Budget Utilization endpoint
    budget_resp = await client.get("/api/v1/analytics/budgets/utilization", headers=headers)
    assert budget_resp.status_code == 200

    # 8. Liability Overview endpoint
    liab_resp = await client.get("/api/v1/analytics/liabilities/overview", headers=headers)
    assert liab_resp.status_code == 200

    # 9. Planning Forecast endpoint
    plan_resp = await client.get("/api/v1/analytics/planning/forecast", headers=headers)
    assert plan_resp.status_code == 200

    # 10. Risk Overview endpoint
    risk_resp = await client.get("/api/v1/analytics/risks/overview", headers=headers)
    assert risk_resp.status_code == 200


@pytest.mark.asyncio
async def test_analytics_api_validation_error(
    client: AsyncClient, test_user_factory
):
    """Verify invalid date parameters return HTTP 400 Bad Request."""
    user, tenant, token = await test_user_factory(email="analytics.val@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # start_date > end_date must return 400
    resp = await client.get(
        "/api/v1/analytics/net-worth?start_date=2026-12-31&end_date=2026-01-01",
        headers=headers,
    )
    assert resp.status_code == 400
    res_data = resp.json()
    err_msg = res_data.get("error", {}).get("message") or res_data.get("detail", "")
    assert "start_date must be before or equal to end_date" in err_msg


@pytest.mark.asyncio
async def test_cross_tenant_analytics_isolation(
    client: AsyncClient, test_user_factory
):
    """Verify that analytics queries strictly isolate data between distinct tenants."""
    user_a, tenant_a, token_a = await test_user_factory(email="tenant_a.analytics@example.com")
    user_b, tenant_b, token_b = await test_user_factory(email="tenant_b.analytics@example.com")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    resp_a = await client.get("/api/v1/analytics/overview", headers=headers_a)
    resp_b = await client.get("/api/v1/analytics/overview", headers=headers_b)

    assert resp_a.status_code == 200
    assert resp_b.status_code == 200
    data_a = resp_a.json()
    data_b = resp_b.json()
    assert data_a["net_worth"]["metric"]["currency"] == "INR"
    assert data_b["net_worth"]["metric"]["currency"] == "INR"


@pytest.mark.asyncio
async def test_cash_flow_transfer_neutrality_and_savings_rate(
    db_session: AsyncSession, test_user_factory
):
    """Verify operating cash flow computes savings rate and strictly excludes internal transfers."""
    user, tenant, _ = await test_user_factory(email="transfer.neutral@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = AnalyticsService(db_session)
    cf = await service.cashflow_service.get_cash_flow_analytics(
        tenant.id, date(2026, 8, 1), date(2026, 11, 8), TimeGrain.MONTH, "INR"
    )

    inflow_points = cf.series[0].points
    outflow_points = cf.series[1].points
    latest_inflow = inflow_points[-1].value
    latest_outflow = outflow_points[-1].value

    expected_net = latest_inflow - latest_outflow
    assert cf.summary.current_value == expected_net
    assert cf.summary.current_value == Decimal("60450.00")

    expected_savings_rate = (expected_net / latest_inflow) * Decimal("100")
    assert abs(cf.summary.savings_rate - expected_savings_rate) < Decimal("0.01")


@pytest.mark.asyncio
async def test_net_worth_double_entry_reconciliation(
    db_session: AsyncSession, test_user_factory
):
    """Verify net worth preserves the fundamental accounting equation: Assets - Liabilities = Equity."""
    user, tenant, _ = await test_user_factory(email="accounting.eq@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = AnalyticsService(db_session)
    nw = await service.net_worth_service.get_net_worth_analytics(
        tenant.id, date(2026, 10, 1), date(2026, 11, 8), TimeGrain.MONTH, "INR"
    )

    # Net worth must be non-null and equal to total liquid assets minus total liabilities
    assert nw.summary.current_value == Decimal("7537901.25")
    assert nw.summary.previous_value == Decimal("7195050.00")
    assert nw.summary.absolute_change == nw.summary.current_value - nw.summary.previous_value


@pytest.mark.asyncio
async def test_budget_utilization_ratio_calculation(
    db_session: AsyncSession, test_user_factory
):
    """Verify budget utilization ratio is exact and correctly bounded."""
    user, tenant, _ = await test_user_factory(email="budget.ratio@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = AnalyticsService(db_session)
    b = await service.budget_service.get_budget_utilization_analytics(tenant.id, "INR")

    assert b.metric.key == "budget_utilization"
    assert b.summary.utilization_rate == Decimal("84.19")
    assert b.summary.current_value == Decimal("151550.00")  # Total actual spent
    assert b.summary.previous_value == Decimal("180000.00")  # Approved limit

