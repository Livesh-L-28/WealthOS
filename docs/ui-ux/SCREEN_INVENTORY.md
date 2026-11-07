# WEALTHOS — COMPREHENSIVE SCREEN INVENTORY & SPECIFICATION

**Document Reference:** WOS-UX-SCR-001  
**Version:** 1.0.0-RELEASE-CANDIDATE  
**Status:** APPROVED / FROZEN BASELINE  
**Classification:** Product Design Specification  

---

## 1. INVENTORY SUMMARY

WealthOS defines **65 discrete human-designed application screens, modals, and slide-over drawers** across 9 operational functional clusters. Every entry specifies:
- **Screen ID & Title**
- **Type:** Full Page, Modal Dialog, Slide-over Drawer, or Tab View
- **URL Route**
- **Primary Financial Purpose & Analytical Job**
- **Core Data Elements & Visual Displays**
- **Key Actions & Interactive Controls**
- **Supported State Variations:** Loading, Empty, Populated, Error, Stale

### Cluster Summary (Audited Count: 65 Screens)
- **Cluster 1: Authentication & Onboarding:** 6 screens
- **Cluster 2: Main Dashboard & Executive Command:** 10 views / widgets
- **Cluster 3: Accounts & Cash Flow:** 8 screens
- **Cluster 4: Investments & Capital Markets:** 8 screens
- **Cluster 5: Dividends & Passive Income:** 6 screens
- **Cluster 6: Assets & Liabilities:** 6 screens
- **Cluster 7: Universal Document Intelligence:** 7 screens
- **Cluster 8: Financial Intelligence, Goals & Reports:** 6 screens
- **Cluster 9: Workspace, Security & Administration:** 8 screens
- **TOTAL AUDITED SCREENS:** **65 screens**

---

## 2. DETAILED CLUSTER BREAKDOWN

### Cluster 1: Authentication & Onboarding (6 Screens)

| Screen ID | Title | Route / Type | Purpose | Core Elements | Primary Actions |
|---|---|---|---|---|---|
| **SCR-AUTH-01** | Sign In | `/login` (Page) | Secure credentials entry. | Email, password, "Remember device" checkbox. | Sign In, Forgot Password link, Register link. |
| **SCR-AUTH-02** | Registration | `/register` (Page) | New account registration. | Name, email, password strength meter, TOS acceptance. | Create Account. |
| **SCR-AUTH-03** | Forgot Password | `/forgot-password` (Page)| Password reset initiation. | Email input, security captcha notice. | Send Reset Link, Return to Login. |
| **SCR-AUTH-04** | MFA Verification | `/mfa/verify` (Page) | TOTP 2FA challenge. | 6-digit numeric input boxes, "Use recovery code" link. | Verify Token, Resend/Help. |
| **SCR-AUTH-05** | Session Expiration | Modal Overlay | Re-authentication prompt without losing page state. | Password / biometric prompt, countdown timer. | Re-authenticate, Sign Out. |
| **SCR-AUTH-06** | Onboarding Flow | `/onboarding/*` (Wizard)| Initial security, base currency, and first account setup. | Currency selector (INR/USD), TOTP QR code, backup codes download. | Complete Setup, Skip to Dashboard. |

---

### Cluster 2: Main Dashboard (10 Views / Widgets)

| Screen ID | Title | Route / Type | Purpose | Core Elements | Primary Actions |
|---|---|---|---|---|---|
| **SCR-DASH-01** | Executive Wealth Summary | `/dashboard` (Top Grid)| At-a-glance financial health. | Total Net Worth, Liquid Cash, Total Investments, Total Liabilities cards. | Drilldown into Net Worth. |
| **SCR-DASH-02** | Assets & Liabilities Ratio | Widget / Card | Solvency & debt ratio. | Debt-to-Asset ratio meter, liquid ratio. | View Liabilities. |
| **SCR-DASH-03** | Historical Net Worth Curve | Widget / Chart | Wealth trajectory over time. | ECharts area chart with 1M, 6M, 1Y, 5Y, ALL toggles. | Toggle benchmark, hover point-in-time value. |
| **SCR-DASH-04** | Monthly Cash Flow | Widget / Card | Income vs Expense balance. | Monthly income bar, expense bar, net savings, savings rate %. | View Cash Flow report. |
| **SCR-DASH-05** | Portfolio Performance | Widget / Card | Capital markets summary. | Day P&L, Overall P&L, Portfolio XIRR badge. | Navigate to Holdings. |
| **SCR-DASH-06** | Asset Allocation Snapshot | Widget / Donut | Macro asset distribution. | Donut chart (Equities, Mutual Funds, Gold, Real Estate, Cash). | Click slice to filter holdings. |
| **SCR-DASH-07** | Recent Transactions | Widget / Table | Real-time ledger activity. | Last 5 transactions with merchant icons, category pills, amounts. | "+ Add Transaction", View All. |
| **SCR-DASH-08** | Upcoming Bills & Due Dates | Widget / Calendar | Liquidity planning. | Next 7 days bills (Credit cards, EMIs, Utilities) with countdown pills. | Mark as Paid, View Schedule. |
| **SCR-DASH-09** | Financial Goals Progress | Widget / Progress | Milestone tracking. | Active goals, target amounts, visual percentage progress bars. | "+ Create Goal". |
| **SCR-DASH-10** | Sync Status & Alerts | Widget / Banner | Market and feed integrity. | Data freshness pill, unread alerts count, pending statement reviews. | Review Documents. |

