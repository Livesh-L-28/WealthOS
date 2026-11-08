# WealthOS Remediation Round 2 Baseline

## 1. Executive Summary & Git Verification

This baseline document captures the state of the WealthOS repository prior to initiating Remediation Round 2.
It records the active branch, cryptographic commit hashes, clean working tree status, identified defects, target remediation files, and rollback procedures.

- **Repository:** `Livesh-L-28/WealthOS`
- **Active Branch:** `feature/final-financial-intelligence-production`
- **Starting Local HEAD SHA:** `a559954da76b3db990f022e071804d7a173b7cbc`
- **Remote Origin HEAD SHA:** `a559954da76b3db990f022e071804d7a173b7cbc`
- **Baseline Alignment:** Synchronized with `origin/feature/final-financial-intelligence-production`.
- **Working Tree Status:** Clean (`nothing to commit, working tree clean`).
- **Timestamp:** 2026-11-08T10:41:23+05:30

---

## 2. Inventory of Identified Acceptance Deficiencies

Independent review and verification identified six critical areas requiring remediation before final release acceptance:

1. **Defect 1: Duplicate Route Registration (`backend/app/api/v1/__init__.py`)**
   - `copilot_router` is included twice in `api_v1_router` (lines 18 and 19-21), resulting in duplicate route mounts in FastAPI's route table and redundant entries in the OpenAPI schema (`/api/v1/copilot/*`).
   - Need route uniqueness assertion tests to prevent regressions.

2. **Defect 2: In-Memory / Simulated Logic in E2E Acceptance Suite (`backend/tests/test_gate12_e2e_acceptance.py`)**
   - Workflows WF-03 (Investments), WF-04 (Dividends), WF-05 (Documents), WF-06 (Budgets), WF-07 (Goals), WF-08 (Forecasting), WF-10 (Reports), and WF-12 (Mobile API) relied on in-memory Python dictionaries and simulated state transitions rather than executing real FastAPI endpoints, domain services, and database persistence.
   - Workflows must be converted into genuine application journeys asserting real database state, double-entry invariance, and tenant isolation.

3. **Defect 3: Web E2E Browser Test Verification Gap**
   - Playwright browser tests must be established and executed against real frontend and backend runtime endpoints, testing authentication, transaction flows, budgets, and copilot dashboards in Chromium.
   - Clear classification between unit, component, and full browser E2E tests must be documented.

4. **Defect 4: Mobile Runtime Validation Gap**
   - The mobile runtime status, Expo SecureStore token persistence, token deletion on logout, and offline sync mechanisms must be audited and verified with concrete evidence.

5. **Defect 5: Restore Script Tenant Security Verification Depth**
   - The database restore verification script checked only `pg_tables.rowsecurity = true`, but did not assert `relforcerowsecurity = true` on `pg_class`, RLS policy definitions, or execute cross-tenant read/write denial tests under the application role (`wealthos_app`).

6. **Defect 6: Performance Benchmark Reproducibility**
   - Performance claims must be backed by a standalone, deterministic benchmark script (`scripts/performance_benchmark.py`) executing genuine HTTP requests against the local API with warm-up, $\ge 100$ iterations, percentile analysis (p50, p90, p95, p99), error rates, and machine-readable JSON output.

---

## 3. Target Files to be Created or Modified

| Target Path | Action | Description |
|---|---|---|
| `docs/local/WEALTHOS_REMEDIATION_ROUND_2_BASELINE.md` | Create | Baseline record prior to code changes (this document). |
| `backend/app/api/v1/__init__.py` | Modify | Remove duplicate `copilot_router` inclusion. |
| `backend/tests/test_api_route_registration.py` | Create | Pytest suite validating route uniqueness and OpenAPI integrity. |
| `docs/local/WEALTHOS_E2E_TEST_CLASSIFICATION.md` | Create | Formal classification of all 15 E2E workflows. |
| `backend/tests/test_gate12_e2e_acceptance.py` | Modify | Refactor workflows WF-01 to WF-15 into genuine application-level E2E journeys. |
| `apps/web/e2e/auth.spec.ts` | Create | Playwright test for web authentication & session security. |
| `apps/web/e2e/accounts-transactions.spec.ts` | Create | Playwright test for accounts & double-entry transactions. |
| `apps/web/e2e/investments-budgets.spec.ts` | Create | Playwright test for investment portfolio & budget envelope flows. |
| `apps/web/e2e/copilot-dashboard.spec.ts` | Create | Playwright test for dashboard metrics and copilot citations. |
| `docs/local/WEALTHOS_WEB_BROWSER_ACCEPTANCE.md` | Create | Browser acceptance report with test results and evidence. |
| `docs/local/WEALTHOS_MOBILE_RUNTIME_ACCEPTANCE.md` | Create | Mobile runtime acceptance and token lifecycle audit report. |
| `scripts/restore_database.sh` | Modify | Add deep RLS (`relforcerowsecurity`), role, and tenant isolation verification. |
| `docs/local/WEALTHOS_RESTORE_SECURITY_ACCEPTANCE.md` | Create | Restore security acceptance report with SQL audit evidence. |
| `scripts/performance_benchmark.py` | Create | Benchmark script measuring latency, throughput, and error rates. |
| `docs/local/WEALTHOS_PERFORMANCE_REPRODUCIBILITY_REPORT.md` | Create | Performance benchmark report with raw data and distribution analysis. |
| `docs/local/WEALTHOS_REMEDIATION_DEFECT_REGISTER.md` | Create | Comprehensive register of remediated defects, root cause, and fixes. |
| `docs/local/WEALTHOS_REMEDIATION_ROUND_2_REPORT.md` | Create | Final release readiness report with exact commit hashes and verdict. |

---

## 4. Expected Risks and Mitigation

1. **Risk: Route modification impacts existing API clients.**
   - *Mitigation:* The removal of the duplicate registration cleans the route table without altering any route path, method, or handler logic. All existing endpoints remain intact and registered exactly once.
2. **Risk: Genuine DB persistence in E2E tests conflicts with transactional isolation.**
   - *Mitigation:* Use existing test session fixtures or explicit test tenant provisioning with cleanup teardown to guarantee isolated test execution without contaminating seeded demo tenants.
3. **Risk: Browser test environment flakiness.**
   - *Mitigation:* Use resilient locators (role, test-id, text) and explicit assertions with configurable timeouts in Playwright.
4. **Risk: Performance test execution load on local machine.**
   - *Mitigation:* Cap concurrent requests to reasonable concurrency levels matching local Docker resource constraints (M1 Pro, 16 GB RAM).

---

## 5. Rollback Approach

If any remediation step introduces regressions:
1. Since Git history will not be rewritten or force-pushed, rollback is cleanly achieved via `git checkout` or `git revert` against the baseline commit `a559954da76b3db990f022e071804d7a173b7cbc`.
2. All database migrations remain forward-only and backwards-compatible.
3. No destructive volume or database drops will occur.
