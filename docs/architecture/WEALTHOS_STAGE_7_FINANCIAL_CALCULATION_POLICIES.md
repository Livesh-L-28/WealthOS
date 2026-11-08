# WealthOS — Stage 7 Financial Calculation Policies & Invariants

**Document Version:** 1.0.0  
**Status:** Approved Architecture Standard  
**Date:** 2026-11-08  
**Author:** Google DeepMind / Antigravity Agentic Engineering  
**Approved Baseline:** Phase 4 Ledger Core (`e4fe49b`), Stages 2–6 Standards

---

## 1. Executive Summary

This document establishes the canonical mathematical policies, calculation formulas, and accounting invariants governing **Budgeting, Financial Goals, Debt Planning, and Financial Forecasting** in WealthOS.

To ensure strict financial truth, all calculation formulas are centralized here. **The frontend, backend domain services, and AI Financial Copilot must strictly adhere to these identical definitions.** Competing or heuristic calculations in client-side code are strictly forbidden.

---

## 2. The 20 Canonical Financial Calculation Policies

### Policy 1: Budget Actual Spending Eligibility
- **Definition:** Only finalized, eligible transactions of direction `DEBIT` and category type `EXPENSE` posted within the budget date range `[start_date, end_date]` count toward actual spending.
- **Inclusion Formula:**
  $$\text{Actual Spending} = \sum_{t \in T_{budget}} t.\text{amount}$$
  Where $T_{budget} = \{ t \mid t.\text{status} = \text{'POSTED'} \land t.\text{direction} = \text{'DEBIT'} \land t.\text{category\_type} = \text{'EXPENSE'} \land t.\text{date} \in [\text{start}, \text{end}] \land t.\text{is\_transfer} = \text{FALSE} \}$.

### Policy 2: Transaction Posting Eligibility
- Only transactions in status `POSTED` or `RECONCILED` are included in actual budget consumption.
- Transactions in status `PENDING`, `DRAFT`, or `REJECTED` are strictly excluded from actuals, though they may appear in short-term pending alerts.

### Policy 3: Refund & Expense Reversal Handling
- When a refund is credited to an account (e.g., returned merchandise credited to the original merchant), the credit reduces the actual spending of that category:
  $$\text{Net Category Spending} = \sum \text{Debits}_{cat} - \sum \text{Refund Credits}_{cat}$$
- A refund is never classified as ordinary income.

### Policy 4: Chargeback & Reversal Journal Handling
- If a transaction is reversed in the general ledger via `ReversalService.reverse_journal_entry`, both the original transaction and the reversal line item are excluded from budget actuals.
- Net impact on the budget: exactly zero.

### Policy 5: Internal Transfer Neutralization
- Transfers between accounts owned by the same tenant (e.g. Bank Checking to Savings, or Bank to Demat Cash) are neutralized:
  $$\Delta \text{Source} = -X, \quad \Delta \text{Destination} = +X \implies \text{Budget Spending} = 0$$
- Internal transfers are strictly excluded from all budget spending, income metrics, and savings rates.

### Policy 6: Credit Card Purchases vs. Bill Settlement
- **The Purchase:** When an item is bought with a credit card, it debits Expense and credits Credit Card Liability (`2010`). This purchase is counted in the budget category on the date of purchase.
- **The Bill Payment:** When the user pays their credit card bill from their bank checking account (`1020`), this is an internal liability settlement (`1020` credit $\to$ `2010` debit).
- **Invariant:** The bill payment is strictly excluded from category spending to prevent double-counting.

### Policy 7: Loan Principal vs. Interest Separation
- An EMI repayment consists of two distinct components:
  1. **Principal Portion:** Reduces Loan Liability (`2100`). It is a balance sheet debt reduction, not an operating consumption expense.
  2. **Interest & Fee Portion:** Debits Loan Interest Expense (`5080`). It is recognized as an operating expense in the "Loan Interest" budget category.

### Policy 8: Investment Contribution Treatment
- Buying marketable securities, mutual funds, or gold bullion is an **Asset Swap** (Cash Asset $\to$ Investment Asset).
- It is classified under **Investing Cash Flow** or **Financial Goal Contributions**, NEVER as an ordinary household consumption expense.
- Transaction fees and STT are categorized as investment expenses.

### Policy 9: Recurring Expense Projection Formula
- Expected future recurring obligations are derived from active `recurring_transaction_rules`:
  $$\text{Expected Remaining Spending} = \sum_{r \in R_{active}} r.\text{expected\_amount} \times \text{OccurrencesRemaining}(r, \text{period\_end})$$
- Projected period-end spending combines actuals to date with expected remaining obligations:
  $$\text{Projected Spending} = \text{Actual Spending To Date} + \text{Expected Remaining Spending}$$

### Policy 10: Budget Rollover Invariants
- When a budget rollover policy is enabled (`ROLLOVER_SURPLUS` or `ROLLOVER_ALL`):
  $$\text{Carryover} = \text{Planned Amount}_{t-1} - \text{Actual Spending}_{t-1}$$
  $$\text{Effective Planned Amount}_t = \text{Base Planned Amount}_t + \text{Carryover}_{t-1}$$
