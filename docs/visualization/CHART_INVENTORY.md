# WealthOS Chart & Visualization Inventory

## 1. Product-Wide Visualization Directory

| Chart Identifier | Domain | Component | Primary Chart Type | Secondary Subviews | Data Source Endpoint |
|---|---|---|---|---|---|
| `CHART-NW-01` | Wealth Overview | `WealthOverviewCard` | `FinancialAreaChart` | `FinancialWaterfallChart`, `FinancialTableFallback` | `/api/v1/analytics/net-worth` |
| `CHART-CF-01` | Cash Management | `CashFlowChart` | `FinancialBarChart` (Grouped) | `FinancialTableFallback` | `/api/v1/analytics/cash-flow` |
| `CHART-INV-01` | Investments | `PortfolioAllocationChart` | `FinancialDonutChart` | `FinancialHorizontalBarChart` (Sectors), Table Fallback | `/api/v1/analytics/investments/allocation` |
| `CHART-BDG-01` | Budgeting | `BudgetProgressCard` | `FinancialHorizontalBarChart` | `FinancialTableFallback` | `/api/v1/analytics/budgets/utilization` |
| `CHART-EXP-01` | Expense Intelligence | `ExpenseAnalyticsPage` | `FinancialBarChart` (Velocity) | `FinancialHeatmap` (30-Day), Table Fallback | `/api/v1/analytics/income-expenses` |
| `CHART-TAX-01` | Tax Readiness | `ExpenseAnalyticsPage` | `FinancialHorizontalBarChart` (Statutory) | Regime Comparison Matrix | `/api/v1/analytics/metadata` |
| `CHART-LIA-01` | Debt Management | `NetWorthPage` | `FinancialBarChart` (Amortization) | Strategy Simulator (Snowball vs Avalanche) | `/api/v1/analytics/liabilities/overview` |
| `CHART-RSK-01` | Risk Intelligence | `FinancialHealthCard` | 4-Pillar Score Bars | `FinancialTableFallback` | `/api/v1/analytics/risks/overview` |
| `CHART-GOL-01` | Financial Planning | `FinancialGoalsCard` | Progress Bar Tracks | Milestone Status Badges | `/api/v1/analytics/planning/forecast` |
| `CHART-HOU-01` | Household Wealth | `HouseholdPage` | Collaborative Split Donut | Member Contribution Breakdown | `/api/v1/analytics/overview` |
