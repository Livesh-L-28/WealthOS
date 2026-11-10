# WealthOS Mobile — Backend API Integration Matrix

> **Verification Date:** November 9, 2026  
> **Backend Base URL:** Configurable (`10.0.2.2:8000` on Android / `127.0.0.1:8000` on iOS/Web / `EXPO_PUBLIC_API_URL`)  
> **Backend Health:** All 19 domain routers verified running on FastAPI v1 with PostgreSQL 16 RLS.  

---

## 1. Domain-by-Domain Integration Matrix

| Domain | Actual Endpoint | HTTP Method | Mobile Service | Screen / Modal | Status |
| :--- | :--- | :---: | :--- | :--- | :---: |
| **Authentication** | `/api/v1/auth/login` | `POST` | `client.ts` / `AuthScreen.tsx` | `AuthScreen` | **Verified & Active** |
| **Authentication** | `/api/v1/auth/register` | `POST` | `client.ts` / `AuthScreen.tsx` | `AuthScreen` | **Verified & Active** |
| **Authentication** | `/api/v1/auth/me` | `GET` | `restoreActiveSession()` | `App.tsx` (Boot) | **Verified & Active** |
| **Authentication** | `/api/v1/auth/refresh` | `POST` | `restoreActiveSession()` | `App.tsx` (Token Rotation) | **Verified & Active** |
| **Authentication** | `/api/v1/auth/logout` | `POST` | `clearAuthenticatedSession()` | `EnterpriseDrawer` / `Settings` | **Verified & Active** |
| **Tenancy / Workspaces**| `/api/v1/tenants` | `GET` | `apiClient.listWorkspaces()` | `EnterpriseDrawer` / `Settings` | **Verified & Active** |
| **Tenancy / Workspaces**| `/api/v1/tenants/{id}/switch` | `POST` | `apiClient.switchWorkspace()`| `EnterpriseDrawer` / `Settings` | **Verified & Active** |
| **Accounting / Chart of Accounts**| `/api/v1/accounting/accounts` | `GET` | `accountingService.fetchAccounts` | `AccountsScreen`, `OverviewScreen` | **Verified & Active** |
| **Accounting / Auto-Seed**| `/api/v1/accounting/accounts/seed` | `POST` | `accountingService.fetchAccounts` | `AccountsScreen` (Auto-seed) | **Verified & Active** |
| **Accounting / Custom Accounts**| `/api/v1/accounting/accounts` | `POST` | `accountingService.createAccount` | `ConnectAccountModal` | **Verified & Active** |
| **Accounting / Account Balances**| `/api/v1/accounting/accounts/{id}/balance` | `GET` | `accountingService.fetchAccounts` | `AccountsScreen`, `OverviewScreen` | **Verified & Active** |
| **Accounting / Double-Entry Journals**| `/api/v1/accounting/journals` | `GET` | `accountingService.fetchTransactions`| `AccountsScreen` (Transactions sub-tab) | **Verified & Active** |
| **Accounting / Direct Posting**| `/api/v1/accounting/journals/post-direct` | `POST` | `accountingService.postTransaction` | `AddTransactionModal` | **Verified & Active** |
| **Accounting / Transfers** | `/api/v1/accounting/journals/post-direct` | `POST` | `accountingService.transferFunds` | `TransferFundsModal` | **Verified & Active** |
| **Accounting / Trial Balance**| `/api/v1/accounting/reports/trial-balance` | `GET` | `accountingService.fetchReconciliation`| `ReconciliationScreen`, `ReconciliationModal` | **Verified & Active** |
| **Budgets / Envelopes** | `/api/v1/budgets` | `GET` | `budgetService.fetchBudgets` | `BudgetsScreen`, `OverviewScreen` | **Verified & Active** |
| **Budgets / Auto-Seed** | `/api/v1/budgets/categories/seed` | `POST` | `budgetService.fetchBudgets` | `BudgetsScreen` (Auto-seed) | **Verified & Active** |
| **Budgets / Create Envelope**| `/api/v1/budgets` | `POST` | `budgetService.createBudget` | `CreateBudgetModal` | **Verified & Active** |
| **Goals & Planning** | `/api/v1/goals` | `GET` | `goalsService.fetchGoals` | `BudgetsScreen` (Goals sub-tab) | **Verified & Active** |
| **Goals & Planning** | `/api/v1/goals` | `POST` | `goalsService.createGoal` | `CreateGoalModal` | **Verified & Active** |
| **Goals / Savings Deposit**| `/api/v1/goals/{id}/contributions` | `POST` | `goalsService.depositSavings` | `BudgetsScreen` (Goal cards) | **Verified & Active** |
| **Investments / Holding Lots**| `/api/v1/investments/lots` | `GET` | `investmentsService.fetchHoldings`| `PortfolioScreen`, `OverviewScreen` | **Verified & Active** |
| **Investments / Portfolio Summary**| `/api/v1/investments/portfolio` | `GET` | `investmentsService.fetchHoldings`| `PortfolioScreen` (Hero Card) | **Verified & Active** |
| **Investments / Acquisitions**| `/api/v1/investments/transactions/buy` | `POST` | `investmentsService.addHoldingLot`| `AddInvestmentModal` | **Verified & Active** |
| **Investments / Passive Income**| `/api/v1/investments/income` | `GET` | `investmentsService.fetchDividends` | `DividendsScreen` | **Verified & Active** |
| **Liabilities & Debt** | `/api/v1/liabilities` | `GET` | `liabilitiesService.fetchLiabilities`| `LiabilitiesScreen` | **Verified & Active** |
| **Liabilities / Prepayment Sim**| `/api/v1/liabilities/simulate-prepayment` | `POST` | `liabilitiesService.simulatePrepayment`| `LiabilitiesScreen` | **Verified & Active** |
| **Documents / Repository** | `/api/v1/documents` | `GET` | `documentsService.fetchDocuments` | `DocumentsScreen` | **Verified & Active** |
| **Copilot / Conversations**| `/api/v1/copilot/conversations` | `POST` | `copilotService.sendMessage` | `CopilotScreen` | **Verified & Active** |
| **Copilot / Chat Execution**| `/api/v1/copilot/conversations/{id}/messages` | `POST` | `copilotService.sendMessage` | `CopilotScreen` | **Verified & Active** |
| **Analytics / Net Worth Engine**| `/api/v1/analytics/net-worth` | `GET` | `analyticsService.fetchNetWorth` | `NetWorthScreen`, `OverviewScreen` | **Verified & Active** |
| **Analytics / Cash Flow** | `/api/v1/analytics/cash-flow` | `GET` | `analyticsService.fetchCashFlow` | `AnalyticsScreen` | **Verified & Active** |
| **Household / Net Worth** | `/api/v1/households/{id}/net-worth` | `GET` | `householdService.getHouseholdNetWorth`| `HouseholdScreen` | **Verified & Active** |