- Previous-period historical actuals are **immutable and never modified**. The carryover is applied as an adjustment record in the new period.

### Policy 11: Financial Goal Contribution Eligibility
- A contribution toward a financial goal must represent verified capital allocation:
  - Linked to a specific bank transaction, OR
  - Allocated from a designated savings/deposit account balance, OR
  - Recorded as an explicit manual contribution with audit provenance.
- Moving money between goals does not create new wealth.

### Policy 12: Multiple-Goal Allocation & No Double-Counting
- If an account has a balance of ₹1,00,000, and Goal A is allocated ₹60,000, only the remaining ₹40,000 may be allocated to Goal B:
  $$\sum_{g \in \text{Goals}} \text{AllocatedFromAccount}(g, acc) \le \text{AccountBalance}(acc)$$
- The system strictly forbids double-counting the same liquid rupee across multiple independent goals.

### Policy 13: Multi-Currency & Foreign Exchange Policy
- All budget and goal metrics normalize to the tenant's primary functional currency (default `INR`).
- Spot exchange rates convert point-in-time goal balances.
- Historical transaction rates convert historical budget actuals.
- Missing exchange rates flag `status = 'PARTIAL'` rather than silently converting at parity ($1:1$).

### Policy 14: Forecast Data Cutoff
- All forecasting runs establish an immutable `data_cutoff_timestamp` (e.g. 23:59:59 UTC on the run date).
- Transactions posted after the cutoff are excluded from that forecast run to guarantee mathematical reproducibility.

### Policy 15: Forecast Historical Window
- Standard baseline forecasting utilizes a configurable rolling window:
  - Default: Last 90 days for daily/weekly cash flow.
  - Default: Last 12 calendar months for annual trend analysis.
- Anomalous one-time transactions ($> 3\sigma$ from category mean) are surfaced and isolated to prevent distorting future averages.

### Policy 16: Missing-Data & Completeness Policy
- If historical data covers fewer than 3 months, forecasts are labeled `status = 'LOW_CONFIDENCE'`.
- Missing category data never defaults to zero; it is reported with `is_partial = TRUE` and an explicit warning.

### Policy 17: Scenario Simulation Isolation Invariant
- Scenarios are mathematical models evaluated in memory.
- Under NO circumstances may a scenario execution post journal entries, update account balances, alter loan balances, or modify active budgets.
- All scenario outputs are stored in `scenario_forecast_results` separate from operational records.

### Policy 18: Forecast Data Quality Indicators
- Every forecast run outputs a deterministic quality score:
  $$\text{Quality Score} = w_1 \cdot \text{CoveragePct} + w_2 \cdot \text{ReconciliationPct} + w_3 \cdot \text{FreshnessScore}$$
- Thresholds:
  - $\ge 85\%$: `HIGH_CONFIDENCE`
  - $60\% - 84\%$: `MODERATE_CONFIDENCE`
  - $< 60\%$: `LOW_CONFIDENCE`

### Policy 19: Debt Repayment Planning Formulas (Snowball & Avalanche)
- **Snowball Method:** Sort debts by current principal balance ascending:
  $$\text{Order} = \text{Sort}(L, \text{key} = l.\text{current\_balance} \text{ ASC})$$
  Pay minimum on all; apply all extra payments to the smallest debt until extinguished, then roll total payment forward.
- **Avalanche Method:** Sort debts by annual interest rate descending:
  $$\text{Order} = \text{Sort}(L, \text{key} = l.\text{interest\_rate} \text{ DESC})$$
  Pay minimum on all; apply extra payments to highest interest rate debt. Mathematically minimizes total interest paid.
- **Monthly Compound Interest Formula:**
  $$I_{month} = P \times \frac{r}{12}, \quad P_{closing} = P + I_{month} - \text{Payment}$$

### Policy 20: Timezone & Period Boundary Normalization
- All timestamps are persisted in UTC (`TIMESTAMPTZ`).
- Calendar period boundaries (month starts, quarter ends, leap year February 29ths) are evaluated in the tenant's configured financial timezone (e.g., `Asia/Kolkata` for India).

---

## 3. Numeric Precision Policy

| Financial Metric | Database Type | Python Type | Rounding Mode |
| :--- | :--- | :--- | :--- |
| **Budget Allocations & Actuals** | `NUMERIC(18, 4)` | `Decimal` | `ROUND_HALF_UP` |
| **Goal Targets & Contributions** | `NUMERIC(18, 4)` | `Decimal` | `ROUND_HALF_UP` |
| **Forecasted Cash Balances** | `NUMERIC(18, 4)` | `Decimal` | `ROUND_HALF_UP` |
| **Utilization & Progress %** | `NUMERIC(7, 4)` | `Decimal` | 4 decimal places (e.g. `87.5250%`) |
| **Interest Rates & Ratios** | `NUMERIC(7, 4)` | `Decimal` | 4 decimal places |
| **Foreign Exchange Rates** | `NUMERIC(18, 8)` | `Decimal` | 8 decimal places |
