# WealthOS Mobile — Financial Data Integrity & Accounting Standards

> **Standard:** Double-Entry General Ledger • Indian Accounting Standards (Ind AS)  
> **Subsystem:** `apps/mobile` & Backend API Integration  
> **Status:** Active & Implemented  

---

## 1. Core Principles of Financial Integrity

WealthOS Mobile adheres to non-negotiable financial integrity rules:
1. **The Backend is the Single Source of Truth:** Authoritative balances and ledger calculations are computed by PostgreSQL 16 using `NUMERIC(18, 4)` and Python `Decimal`. The mobile client never invents independent ledger balances that contradict the backend.
2. **Double-Entry Equilibrium ($\Sigma \text{Debits} = \Sigma \text{Credits}$):** Every recorded financial event is represented by at least two balanced journal lines. Single-sided mutations are rejected.
3. **Immutability of Posted Entries:** Posted journal entries can never be modified or deleted. Any corrections must be executed via reversal entries or balancing adjustments.
4. **Transfer Neutrality:** Inter-account transfers (e.g. moving funds between HDFC Savings and ICICI Demat) are transfer-neutral: they do not impact total income, total expenses, or net worth.
5. **Separation of Valuation:** Realized gains, unrealized gains, capital invested, and corporate dividends are tracked independently and never conflated with liquidity.

---

## 2. Double-Entry Invariant Enforcement in Mobile

### 2.1 Direct Journal Posting (`accountingService.postTransaction`)
When recording a transaction in mobile:
- **For an Expense:**
  - **Debit:** Target Expense Account (e.g. `Food & Dining` or `Housing`) increases by `amount`.
  - **Credit:** Source Asset Account (e.g. `Primary Savings Account`) decreases by `amount`.
- **For Income:**
  - **Debit:** Destination Asset Account (e.g. `Primary Savings Account`) increases by `amount`.
  - **Credit:** Income Account (e.g. `Salary Income` or `Consulting Income`) increases by `amount`.
- **Mathematical Invariant:**
  $$\sum \text{Debits} - \sum \text{Credits} = 0.0000$$

### 2.2 Inter-Account Treasury Transfers (`accountingService.transferFunds`)
When transferring funds between accounts:
- **Debit:** Destination Account (Asset increases by `amount`).
- **Credit:** Source Account (Asset decreases by `amount`).
- **Net Worth Invariant:**
  $$\Delta \text{Net Worth} = \Delta \text{Asset}_{\text{dest}} - \Delta \text{Asset}_{\text{source}} = +A - A = 0$$
- **Cash Flow Invariant:** The transaction is tagged with `source_type: 'TRANSFER'`, excluding it from monthly income or expenditure calculations.

---

## 3. Indian Rupee (INR) Precision & Formatting

Implemented in `apps/mobile/src/formatters.ts`:
- **Indian Numbering System:**
  Formats currency in accordance with the Indian numbering format (Thousands, Lakhs, Crores):
  - `148250.00` $\rightarrow$ `₹1,48,250.00`
  - `4522551.25` $\rightarrow$ `₹45,22,551.25`
  - `10000000.00` $\rightarrow$ `₹1,00,00,000.00` (1 Crore)
  - `-5000.00` $\rightarrow$ `-₹5,000.00`
- **Decimal Quantization:**
  All server payload strings are quantized to 4 decimal places (`.toFixed(4)`) to match backend `NUMERIC(18, 4)` and prevent floating-point representation drift.

---

## 4. Investment Valuation & P&L Mechanics

1. **FIFO Lot Accounting:**
   Securities (Equities and Mutual Funds) are capitalized into discrete First-In-First-Out lots (`apps/mobile/src/types.ts` `InvestmentHolding`).
2. **Unrealized Gain / Loss:**
   $$\text{Unrealized P\&L} = (\text{Current Market Price} \times \text{Quantity}) - (\text{Average Buy Price} \times \text{Quantity})$$
   $$\text{P\&L \%} = \frac{\text{Unrealized P\&L}}{\text{Invested Capital}} \times 100$$
3. **Passive Income Tracking:**
   Dividends are recorded under corporate actions and reflected in passive income yields without affecting trade lot quantities.

---

## 5. Strategic Goal Progress & Shortfall

In `BudgetsScreen.tsx` and `goalsService`:
- **Funded Percentage:**
  $$\text{Funded \%} = \min\left(100, \text{round}\left(\frac{\text{Current Saved}}{\text{Target Corpus}} \times 100\right)\right)$$
- **Remaining Shortfall:**
  $$\text{Shortfall} = \max(0, \text{Target Corpus} - \text{Current Saved})$$
- Incremental savings deposits immediately advance the funded percentage and diminish the remaining shortfall.

