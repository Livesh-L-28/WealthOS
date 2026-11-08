# WealthOS Gate 12 Acceptance Test Suite — E2E Test Classification Matrix

This document provides a comprehensive classification of the 15 canonical end-to-end (E2E) workflows in `backend/tests/test_gate12_e2e_acceptance.py`. Each test is evaluated on whether it interacts with real HTTP endpoints, invokes service domain methods, writes and asserts on database persistence, verifies multi-tenant isolation, or relies on in-memory simulation.

---

## 1. Classification Matrix (Pre-Remediation Baseline)

| Workflow ID | Workflow Name | HTTP Endpoint? | Service Method? | Writes to DB? | Asserts DB State? | Verifies RLS Isolation? | Classification Status |
|---|---|:---:|:---:|:---:|:---:|:---:|---|
| **WF-01** | Auth & Session Lifecycle | Yes (`/api/v1/auth/me`, `/logout`) | Yes | Yes (user, session) | Yes (HTTP payload & auth state) | Yes (bearer token) | **Genuine Application E2E** |
| **WF-02** | Bank Account & Transfer Neutrality | Yes (`/api/v1/accounting/*`) | Yes (JournalService) | Yes (`accounts`, `journal_entries`) | Yes (POSTED status & lines) | Yes (Tenant ID header) | **Genuine Application E2E** |
| **WF-03** | Investment Portfolio & FIFO Engine | No | No | No | No | No | **In-Memory Simulation** |
| **WF-04** | Passive Income & Tax Withholding | No | No | No | No | No | **In-Memory Simulation** |
| **WF-05** | Document Extraction & Review Gate | No | No | No | No | No | **In-Memory Simulation** |
| **WF-06** | Budgeting & Threshold Alerts | No | No | No | No | No | **In-Memory Simulation** |
| **WF-07** | Financial Goals & Progress Tracking | No | No | No | No | No | **In-Memory Simulation** |
| **WF-08** | Financial Forecasting Scenarios | No | No | Partial (checks `journal_entries` count) | Partial | Partial | **In-Memory Simulation** |
| **WF-09** | Deterministic AI Copilot Grounding | No | Yes (CopilotService) | Yes (`copilot_conversations`, `messages`) | Yes | Yes | **Genuine Domain E2E** |
| **WF-10** | Enterprise Reports Export Defense | No | Yes (FinancialReportGenerator) | No | No | No | **In-Memory / Library Level** |
| **WF-11** | Open Banking Provider Sync | No | Yes (FinancialProviderService) | Yes (`financial_providers`, `consents`, `credentials`) | Yes | Yes | **Genuine Domain E2E** |
| **WF-12** | Mobile Client State Contracts | No | No | No | No | No | **In-Memory Simulation** |
| **WF-13** | Multi-Tenant RLS Isolation | Yes (`/api/v1/accounting/accounts`) | Yes | Yes (`accounts`) | Yes (Tenant Beta query empty) | Yes | **Genuine Application E2E** |
| **WF-14** | Disaster Recovery Backup & Restore | Subprocess | Yes (DR runner) | Yes (Restores DB) | Yes (Ledger balance & RLS checks) | Yes | **Genuine System E2E** |
| **WF-15** | Audit Trail Logging & Rate Limiting | No | Yes | Yes (`security_audit_logs`) | Yes (Flush & field checks) | Yes | **Genuine Domain E2E** |

---

## 2. In-Memory Workflows & Target Remediation Architecture

The 8 tests identified as in-memory simulations or lacking full database lifecycle persistence are transformed into genuine application-level tests executing real SQL and HTTP operations:

### 1. WF-03: Investment Portfolio & FIFO Lot Depletion
- **Pre-Remediation:** Evaluated Python dictionaries in a `for lot in lots` loop.
- **Post-Remediation:**
  - Seeds a Demat financial account and financial instruments (`financial_instruments`).
  - Persists real initial lots (`investment_holding_lots`) for Lot 1 (100 shares @ ₹100) and Lot 2 (100 shares @ ₹150) in PostgreSQL.
  - Executes chronological FIFO disposal for 150 shares through a transactional lot depletion routine.
  - Queries `investment_holding_lots` from PostgreSQL asserting:
    - Lot 1 `remaining_quantity = 0.0000` and `lot_status = 'CLOSED'`.
    - Lot 2 `remaining_quantity = 50.0000` and `lot_status = 'PARTIALLY_DISPOSED'`.
    - Realized gain calculation: proceeds ₹30,000 - depleted cost ₹17,500 = ₹12,500.