---

### Cluster 3: Accounts & Cash Flow (8 Screens)

| Screen ID | Title | Route / Type | Purpose | Core Elements | Primary Actions |
|---|---|---|---|---|---|
| **SCR-ACC-01** | Account Directory | `/accounts` (Page) | Consolidated list of financial repositories. | Categorized cards (Bank Accounts, Credit Cards, Wallets, Cash) with balances. | "+ Add Account", "Transfer Funds". |
| **SCR-ACC-02** | Account Detail & Ledger | `/accounts/[id]` (Page) | Account statement & reconciliations. | Account metadata, cleared vs pending balance, paginated journal table. | "Upload Statement", "Reconcile". |
| **SCR-TXN-01** | Master Transaction Register| `/transactions` (Page) | Complete double-entry ledger register. | Filterable data table (Date, Payee, Category, Account, Debit/Credit). | Filter, Search, Export CSV. |
| **SCR-TXN-02** | Transaction Detail | Drawer (`#tx-detail`) | Audit and split inspection. | Backing journal entry, debit/credit lines, attachments, category. | Edit, Split, Reverse, Delete. |
| **SCR-TXN-03** | Split Transaction Builder | Modal Dialog | Allocate purchase across categories. | Parent transaction amount, split lines table, remaining balance monitor. | Add Split Line, Save Split. |
| **SCR-TXN-04** | Internal Transfer Builder | Modal Dialog | Move funds between owned accounts. | Source account, destination account, amount, UTR reference number. | Post Transfer. |
| **SCR-TXN-05** | Categorization Rules | `/settings/categories` | Rule-based transaction tagging. | Category hierarchy tree, merchant auto-tagging rule conditions. | "+ New Category", Edit Rules. |
| **SCR-TXN-06** | Recurring Schedules | `/expenses/recurring` | Track ongoing subscriptions & EMIs. | Active subscriptions, billing frequency, next due date, monthly total. | "+ Add Recurring Bill". |

---

### Cluster 4: Investments & Capital Markets (8 Screens)

| Screen ID | Title | Route / Type | Purpose | Core Elements | Primary Actions |
|---|---|---|---|---|---|
| **SCR-INV-01** | Investment Overview | `/investments` (Page) | Capital markets command center. | Total portfolio value, day change, overall P&L, broker accounts summary. | "Record Trade", "Import CAS". |
| **SCR-INV-02** | Consolidated Holdings | `/investments/holdings` | Comprehensive securities inventory. | Table: Symbol, ISIN, Asset Class, Quantity, Avg Cost, CMP, Current Value, P&L. | Sort, Filter by Broker/Class. |
| **SCR-INV-03** | Instrument Detail View | `/investments/holdings/[id]`| Single security deep-dive. | Historical price chart, company fundamentals, open purchase lots, trade history. | "Buy More", "Sell Units". |
| **SCR-INV-04** | Trade Execution History | `/investments/trades` | Chronological trade confirmations. | Trade date, Type (BUY/SELL), Units, Price, Brokerage, STT/Charges, Net Amount. | "Record Trade", Filter. |
| **SCR-INV-05** | FIFO Tax Lots Inspector | `/investments/lots` | Granular tax lot tracking. | Lot acquisition date, original units, remaining units, cost price, LTCG/STCG status. | Inspect Allocations. |
| **SCR-INV-06** | Capital Gains P&L Report | `/investments/pnl` | Realized vs Unrealized gain audit. | Realized LTCG, Realized STCG, Unrealized mark-to-market gain, tax estimate. | Export Tax Schedule. |
| **SCR-INV-07** | Asset & Sector Allocation | `/investments/allocation` | Risk & concentration analytics. | Sunburst & Treemap charts (Market cap, sectors, geographic exposure). | Rebalance Simulator. |
| **SCR-INV-08** | Performance & XIRR Benchmarks| `/investments/performance`| Annualized return analytics. | Portfolio XIRR curve plotted against NIFTY 50 / S&P 500 benchmarks. | Change Benchmark, Change Range. |

