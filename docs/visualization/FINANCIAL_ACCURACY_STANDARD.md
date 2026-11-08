# WealthOS Financial Chart Accuracy & Integrity Standard

## 1. Accounting Grounding Principles

1. **Source of Truth**: All chart metrics derive from PostgreSQL authoritative double-entry general journal records (`journal_entries`, `transactions`, `reconciliation_records`). Front-end charts never compute standalone balances or invent financial figures.
2. **Zero Floating-Point Discrepancies**: Exact valuations match down to the paise. Chart tooltips and table fallback ledgers reconcile 100% with executive summary KPI cards.
3. **Transfer Neutrality**: Internal self-transfers between user-owned accounts (e.g. Savings to Demat or Savings to Fixed Deposit) are strictly tagged and excluded from Operating Inflow / Operating Outflow calculations to prevent double-counting.
4. **Distinction of Data States**:
   - **Settled / Actual**: Solid green or indigo visual marks with verified badges.
   - **Projected / Scenario**: Dashed borders and neutral slate markers.
   - **Mark-to-Market / Stale Feeds**: Marked with timestamps (`BSE/NSE Close: Today 15:30 IST`) and warning banners if delayed beyond statutory limits.
5. **Realized vs Unrealized P&L**: Investment sale proceeds are never treated as operating income or realized gains. Capital gains use strict FIFO tax-lot basis calculations.
6. **Zero-Baseline Anchor**: Bar charts and waterfall bridges with negative values anchor strictly to $Y = 0$, preventing deceptive visual scaling or clipped negative bars.

---

## 2. Reconciled Financial Equations

### Net Worth Equation
$$\text{Net Worth} = \sum \text{Recognized Assets} - \sum \text{Recognized Liabilities}$$
Reconciled value:
$$\text{₹94,30,201.25} - \text{₹18,92,300.00} = \text{₹75,37,901.25}$$

### Net Worth Waterfall Walk (1-Month Window)
$$\text{Starting Net Worth (10-Oct)} + \text{Inflow} - \text{Outflow} + \text{Market Gains} - \text{Debt Principal} = \text{Ending Net Worth (08-Nov)}$$
$$\text{₹71,95,050.00} + \text{₹2,12,000.00} - \text{₹1,51,550.00} + \text{₹3,24,401.25} - \text{₹42,000.00} = \text{₹75,37,901.25}$$

### Cash Flow Savings Rate
$$\text{Savings Rate} = \frac{\text{Net Cash Surplus}}{\text{Operating Inflows}} \times 100$$
$$\frac{\text{₹60,450.00}}{\text{₹2,12,000.00}} \times 100 = 28.51\%$$

