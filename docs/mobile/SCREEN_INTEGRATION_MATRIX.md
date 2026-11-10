# WealthOS Mobile — Comprehensive Screen Integration Matrix

> **Matrix Title:** Production Screen, Navigation & Modal Integration Specification  
> **Verification Date:** November 9, 2026 • 21:51 IST  
> **Repository Commit SHA:** `665248af05caaa730a695a8b6bf4b315fcca6d96`  
> **Status:** All 16 Screens & 10 Modals 100% Wired to Live Backend Services  

---

## 1. Master Screen Integration Inventory

| # | Screen Name | Route / Identifier | Component File | Backend Service & Endpoint | Integration Status |
|:---:|:---|:---|:---|:---|:---:|
| 1 | **Overview / Executive Cockpit** | `overview` | `apps/mobile/App.tsx` | `accountingService.fetchAccounts()`, `transactionService.fetchRecent()`, `/api/v1/accounting/accounts` | **LIVE INTEGRATED** |
| 2 | **Accounts Hub** | `accounts` | `apps/mobile/App.tsx` | `accountingService.fetchAccounts()`, `accountingService.fetchBalances()`, `/api/v1/accounting/accounts/{id}/balance` | **LIVE INTEGRATED** |
| 3 | **Transactions Register** | `transactions` | `apps/mobile/App.tsx` | `transactionService.fetchRecent()`, `transactionService.create()`, `/api/v1/accounting/journals/post-direct` | **LIVE INTEGRATED** |
| 4 | **Net Worth Hub** | `networth` | `src/components/NetWorthScreen.tsx` | `analyticsService.fetchNetWorth()`, `liabilitiesService.compareDebtStrategies()`, `/api/v1/analytics/net-worth` | **LIVE INTEGRATED** |
| 5 | **Investments & Demat Hub** | `investments` | `apps/mobile/App.tsx`, `InvestmentsScreen.tsx` | `investmentsService.fetchHoldings()`, `investmentsService.addHoldingLot()`, `/api/v1/investments/holdings` | **LIVE INTEGRATED** |
| 6 | **Budgets & Spending Envelopes** | `budgets` | `src/components/BudgetsScreen.tsx` | `budgetService.fetchEnvelopes()`, `budgetService.createEnvelope()`, `/api/v1/budget/envelopes` | **LIVE INTEGRATED** |
| 7 | **Strategic Financial Goals** | `goals` | `src/components/BudgetsScreen.tsx` | `goalsService.fetchGoals()`, `goalsService.createGoal()`, `goalsService.deposit()`, `/api/v1/goals` | **LIVE INTEGRATED** |
| 8 | **Cash Flow & Spend Analytics** | `analytics` | `src/components/AnalyticsScreen.tsx` | `analyticsService.fetchCadenceSpend(cadence)`, `/api/v1/analytics/spending/breakdown` | **LIVE INTEGRATED** |
| 9 | **Liabilities & Debt Optimizer** | `liabilities` | `src/components/LiabilitiesScreen.tsx` | `liabilitiesService.fetchSummary()`, `liabilitiesService.compareDebtStrategies()`, `/api/v1/liabilities/debts` | **LIVE INTEGRATED** |
| 10 | **Ledger Reconciliation** | `reconciliation` | `src/components/ReconciliationScreen.tsx` | `reconciliationService.fetchDiscrepancies()`, `accountingService.fetchReconciliation()`, `/api/v1/reconciliation` | **LIVE INTEGRATED** |
| 11 | **Household Wealth Entity** | `household` | `src/components/HouseholdScreen.tsx` | `householdService.fetchHouseholdNetWorth()`, `/api/v1/household/members` | **LIVE INTEGRATED** |
| 12 | **Financial Calendar & Liquidity** | `calendar` | `src/components/FinancialCalendarScreen.tsx` | `cashService.fetchRecurringRules()`, `/api/v1/cash/recurring` | **LIVE INTEGRATED** |
| 13 | **Dividends & Yield Register** | `dividends` | `src/components/DividendsScreen.tsx` | `investmentsService.fetchDividends()`, `/api/v1/investments/dividends` | **LIVE INTEGRATED** |
| 14 | **Smart Document Vault** | `documents` | `src/components/DocumentsScreen.tsx` | `documentsService.fetchDocuments()`, `/api/v1/documents` | **LIVE INTEGRATED** |
| 15 | **Wealth Intelligence Copilot** | `copilot` | `src/components/CopilotScreen.tsx` | `copilotService.ask()`, `/api/v1/ai/copilot/query` | **LIVE INTEGRATED** |
| 16 | **Security & Hardware Enclave** | `settings` | `src/components/SettingsScreen.tsx` | `authService.getSessions()`, `authService.logout()`, `storage.getBiometricStatus()` | **LIVE INTEGRATED** |

