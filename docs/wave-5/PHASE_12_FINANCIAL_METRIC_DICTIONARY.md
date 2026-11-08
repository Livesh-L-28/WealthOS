# WealthOS — Phase 12 Financial Metric Dictionary & Standard Definitions

**Programme:** Wave 5 — Final Platform Integration and Acceptance  
**Phase:** Phase 12 — Unified User Experience  
**Date:** 2026-11-08  

---

## 1. Overview & Purpose

The Financial Metric Dictionary serves as the authoritative single source of truth for all mathematical formulas, financial terminology, data sources, and visual conventions across the WealthOS platform. It establishes unambiguous clarity between **settled double-entry ledger facts** (`ACTUAL`) and **actuarial/statistical projections** (`PROJECTED`).

---

## 2. Core Balance Sheet Metrics

### 2.1 Total Net Worth
- **Definition**: The net monetary worth of an individual or household, equal to the sum of all owned assets minus all outstanding obligations.
- **Formula**:
  $$\text{Net Worth} = \sum \text{Asset Balances} - \sum \text{Liability Balances}$$
- **Data Source**: General Ledger account balances (`accounts` table where `type IN ('ASSET', 'LIABILITY')`).
- **Precision**: PostgreSQL `NUMERIC(20, 4)`, rendered as 2 decimal places with currency formatting.
- **Status Classification**: `ACTUAL` (Confirmed double-entry ledger state).

### 2.2 Liquid Assets & Liquid Net Worth
- **Definition**: Financial assets that can be converted immediately into cash with negligible loss of principal (checking accounts, savings accounts, demand deposits, liquid mutual funds). Excludes illiquid real estate, locked retirement funds, and unvested equity.
- **Formula**:
  $$\text{Liquid Assets} = \sum \text{Balances}(\text{Liquid Cash Accounts})$$
  $$\text{Liquid Net Worth} = \text{Liquid Assets} - \text{Short-Term Current Liabilities}$$
- **Status Classification**: `ACTUAL`.

### 2.3 Solvency Ratio
- **Definition**: A measure of financial resilience comparing total assets to total outstanding liabilities.
- **Formula**:
  $$\text{Solvency Ratio} = \frac{\sum \text{Asset Balances}}{\sum \text{Liability Balances}}$$
- **Interpretation**: A ratio $> 1.0$ indicates positive net solvency. A ratio $\ge 3.0$ indicates strong financial stability.
- **Status Classification**: `ACTUAL`.

---

## 3. Cash Flow & Burn Metrics

### 3.1 Monthly Inflow
- **Definition**: The total verified cash received during the active period from external sources (salary, business revenue, interest, dividends, distributions).
- **Rule**: Internal transfers between accounts owned by the same user or household member are strictly excluded via Transfer Neutrality filtering (`category != 'TRANSFER'`).
- **Status Classification**: `ACTUAL`.

### 3.2 Monthly Outflow (Net Burn)
- **Definition**: The total verified cash expended during the active period on goods, services, taxes, loan interest, and principal amortization.
- **Rule**: Internal transfers are excluded.
- **Status Classification**: `ACTUAL`.

### 3.3 Net Cash Flow & Savings Rate
- **Definition**: The net surplus or deficit generated during the period, and the proportion of gross income retained.
- **Formulas**:
  $$\text{Net Cash Flow} = \text{Inflow} - \text{Outflow}$$
  $$\text{Savings Rate} = \frac{\text{Net Cash Flow}}{\text{Inflow}} \times 100\%$$
- **Status Classification**: `ACTUAL`.

### 3.4 Emergency Runway
- **Definition**: The duration (in months) an individual or household can sustain mandatory living expenses using liquid assets alone without new income.
- **Formula**:
  $$\text{Emergency Runway (Months)} = \frac{\text{Liquid Cash Balances}}{\text{Average Monthly Outflows (Past 90 Days)}}$$
- **Benchmark**: Minimum 3.0 months (Recommended: 6.0 months).
- **Status Classification**: `ACTUAL` / `ESTIMATED`.

---

## 4. Investment Accounting Metrics

### 4.1 Realized Profit & Loss (P&L)
- **Definition**: The actual profit or loss locked in upon the sale or disposal of an asset, determined by matching the disposal against earlier acquisition lots using strict First-In, First-Out (FIFO) ordering.
- **Formula**:
  $$\text{Realized P&L} = \sum_{\text{Disposed Lots}} (\text{Disposal Price} - \text{Acquisition Cost Basis}) \times \text{Disposed Quantity} - \text{Transaction Fees}$$
- **Tax Implication**: Subject to statutory Capital Gains Tax (STCG / LTCG).
- **Status Classification**: `ACTUAL`.

### 4.2 Unrealized Profit & Loss (Paper P&L)
- **Definition**: The difference between the current market valuation of unsold holdings and their FIFO acquisition cost basis.
- **Formula**:
  $$\text{Unrealized P&L} = (\text{Current Market Price} - \text{FIFO Cost Basis}) \times \text{Open Quantity}$$
- **Tax Implication**: Not subject to tax until realized via a disposal transaction.
- **Status Classification**: `MARKET ESTIMATE`.

### 4.3 XIRR (Extended Internal Rate of Return)
- **Definition**: The annualized internal rate of return calculated across irregular, non-periodic cash inflows, outflows, and final portfolio terminal value.
- **Formula**: Solves for discount rate $r$ such that:
  $$\sum_{i=1}^{N} \frac{C_i}{(1 + r)^{\frac{d_i - d_0}{365}}} = 0$$
- **Status Classification**: `ACTUAL`.

---

## 5. Forecasting & Planning Metrics

### 5.1 Inflation-Compounded Goal Target
- **Definition**: The future monetary value required to achieve a specific purchasing power objective at horizon year $T$, adjusted for continuous annual inflation $i$.
- **Formula**:
  $$\text{Future Cost} = \text{Present Cost} \times (1 + i)^T$$
- **Status Classification**: `PROJECTED`.

### 5.2 Actuarial Retirement Corpus
- **Definition**: The capital required at retirement age $R$ to fund real monthly living expenses throughout life expectancy $L$, assuming real return $r$.
- **Status Classification**: `PROJECTED`.

---

## 6. Visual Status Badge Taxonomies

To eliminate user confusion, all metrics displayed on cards and tables must carry one of the following standardized visual indicators:

| Status Badge | Visual Styling | Meaning & Data Origin |
| :--- | :--- | :--- |
| `ACTUAL` | Solid Emerald (`bg-[#16A36A]/10 text-[#087A50]`) | Confirmed double-entry General Ledger fact, bank-reconciled, immutable transaction history. |
| `PROJECTED` | Solid Blue (`bg-[#3B82F6]/10 text-[#1D4ED8]`) | Forward-looking mathematical projection, actuarial estimate, or what-if scenario. |
| `PENDING` | Amber (`bg-[#F59E0B]/10 text-[#B45309]`) | Staged document, unconfirmed transaction, or awaiting human approval. |
| `RECONCILED` | Teal (`bg-[#0D9488]/10 text-[#0F766E]`) | Formally matched against third-party statement with zero discrepancy. |
| `STALE` | Slate (`bg-[#64748B]/10 text-[#475569]`) | Market valuation or account sync older than the freshness threshold ($> 24\text{h}$). |

