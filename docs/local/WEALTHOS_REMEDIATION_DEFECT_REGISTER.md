# WealthOS Remediation Round 2 Defect Register

This defect register documents all acceptance gaps and deficiencies remediated during Round 2, detailing root causes, source modifications, verification tests, and regression protections.

---

## Defect Inventory & Remediation Log

### DEF-01: Duplicate Copilot Router Registration
- **Severity:** Medium (Routing Table Redundancy / API Schema Inconsistency)
- **Component:** Backend API (`backend/app/api/v1/__init__.py`)
- **Root Cause:** `api_v1_router.include_router(copilot_router, prefix="/copilot", tags=["AI Financial Copilot"])` was called twice consecutively, causing every Copilot route to mount twice in the route table and appear twice in OpenAPI docs.
- **Files Modified:**
  - `backend/app/api/v1/__init__.py`: Removed duplicate registration.
  - `backend/tests/test_api_route_registration.py`: Added automated regression suite that recursively inspects all APIRoute instances and enforces route uniqueness.
- **Verification Evidence:** `pytest tests/test_api_route_registration.py` passed (3/3 tests passed in 0.33s).

---

### DEF-02: In-Memory / Simulated Logic in Gate 12 Acceptance Suite
- **Severity:** High (Acceptance Realism Deficit)
- **Component:** QA / E2E Suite (`backend/tests/test_gate12_e2e_acceptance.py`)
- **Root Cause:** Workflows WF-03, WF-04, WF-05, WF-06, WF-07, WF-08, WF-10, and WF-12 relied on local Python dictionaries, loops, and mocked calculations rather than executing genuine database queries and HTTP API endpoints.
- **Files Modified:**
  - `docs/local/WEALTHOS_E2E_TEST_CLASSIFICATION.md`: Formal classification matrix of all 15 workflows.
  - `backend/tests/test_gate12_e2e_acceptance.py`:
    - **WF-03:** Seeds `financial_accounts`, `financial_instruments`, and `investment_holding_lots` in PostgreSQL, executes FIFO lot disposal, and asserts `CLOSED` / `PARTIALLY_DISPOSED` database states.
    - **WF-04:** Seeds `passive_income_records`, posts balanced journal entry via `/api/v1/accounting/journals/post-direct`, and asserts ledger invariance in PostgreSQL.
    - **WF-05:** Seeds `financial_documents`, simulates OCR extraction pipeline updating JSONB extracted data, and creates `reconciliation_sessions` in PostgreSQL.
    - **WF-06:** Seeds `budgets` and `budget_allocations`, calculates threshold utilization (87% WARNING, 112% OVERSPENT) via database queries.
    - **WF-07:** Seeds `financial_goals` and `goal_contributions`, updates goal current amount from database sum, and asserts 65% progress.
    - **WF-08:** Reads baseline liquidity from database, computes multi-month runway, inserts `forecast_runs`, and asserts zero mutation to financial ledger.
    - **WF-10:** Creates `report_jobs` in PostgreSQL, verifies CSV formula injection protection (`'=HYPERLINK`), generates PDF, and updates status to `COMPLETED`.
    - **WF-12:** Executes real HTTP requests via `AsyncClient` to `/api/v1/auth/me`, `/api/v1/accounting/accounts`, `/api/v1/copilot/tools`, and `/health/live`.
- **Verification Evidence:** `pytest tests/test_gate12_e2e_acceptance.py` passed (15/15 tests passed in 6.31s).

---

### DEF-03: Web Browser End-to-End Test Verification Gap
- **Severity:** High (UI/UX Acceptance Deficit)
- **Component:** Web Application (`apps/web`)
- **Root Cause:** Playwright browser tests were not configured or executed against running frontend and backend services in a real browser.
- **Files Modified / Created:**
  - Installed `@playwright/test` and Playwright Chromium headless shell.
  - `apps/web/playwright.config.ts`: Configured Playwright against `http://localhost:3000`.
  - `apps/web/e2e/auth.spec.ts`: Authentication, invalid login alert, password reset, and MFA challenge journeys.
  - `apps/web/e2e/accounts-transactions.spec.ts`: Executive dashboard, account list, and transactions ledger views.
  - `apps/web/e2e/investments-budgets.spec.ts`: Portfolio holdings, budget envelope utilization, and goals tracking.
  - `apps/web/e2e/copilot-dashboard.spec.ts`: Copilot interactive chat, documents repository, net worth, settings, and 404 recovery.
  - `apps/web/vitest.config.ts`: Configured Vitest to separate component tests from Playwright browser specs.
  - `docs/local/WEALTHOS_WEB_BROWSER_ACCEPTANCE.md`: Comprehensive browser acceptance report.
