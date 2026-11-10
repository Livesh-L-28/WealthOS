# WealthOS Web & Mobile Product Parity Matrix

> **Audit Date:** November 9, 2026  
> **Platforms:** WealthOS Web (`apps/web` - Next.js 14) vs WealthOS Mobile (`apps/mobile` - React Native / Expo)  
> **Shared Packages:** `@wealthos/api-client`, `@wealthos/shared-types`, `@wealthos/design-tokens`  

---

## 1. Overview & Architectural Consistency

Both clients consume the unified FastAPI backend (`/api/v1`) using shared request and response schemas:
- **Design Tokens:** Both platforms share the dark canvas `#0B0F17`, emerald green `#10B981` accent, sapphire `#3B82F6` secondary, and neutral slate cards.
- **Financial Terminology:** Both clients use identical concepts: Double-Entry Trial Balances, Spending Envelopes, Strategic Goals, FIFO Lot Aging, and Amortization Schedules.
- **INR Numbering:** Both format Indian Rupees using `₹ Lakhs / Crores` grouping (`formatINR`).

---

## 2. Feature Parity Matrix

| Domain / Feature | Web Platform (`apps/web`) | Mobile Platform (`apps/mobile`) | Parity Status | Notes |
| :--- | :--- | :--- | :---: | :--- |
| **Authentication (Sign In / Up)** | Next.js form calling `apiClient.login` | React Native `AuthScreen` calling `apiClient.login` | **Complete Parity** | Both enforce argon2id verification with fail-closed security. |
| **Session Persistence** | `localStorage` + in-memory token elevation | Hardware-backed Expo SecureStore driver | **Complete Parity** | Mobile uses hardware Keychain/Keystore. |
| **Workspace / Tenant Switcher** | Dropdown in settings calling `/tenants/{id}/switch` | `EnterpriseDrawer` calling `/tenants/{id}/switch` | **Complete Parity** | Both switch tenant ID and refresh token. |
| **Executive Net Worth Card** | Area chart + Assets/Liabilities cards | SVG `MobileAreaChart` + Net Worth Hero Card | **Complete Parity** | Mobile uses pure React Native SVG without WebView. |
| **Bank Accounts Listing** | Table with balance, category, and masks | Touch-optimized cards with sync status badges | **Complete Parity** | Identical data fields and balance sources. |
| **Manual Account Creation** | Modal with account code & type | `ConnectAccountModal` manual entry mode | **Complete Parity** | Both post to `/api/v1/accounting/accounts`. |
| **Double-Entry Journal Posting** | Journal entry creator with debit/credit lines | `AddTransactionModal` with automatic balancing | **Complete Parity** | Mobile constructs contra line for mobile simplicity. |
| **Inter-Account Transfers** | Transfer modal with debit/credit selection | `TransferFundsModal` with source/destination picker | **Complete Parity** | Both post transfer journals preserving net worth. |
| **Portfolio & Holdings** | Holdings table with FIFO lots, P&L, NAV | Holdings list with FIFO lot age & unrealized P&L | **Complete Parity** | Identical valuation and return formulas. |
| **Investment Trade Entry** | Buy/Sell trade lot modal | `AddInvestmentModal` with quantity & buy price | **Complete Parity** | Both post to `/investments/transactions/buy`. |
| **Budget Envelopes** | Zero-based category progress bars | Category cards with color-coded progress bars | **Complete Parity** | Both auto-advance spent amount on debit transactions. |
| **Strategic Goals** | Goal cards with milestone targets & progress | Goal cards with milestone presets & progress | **Complete Parity** | Identical shortfall and percentage funded formulas. |
| **Interactive Goal Savings Deposit**| Modal to deposit savings to goal | "Add Savings" action sheet on goal cards | **Complete Parity** | Both call `/api/v1/goals/{id}/contributions`. |
| **Loan & EMI Manager** | Amortization schedule table | `LiabilitiesScreen` with interactive simulator | **Complete Parity** | Interactive principal vs interest split. |
| **Document Vault** | MinIO upload + OCR extraction status | `DocumentsScreen` with OCR status & verification | **Complete Parity** | Ingests statements and reports arithmetic check. |
| **AI Financial Copilot** | Web chat with citations and metrics | Conversational chat with financial metrics pills | **Complete Parity** | Grounded against active tenant ledger context. |
| **Double-Entry Reconciliation** | Trial balance sheet with variance | Trial balance card with sigma check | **Complete Parity** | Both verify total debits match total credits. |
| **Household Finance** | Multi-entity family office member list | `HouseholdScreen` family office entity view | **Complete Parity** | Shared assets and ownership percentages. |
| **Universal Financial Search** | Global search bar (Cmd+K) | `GlobalSearchModal` with category pills | **Complete Parity** | Real-time search across accounts, tx, holdings, goals. |
| **Dark / Light Theme** | CSS variables via `ThemeProvider` | React Context via `theme.ts` `ThemeProvider` | **Complete Parity** | Consistent token values across platforms. |