---

## 2. Request & Response Payload Examples

### 2.1 Direct Double-Entry Journal Posting (`POST /api/v1/accounting/journals/post-direct`)
```json
{
  "entry_date": "2026-11-09",
  "description": "Dining & Restaurant Expense",
  "source_type": "Food & Dining",
  "functional_currency": "INR",
  "lines": [
    {
      "account_id": "71db99a2-87d7-42c5-8412-33d20c269327",
      "debit_amount": "2500.0000",
      "credit_amount": "0.0000",
      "transaction_currency": "INR",
      "description": "Dining & Restaurant Expense"
    },
    {
      "account_id": "782414cc-9714-46b0-8b0a-ab9fea1399d0",
      "debit_amount": "0.0000",
      "credit_amount": "2500.0000",
      "transaction_currency": "INR",
      "description": "Contra balancing line for Dining & Restaurant Expense"
    }
  ]
}
```
*Response: 201 Created — Journal entry posted immutably to PostgreSQL ledger.*

### 2.2 Strategic Goal Contribution (`POST /api/v1/goals/{id}/contributions`)
```json
{
  "amount": "50000.0000",
  "currency": "INR",
  "contribution_date": "2026-11-09"
}
```
*Response: 201 Created — Goal contribution recorded, updating target progress percentage and recalculating feasibility gap.*

