# WEALTHOS — FINANCIAL DATA PRESENTATION & VISUALIZATION STANDARDS

**Document Reference:** WOS-UX-DAT-001  
**Version:** 1.0.0-RELEASE-CANDIDATE  
**Status:** APPROVED / FROZEN BASELINE  
**Classification:** Financial Engineering & UX Specification  

---

## 1. INDIAN FINANCIAL NUMBER FORMATTING SPECIFICATION

By default, WealthOS formats all currency figures according to the Indian numbering system, utilizing **Lakhs** ($10^5$) and **Crores** ($10^7$) rather than Millions and Billions:

### 1.1 Grouping & Decimal Rules
- **Base Format:** `₹ [X,XX,XX,XXX.XX]`
- **The Grouping Invariant:** The rightmost group has 3 digits (`XXX`), followed by 2-digit groups separated by commas (`XX,XX,XXX`).
- **Examples:**
  - One Thousand: `₹1,000.00`
  - Ten Thousand: `₹10,000.00`
  - One Lakh: `₹1,00,000.00`
  - Ten Lakhs: `₹10,00,000.00`
  - One Crore: `₹1,00,00,000.00`
  - Twelve Crores Thirty-Four Lakhs Fifty-Six Thousand Seven Hundred Eighty-Nine: `₹12,34,56,789.00`
- **Compact Notation for Cards & Mobile:**
  - Amounts $\ge 1 \text{ Crore}$: `₹1.42 Cr`
  - Amounts $\ge 1 \text{ Lakh}$ and $< 1 \text{ Crore}$: `₹38.50 L`
  - Amounts $< 1 \text{ Lakh}$: `₹42,850`

### 1.2 Fiscal Year & Calendar Architecture
- **Primary Fiscal Year:** April 1 to March 31 (`FY 2026-27`).
- **Quarter Divisions:**
  - `Q1`: April 1 – June 30
  - `Q2`: July 1 – September 30
  - `Q3`: October 1 – December 31
  - `Q4`: January 1 – March 31
- **Standard Date Format:** Always `DD MMM YYYY` (e.g., `07 Nov 2026`) in prose and UI headers. Avoid ambiguous numeric slashes (`07/11/2026` vs `11/07/2026`).

---

## 2. INTERNATIONAL MULTI-CURRENCY SUPPORT

While the default workspace currency is INR (₹), WealthOS natively supports international accounts:
- **Major Supported Currencies:** USD (`$`), EUR (`€`), GBP (`£`), AED (`AED `), SGD (`S$`), CAD (`C$`).
- **Dual Display Rule:** For foreign currency holdings (e.g., US RSUs), the UI displays the native currency amount alongside the base currency equivalent calculated at the transaction or valuation exchange rate:
  ```
  $62,500.00 USD  (₹52,18,750.00 INR @ ₹83.50/USD)
  ```

---

## 3. STRICT FINANCIAL PRESENTATION INVARIANTS

To maintain enterprise integrity, WealthOS enforces 5 absolute presentation rules:

| Rule ID | Violation to Strictly Avoid | Correct Architectural Treatment |
|---|---|---|
| **R-01** | **Presenting missing values as zero.** | If an account balance or asset valuation is unknown or unverified, display `—` (em-dash) or `"Unverified"`. Never display `₹0.00`, which implies complete liquidation. |
| **R-02** | **Confusing expected income with received income.** | Declared dividends and uncollected invoices must carry the label `"Expected"` or `"Pending Receipt"`. Only confirmed bank credits are classified as `"Received Income"`. |
| **R-03** | **Confusing market valuation with cost basis.** | Portfolio views must visibly decouple **Invested Capital (Cost Basis)** from **Current Market Value**. Presenting only current value conceals capital losses or gains. |
| **R-04** | **Confusing realized gains with unrealized gains.** | Realized capital gains (closed positions with actual cash settlement) must be kept strictly distinct from paper / unrealized mark-to-market fluctuations. |
| **R-05** | **Displaying stale market data without a freshness indicator.** | If a market quote or NAV is older than 15 minutes during active trading hours, an explicit badge (`● Delayed as of Nov 06`) must appear next to the value. |

---

## 4. PURPOSEFUL FINANCIAL DATA VISUALIZATIONS

Every financial chart in WealthOS must serve an explicit analytical objective:

### 4.1 Net Worth Historical Curve
- **Chart Type:** ECharts Smooth Area Chart.
- **Analytical Purpose:** Answers: *"Is my family building durable long-term wealth, and what were the major inflection points?"*
- **Visual Design:** Gradient fill under indigo curve (`rgba(99, 102, 241, 0.2)` to transparent); Hover tooltip displays exact net worth, total assets, total debt, and the single largest transaction on that date.

### 4.2 Monthly Cash Flow Waterfall
- **Chart Type:** ECharts Positive/Negative Waterfall Bar Chart.
- **Analytical Purpose:** Answers: *"Where did my monthly salary go, and what was my actual net addition to savings?"*
- **Visual Design:** Gross Income (Green bar) $\rightarrow$ Tax Deductions (Rose bar) $\rightarrow$ Fixed Living Expenses (Rose bar) $\rightarrow$ Discretionary (Rose bar) $\rightarrow$ Final Net Savings (Green bar).

### 4.3 Asset & Sector Allocation Donut
- **Chart Type:** ECharts Two-Tier Nested Sunburst / Donut Chart.
- **Analytical Purpose:** Answers: *"Am I over-concentrated in one asset class or market sector?"*
- **Visual Design:** Inner ring: Broad Asset Class (Equities, Real Estate, Debt, Gold, Cash); Outer ring: Granular Sectors (IT, Banking, Pharma, Commercial Realty).

### 4.4 Portfolio Benchmark Alpha Comparison
- **Chart Type:** Dual-Line Normalized Percentage Comparison Chart.
- **Analytical Purpose:** Answers: *"Did my active stock and mutual fund picks outperform the NIFTY 50 index?"*
- **Visual Design:** Both portfolio and benchmark baseline are pegged to 0% at period start date; green shaded area indicates Alpha (outperformance).
