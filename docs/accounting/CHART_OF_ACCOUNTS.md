# WealthOS — Chart of Accounts (CoA) Architecture & Standard Template

## 1. Overview & Hierarchy Principles

The Chart of Accounts organizes a tenant's financial landscape into a standard hierarchical numbering scheme. Each account possesses:
1. `account_code`: Unique code per tenant (e.g., `1020`).
2. `account_type`: `ASSET`, `LIABILITY`, `EQUITY`, `INCOME`, `EXPENSE`.
3. `normal_balance`: `DEBIT` or `CREDIT`.
4. `parent_account_id`: Hierarchical rollup parent (nullable). Circular relationships are prohibited.
5. `is_active`: Only active accounts accept postings.
6. `is_system_account`: System-provisioned core accounts protected against deletion.
7. `currency_code`: Functional or denominated currency (default `INR`).

---

## 2. Standard Personal Finance Template

Every newly provisioned workspace receives a pre-seeded, customizable standard chart of accounts:

```text
1000 - ASSETS
  ├── 1010 Cash on Hand (Asset, Debit)
  ├── 1020 Primary Bank Account (Asset, Debit)
  ├── 1030 Secondary Bank Account (Asset, Debit)
  ├── 1100 Liquid Funds & Fixed Deposits (Asset, Debit)
  ├── 1200 Equity Investments (Stocks) (Asset, Debit)
  └── 1250 Mutual Funds (Equity/Debt) (Asset, Debit)

2000 - LIABILITIES
  ├── 2010 Credit Card Payables (Liability, Credit)
  ├── 2100 Personal Loan Liability (Liability, Credit)
  ├── 2200 Home Loan Mortgage (Liability, Credit)
  └── 2300 Vehicle Loan (Liability, Credit)

3000 - EQUITY
  ├── 3010 Opening Balance Equity (Equity, Credit)
  └── 3020 Retained Earnings / Net Worth (Equity, Credit)

4000 - INCOME
  ├── 4010 Salary / Wages Income (Income, Credit)
  ├── 4020 Bonus & Variable Pay (Income, Credit)
  ├── 4100 Interest Income (Income, Credit)
  ├── 4200 Dividend Income (Income, Credit)
  ├── 4300 Realized Capital Gains (Income, Credit)
  └── 4400 Other Passive Income (Income, Credit)

5000 - EXPENSES
  ├── 5010 Groceries & Dining (Expense, Debit)
  ├── 5020 Housing & Rent (Expense, Debit)
  ├── 5030 Utilities (Electricity, Water, Gas) (Expense, Debit)
  ├── 5040 Transportation & Fuel (Expense, Debit)
  ├── 5050 Healthcare & Medical (Expense, Debit)
  ├── 5060 Education & Childcare (Expense, Debit)
  ├── 5070 Entertainment & Subscriptions (Expense, Debit)
  ├── 5080 Loan Interest Expense (Expense, Debit)
  ├── 5090 Bank Fees & Brokerage Charges (Expense, Debit)
  ├── 5100 Taxes & Government Duties (Expense, Debit)
  ├── 5200 Foreign Exchange Loss (Expense, Debit)
  └── 5300 Miscellaneous Expense (Expense, Debit)
```

---

## 3. Account Lifecycle Rules

1. **Unique Code Constraint:** `UNIQUE (tenant_id, account_code)` guarantees no duplicate account codes within any single workspace.
2. **Circular Hierarchy Guard:** Account tree cannot have cycles ($A \to B \to A$). Checked recursively before update.
3. **Delete Protection:** Accounts referenced by posted journal lines cannot be deleted (`ON DELETE RESTRICT`). Users may mark them inactive (`is_active = false`).
4. **Tenant Scoping:** Accounts cannot be transferred across tenants.