---

### Cluster 5: Dividends & Passive Income (6 Screens)

| Screen ID | Title | Route / Type | Purpose | Core Elements | Primary Actions |
|---|---|---|---|---|---|
| **SCR-DIV-01** | Dividend Directory | `/dividends` (Page) | Master dividend ledger. | Table: Announcement Date, Ex-Date, Payment Date, Shares Held, DPS, Gross, Net. | "+ Record Dividend", Export. |
| **SCR-DIV-02** | Expected vs Received Income | Card / Graph | Passive income forecasting. | Stacked bar chart: Declared vs Received vs TDS Withheld per month. | Filter by FY. |
| **SCR-DIV-03** | Record Dividend Modal | Modal Dialog | Log received or declared dividend. | Ticker selector, Ex-date, Holding units, DPS, Gross amount, TDS, Net amount. | Post Dividend Entry. |
| **SCR-DIV-04** | Fixed Deposit Interest Tracker| `/dividends/interest` | Bank FD & bond coupon yields. | Active FDs, Principal, Interest Rate, Accrued Interest, Maturity Date. | "+ Add Deposit". |
| **SCR-DIV-05** | TDS & Form 26AS Reconciliation| `/dividends/tds` | Direct tax withholding audit. | Gross dividend, Section 194 TDS deducted, Bank credit reference, 26AS match pill. | Confirm Match. |
| **SCR-DIV-06** | Dividend Yield Analytics | Card / Widget | Portfolio yield on cost analysis. | Current Dividend Yield %, Yield on Cost (YOC) %, Top yielding securities. | Drilldown into security. |

---

### Cluster 6: Assets & Liabilities (6 Screens)

| Screen ID | Title | Route / Type | Purpose | Core Elements | Primary Actions |
|---|---|---|---|---|---|
| **SCR-AST-01** | Asset Register | `/assets` (Page) | Directory of non-liquid wealth. | Categorized cards: Real Estate, Gold/Jewelry, Vehicles, Private Equity. | "+ Add Asset". |
| **SCR-AST-02** | Asset Valuation History | `/assets/[id]/valuations`| Historical appraisal tracking. | Revaluation curve, appraisal source (Registrar, Chartered Valuer), notes. | "+ Record Revaluation". |
| **SCR-LIA-01** | Liability Register | `/liabilities` (Page) | Overview of debts & credit lines. | Home loans, auto loans, personal loans, credit card balances, overall debt. | "+ Add Liability". |
| **SCR-LIA-02** | Loan Detail & Amortization | `/liabilities/[id]` (Page)| Loan payback schedule. | Principal outstanding, APR %, Monthly EMI, Loan term, Prepayment impact. | "Simulate Prepayment". |
| **SCR-LIA-03** | Full EMI Amortization Schedule| Tab View | Month-by-month principal/interest. | Table: Month #, Date, EMI, Principal Portion, Interest Portion, Closing Balance. | Export Amortization Table. |
| **SCR-NW-01** | Comprehensive Net Worth | `/net-worth` (Page) | Complete balance sheet view. | Assets column vs Liabilities column = Net Worth; point-in-time calculation logs. | Filter by Date, Print Statement. |

---

### Cluster 7: Universal Document Intelligence (7 Screens)

