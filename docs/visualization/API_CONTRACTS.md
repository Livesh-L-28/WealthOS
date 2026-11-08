# WealthOS Enterprise Financial Visualization Engine — API Contracts

## 1. Executive Summary & Architecture Standard

This document details the authoritative API contract specifications for the WealthOS Central Financial Analytics & Visualization Engine (`/api/v1/analytics/*`).

### Core Design Rules
1. **Strict Decimal Precision**: All valuations, sums, variances, and rates are emitted and preserved using string-grounded `Decimal` representation, eliminating IEEE 754 floating-point degradation.
2. **Canonical Envelope Structure**: Every analytical chart endpoint returns a standardized `AnalyticsResponseEnvelope` containing metadata, period framing, series payloads, period summaries, and cryptographic/lineage audit provenance.
3. **Transfer Neutrality**: Inflow and outflow series strictly exclude balance transfers between internal accounts, safeguarding against artificial volume inflation.
4. **Data Certainty Classification**: Individual data points are explicitly tagged with a `DataStatus` enum (`actual`, `projected`, `estimated`, `scenario`).
5. **Multi-Tenant Isolation**: Every request is bounded by tenant context (`TenantContext`), rejecting cross-tenant parameter tampering with zero cross-tenant leakage.

---

## 2. Standard Response Envelope Schema

Every visualization endpoint adheres to the following JSON schema:

```json
{
  "metric": {
    "key": "net_worth",
    "name": "Consolidated Net Worth",
    "domain": "wealth",
    "unit": "currency",
    "currency": "INR"
  },
  "period": {
    "start": "2026-10-09",
    "end": "2026-11-08",
    "granularity": "month"
  },
  "series": [
    {
      "name": "Consolidated Net Worth",
      "status": "actual",
      "color": "#16A36A",
      "points": [
        {
          "date": "2026-10-10",
          "value": "7195050.00",
          "available": true,
          "status": "actual"
        },
        {
          "date": "2026-11-08",
          "value": "7537901.25",
          "available": true,
          "status": "actual"
        }
      ]
    }
  ],
  "summary": {
    "current_value": "7537901.25",
    "previous_value": "7195050.00",
    "absolute_change": "342851.25",
    "percentage_change": "4.76",
    "savings_rate": null,
    "utilization_rate": null
  },
  "provenance": {
    "calculated_at": "2026-11-08T14:00:00Z",
    "source_version": "wos-accounting-v1.4",
    "freshness": "current",
    "valuation_timestamp": "Reconciled Today"
  },
  "warnings": []
}
```

---

## 3. Registered Endpoint Catalog

### 3.1 Metadata & Discovery
- **Route**: `GET /api/v1/analytics/metadata`
- **Description**: Returns declarative dictionary of all 13 canonical financial metric definitions, allowed grains, and source services.
- **Response**: Dictionary keyed by `metric_key`.

### 3.2 Consolidated Executive Overview
- **Route**: `GET /api/v1/analytics/overview`
- **Query Params**:
  - `period` (string, default: `"1M"`): Time window (`"1M"`, `"3M"`, `"6M"`, `"1Y"`, `"ALL"`).
  - `currency` (string, default: `"INR"`): Target reporting currency.
  - `household_id` (UUID string, optional): Scope to authorized household unit.
- **Response**: Consolidated object grouping `net_worth`, `cash_flow`, `allocation`, `budget`, and `risk` envelopes.

### 3.3 Consolidated Net Worth
- **Route**: `GET /api/v1/analytics/net-worth`
- **Query Params**:
  - `start_date` (date, optional): Beginning of historical interval.
  - `end_date` (date, optional): Terminal historical interval date.
  - `granularity` (`day`, `week`, `month`, `quarter`, `year`, default: `month`).
  - `currency` (string, default: `"INR"`).
- **Validation**: Enforces `start_date <= end_date`. Returns HTTP 400 Bad Request on violation.
- **Invariants**: Summary satisfies `Assets - Liabilities = Net Worth`.

### 3.4 Operating Cash Flow
- **Route**: `GET /api/v1/analytics/cash-flow`
- **Query Params**: `start_date`, `end_date`, `currency`.
- **Response**: Emits dual series: `Operating Inflows (Earned)` and `Operating Outflows (Spent)`.
- **Invariants**:
  - `savings_rate = (current_net / current_inflow) * 100`
  - Internal self-account transfers are strictly omitted.

### 3.5 Income & Expense Velocity
- **Route**: `GET /api/v1/analytics/income-expenses`
- **Query Params**: `cadence` (`day`, `week`, `month`, `year`), `currency`.
- **Purpose**: Powers spending rhythm heatmaps and cash velocity histograms.

### 3.6 Multi-Asset Portfolio Allocation
- **Route**: `GET /api/v1/analytics/investments/allocation`
- **Query Params**: `currency`.
- **Response**: Asset classes (Equities, Mutual Funds, Fixed Income, Gold, Liquid Cash) with absolute values and allocation percentages summing strictly to 100%.

### 3.7 Budget Utilization & Variance
- **Route**: `GET /api/v1/analytics/budgets/utilization`
- **Query Params**: `currency`.
- **Response**: Category-level spend breakdown against approved budget envelope caps with overrun indicators.

### 3.8 Debt Amortization Schedule
- **Route**: `GET /api/v1/analytics/liabilities/overview`
- **Query Params**: `currency`.
- **Response**: Monthly reducing-balance installments partitioned into principal amortization and interest components.

### 3.9 Planning & Wealth Growth Forecast
- **Route**: `GET /api/v1/analytics/planning/forecast`
- **Query Params**: `currency`.
- **Response**: Multi-year projected net worth trajectories under conservative, expected, and accelerated market scenarios with `DataStatus.PROJECTED` markers.

### 3.10 Solvency & Risk Radar
- **Route**: `GET /api/v1/analytics/risks/overview`
- **Query Params**: `currency`.
- **Response**: Composite financial health score (0-100) and 5-pillar radar distribution (Emergency Liquidity, Debt Burden, Cash Flow Margin, Concentration, Verification).
