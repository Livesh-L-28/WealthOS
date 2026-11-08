# WealthOS — Phase 5: Liability & Debt Management Architecture Specification

**Document Version:** 1.0.0  
**Phase:** Phase 5 — Wave 2 Master Implementation  
**Status:** IMPLEMENTED & VERIFIED  
**Module Path:** `backend/app/domains/liabilities/`

---

## 1. Executive Summary & Core Objectives

Phase 5 delivers enterprise-grade **Liability and Debt Management** for WealthOS, empowering users to track, service, simulate, and optimize all personal debt obligations. The system encompasses:
1. **Multi-Type Liability Tracking:** Mortgages, Auto Loans, Personal Loans, Education Loans, Lines of Credit, and Credit Cards.
2. **Deterministic Reducing-Balance Amortization Engine:** Exact monthly installment (EMI) calculation, principal/interest decomposition, and cumulative interest tracking using strict Python `Decimal` arithmetic.
3. **Automated Amortization Schedule Generation:** Granular installment schedules (`loan_payment_schedules`) with state-machine status tracking (`UPCOMING`, `DUE`, `PAID`, `OVERDUE`).
4. **General Ledger Integration:** Automatic dual-leg double-entry posting upon debt servicing:
   - Debit: Liability Principal (`2100` Long-Term Debt / `2000` Current Liabilities)
   - Debit: Interest Expense (`5210` Loan Interest Expense)
   - Credit: Bank / Liquid Cash Account (`1010` Cash and Bank)
   - Verification Invariant: $\sum\text{Debit} - \sum\text{Credit} = 0.0000$.
5. **Debt Strategy Optimization Engine:**
   - **Debt Avalanche (APR-first):** Directs surplus cash flow to highest-interest debt first to minimize total interest paid.
   - **Debt Snowball (Balance-first):** Directs surplus cash flow to smallest balance first to maximize psychological momentum.
   - Comprehensive side-by-side comparison including payoff dates, total interest saved, and acceleration months.
6. **Prepayment Simulator:** Accurate simulation of one-time lump-sum prepayments or recurring extra EMI payments, calculating tenure reduction and exact interest savings.
7. **Credit Card Statement & Utilization Intelligence:** Tracking statements, minimum amounts due, revolving credit utilization ($\text{Balance} / \text{Credit Limit}$), and finance charges.

---

## 2. Mathematical Formulations & Precision Invariants

### 2.1 Reducing-Balance EMI Calculation
For an initial principal $P$, annual nominal interest rate $R$ (e.g., $10.5\%$), and total tenure $n$ in months:

1. Monthly interest rate $r$:
   $$r = \frac{R}{12 \times 100} = \frac{R}{1200}$$
2. Fixed monthly installment $EMI$:
   $$EMI = P \times \frac{r(1 + r)^n}{(1 + r)^n - 1}$$
   If $r = 0$ (zero-interest loan), $EMI = \frac{P}{n}$.

All computations are executed with 18 decimal places of intermediate precision before being rounded to 4 decimal places (`ROUND_HALF_UP`) for database persistence: `NUMERIC(18, 4)`. No binary floats (`float`) are permitted.

### 2.2 Schedule Installment Decomposition
For each month $k \in \{1, 2, \dots, n\}$ with beginning principal $B_{k-1}$ ($B_0 = P$):
1. **Interest Component:**
   $$I_k = \text{round}\left(B_{k-1} \times r, 4\right)$$
2. **Principal Component:**
   $$P_k = EMI - I_k$$
3. **Ending Principal:**
   $$B_k = B_{k-1} - P_k$$
4. **Final Installment Adjustment ($k = n$):**
   To prevent residual cent imbalances caused by cumulative rounding:
   $$P_n = B_{n-1}, \quad EMI_n = P_n + I_n, \quad B_n = 0.0000$$

---

## 3. Data Architecture & Tenant Isolation

All liability tables enforce PostgreSQL Row-Level Security (`FORCE ROW LEVEL SECURITY`) bound to `app.current_tenant_id`:

