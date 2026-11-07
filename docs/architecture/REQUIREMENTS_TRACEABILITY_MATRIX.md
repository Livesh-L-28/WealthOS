# WEALTHOS — REQUIREMENTS TRACEABILITY MATRIX (RTM)

**Document Reference:** WOS-RTM-001  
**Version:** 1.0.0-RELEASE-CANDIDATE  
**Status:** APPROVED / FROZEN BASELINE  

---

## 1. COMPREHENSIVE REQUIREMENTS TRACEABILITY MATRIX

| Req ID | User Specification Category | PRD Section | SRS Requirement | Architectural Domain | Database Tables | Target API Endpoints | Target Phase | Verification Method |
|---|---|---|---|---|---|---|---|---|
| **REQ-01** | Bank Accounts & Balances | Sec 4.1 | FR-AUTH-03, FR-TXN-01 | Accounts Domain | `financial_accounts`, `account_balances` | `/api/v1/accounts` | Phase 5 | Unit & API integration tests |
| **REQ-02** | Income & Salary Tracking | Sec 4.2 | FR-TXN-01 | Transactions Domain | `transactions`, `categories` | `/api/v1/transactions` | Phase 5 | Ledger balance invariant test |
| **REQ-03** | Expenses & Spending Analytics | Sec 4.3 | FR-TXN-02 | Transactions Domain | `transactions`, `transaction_splits`, `categories` | `/api/v1/transactions/split` | Phase 5 | Split aggregation unit tests |
| **REQ-04** | Investments & Portfolio Management | Sec 4.4 | FR-INV-01 | Investments Domain | `broker_accounts`, `instruments` | `/api/v1/investments/holdings` | Phase 7 | Portfolio valuation tests |
| **REQ-05** | Stocks & Mutual Funds (NSE/BSE/AMFI) | Sec 4.5 | FR-INV-01, FR-INV-02 | Investments Domain | `instruments`, `investment_transactions` | `/api/v1/investments/trades` | Phase 7 | Trade settlement tests |
| **REQ-06** | Dividends & Interest Management | Sec 4.6 | FR-DIV-01 | Passive Income Domain | `dividend_records`, `interest_schedules` | `/api/v1/dividends` | Phase 8 | TDS matching & reconciliation test |
| **REQ-07** | Realized & Unrealized P&L (FIFO) | Sec 4.7 | FR-INV-02, FR-INV-03 | Investments Domain (FIFO Engine) | `investment_lots`, `investment_lot_allocations` | `/api/v1/investments/pnl` | Phase 7 | FIFO lot depletion tests |
| **REQ-08** | Physical Assets & Valuations | Sec 4.8 | FR-ASSET-01 | Assets Domain | `assets`, `asset_valuations` | `/api/v1/assets` | Phase 6 | Valuation history tests |
| **REQ-09** | Liabilities & Loan Amortization | Sec 4.9 | FR-LIAB-01 | Liabilities Domain | `liabilities`, `amortization_schedules` | `/api/v1/liabilities` | Phase 6 | EMI mathematical calculation tests |
| **REQ-10** | Net Worth Real-Time Engine | Sec 4.10 | FR-NW-01 | Net Worth Domain | All Asset/Liability Tables | `/api/v1/net-worth` | Phase 6 | Formula: Assets - Liab tests |
| **REQ-11** | Loans & Credit Cards Tracking | Sec 4.11 | FR-LIAB-02 | Liabilities Domain | `financial_accounts`, `liabilities` | `/api/v1/liabilities/credit-cards` | Phase 6 | Due date calculation tests |
| **REQ-12** | Financial Goals & Projections | Sec 4.12 | FR-GOAL-01 | Budgeting Domain | `financial_goals`, `goal_contributions` | `/api/v1/goals` | Phase 13 | Goal progress projection tests |
| **REQ-13** | Budgets & Savings Rates | Sec 4.13 | FR-BUDGET-01 | Budgeting Domain | `budgets`, `budget_categories` | `/api/v1/budgets` | Phase 13 | Savings rate calculation tests |
| **REQ-14** | Bills & Recurring Payments | Sec 4.14 | FR-BILL-01 | Transactions Domain | `recurring_schedules` | `/api/v1/bills` | Phase 5 | Recurrence generator tests |
| **REQ-15** | Universal Document Vault | Sec 5.1 | FR-DOC-01 | Documents Domain | `documents` | `/api/v1/documents/upload` | Phase 9 | MIME & SHA-256 deduplication tests |
| **REQ-16** | OCR & Document Extraction Pipeline | Sec 5.2 | FR-DOC-02 | Extraction Domain (Celery) | `document_extractions`, `extraction_line_items` | Celery Tasks | Phase 9 | Statement parsing accuracy tests |
| **REQ-17** | Document Human Approval Gate | Sec 5.3 | FR-DOC-03 | Reconciliation Domain | `document_extractions` | `/api/v1/documents/{id}/approve` | Phase 10 | Human-in-loop approval tests |
| **REQ-18** | Financial Double-Entry Accounting | Sec 6.1 | FR-LEDGER-01 | Ledger Domain | `journal_entries`, `journal_lines` | `/api/v1/ledger/journal-entries` | Phase 4 | $\sum \text{Debit} \equiv \sum \text{Credit}$ invariant tests |
| **REQ-19** | Multi-Tenancy & Workspace Scoping | Sec 7.1 | FR-AUTH-03 | Tenancy Domain | `tenants`, `tenant_memberships` | All API Endpoints | Phase 3 | Cross-tenant isolation tests |
| **REQ-20** | Identity, Argon2id & TOTP MFA | Sec 9.2 | FR-AUTH-01, FR-AUTH-02 | Auth Domain | `users`, `user_sessions` | `/api/v1/auth/*` | Phase 3 | Security & auth session tests |
| **REQ-21** | Human-Designed UI/UX (Zero AI UI) | Sec 8.1 | UX Guidelines | Web & Mobile Apps | Design Tokens, UI Components | Web & Mobile Clients | Phase 1 & 2 | Accessibility & usability reviews |
| **REQ-22** | AI Financial Copilot (Read-Only) | Sec 4.17 | FR-COPILOT-01 | Copilot Domain | `copilot_conversations`, `copilot_messages` | `/api/v1/copilot/ask` | Phase 12 | Grounded retrieval & safety tests |
| **REQ-23** | Complete Application Dashboard | Sec 4.10 | FR-ANALYTICS-01 | Analytics Domain | Aggregated Materialized Views | `/api/v1/analytics/dashboard` | Phase 11 | End-to-end dashboard tests |
| **REQ-24** | Audit Logging & Forensic Trail | Sec 9.4 | NFR-SEC-04 | Audit Domain | `audit_logs` | `/api/v1/audit` | Phase 3 | Immutable append tests |