---

## 2. Modal Sheet & Action Integration Inventory

| # | Modal Sheet Name | Trigger Location | Component File | Backend Operations | Validation & Safeguards |
|:---:|:---|:---|:---|:---|:---|
| 1 | **Add Transaction** | Header, Tab Dock, Action Bar | `AddTransactionModal.tsx` | Posts dual-entry balanced journal entry via `/api/v1/accounting/journals/post-direct` | Resolves contra account code from COA; wash-trade guard prevents source == contra; positive amount validation. |
| 2 | **Transfer Funds** | Account Card, Quick Actions | `TransferModal.tsx` | Inter-account asset reclassification journal | Rejects identical source and destination accounts; enforces positive amount and valid UUIDs. |
| 3 | **Connect / Add Account** | Accounts Hub `+ Connect` | `ConnectAccountModal.tsx` | Creates new ledger asset account via `/api/v1/accounting/accounts` | Generates RFC 4122 UUID; sets currency, institution code, account type. |
| 4 | **Create Spending Envelope** | Budgets Hub `+ Add Envelope` | `CreateEnvelopeModal.tsx` | Creates monthly category envelope via `/api/v1/budget/envelopes` | Enforces budget ceiling limit; assigns category slug and color code. |
| 5 | **Set Strategic Goal** | Goals Hub `+ Add Goal` | `CreateGoalModal.tsx` | Initializes target wealth milestone via `/api/v1/goals` | Validates target corpus > 0; target year >= current year; initial capital allocation. |
| 6 | **Add Investment Holding** | Portfolio Hub `+ Add Asset` | `AddInvestmentModal.tsx` | Records asset holding lot via `/api/v1/investments/holdings` | Asset class selection (Equities, MFs, Gold, Bonds); units > 0; buy price > 0. |
| 7 | **Import Financial Statement** | Transactions & Overview | `ImportStatementModal.tsx` | Uploads PDF/CSV/OFX statements for OCR & parsing | File format validation (PDF/CSV); token authorization; double-entry journal ingestion. |
| 8 | **Reconciliation Discrepancy** | Reconciliation Hub | `ReconciliationModal.tsx` | Triggers trial balance audit & ledger verification | Equation validation: $\sum \text{Assets} - \sum \text{Liabilities} \equiv \sum \text{Equity}$. |
| 9 | **Envelope Details & Itemization** | Envelope Card Click | `BudgetsScreen.tsx` | Fetches itemized category expenditures from transaction service | Computes utilization percentage, daily burn rate, and ceiling overflow warning. |
| 10 | **Goal Savings Deposit** | Goal Card `+ Add Savings` | `BudgetsScreen.tsx` | Allocates savings deposit to target goal | Updates accumulated capital and decrements remaining shortfall. |

---

## 3. Screen-by-Screen Technical Specifications

### Screen 1: Overview / Executive Cockpit
- **Route:** `overview`
- **Component:** `apps/mobile/App.tsx`
- **Data Hooks:** `accountingService.fetchAccounts()`, `transactionService.fetchRecent()`
- **KPI Metrics Rendered:**
  - Net Worth (Assets minus Liabilities)
  - Monthly Inflows vs Monthly Outflows
  - Cash Runway (Months of survival at current burn)
  - 3-Pill Clarity Status: Daily Burn, Savings Rate, Cash Runway
- **Loading State:** `ActivityIndicator` with branded emerald spinner.
- **Empty State:** "No accounts connected yet" with "Connect First Account" CTA.
- **Error State:** Dismissible error notification banner with "Retry" trigger.

### Screen 2: Accounts Hub
- **Route:** `accounts`
- **Component:** `apps/mobile/App.tsx`
- **Data Hooks:** `accountingService.fetchAccounts()`, `accountingService.getAccountBalance(id)`
- **Information Rendered:**
  - Bank Accounts (HDFC Salary, ICICI Savings, etc.) with verified balance
  - Demat & Investment accounts
  - Liquid Cash & Emergency Fund
  - Last synced timestamp and cryptographic hash
