# WealthOS Mobile-to-Web Unification — Deliverable 3: Mobile-to-Web Screen Mapping

**Status:** IMPLEMENTED | CROSS_PLATFORM_VERIFIED | WEB_RUNTIME_VERIFIED  
**Assigned Role:** Principal Web Application Architect & QA Automation Lead  

---

## 1. Complete 16-Screen Mapping Matrix

| # | Mobile Screen Reference | Web Target Route | Functional & Conceptual Alignment | Shared Accounting Entity |
|---|---|---|---|---|
| **1** | `OverviewScreen` (`#screen-overview`) | `/dashboard` | Executive Cockpit, Net Worth Hero, 5-Question Bar, KPIs | Net Worth, Assets, Liabilities, Inflow/Outflow |
| **2** | `AccountsScreen` (`#screen-accounts`) | `/accounts` | 6 Connected Bank/Demat/Loan accounts, institution sync | General Ledger Cash & Liability accounts |
| **3** | `TransactionsScreen` (Accounts ledger) | `/transactions` | Double-entry journal entries, credit/debit filtering | Journal Entry lines, debits & credits |
| **4** | `InvestmentsScreen` (`#screen-investments`) | `/investments` | Multi-asset portfolio, equities, mutual funds, SIPs, SGB | FIFO tax lots, unrealized P&L, NAVs |
| **5** | `AnalyticsScreen` (`#screen-analytics`) | `/analytics` | Cash Flow velocity, 50/30/20 budget framework, burn rate | Cash flow statement, daily/weekly/monthly cadence |
| **6** | `BudgetsScreen` (`#screen-budgets`) | `/budgets` | 6 Expense Envelopes, real-time variance gauges | Budget vs Actual expenditure |
| **7** | `GoalsScreen` (Budgets/Plan subview) | `/goals` | "Bike", "FIRE", "Luxury EV" strategic goals + "+ Add Savings" modal | Equity allocations & Goal escrow sub-ledgers |
| **8** | `NetWorthScreen` (`#screen-net-worth`) | `/net-worth` | Balance Sheet, Debt Amortization (Avalanche/Snowball) | Balance sheet statement, EMI principal/interest |
| **9** | `ReconciliationScreen` (`#screen-reconciliation`)| `/reconciliation` | Discrepancy Control Centre, bank statement matching | Bank statement vs internal journal discrepancies |
| **10**| `DocumentsScreen` (`#screen-documents`) | `/documents` | Document upload, OCR extraction review, GL posting | Statement & contract note artifacts |
| **11**| `HouseholdScreen` (`#screen-household`) | `/household` | Livesh J, Priya J, Family Office Trust resource sharing | Multi-entity household ledger allocation |
| **12**| `CopilotScreen` (`#screen-copilot`) | `/copilot` | Natural language ledger intelligence & verified citations | Read-only SQL/RAG execution engine |
| **13**| `SecurityScreen` (`#screen-security`) | `/settings/security` | Hardware biometric verification, session audit logs | WebAuthn, MFA, session token revocation |
| **14**| `SettingsScreen` (`#screen-settings`) | `/settings` / `/settings/workspaces` | Workspace switching, profile management, currency options | Tenant config, user profile |
| **15**| `AuthScreen` (`#screen-auth`) | `/auth/login` & `/auth/register` | Tenant provisioning, credentials, session restoration | Auth session tokens, tenant isolation |
| **16**| `DeleteAccountScreen` | `/delete-account` | Permanent account and tenant erasure with audit verification | GDPR/DPDP compliant tenant soft/hard deletion |

---

## 2. Shared Workflows & Interaction Equivalents

1. **Transaction Entry Workflow:**
   - *Mobile:* FAB `+` -> Choose Credit/Debit -> Select Account -> Enter Amount -> Confirm -> Instant local state update & journal reference.
   - *Web:* `Header` / `Dashboard` "+ Add Transaction" button -> `AddTransactionModal` -> Same field validations -> Journal posting -> Instant table update.

2. **Strategic Goal Savings Deposit Workflow:**
   - *Mobile:* Strategic Goal Card -> "+ Add Savings" -> Select Account -> Enter ₹25,000 -> Deposit -> Goal progress increases -> Journal entry posted.
   - *Web:* `/goals` page -> Strategic Goal Card -> "+ Add Savings" modal -> Select Account -> Enter amount -> Confirm -> Balance updated.

3. **Budget Envelope Management Workflow:**
   - *Mobile:* Budgets list -> Tap Envelope -> Double-entry expenditures sheet -> Add envelope modal.
   - *Web:* `/budgets` page -> Interactive variance cards -> Expenditure table -> `CreateBudgetModal`.

