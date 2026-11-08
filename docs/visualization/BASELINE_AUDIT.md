# WealthOS Enterprise Financial Visualization Engine — Baseline Audit

**Date of Audit:** 2026-11-08  
**Repository Branch:** `feature/final-financial-intelligence-production`  
**Baseline Commit:** `2c738e7`  
**Auditor:** WealthOS Principal Engineering Team

---

## 1. Executive Summary

This baseline audit inventories all existing frontend chart implementations, backend calculation services, data models, API endpoints, styling tokens, accessibility provisions, and test coverage prior to establishing the centralized **Enterprise Financial Visualization Engine**.

---

## 2. Frontend Inventory

### 2.1 Chart Implementations & UI Wrappers

| Chart Area | Component Path | Underlying Library / Engine | Status | Required Architecture Action |
|---|---|---|---|---|
| **Consolidated Net Worth** | `apps/web/src/components/dashboard/WealthTrendChart.tsx` | Native SVG (`FinancialAreaChart`, `FinancialWaterfallChart`) | **Verified** | Connect to backend `/api/v1/analytics/net-worth` API. Retain native SVG vector rendering. |
| **Monthly Cash Flow** | `apps/web/src/components/dashboard/CashFlowChart.tsx` | Native SVG (`FinancialBarChart`) | **Verified** | Connect to backend `/api/v1/analytics/cash-flow` API with zero double counting. |
| **Portfolio Allocation & Sectors** | `apps/web/src/components/dashboard/PortfolioAllocationChart.tsx` | Native SVG (`FinancialDonutChart`, `FinancialHorizontalBarChart`) | **Verified** | Connect to backend `/api/v1/analytics/investments/allocation` API with market data freshness. |
| **Budget Envelope Utilization** | `apps/web/src/components/dashboard/BudgetProgressCard.tsx` & `apps/web/src/app/budgets/page.tsx` | Native SVG / CSS tracks (`FinancialHorizontalBarChart`) | **Verified** | Connect to backend `/api/v1/analytics/budgets/utilization` API. |
| **Expense Velocity & Cadence** | `apps/web/src/app/analytics/page.tsx` | Native SVG (`FinancialBarChart`) | **Verified** | Connect to backend `/api/v1/analytics/income-expenses` API with cadence switching. |
| **30-Day Spending Intensity** | `apps/web/src/app/analytics/page.tsx` | Native Grid (`FinancialHeatmap`) | **Verified** | Connect to backend daily burn aggregation. |
| **India Tax Readiness** | `apps/web/src/app/analytics/page.tsx` | Horizontal Bars / Table (`FinancialHorizontalBarChart`) | **Verified** | Connect to backend capital gains and regime comparison services. |
| **Debt Amortization** | `apps/web/src/app/net-worth/page.tsx` | Native SVG (`FinancialBarChart`) | **Verified** | Connect to backend `/api/v1/analytics/liabilities/overview` API. |
| **Financial Health & Risk** | `apps/web/src/components/dashboard/FinancialHealthCard.tsx` | Horizontal Progress Tracks / Table | **Verified** | Connect to backend `/api/v1/analytics/risks/overview` API. |
| **Chart Container & Fallback** | `apps/web/src/components/charts/ChartContainer.tsx`, `FinancialTableFallback.tsx` | Reusable React Components | **Verified** | Elevate to unified `ChartContainer` with centralized `ChartRegistry`. |

### 2.2 Formatting & Tokens
- **Formatting Engine**: `apps/web/src/lib/formatters.ts` implements standard Indian 3-2-2 grouping (`formatIndianNumber`), compact notation (`₹Cr`, `₹L`, `₹K`), signed deltas (`formatPercentage`), and accessible CSV export (`exportToCSV`).
- **Color Tokens**: `packages/design-tokens/src/colors.ts` defines WCAG 2.1 AA compliant series colors (`chartTokens`).

---

## 3. Backend Inventory

### 3.1 Financial Domain Services (Authoritative Truth)

| Domain | Authoritative Service Class | Key Accounting Methods | Financial Invariants |
|---|---|---|---|
| **Accounting** | `BalanceService`, `JournalService` | `get_account_balances`, `get_journal_entries` | Double-entry debits == credits, strict immutability. |
| **Cash Management** | `CashManagementService` | `get_cash_position`, `get_cash_flow_forecast` | Transfer neutrality, liquidity reserve tracking. |
| **Investments** | `InvestmentService` | `get_holdings`, `get_portfolio_summary`, FIFO lot engine | Separate realized vs unrealized P&L, corporate actions. |
| **Budgets** | `BudgetService` | `get_budget_envelopes`, `calculate_utilization` | Overspend alerts, internal transfers excluded. |
| **Liabilities** | `LiabilityService` | `get_liability_summary`, `simulate_repayment` | Reducing balance amortization, EMI schedule tracking. |
| **Planning** | `PlanningService` | `evaluate_goal_feasibility`, `simulate_retirement` | Inflation compounding, scenario projection boundaries. |
| **Risk** | `RiskService` | `evaluate_risk_signals`, `calculate_health_score` | 5-pillar solvency & concentration radar. |
| **Tax** | `TaxService` | `calculate_tax_liability`, `compare_regimes` | Finance Act 2024 / Sec 115BAC dual-regime optimization. |
| **Household** | `HouseholdService` | `get_household_net_worth`, `calculate_settlement` | Tenant isolation, member role scoping, zero double counting. |

### 3.2 Analytics API Gaps Identified
- Currently, analytical metrics are retrieved via disjoint domain-specific endpoints (`/cash-management/position`, `/investments/summary`, `/budgets/envelopes`, `/liabilities/summary`).
- **Identified Gap**: Lack of a centralized `/api/v1/analytics` router that downsamples time-series, enforces multi-tenant & household authorization uniformly, generates standardized response envelopes (`metric`, `period`, `series`, `summary`, `provenance`, `warnings`), provides Redis query caching with tenant isolation, and powers charts without redundant round-trips.

---

## 4. Required Action Plan

1. **Backend**: Implement `backend/app/domains/analytics/` module containing:
   - Metric Registry & Enum Definitions (`metric_definitions.py`, `metric_enums.py`).
   - Domain Analytics Services orchestrating domain models without bypassing accounting rules.
   - Standardized Pydantic Response Envelope preserving exact Decimal precision.
   - Redis Analytics Cache with tenant-isolated and household-scoped keys.
   - Analytics REST Router exposed at `/api/v1/analytics`.
2. **Frontend**:
   - Establish `ChartRegistry` mapping metric identifiers to verified chart types.
   - Wire domain charts to the new analytics endpoints.
   - Preserve native SVG rendering and table fallback accessibility.
3. **Verification**:
   - Write backend unit, integration, and financial invariant tests.
   - Write security tests verifying cross-tenant isolation and household sharing rules.
   - Verify visual rendering via Playwright screenshot automation.