- **Actions:** Connect Account, View Ledger, Refresh Balances.

### Screen 3: Transactions Register
- **Route:** `transactions`
- **Component:** `apps/mobile/App.tsx`
- **Data Hooks:** `transactionService.fetchRecent()`, `transactionService.create()`
- **Information Rendered:**
  - Dual-entry journal list sorted by date descending
  - Account name, category icon, description, amount (Green for Debit, Red for Credit)
  - Categorization filter pills (All, Inflows, Outflows, Investments)
- **Actions:** Add Expense, Add Income, Transfer Funds, Search/Filter.

### Screen 4: Net Worth Hub
- **Route:** `networth`
- **Component:** `apps/mobile/src/components/NetWorthScreen.tsx`
- **Data Hooks:** `analyticsService.fetchNetWorth()`, `liabilitiesService.compareDebtStrategies()`
- **Information Rendered:**
  - Historical Net Worth trend chart
  - Asset Allocation breakdown
  - Liabilities breakdown
  - Debt Payoff Optimizer Engine (Avalanche vs Snowball vs High-Interest First)
  - Amortization schedule and interest savings projection
- **Actions:** Switch debt strategy, adjust monthly extra payment stepper, download audited statement.

### Screen 5: Investments & Demat Hub
- **Route:** `investments`
- **Component:** `apps/mobile/src/components/InvestmentsScreen.tsx` (and `mobile_preview.html`)
- **Data Hooks:** `investmentsService.fetchHoldings()`, `investmentsService.addHoldingLot()`
- **Information Rendered:**
  - Total Investment Portfolio value with live market quotes badge
  - Total Unrealized P&L (₹ and %)
  - Invested Capital vs Current Value
  - Segmented asset filter (All, Equities, Mutual Funds, Active SIPs, Gold & Bonds)
  - Holding cards with shares, avg buy price, LTP, and LTCG/STCG tags
- **Actions:** Add Asset (+ Add Asset button), AI Statement OCR Scan.

### Screen 6: Budgets & Spending Envelopes
- **Route:** `budgets`
- **Component:** `apps/mobile/src/components/BudgetsScreen.tsx`
- **Data Hooks:** `budgetService.fetchEnvelopes()`, `budgetService.createEnvelope()`
- **Information Rendered:**
  - Zero-based monthly spending envelopes
  - Consumed vs Safe Remaining ceiling ratio
  - Dual-tone progress bar with 80% caution indicator
  - 50/30/20 allocation framework compliance indicator
- **Actions:** Tap envelope to view itemized expenditures, create new envelope.

### Screen 7: Strategic Financial Goals
- **Route:** `goals` (or Budgets tab -> Strategic Goals)
- **Component:** `apps/mobile/src/components/BudgetsScreen.tsx`
- **Data Hooks:** `goalsService.fetchGoals()`, `goalsService.createGoal()`
- **Information Rendered:**
  - Goal milestone cards (FIRE, Luxury EV, Villa, Emergency Reserve)
  - Target corpus vs current accumulated capital
  - Funding completion percentage (0% to 100%)
  - Milestone ticks (25%, 50%, 75%) and shortfall calculation
- **Actions:** `+ Add Savings` direct deposit, Create Strategic Goal modal.

### Screen 8: Cash Flow & Spend Analytics
- **Route:** `analytics`
- **Component:** `apps/mobile/src/components/AnalyticsScreen.tsx`
- **Data Hooks:** `analyticsService.fetchCadenceSpend(cadence)`
- **Information Rendered:**
  - Cadence selector tabs: Daily, Weekly, Monthly, Yearly
  - Outflows Hero Executive Card (Total outflows vs Budget ceiling)
  - 3-Column Burn Rate & Runway Indicators (Daily burn, Savings rate, Cash runway)
  - 50/30/20 Framework Audit Card (Needs, Wants, Investments)
  - Category-wise expenditure distribution breakdown
- **Actions:** Switch cadence, inspect category breakdown.

