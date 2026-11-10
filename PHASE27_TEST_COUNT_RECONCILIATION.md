# WealthOS Phase 28 — Test Count Reconciliation & Evidence Inventory

**Phase ID:** `WEALTHOS-PHASE-28`  
**Execution Timestamp:** 2026-11-10T12:21:00+05:30  
**Status:** **DISCREPANCY RECONCILED & PROVEN WITH CODEBASE EVIDENCE**

---

## 1. Executive Summary

The Phase 27 report presented a test inventory claiming **381 total verified checks**, but listed individual rows that added up to 171 ($9 + 50 + 99 + 6 + 7 = 171$).

An independent audit of the actual repository, test files, and pytest/vitest collectors was conducted during Gate 1. The root cause of the discrepancy has been identified, reproduced, and documented:
1. **Inclusion of Benchmark Samples in Claimed Total:** The Phase 27 report conflated **210 latency benchmark requests** (30 iterations $\times$ 7 endpoints) with functional test assertions ($171 + 210 = 381$).
2. **Sub-sampling of Backend Suite in Phase 27:** The Phase 27 targeted run executed only 9 newly modified or phase-specific backend tests (`test_phase21`, `test_phase23`, `test_phase27`), while the full backend repository contains **363 collected Pytest test cases**.
3. **Reconciled Repository Inventory:** The true full functional test inventory across the monorepo comprises **512 automated test cases** plus **13 live staging assertions** (Total: **525 verifiable test checks**), completely separate from the 210 empirical latency measurements.

---

## 2. Phase 27 Discrepancy Breakdown

| Subsystem / Test Target | Phase 27 Reported Count | Actual Category | Reconciliation Finding |
| :--- | :--- | :--- | :--- |
| **Backend Suite (Phase 27 Subset)** | 9 | Unit / Integration Test Cases | Executed only targeted subset: `test_phase21` (1), `test_phase23` (4), `test_phase27` (4). |
| **Full Backend Repository Suite** | *Omitted from Ph27 summary* | Unit / Integration Test Cases | **363 test cases** collected across `backend/tests/` (363 tests in 34 files). |
| **Web Frontend Suite** | 50 | Unit / Integration Test Cases | Exactly 50 Vitest test cases across 8 test files in `apps/web`. |
| **Mobile Frontend Suite** | 99 | Unit / Integration Test Cases | Exactly 99 Vitest test cases across 7 test files in `apps/mobile`. |
| **Disaster Recovery Drill** | 6 | Live Dynamic Assertions | 6 verified assertions in `disaster_recovery_exercise.py`. |
| **Financial Invariants Suite** | 7 | Live Dynamic Assertions | 7 verified assertions in `test_phase27_financial_consistency.py`. |
| **Staging Benchmark Samples** | 210 | Empirical Latency Samples | 210 HTTP requests (30 samples $\times$ 7 endpoints) in `benchmark_phase27_performance.py`. |
| **PHASE 27 REPORTED SUM** | **381** | **Mixed Assertions + Samples** | Computed as: $9 + 50 + 99 + 6 + 7 + 210 = 381$. |

---

## 3. Comprehensive Repository Test Inventory (Phase 28 Baseline)

Running the actual test collectors across the monorepo:

### 3.1 Backend Pytest Suite (`backend/tests/`)
- Command: `cd backend && .venv/bin/pytest --collect-only -q`
- Output: **363 tests collected** in 0.33s across 34 test files.
- Functional coverage: Auth (Argon2id, MFA, lockout), Double-entry general ledger, Row-Level Security (RLS) on 71 tables, Investment FIFO matching, Corporate actions, Cash management, Budget intelligence, Copilot isolation, Document processing, and Phase 27 Sync Engine.

### 3.2 Web Vitest Suite (`apps/web/src/`)
- Command: `cd apps/web && npm test -- --run`
- Output: **50 tests passed** across 8 test files:
  1. `src/auth.test.ts` (7 tests)
  2. `src/charts.test.ts` (4 tests)
  3. `src/chartRegistry.test.ts` (5 tests)
  4. `src/formatters.test.ts` (11 tests)
  5. `src/offlineStore.test.ts` (3 tests)
  6. `src/pages.test.ts` (10 tests)
  7. `src/unification.test.ts` (5 tests)
  8. `src/webSecurity.test.ts` (5 tests)

### 3.3 Mobile Vitest Suite (`apps/mobile/src/`)
- Command: `cd apps/mobile && npm test -- --run`
- Output: **99 tests passed** across 7 test files:
  1. `src/cryptoHmac.test.ts` (12 tests)
  2. `src/localDatabase.test.ts` (5 tests)
  3. `src/mobile.test.ts` (11 tests)
  4. `src/mobileAuthAndIntegration.test.ts` (31 tests)
  5. `src/mobileFunctionsVerification.test.ts` (12 tests)
  6. `src/mobileSecurity.test.ts` (9 tests)
  7. `src/mobileUI.test.ts` (19 tests)

### 3.4 Live Staging Verification Assertions
- Disaster Recovery Verification (`disaster_recovery_exercise.py`): 6 live assertions.
- Financial Consistency & Transfer Neutrality (`test_phase27_financial_consistency.py`): 7 live assertions.

---

## 4. Reconciled Metrics Summary

```
+==================================================================================================+
| WEALTHOS MONOREPO RECONCILED TEST METRICS (PHASE 28)                                            |
+==================================================================================================+
| Backend Pytest Unit & Integration Tests:                     363 collected & executable          |
| Web Vitest Unit & Page Tests:                                50 passed                           |
| Mobile Vitest Cryptographic & Functional Tests:              99 passed                           |
| Live Staging Verification Assertions (DR & Consistency):     13 passed                           |
+--------------------------------------------------------------------------------------------------+
| TOTAL FUNCTIONAL TEST CASES & ASSERTIONS:                    525 VERIFIABLE CHECKS               |
+--------------------------------------------------------------------------------------------------+
| Staging Empirical Latency Samples (Benchmark Telemetry):      210 HTTP samples (0 errors)        |
+==================================================================================================+
```

### Counting Standard Rule:
In all subsequent Phase 28 reports, **empirical performance samples (210) will be reported in a dedicated performance section and strictly separated from functional test counts (525)** to prevent reporting ambiguity.
