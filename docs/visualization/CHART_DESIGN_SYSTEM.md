# WealthOS Professional Data Visualization Design System

## 1. Executive Overview

The WealthOS Visualization Design System establishes an enterprise-grade, mathematically grounded, accessible financial data visualization standard across the entire platform. Designed for high-trust wealth management, family office accounting, and analytical intelligence, every visual element prioritizes financial accuracy, visual hierarchy, clarity, and WCAG 2.2 Level AA accessibility over superficial decoration.

---

## 2. Design Tokens & Semantic Color Palette

All charts and analytical interfaces source their styling exclusively from `@wealthos/design-tokens` (`chartTokens`). The palette is calibrated to guarantee minimum 4.5:1 text contrast and 3:1 graphical element contrast against light surfaces (`#FFFFFF` and `#F7F9F7`).

| Token Key | Hex Value | Semantic Financial Purpose |
|---|---|---|
| `series.primary` | `#16A36A` | Operating Inflows, Consolidated Net Worth, Equities |
| `series.primaryDark` | `#087A50` | Surplus Retention, Settled Realized Profit, Hover Focus |
| `series.secondary` | `#6475D8` | Operating Outflows, Direct Mutual Funds, Analytics |
| `series.warning` | `#D99A32` | Amortization Interest, Fixed Deposits, Budget Approaching (>85%) |
| `series.danger` | `#DC5B5B` | Deficit, Overspending (>100%), Liabilities, Tax Outflow |
| `series.teal` | `#0D9488` | Commodities, Sovereign Gold Bonds (SGB), Physical Gold |
| `series.purple` | `#8B5CF6` | Real Estate Holdings, Alternative Assets, Private Equity |
| `series.blue` | `#0284C7` | Liquid Cash, Depository Accounts, Emergency Reserves |
| `series.neutral` | `#758078` | Historic Benchmarks, Projected Estimates, Axis Labels |
| `ui.gridline` | `#E7ECE8` | Subtle Horizontal Gridlines (1px, 4 4 Dasharray) |
| `ui.tooltipBg` | `#17231D` | High-contrast Dark Charcoal Tooltip Card (`#F8FAFC` typography) |

---

## 3. Reusable Chart Components Library

All components reside in `apps/web/src/components/charts/` and export a consistent, typed API:

### 1. `ChartContainer`
- Standard enterprise card wrapper providing unified title, subtitle, financial domain term tooltips (`InfoTooltip`), data freshness badges (`Double-Entry Grounded`, `Mark-to-Market`), valuation timestamps, date range pills (`1M`, `3M`, `6M`, `1Y`, `ALL`), loading skeletons, empty state illustrations, error state with retry actions, accessible "View as Table" toggle, and plain-English narrative summaries.

### 2. `FinancialTooltip`
- Floating and crosshair-anchored tooltip displaying exact dates, metric names, full rupee amounts formatted with Indian comma grouping, comparison delta amounts, and signed percentage variations (`+4.76%`).

### 3. `FinancialAreaChart`
- Cubic-bezier or linear interpolated area curves with smooth vertical linear gradients (bounded opacity 0.22 $\rightarrow$ 0.0), interactive hover crosshairs, Y-axis ticks formatted in Lakhs (`₹L`) and Crores (`₹Cr`), and accessible SVG descriptions.

### 4. `FinancialLineChart`
- Multi-series continuous line chart supporting historical actuals alongside projected scenario run-rates (dashed strokes), zero-baseline anchors, and interactive point crosshairs.

### 5. `FinancialBarChart`
- Grouped and standalone vertical bars with mathematically anchored zero baselines. Handles both positive cash inflows and negative burn or overdrafts without axis clipping.

### 6. `FinancialHorizontalBarChart`
- High-efficiency ranked category visualization for top burn categories, sector allocations, and budget envelope tracking with status badges (Healthy, Warning, Exceeded).

### 7. `FinancialDonutChart`
- SVG strokeDashoffset segmented donut chart with center KPI metric, hover segment scaling, and interactive legend with portfolio percentage shares and exact rupee valuations.

### 8. `FinancialWaterfallChart`
- Net worth bridges and cash-flow walks showing: Starting Balance $\rightarrow$ Increments (Salary, Unrealized Gains) $\rightarrow$ Decrements (Living Expenses, Debt EMI, Taxes) $\rightarrow$ Ending Balance.

### 9. `FinancialHeatmap`
- Day-by-day activity and spending burn intensity calendar grid with 4-level semantic color scaling and scale legend.

### 10. `FinancialTableFallback`
- WCAG 2.2 AA compliant tabular alternative embedded inside every major chart container. Features sortable columns, exact formatted decimal currency, and client-side accessible CSV export (`exportToCSV`).

---

## 4. Axis, Number & Tooltip Formatting Standard

Implemented in `apps/web/src/lib/formatters.ts`:

- **Indian Grouping (`formatIndianNumber`)**: 3 digits for hundreds, followed by repeating 2-digit groups (e.g. `₹75,37,901.25`).
- **Compact Currency (`formatCurrency(val, { notation: 'compact' })`)**:
  - Values $\ge$ ₹1,00,00,000 $\rightarrow$ `₹X.XX Cr`
  - Values $\ge$ ₹1,00,000 $\rightarrow$ `₹X.XX L`
  - Values $\ge$ ₹1,000 $\rightarrow$ `₹X.X K`
  - Values $<$ ₹1,000 $\rightarrow$ Full amount (e.g. `₹450.00`)
- **Percentages (`formatPercentage`)**: Explicit mathematical signs (`+4.76%`, `-1.20%`, `0.00%`).
- **Y-Axis Ticks (`formatAxisTick`)**: Clean interval ticks (`₹1Cr`, `₹75L`, `₹50L`, `0`, `-₹10L`).