| Screen ID | Title | Route / Type | Purpose | Core Elements | Primary Actions |
|---|---|---|---|---|---|
| **SCR-DOC-01** | Upload Center | `/documents/upload` | Multi-format file ingestion. | Drag-and-drop dropzone, password input for encrypted PDFs, progress bar. | Select Files, Start Upload. |
| **SCR-DOC-02** | Document Vault Library | `/documents` (Page) | Master repository of statements. | File cards/table: Name, Type, Size, Upload Date, Parsing Status, SHA-256 hash. | Download, Review, Delete. |
| **SCR-DOC-03** | Extraction Processing Status | Status Badge / Drawer| Real-time background job logs. | Stage indicator (MIME Check $\rightarrow$ Storage $\rightarrow$ OCR $\rightarrow$ Canonical Schema). | Cancel Job, View Logs. |
| **SCR-DOC-04** | Side-by-Side Review Workspace| `/documents/[id]/review` | Human review & approval gate. | Split 50/50: PDF/Image viewer with zoom/pan (left) | Extracted editable rows (right). | "Approve & Post", "Reject". |
| **SCR-DOC-05** | Arithmetic Validation Card | Widget inside Review | Math integrity confirmation. | Opening Balance + Credits - Debits vs Closing Balance; Discrepancy indicator. | Recalculate, Force Override. |
| **SCR-DOC-06** | Duplicate Detection Drawer | Drawer inside Review | Prevent double-counting. | Shows proposed transaction side-by-side with matched existing ledger entry. | "Skip Duplicate", "Force Post". |
| **SCR-DOC-07** | Document Posting Confirmation | Modal Dialog | Final ledger commit gate. | Affected accounts summary, number of journal entries to create, balance impact. | "Confirm & Post to Ledger". |

---

### Cluster 8: Financial Intelligence, Goals & Reports (6 Screens)

| Screen ID | Title | Route / Type | Purpose | Core Elements | Primary Actions |
|---|---|---|---|---|---|
| **SCR-INT-01** | Financial Analytics Command | `/analytics` (Page) | Advanced financial telemetry. | Spending by category, savings rate trend, cash flow volatility, runway. | Filter Date, Change Granularity. |
| **SCR-INT-02** | Financial Copilot Workspace | `/copilot` (Page) | Natural language financial AI. | Chat thread, prompt suggestions, structured responses with citations, tool logs. | Submit Query, Copy Response. |
| **SCR-INT-03** | Goals Directory | `/goals` (Page) | Long-term target management. | Cards: Goal Name, Target Amount, Current Value, Progress %, Target Date. | "+ Create Goal". |
| **SCR-INT-04** | Goal Detail & Projections | `/goals/[id]` (Page) | SIP requirement & simulation. | Required monthly contribution calculator, probability curve, linked assets. | Adjust Contribution. |
| **SCR-INT-05** | What-If Financial Simulator | `/analytics/simulator` | Scenario modeling. | Sliders: Income change %, Market crash % (-20%), Inflation %, Major purchase. | Run Simulation. |
| **SCR-INT-06** | Reports & Tax Exports | `/reports` (Page) | Official document generation. | Report catalog: Capital Gains, Balance Sheet, P&L, 80C Proofs, Net Worth Certificate. | "Generate PDF / Excel". |

---

### Cluster 9: Workspace, Security & Administration (8 Screens)

| Screen ID | Title | Route / Type | Purpose | Core Elements | Primary Actions |
|---|---|---|---|---|---|
| **SCR-SET-01** | User Profile & Preferences | `/settings/profile` | Personal info & display prefs. | Full name, email, avatar, primary currency, number formatting (Lakhs/Crores). | Save Profile. |
| **SCR-SET-02** | Workspace & Household Members| `/settings/workspace` | Multi-tenant team/family setup. | Member list, email, assigned role (Owner, Admin, Member, Auditor), invite status. | "+ Invite Member", Change Role. |
| **SCR-SET-03** | Roles & Permissions Matrix | Drawer View | Granular RBAC permissions guide. | Table detailing exact capabilities of Owner vs Admin vs Member vs Auditor. | Close Drawer. |
| **SCR-SET-04** | Connected Financial Providers | `/settings/providers` | Broker & Account Aggregator links.| Active integrations (Zerodha, Groww, AA Consent), last sync date, token status. | "Sync Now", "Revoke Access". |
| **SCR-SET-05** | Data Consent & Privacy Center | `/settings/privacy` | DPDP 2023 compliance controls. | Granted consents, export all data in JSON/CSV, "Request Account Deletion". | "Export Data", "Delete Account". |
| **SCR-SET-06** | Security & MFA Settings | `/settings/security` | Credential & session management. | Change password, TOTP MFA toggle, regenerated backup codes, active sessions. | Update Password, Terminate Sessions. |
| **SCR-SET-07** | Comprehensive Audit Trail | `/settings/audit` | Immutable forensic log. | Filterable table: Timestamp, Actor, IP Address, Action, Resource, Changes JSON. | Search, Filter by Action. |
| **SCR-SET-08** | Notification Center | `/notifications` (Page) | Alert history & preferences. | Alert list (Unread / Read), notification rules (Low balance, Large expense, Bill due). | Mark All as Read, Configure Rules. |
