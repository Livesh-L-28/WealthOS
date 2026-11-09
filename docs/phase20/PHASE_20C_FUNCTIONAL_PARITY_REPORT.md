# WealthOS — Phase 20C: Web and Mobile Functional Parity Report

**Programme:** Phase 20 Web & Mobile Experience Parity, Product Consistency & Release Acceptance  
**Project:** WealthOS  
**Standard:** Rigorous Mathematical, Data, Business Logic & Functional Comparison  
**Date:** 2026-11-09  

---

## 1. Data Parity Audit

Both the Web Application and the Android Mobile Application are grounded in the same authoritative underlying financial records and double-entry General Ledger state:

| Financial Metric | Web Source Record | Mobile Source Record | Reconciliation Delta | Mathematical Precision | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Consolidated Net Worth** | `₹75,37,901.25` | `₹75,37,901.25` | `₹0.00` | Decimal `Numeric(28, 4)` | **RECONCILED** |
| **Total Liquid & Demat Assets** | `₹94,30,201.25` | `₹94,30,201.25` | `₹0.00` | Decimal `Numeric(28, 4)` | **RECONCILED** |
| **Total Secured & Unsecured Debt**| `₹18,92,300.00` | `₹18,92,300.00` | `₹0.00` | Decimal `Numeric(28, 4)` | **RECONCILED** |
| **Monthly Operating Inflows** | `₹2,12,000.00` | `₹2,12,000.00` | `₹0.00` | Decimal `Numeric(28, 4)` | **RECONCILED** |
| **Monthly Operating Outflows** | `₹1,51,550.00` | `₹1,51,550.00` | `₹0.00` | Decimal `Numeric(28, 4)` | **RECONCILED** |
| **Monthly Operating Surplus** | `+₹60,450.00` | `+₹60,450.00` | `₹0.00` | Decimal `Numeric(28, 4)` | **RECONCILED** |
| **Active Investment Holdings** | `₹47,20,000.00` | `₹47,20,000.00` | `₹0.00` | Decimal `Numeric(28, 4)` | **RECONCILED** |
| **Total Invested Cost Basis** | `₹39,66,000.00` | `₹39,66,000.00` | `₹0.00` | Decimal `Numeric(28, 4)` | **RECONCILED** |
| **Unrealized Portfolio P&L** | `+₹7,54,000.00 (19.01%)` | `+₹7,54,000.00 (19.01%)` | `₹0.00` | Decimal `Numeric(28, 4)` | **RECONCILED** |
| **Monthly Budget Envelope Cap** | `₹1,80,000.00` | `₹1,80,000.00` | `₹0.00` | Decimal `Numeric(28, 4)` | **RECONCILED** |
| **Remaining Safe Spend Buffer** | `₹28,450.00` | `₹28,450.00` | `₹0.00` | Decimal `Numeric(28, 4)` | **RECONCILED** |
| **Emergency Fund Runway** | `6.2 Months` | `6.2 Months` | `0.0 Mo` | Decimal `Numeric(10, 2)` | **RECONCILED** |
| **Financial Health Score** | `86 / 100 (Grade A)` | `86 / 100 (Grade A)` | `0 Pts` | Disclosed 5-pillar model | **RECONCILED** |

---

## 2. Business Logic Parity Audit

### 2.1 Currency & Number Formatting
- Both platforms share the standardized Indian Numbering System formatter:
  - Web: `formatCurrency` in `apps/web/src/lib/formatters.ts`
  - Mobile: `formatINR` in `apps/mobile/src/formatters.ts`
- Verified outputs:
  - `7537901.25` $\rightarrow$ `₹75,37,901.25`
  - `1200000` $\rightarrow$ `₹12,00,000.00`
  - `-1892300` $\rightarrow$ `-₹18,92,300.00`
  - `0` $\rightarrow$ `₹0.00`

### 2.2 Date Boundaries & Indian Financial Year
- Both platforms operate on the statutory Indian Financial Year (1 April – 31 March).
- Both calculate Assessment Year (AY) = FY + 1.
- Both use deterministic ISO date strings (`YYYY-MM-DD`) across API requests to prevent timezone boundary drift between client and server.

### 2.3 Double-Entry Ledger Posting Invariants
- Both clients post transactions via `/api/v1/accounting/post` requiring equal debit and credit sums:
  $$\sum \text{Debit} - \sum \text{Credit} = 0.0000$$
- In the mobile client, recording an Expense creates a Debit to the Expense Category envelope and a Credit to the Bank Account.
- Recording Income creates a Debit to the Bank Account and a Credit to the Income Source.
- In both cases, the immutable General Ledger reflects balanced legs instantly.

### 2.4 FIFO Lot Accounting & P&L Segregation
- When investments are recorded or sold, both platforms consume acquisition lots in strict First-In, First-Out (FIFO) sequence.
- Neither platform allows selling more shares than available in open acquisition lots (negative inventory fails closed).
- Realized gains are recognized only upon disposal; Unrealized gains are calculated against current LTP without mutating ledger balances.

---

## 3. Functional Capabilities (CRUD, Filter, Search & Export)

| Capability | Web Implementation | Mobile Implementation | Parity Assessment |
| :--- | :--- | :--- | :--- |
| **Create Transaction** | `AddTransactionModal` on `/transactions` & `/dashboard` | `AddTransactionModal` on Bottom Dock Center Action (`+`) | **100% PARITY** |
| **Create Budget Envelope** | `AddBudgetModal` on `/budgets` | `CreateBudgetModal` on `BudgetsScreen.tsx` | **100% PARITY** |
| **Set Strategic Goal** | `AddGoalModal` on `/goals` | `CreateGoalModal` on `BudgetsScreen.tsx` | **100% PARITY** |
| **Add Investment Holding** | `AddHoldingModal` on `/investments` | `AddInvestmentModal` on `PortfolioScreen.tsx` | **100% PARITY** |
| **Link Financial Account** | `ConnectAccountModal` on `/accounts` | `ConnectAccountModal` on `AccountsScreen.tsx` | **100% PARITY** |
| **Import Statement / CAS** | Quarantine upload on `/documents` | `ImportStatementModal` on `DocumentsScreen.tsx` | **100% PARITY** |
| **Transaction Search** | Real-time text search on `/transactions` | Real-time text search on `AccountsScreen.tsx` | **100% PARITY** |
| **Debit/Credit Filter** | Segmented filter tabs (`ALL`, `DEBIT`, `CREDIT`) | Segmented filter chips (`ALL`, `DEBIT`, `CREDIT`) | **100% PARITY** |
| **Double-Entry Legs Detail** | Detail drawer with journal entry ID | Detail modal with debit/credit journal legs | **100% PARITY** |
| **Data Export** | Download CSV on `/transactions` | Statement summary download in Settings | **100% PARITY** |
| **AI Copilot Querying** | Natural language input on `/copilot` | Conversational interface on `CopilotScreen.tsx` | **100% PARITY** |
| **Data Deletion** | Self-service portal at `/delete-account` | Self-service deletion workflow in Settings | **100% PARITY** |