```
+-----------------------------------------------------------+
|                        tenants                            |
+-----------------------------------------------------------+
                            | 1:N
                            v
+-----------------------------------------------------------+
|                      liabilities                          |
| - id: UUID (PK)                                           |
| - tenant_id: UUID (FK -> tenants, RLS)                    |
| - name: VARCHAR(255)                                      |
| - liability_type: VARCHAR(50)                             |
| - lender_name: VARCHAR(255)                               |
| - initial_principal: NUMERIC(18, 4)                       |
| - current_principal: NUMERIC(18, 4)                       |
| - interest_rate: NUMERIC(7, 4)                            |
| - tenure_months: INT                                      |
| - emi_amount: NUMERIC(18, 4)                              |
| - start_date, maturity_date: DATE                         |
| - gl_account_id: UUID (FK -> accounts)                    |
| - is_active: BOOLEAN                                      |
+-----------------------------------------------------------+
         | 1:N                                     | 1:N
         v                                         v
+-----------------------------------+   +------------------------------------+
|     loan_payment_schedules        |   |      credit_card_statements        |
| - id: UUID (PK)                   |   | - id: UUID (PK)                    |
| - tenant_id: UUID (FK, RLS)       |   | - tenant_id: UUID (FK, RLS)        |
| - liability_id: UUID (FK)         |   | - liability_id: UUID (FK)          |
| - installment_number: INT         |   | - statement_date, due_date: DATE   |
| - due_date, paid_date: DATE       |   | - statement_balance: NUMERIC(18, 4)|
| - expected_payment: NUMERIC(18, 4)|   | - minimum_due: NUMERIC(18, 4)      |
| - principal_component: NUMERIC    |   | - credit_limit: NUMERIC(18, 4)     |
| - interest_component: NUMERIC     |   | - available_credit: NUMERIC(18, 4) |
| - remaining_principal: NUMERIC    |   | - finance_charges: NUMERIC(18, 4)  |
| - payment_status: VARCHAR(30)     |   | - status: VARCHAR(20)              |
| - transaction_id: UUID (FK)       |   +------------------------------------+
+-----------------------------------+
```

---

## 4. General Ledger Accounting Posting

When an EMI payment or debt service payment is recorded:
$$\begin{array}{|l|l|c|c|}
\hline
\textbf{Account Code} & \textbf{Account Name} & \textbf{Debit (Dr)} & \textbf{Credit (Cr)} \\
\hline
\text{2100} & \text{Liability (Principal Reduction)} & P_k & - \\
\text{5210} & \text{Loan Interest Expense} & I_k & - \\
\text{1010} & \text{Cash and Bank (Settlement Asset)} & - & EMI_k \\
\hline
\textbf{Total} & & \mathbf{EMI_k} & \mathbf{EMI_k} \\
\hline
\end{array}$$

Invariant: $\Delta \text{Assets} = -\text{Cash}$, $\Delta \text{Liabilities} = -P_k$, $\Delta \text{Equity} = -I_k$ (via expense closing to retained earnings). Accounting equation remains strictly balanced.

---

## 5. Repayment Strategy Comparison Engine

Users with multiple debts can evaluate repayment acceleration options:
1. **Baseline (Minimum Payments):** Every debt is serviced only at its contracted monthly EMI until maturity.
2. **Debt Avalanche:**
   - Rank active liabilities by `interest_rate DESC`.
   - Allocate minimum payment to all debts.
   - Direct all extra monthly repayment cash flow to the debt with the highest APR.
   - When that debt is fully extinguished, roll its entire monthly payment into the next highest APR debt.
   - **Result:** Lowest total interest paid, fastest mathematical debt freedom.
3. **Debt Snowball:**
   - Rank active liabilities by `current_principal ASC`.
   - Allocate minimum payment to all debts.
   - Direct all extra monthly repayment cash flow to the debt with the lowest balance.
   - When that debt is extinguished, roll its payment into the next smallest balance.
   - **Result:** Rapid psychological victories, highest number of early debt closures.

---

## 6. Prepayment Simulation Engine

Given an active liability:
- **Scenario A (Tenure Reduction):** Keep monthly EMI identical; apply lump sum or recurring extra prepayment directly to principal. Calculate how many months earlier the loan closes and the exact cumulative interest saved.
- **Scenario B (EMI Reduction):** Recalculate monthly EMI with the reduced principal over the original remaining tenure. Calculate monthly cash-flow relief.
