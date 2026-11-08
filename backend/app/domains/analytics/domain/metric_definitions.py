"""WealthOS Centralized Financial Metric Registry."""

from typing import Any
from pydantic import BaseModel, Field

from app.domains.analytics.domain.metric_enums import (
    AggregationMethod,
    MetricDomain,
    TimeGrain,
)


class MetricDefinition(BaseModel):
    """Declarative specification for a registered financial metric."""

    key: str = Field(..., description="Unique stable metric key")
    name: str = Field(..., description="Human-readable financial metric title")
    description: str = Field(..., description="Detailed description of financial meaning")
    domain: MetricDomain = Field(..., description="Financial domain classification")
    unit: str = Field(default="currency", description="Unit of measurement: currency, percentage, score, count")
    default_currency: str = Field(default="INR", description="Default operational currency")
    aggregation: AggregationMethod = Field(..., description="Aggregation behavior across periods")
    allowed_grains: list[TimeGrain] = Field(default_factory=list, description="Supported time grains")
    supports_comparison: bool = Field(default=True, description="Whether period comparisons are mathematically valid")
    calculation_service: str = Field(..., description="Authoritative domain service handling calculation")
    missing_data_strategy: str = Field(default="preserve_null", description="Behavior when points are missing")


METRIC_REGISTRY: dict[str, MetricDefinition] = {
    "net_worth": MetricDefinition(
        key="net_worth",
        name="Consolidated Net Worth",
        description="Total recognized assets minus total liabilities verified against double-entry journal records",
        domain=MetricDomain.WEALTH,
        unit="currency",
        default_currency="INR",
        aggregation=AggregationMethod.POINT_IN_TIME,
        allowed_grains=[TimeGrain.DAY, TimeGrain.MONTH, TimeGrain.QUARTER, TimeGrain.YEAR],
        supports_comparison=True,
        calculation_service="NetWorthAnalyticsService",
        missing_data_strategy="preserve_null",
    ),
    "cash_flow": MetricDefinition(
        key="cash_flow",
        name="Net Operating Cash Flow",
        description="Operating inflows minus operating outflows with internal transfers strictly excluded",
        domain=MetricDomain.CASH,
        unit="currency",
        default_currency="INR",
        aggregation=AggregationMethod.SUM,
        allowed_grains=[TimeGrain.DAY, TimeGrain.WEEK, TimeGrain.MONTH, TimeGrain.YEAR],
        supports_comparison=True,
        calculation_service="CashFlowAnalyticsService",
        missing_data_strategy="preserve_zero",
    ),
    "income_expenses": MetricDefinition(
        key="income_expenses",
        name="Income & Expense Breakdown",
        description="Itemized cash inflows and outflows categorized by ledger head",
        domain=MetricDomain.CASH,
        unit="currency",
        default_currency="INR",
        aggregation=AggregationMethod.SUM,
        allowed_grains=[TimeGrain.DAY, TimeGrain.WEEK, TimeGrain.MONTH, TimeGrain.YEAR],
        supports_comparison=True,
        calculation_service="CashFlowAnalyticsService",
        missing_data_strategy="preserve_zero",
    ),
    "budget_utilization": MetricDefinition(
        key="budget_utilization",
        name="Budget Envelope Utilization",
        description="Actual eligible spending divided by approved envelope limit",
        domain=MetricDomain.BUDGET,
        unit="percentage",
        default_currency="INR",
        aggregation=AggregationMethod.RATIO,
        allowed_grains=[TimeGrain.MONTH, TimeGrain.YEAR],
        supports_comparison=True,
        calculation_service="BudgetAnalyticsService",
        missing_data_strategy="preserve_null",
    ),
    "portfolio_performance": MetricDefinition(
        key="portfolio_performance",
        name="Portfolio Value & Holdings",
        description="Mark-to-market valuation of direct equities and mutual fund schemes",
        domain=MetricDomain.INVESTMENT,
        unit="currency",
        default_currency="INR",
        aggregation=AggregationMethod.POINT_IN_TIME,
        allowed_grains=[TimeGrain.DAY, TimeGrain.MONTH, TimeGrain.QUARTER, TimeGrain.YEAR],
        supports_comparison=True,
        calculation_service="InvestmentAnalyticsService",
        missing_data_strategy="preserve_null",
    ),
    "asset_allocation": MetricDefinition(
        key="asset_allocation",
        name="Portfolio Asset Allocation",
        description="Percentage weighting across Equities, Mutual Funds, Fixed Income, and Gold",
        domain=MetricDomain.INVESTMENT,
        unit="percentage",
        default_currency="INR",
        aggregation=AggregationMethod.RATIO,
        allowed_grains=[TimeGrain.DAY, TimeGrain.MONTH],
        supports_comparison=True,
        calculation_service="InvestmentAnalyticsService",
        missing_data_strategy="preserve_null",
    ),
    "portfolio_returns": MetricDefinition(
        key="portfolio_returns",
        name="Realized vs Unrealized Returns",
        description="Separated capital gains tracking using strict FIFO tax lot cost basis",
        domain=MetricDomain.INVESTMENT,
        unit="currency",
        default_currency="INR",
        aggregation=AggregationMethod.SUM,
        allowed_grains=[TimeGrain.MONTH, TimeGrain.YEAR],
        supports_comparison=True,
        calculation_service="InvestmentAnalyticsService",
        missing_data_strategy="preserve_zero",
    ),
    "debt_amortization": MetricDefinition(
        key="debt_amortization",
        name="Debt Amortization & Payoff",
        description="Reducing balance installment schedules split into principal and interest",
        domain=MetricDomain.LIABILITY,
        unit="currency",
        default_currency="INR",
        aggregation=AggregationMethod.SUM,
        allowed_grains=[TimeGrain.MONTH, TimeGrain.YEAR],
        supports_comparison=True,
        calculation_service="LiabilityAnalyticsService",
        missing_data_strategy="preserve_null",
    ),
    "goal_progress": MetricDefinition(
        key="goal_progress",
        name="Financial Goal Milestone Progress",
        description="Percentage progress toward funded financial target milestones",
        domain=MetricDomain.PLANNING,
        unit="percentage",
        default_currency="INR",
        aggregation=AggregationMethod.RATIO,
        allowed_grains=[TimeGrain.MONTH, TimeGrain.YEAR],
        supports_comparison=False,
        calculation_service="PlanningAnalyticsService",
        missing_data_strategy="preserve_null",
    ),
    "wealth_forecast": MetricDefinition(
        key="wealth_forecast",
        name="Net Worth Growth Forecast",
        description="Inflation-adjusted future net worth trajectory across optimistic, expected, and conservative scenarios",
        domain=MetricDomain.PLANNING,
        unit="currency",
        default_currency="INR",
        aggregation=AggregationMethod.POINT_IN_TIME,
        allowed_grains=[TimeGrain.YEAR],
        supports_comparison=True,
        calculation_service="PlanningAnalyticsService",
        missing_data_strategy="preserve_null",
    ),
    "financial_health": MetricDefinition(
        key="financial_health",
        name="Financial Health & Solvency Score",
        description="Composite 0-100 score across liquidity, debt service, cash flow, diversification, and data quality",
        domain=MetricDomain.RISK,
        unit="score",
        default_currency="INR",
        aggregation=AggregationMethod.WEIGHTED_INDEX,
        allowed_grains=[TimeGrain.DAY, TimeGrain.MONTH],
        supports_comparison=True,
        calculation_service="RiskAnalyticsService",
        missing_data_strategy="preserve_null",
    ),
    "tax_liability": MetricDefinition(
        key="tax_liability",
        name="Income Tax Liability (India)",
        description="Annual income tax computations under Section 115BAC (New) vs Old Regime",
        domain=MetricDomain.TAX,
        unit="currency",
        default_currency="INR",
        aggregation=AggregationMethod.SUM,
        allowed_grains=[TimeGrain.YEAR],
        supports_comparison=True,
        calculation_service="TaxService",
        missing_data_strategy="preserve_zero",
    ),
    "household_net_worth": MetricDefinition(
        key="household_net_worth",
        name="Household Consolidated Wealth",
        description="Aggregated wealth across authorized household members respecting ownership allocations",
        domain=MetricDomain.HOUSEHOLD,
        unit="currency",
        default_currency="INR",
        aggregation=AggregationMethod.POINT_IN_TIME,
        allowed_grains=[TimeGrain.DAY, TimeGrain.MONTH, TimeGrain.YEAR],
        supports_comparison=True,
        calculation_service="HouseholdService",
        missing_data_strategy="preserve_null",
    ),
}
