# WealthOS — Phase 20A: Repository and Runtime Baseline Report

**Programme:** Phase 20 Web & Mobile Experience Parity, Product Consistency & Release Acceptance  
**Project:** WealthOS  
**Audit Standard:** Strict Independent Source Code & Runtime Verification  
**Date:** 2026-11-09  
**Branch:** `feature/final-financial-intelligence-production`  
**Git HEAD:** `41ec801d9326cb6825c31677332f1ea8e058f4a1`  
**Working Tree:** Clean (`working tree clean`)  
**Auditors:** Principal Product Architect, Senior Web Engineer, Senior Mobile Engineer, Financial Systems Engineer, Security Architect, QA Automation Lead

---

## 1. Executive Baseline Summary

This Phase 20A baseline establishes an authoritative inventory of WealthOS across Web (`apps/web`), Mobile (`apps/mobile`), Backend (`backend`), Shared Packages (`packages/`), Database, and CI/CD before verifying feature parity.

### Automated Test & Runtime Evidence
- **Backend Automated Pytest Suite:** **354 / 354 passed** (0 failed, 0 skipped, 100% pass rate in 109.59s).
- **Web Application Vitest Suite:** **42 / 42 passed** (0 failed, 100% pass rate).
- **Mobile Application Vitest Suite:** **37 / 37 passed** (0 failed, 100% pass rate).
- **API Client Vitest Suite:** **4 / 4 passed** (0 failed, 100% pass rate).
- **Design Tokens Vitest Suite:** **3 / 3 passed** (0 failed, 100% pass rate).
- **Total Automated Test Suite:** **440 / 440 tests passing (100% success rate)**.
- **Monorepo TypeScript Verification:** **0 errors** across all 5 workspace packages.
- **Next.js Production Build:** **30 / 30 routes** compiled cleanly with static optimization.
- **Android EAS Cloud Production Build:** Build `1f4774c9-b502-4f1f-b41f-8f8d7fd8b6e9` compiled successfully with Expo SDK 52, Kotlin 1.9.25, and direct downloadable APK generated.

---

## 2. Monorepo Architecture & Directory Inventory

```
WEALTHOS/
├── apps/
│   ├── web/                    # Next.js 14 App Router Web Client (30 routes)
│   └── mobile/                 # React Native 0.76.9 / Expo SDK 52 Mobile Client (11 screens, 6 modals)
├── backend/
│   ├── app/
│   │   ├── api/v1/             # 18 FastAPI domain routers
│   │   ├── core/               # Database, Security, Config, Logging
│   │   ├── domains/            # Modular monolith financial domain engines
│   │   └── infrastructure/     # Redis, Celery, Object Storage
│   ├── migrations/versions/    # 11 Alembic migrations (0001 - 0011)
│   └── tests/                  # 354 pytest integration & unit tests
├── packages/
│   ├── shared-types/           # Shared TypeScript interfaces & models
│   ├── design-tokens/          # FinTech Light & Dark theme tokens, chart series
│   └── api-client/             # Shared TypeScript API client with tenant headers
├── docs/                       # Complete architecture, runbooks, and audits
└── scripts/                    # Cryptographic backup, restore, and DR drills
```

---

## 3. Web Application Route Inventory (`apps/web`)

Total 30 prerendered static and dynamic routes:

