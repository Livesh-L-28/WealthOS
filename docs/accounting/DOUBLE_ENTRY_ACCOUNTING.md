# WealthOS — Double-Entry Accounting Core Specification

## 1. Fundamentals & Core Invariants

WealthOS employs an immutable, deterministic double-entry general ledger as the single source of truth for all posted financial activity. Every financial transaction is represented as a balanced set of debit and credit entries.

### 1.1 The Fundamental Accounting Equation

$$\text{Assets} \equiv \text{Liabilities} + \text{Equity} + (\text{Income} - \text{Expenses})$$

Rearranged into debit and credit normal balances:

$$\text{Total Debits (Assets + Expenses)} \equiv \text{Total Credits (Liabilities + Equity + Income)}$$

### 1.2 Mathematical Journal Balance Invariant

Every posted journal entry $J$ containing $n \ge 2$ journal lines must strictly satisfy:

$$\sum_{i=1}^n \text{Debit}_i \equiv \sum_{i=1}^n \text{Credit}_i$$

Where:
- $\text{Debit}_i \ge 0$ and $\text{Credit}_i \ge 0$ in tenant functional currency.
- Exactly one of $(\text{Debit}_i > 0, \text{Credit}_i = 0)$ or $(\text{Credit}_i > 0, \text{Debit}_i = 0)$ holds true for each line.
- Fractional paise/cents are preserved using fixed-point `NUMERIC(18, 4)` and Python `Decimal`.
- Floating-point arithmetic (`float`, `double`) is strictly banned.

---

## 2. Account Categories & Normal Balances

| Account Type | Category Code | Normal Balance | Balance Calculation Formula | Example Accounts |
| :--- | :--- | :--- | :--- | :--- |
| **ASSET** | `1xxx` | **DEBIT** | $\sum \text{Debits} - \sum \text{Credits}$ | Bank accounts, Cash, Investments, Property |
| **LIABILITY** | `2xxx` | **CREDIT** | $\sum \text{Credits} - \sum \text{Debits}$ | Credit Cards, Mortgages, Personal Loans |
| **EQUITY** | `3xxx` | **CREDIT** | $\sum \text{Credits} - \sum \text{Debits}$ | Opening Balance Equity, Retained Capital |
| **INCOME** | `4xxx` | **CREDIT** | $\sum \text{Credits} - \sum \text{Debits}$ | Salary, Interest, Dividends, Realized Capital Gains |
| **EXPENSE** | `5xxx` | **DEBIT** | $\sum \text{Debits} - \sum \text{Credits}$ | Groceries, Rent, Utilities, Loan Interest |

---

## 3. Standard Transaction Scenarios

### Scenario A — Initial Cash Deposit
A user deposits ₹50,000 into a bank account during onboarding:
- **Debit:** Bank Account (`1020`, Asset) ₹50,000.0000
- **Credit:** Opening Balance Equity (`3010`, Equity) ₹50,000.0000

### Scenario B — Salary Received
A user receives ₹60,000 monthly salary:
- **Debit:** Bank Account (`1020`, Asset) ₹60,000.0000
- **Credit:** Salary Income (`4010`, Income) ₹60,000.0000

### Scenario C — Expense Paid
A user pays ₹5,000 for groceries using debit card:
- **Debit:** Grocery Expense (`5010`, Expense) ₹5,000.0000
- **Credit:** Bank Account (`1020`, Asset) ₹5,000.0000

### Scenario D — Transfer Between Owned Accounts
A user transfers ₹10,000 from Savings to Checking account:
- **Debit:** Destination Bank Checking (`1020`, Asset) ₹10,000.0000
- **Credit:** Source Bank Savings (`1030`, Asset) ₹10,000.0000
*(Note: Pure asset reallocation; no income or expense impact).*

### Scenario E — Loan Received
A user receives a loan disbursement of ₹2,00,000:
- **Debit:** Bank Account (`1020`, Asset) ₹2,00,000.0000
- **Credit:** Personal Loan Liability (`2100`, Liability) ₹2,00,000.0000
*(Note: Inflow is a liability, not income).*

### Scenario F — Loan Repayment (Principal + Interest)
A user repays a loan installment of ₹11,000 (₹10,000 principal + ₹1,000 interest):
- **Debit:** Personal Loan Liability (`2100`, Liability) ₹10,000.0000
- **Debit:** Loan Interest Expense (`5080`, Expense) ₹1,000.0000
- **Credit:** Bank Account (`1020`, Asset) ₹11,000.0000

### Scenario G — Investment Purchase
A user purchases mutual fund units for ₹20,000 from their bank:
- **Debit:** Mutual Funds Investment (`1250`, Asset) ₹20,000.0000
- **Credit:** Bank Account (`1020`, Asset) ₹20,000.0000
*(Note: Asset exchange, not an expense).*