### Screen 9: Liabilities & Debt Optimizer
- **Route:** `liabilities`
- **Component:** `apps/mobile/src/components/LiabilitiesScreen.tsx`
- **Data Hooks:** `liabilitiesService.fetchSummary()`, `liabilitiesService.compareDebtStrategies()`
- **Information Rendered:**
  - Total Debt outstanding across Home Loan, Auto Loan, Credit Cards
  - Weighted Average Interest Rate
  - Total Monthly EMI Commitment
  - Payoff Strategy Comparison (Avalanche saves maximum interest vs Snowball provides early psychological wins)
  - Payoff acceleration slider (+₹5,000 to +₹50,000/mo)
- **Actions:** Select payoff strategy, preview amortization table.

### Screen 10: Ledger Reconciliation & Integrity
- **Route:** `reconciliation`
- **Component:** `apps/mobile/src/components/ReconciliationScreen.tsx`
- **Data Hooks:** `reconciliationService.fetchDiscrepancies()`, `accountingService.fetchReconciliation()`
- **Information Rendered:**
  - Trial Balance Sigma Equality Status ($\sum \text{Debits} \equiv \sum \text{Credits}$)
  - Ledger Zero Variance Badge
  - Unreconciled transaction items and discrepancy alerts
  - Cryptographic audit trail SHA-256 block hash
- **Actions:** Trigger automated bank statement auto-reconciliation, resolve discrepancies.

### Screen 11: Household Wealth & Multi-Entity Management
- **Route:** `household`
- **Component:** `apps/mobile/src/components/HouseholdScreen.tsx`
- **Data Hooks:** `householdService.fetchHouseholdNetWorth()`
- **Information Rendered:**
  - Consolidated Family Net Worth
  - Member breakdown (Primary Owner, Spouse, Minor Child)
  - Shared accounts vs segregated individual accounts
  - Role-Based Access Control (Admin vs Viewer permissions)
- **Actions:** Switch active workspace/member view, invite household member.

### Screen 12: Financial Calendar & Recurring Liquidity
- **Route:** `calendar`
- **Component:** `apps/mobile/src/components/FinancialCalendarScreen.tsx`
- **Data Hooks:** `cashService.fetchRecurringRules()`
- **Information Rendered:**
  - 30-Day Liquidity Net Runway
  - Scheduled cash outflows (EMIs, SIPs, Rent, Utilities)
  - Expected inflows (Salary, Dividends, Consulting)
  - Projected cash dip warning marker if balance drops below threshold
- **Actions:** Filter by Inflows/Outflows, add recurring payment rule.

### Screen 13: Dividends & Yield Register
- **Route:** `dividends`
- **Component:** `apps/mobile/src/components/DividendsScreen.tsx`
- **Data Hooks:** `investmentsService.fetchDividends()`
- **Information Rendered:**
  - Annual Dividend Yield (%)
  - Total Projected Annual Passive Income
  - Historical dividend payout timeline with company ticker, per-share dividend, and credit status
- **Actions:** Filter by Paid / Upcoming, export dividend tax schedule.

### Screen 14: Smart Document Vault
- **Route:** `documents`
- **Component:** `apps/mobile/src/components/DocumentsScreen.tsx`
- **Data Hooks:** `documentsService.fetchDocuments()`
- **Information Rendered:**
  - Bank Statements, Form 16, Tax Assessment Orders, Insurance Policies
  - OCR extraction status (Structured JSON extracted, Journal posted)
  - SHA-256 tamper-evident cryptographic document hash
- **Actions:** Upload document, filter by category, view extraction preview.

### Screen 15: Wealth Intelligence Copilot
- **Route:** `copilot`
- **Component:** `apps/mobile/src/components/CopilotScreen.tsx`
- **Data Hooks:** `copilotService.ask(query)`
- **Information Rendered:**
  - Interactive AI wealth advisor interface
  - Suggested contextual prompts (e.g. "Calculate my tax liability under New Regime", "Am I spending too much on dining?")
  - Verified responses grounded in real tenant ledger data
- **Actions:** Send natural language query, tap suggestion chips.

### Screen 16: Security & Hardware Enclave Settings
- **Route:** `settings`
- **Component:** `apps/mobile/src/components/SettingsScreen.tsx`
- **Data Hooks:** `authService.getSessions()`, `authService.logout()`, `storage.getBiometricStatus()`
- **Information Rendered:**
  - Biometric Enclave Status (Apple Secure Enclave / Android StrongBox Keystore)
  - Active device sessions with IP address, device type, and revoke action
  - Cryptographic audit trail log
  - Offline sync status and queue depth
- **Actions:** Revoke device session, clear local cache, logout session.