- **Verification Evidence:** `npm run test:e2e --workspace=@wealthos/web` passed (16/16 tests passed in Chromium in 3.7s). `npm run test --workspace=@wealthos/web` passed (17/17 tests passed in Vitest in 238ms).

---

### DEF-04: Mobile Runtime Testing & Token Lifecycle Gap
- **Severity:** Medium (Mobile Verification Deficit)
- **Component:** Mobile Application (`apps/mobile`)
- **Root Cause:** Mobile verification lacked explicit documentation of environment limitations (absence of iOS simulator / Android emulator) and deep token lifecycle tests.
- **Files Modified / Created:**
  - Installed `expo-secure-store`.
  - `apps/mobile/src/storage.ts`: Implemented `MobileAuthStorage` with hardware Keychain/Keystore abstraction and `OfflineSyncQueue` state machine.
  - `apps/mobile/src/mobile.test.ts`: Added tests for SecureStore token storage, complete purge on logout, and offline queue state transitions (`QUEUED -> SYNCING -> COMMITTED`, retry threshold `FAILED_FATAL`).
  - `docs/local/WEALTHOS_MOBILE_RUNTIME_ACCEPTANCE.md`: Full mobile audit report.
- **Verification Evidence:** `npm run test --workspace=@wealthos/mobile` passed (9/9 tests passed in 205ms); `npm run typecheck --workspace=@wealthos/mobile` passed (0 errors).

---

### DEF-05: Restore Script Tenant Security Verification Depth
- **Severity:** High (Disaster Recovery & Multi-Tenant Security)
- **Component:** Operations / DR (`scripts/restore_database.sh`)
- **Root Cause:** `scripts/restore_database.sh` only checked `pg_tables.rowsecurity = true`, but did not verify `relforcerowsecurity = true` in `pg_class`, or execute behavioral queries under the non-superuser role `wealthos_app`.
- **Files Modified:**
  - `scripts/restore_database.sh`:
    - Added catalog checks for both `relrowsecurity` and `relforcerowsecurity` on all tenant tables ($\ge 40$).
    - Re-established default runtime privileges for `wealthos_app`.
    - Added behavioral cross-tenant query under `wealthos_app` (must return 0 rows).
    - Added tamper-resistance test: attempts by `wealthos_app` to disable RLS must be rejected with permission denied.
  - `docs/local/WEALTHOS_RESTORE_SECURITY_ACCEPTANCE.md`: Comprehensive security audit report.
- **Verification Evidence:** `pytest tests/test_gate12_e2e_acceptance.py -k "test_wf14"` passed (3.89s); manual DR drill passed all 4 gates.

---

### DEF-06: Performance Benchmark Reproducibility
- **Severity:** Medium (Observability / Performance Proof)
- **Component:** Performance Tooling (`scripts/performance_benchmark.py`)
- **Root Cause:** Previous benchmark numbers were documented without a standalone script that could be deterministically rerun to measure p50, p90, p95, p99 percentiles, error rates, and throughput.
- **Files Modified / Created:**
  - `scripts/performance_benchmark.py`: Standalone benchmark runner executing warm-up, iteration loops, percentile calculations, and JSON export.
  - `scripts/benchmark_results.json`: Machine-readable raw latency results.
  - `docs/local/WEALTHOS_PERFORMANCE_REPRODUCIBILITY_REPORT.md`: Comprehensive performance analysis report.
- **Verification Evidence:** Executed 100 iterations per endpoint (400 requests total), 0.0% error rate, sub-6ms p95 latencies across all probes and authenticated user profile queries.