| Route Path | Operational Role | Key User Capabilities |
| :--- | :--- | :--- |
| `/` | Landing / Entry | Root redirection and session detection |
| `/dashboard` | Executive Cockpit | 5-question clarity bar, net worth, cash flow, portfolio allocation, recent transactions |
| `/accounts` | Connected Accounts | Multi-institution balances, liquid cash vs debt, link bank wizard |
| `/transactions` | General Journal | Master transaction register, search, debit/credit filter, CSV export, Add Entry |
| `/budgets` | Envelope Budgeting | Spending envelopes, monthly caps, rollover tracking, variance analysis |
| `/investments` | Portfolio & FIFO Lots | Demat holdings, strict FIFO acquisition/disposal lots, unrealized/realized P&L |
| `/goals` | Strategic Milestones | Feasibility engine, inflation-compounded corpus targets, retirement tab |
| `/net-worth` | Balance Sheet & Debt | Consolidated balance sheet, reducing-balance loan amortization, Avalanche/Snowball |
| `/analytics` | Financial Intelligence | India Tax Readiness (Section 112A/115BAC), 5-pillar Health Score, risk alerts |
| `/documents` | Document Intelligence | Quarantine vault, OCR verification, canonical schema mapping, approved posting |
| `/reconciliation` | Control Centre | Bank tolerance reconciliation, discrepancy triage, duplicate detection, Merkle proof |
| `/copilot` | AI Financial Copilot | Digital Twin point-in-time snapshot, 15 allowlisted tools, evidence citations |
| `/household` | Joint Wealth Sharing | Multi-member household, resource sharing matrix, consolidated net worth |
| `/settings` | Tenant Settings | General preferences, default currency, timezones |
| `/settings/security` | Security Centre | Argon2id password changes, TOTP MFA enrollment, active session revocation |
| `/settings/members` | User Management | Tenant RBAC roles (Owner, Admin, Member, Viewer), member invitations |
| `/settings/workspaces` | Workspace Hub | Multi-tenant workspace switcher, tenant isolation boundaries |
| `/settings/audit` | Compliance Audit | Immutable system audit log with actor, timestamp, IP, and event payloads |
| `/delete-account` | Data Erasure Portal | Google Play compliant self-service account deletion, statutory ledger retention |
| `/privacy-policy` | Legal Privacy | DPDP Act 2023 & GDPR privacy policy |
| `/terms` | Terms of Service | Financial terms of service and regulatory disclaimer |
| `/auth/login` | Authentication | Secure cookie authentication with Argon2id and rate limiting |
| `/auth/register` | User Registration | Tenant and user account initialization with password strength policy |
| `/auth/mfa` | Multi-Factor Auth | RFC 6238 TOTP challenge and recovery code fallback |
| `/auth/verify-email` | Email Verification | Cryptographic token email verification |
| `/auth/forgot-password` | Password Recovery | Password reset token generation |
| `/auth/reset-password` | Password Reset | Secure password update workflow |

---

## 4. Mobile Application Screen Inventory (`apps/mobile`)

Primary Bottom Navigation Dock (5 Primary Tabs + Center Elevated Action) + Enterprise Hub Drawer:

| Screen / Modal Component | Navigation Tier | Supported Capabilities |
| :--- | :--- | :--- |
| `OverviewScreen.tsx` | Bottom Dock Tab 1 | Net worth Bezier area chart, MoM waterfall, Inflow vs Outflow dual-bars, Donut allocation |
| `AccountsScreen.tsx` | Bottom Dock Tab 2 | Dual-mode: Connected Accounts summary & Transactions Ledger with search & filtering |
| `PortfolioScreen.tsx` | Bottom Dock Tab 3 | Investment portfolio, SVG Donut allocation, FIFO tax lot inspector modal, + Add Holding |
| `BudgetsScreen.tsx` | Bottom Dock Tab 4 | Monthly utilization hero, spending envelopes, strategic goals progress, + Envelope, + Goal |
| `CopilotScreen.tsx` | Bottom Dock Tab 5 | AI Copilot conversational interface, quick chip prompts, structured metric chips |
| `AddTransactionModal.tsx` | Center Action (`+`) | Quick transaction recording with instant toggle between Add Expense (Dr) and Add Income (Cr) |
| `NetWorthScreen.tsx` | Enterprise Drawer | Balance sheet assets/liabilities, loan amortization schedule, debt payoff simulation |
| `AnalyticsScreen.tsx` | Enterprise Drawer | India Tax dual-regime comparison (New vs Old), 5-pillar Health Score, risk alerts |
| `ReconciliationScreen.tsx` | Enterprise Drawer | Reconciliation discrepancies triage, severity badges, one-click ledger resolution |
| `DocumentsScreen.tsx` | Enterprise Drawer | Document vault, OCR confidence meters, arithmetic validation, approved ledger posting |
| `HouseholdScreen.tsx` | Enterprise Drawer | Joint wealth members, contribution percentages, resource sharing matrix |
| `SettingsScreen.tsx` | Enterprise Drawer | Tenant workspace switcher, biometrics/PIN setup, Google Play account deletion |
| `CreateBudgetModal.tsx` | Budgets Screen Action | Preset categories (Dining, Travel, Shopping), custom limits, alert thresholds (85%) |
| `CreateGoalModal.tsx` | Budgets Screen Action | Milestone presets (Emergency, Luxury EV, Vacation, Education), target corpus & year |
| `AddInvestmentModal.tsx` | Portfolio Action | Demat asset entry (Equities, Mutual Funds, Gold SGB, Fixed Income) with FIFO lots |
| `ConnectAccountModal.tsx` | Quick Actions Action | Bank institution linking simulation with real-time balance updates |
| `ImportStatementModal.tsx`| Quick Actions Action | Bank statement simulation with automated transaction extraction & reconciliation |

