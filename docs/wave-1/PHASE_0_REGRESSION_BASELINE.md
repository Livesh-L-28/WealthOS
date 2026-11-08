# Wave 1 — Phase 0: Regression Test Baseline

**Project:** WealthOS  
**Wave:** Wave 1  
**Baseline Commit HEAD:** `057fc1a3564d5f21e02eeb19b94b51b8f93a1198`  
**Date:** 2026-11-08  
**Verification Environment:** Local Docker Compose + Node.js 20 + Python 3.12 (.venv)

---

## 1. Verified Baseline Test Summary

Before adding new Wave 1 domain code, the full regression suite was executed:

| Test Harness | Target Package / Suite | Tests Run | Passed | Failed | Skipped | Duration |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Pytest 9.2.0** | `backend/tests/` (38 test files) | 207 | 207 | 0 | 0 | 69.12s |
| **Vitest 1.6.1** | `apps/mobile` (`src/mobile.test.ts`) | 11 | 11 | 0 | 0 | 227ms |
| **Vitest 1.6.1** | `apps/web` (`src/auth.test.ts`, `src/pages.test.ts`) | 17 | 17 | 0 | 0 | 375ms |
| **Vitest 1.6.1** | `packages/api-client` (`src/client.test.ts`) | 4 | 4 | 0 | 0 | 179ms |
| **Vitest 1.6.1** | `packages/design-tokens` (`src/tokens.test.ts`) | 3 | 3 | 0 | 0 | 189ms |
| **TypeScript Compiler** | Monorepo (5 packages: types, tokens, api, mobile, web) | 5 pkgs | 5 | 0 | 0 | 8.2s |
| **Playwright 1.57.0** | Chromium E2E (`apps/web/e2e/`) | 48 | 48 | 0 | 0 | 21.2s |
| **TOTAL** | **Full System Regression Suite** | **290** | **290** | **0** | **0** | **~100s** |

---

## 2. Financial Accounting Invariants Verified

1. **Balance Equation:** $\sum\text{Dr} - \sum\text{Cr} = 0.0000$ verified across all posted transactions.
2. **Numeric Arithmetic:** All amounts use `Decimal` with explicit currency representation (`INR`, `USD`). Floating-point arithmetic is strictly rejected.
3. **Immutability:** Triggers reject `UPDATE` and `DELETE` on posted `journal_entries` and `journal_lines`.
4. **Reversals:** Corrections execute via reversal entries referencing the parent entry ID.
5. **Multi-Tenancy:** PostgreSQL RLS strictly denies cross-tenant queries and mutations across all 58 tables.

---

## 3. Regression Baseline Guarantee

Every subsequent Wave 1 commit must maintain 100% pass rates across these 290 tests, plus all new Wave 1 tests. Zero regression tolerance.