### 2. WF-04: Passive Income Recognition & Tax Withholding
- **Pre-Remediation:** Basic scalar arithmetic `assert net_received + tds_withheld == gross_dividend`.
- **Post-Remediation:**
  - Persists a `passive_income_records` entry in PostgreSQL (gross ₹10,000, TDS ₹1,000, net ₹9,000).
  - Posts a balanced journal entry via `/api/v1/accounting/journals/post-direct`:
    - Debit Checking (1010): ₹9,000.0000
    - Debit Tax Withheld (1090): ₹1,000.0000
    - Credit Dividend Income (4010): ₹10,000.0000
  - Queries database to verify journal entry status is `POSTED`, zero ledger imbalance, and passive income record status is `RECEIVED`.

### 3. WF-05: Document Intelligence & Parsing Workflow
- **Pre-Remediation:** Simple list comprehension `sum(item['amount'] for item in line_items)`.
- **Post-Remediation:**
  - Inserts a real `financial_documents` record with `processing_status = 'PENDING'` and file metadata into PostgreSQL.
  - Executes document extraction pipeline simulating parsed line items and statement reconciliation.
  - Updates database with `processing_status = 'EXTRACTED'`, `extracted_data` (JSONB), and line items.
  - Asserts against PostgreSQL that `extracted_data` matches statement total and status is `EXTRACTED`.

### 4. WF-06: Budgeting, Envelopes & Threshold Alerts
- **Pre-Remediation:** Pure Python helper `classify_budget(spent, limit)`.
- **Post-Remediation:**
  - Inserts real `budgets` and `budget_allocations` in PostgreSQL linked to expense categories.
  - Records actual transactions and calculates budget utilization via database queries.
  - Verifies database-calculated utilization thresholds (Normal <85%, Warning 85-100%, Overspent >100%).

### 5. WF-07: Financial Goals & Progress Tracking
- **Pre-Remediation:** Local percentage math `progress_pct = (saved / target) * 100`.
- **Post-Remediation:**
  - Inserts a `financial_goals` record in PostgreSQL (target ₹1,000,000.00).
  - Records `goal_contributions` entries (₹650,000.00) linked to the goal.
  - Updates goal `current_amount` from database aggregated contributions.
  - Queries database to assert current balance, 65% progress, and active status.

### 6. WF-08: Financial Forecasting & Scenarios
- **Pre-Remediation:** Evaluated arithmetic formula and checked journal count.
- **Post-Remediation:**
  - Queries opening cash balance from real seeded accounts in PostgreSQL.
  - Computes multi-month projected liquidity curve based on monthly cashflow assumptions.
  - Inserts `forecast_runs` and `financial_scenarios` records in PostgreSQL.
  - Asserts that projection data is persisted in database and zero mutating journal entries were created.

### 7. WF-10: Enterprise Reports & Export Defense
- **Pre-Remediation:** Called generator directly without recording job metadata.
- **Post-Remediation:**
  - Inserts `report_jobs` record in PostgreSQL with status `RUNNING`.
  - Generates sanitized CSV and PDF bytes with formula injection protection.
  - Updates `report_jobs` record in PostgreSQL with status `COMPLETED` and metadata.
  - Queries `report_jobs` to assert completed state and output integrity.

### 8. WF-12: Mobile Client API Contracts
- **Pre-Remediation:** Tested static string dictionary and state array.
- **Post-Remediation:**
  - Executes real HTTP requests via `AsyncClient` to key mobile endpoints:
    - `GET /api/v1/auth/me`
    - `GET /api/v1/accounting/accounts`
    - `GET /api/v1/copilot/tools`
    - `GET /api/v1/health`
  - Asserts HTTP 200, required headers (`X-Correlation-ID`, `X-Response-Time-Ms`), and response payload schemas match mobile client expectations.

---

## 3. Post-Remediation Verification Target

Following remediation, all 15 workflows will execute genuine application-level operations (HTTP endpoints, domain services, and database persistence), eliminating 100% of in-memory simulations from the acceptance suite.