---

## 5. Backend Core Services & API Contract Inventory (`backend/app`)

18 FastAPI Routers registered under `/api/v1/*`:

1. `/auth`: Identity lifecycle, Argon2id, TOTP MFA, session revocation, self-service user deletion.
2. `/tenants`: Workspace isolation, RBAC role management, cryptographic invitation tokens.
3. `/accounting`: Double-entry General Ledger, posting engine ($\sum\text{Dr}=\sum\text{Cr}$), immutable triggers.
4. `/budgets`: Envelope budgeting, rollover calculations, spending variance against actuals.
5. `/cash-management`: Liquidity aggregation, transfer neutrality, 30d/90d/12m cash forecast engine.
6. `/reconciliation`: Tolerance-based bank reconciliation, discrepancy triage, duplicate detection, Merkle audit proof.
7. `/investments`: Strict FIFO lot matching, Realized vs Unrealized P&L separation, stock splits, dividends.
8. `/liabilities`: Reducing-balance amortization engine, EMI schedules, Debt Avalanche/Snowball optimizer.
9. `/documents`: Quarantine pipeline, MIME validation, OCR extraction, canonical schemas, approved posting.
10. `/goals`: Strategic milestone feasibility engine, multi-horizon inflation compounding, annuity-due corpus.
11. `/planning`: Deterministic scenario simulations, zero-mutation what-if financial projections.
12. `/risk`: 7 empirical risk signals, idempotent alert deduplication by `(tenant_id, alert_key)`, alert lifecycle.
13. `/tax`: Indian FY (Apr-Mar), Section 112A capital gains exemption, Section 115BAC New vs Old tax regime comparison.
14. `/twin`: Personal Financial Digital Twin synthesis, data freshness tracking (`CURRENT`, `STALE`, `INCOMPLETE`).
15. `/copilot`: 15 allowlisted deterministic read-only tools, multi-layer prompt injection defense, citations.
16. `/household`: Multi-user household workspace, 3-tier visibility scopes, single-deduplication net worth.
17. `/integrations`: Normalized `ProviderAdapter` (AA sandbox, NSE/BSE market data, Broker CAS), HMAC-SHA256 webhooks.
18. `/analytics`: Consolidated financial ratios, debt-to-income, liquidity coverage, net worth history.

---

## 6. Identified Parity Strengths & Target Deficiencies

### Strengths
1. **Financial Precision:** Python `Decimal` and PostgreSQL `NUMERIC` used across all backend domains. Zero floating-point drift.
2. **Double-Entry Invariants:** Immutable database triggers prevent tampering with posted ledger lines across both clients.
3. **Design System:** Consistent FinTech Light Palette (`#F7F9F7` canvas, `#FFFFFF` cards, `#16A36A` emerald green accents, `#17231D` typography) applied to both Web and Mobile.
4. **Mobile Charts:** Wall Street-grade SVG charts (`MobileAreaChart`, `MobileCashFlowBarChart`, `MobileDonutAllocationChart`) provide complete visual and mathematical parity with Web charts.

### Target Deficiencies to Address in Phase 20
1. **Search Parity:** Web has transaction search on `/transactions`; Mobile has search inside `AccountsScreen.tsx`. A global quick-search modal (`Ctrl+K` / search icon) should be unified across both platforms.
2. **Recurring Transaction Presentation:** Web displays recurring transaction rules; Mobile displays upcoming commitments on the overview screen. Both should reference the same recurring rule definitions.
3. **Data Export:** Web has CSV export; Mobile should provide a clean transaction export summary action.
4. **Offline Feedback:** Mobile requires explicit network status indicator pills so users know when data is being served from local cache.
