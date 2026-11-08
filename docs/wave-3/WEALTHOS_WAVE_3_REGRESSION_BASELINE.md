# WealthOS — Wave 3 Regression Baseline Specification

**Document Version:** 1.0.0  
**Baseline Date:** 2026-11-08  
**Base Commit SHA:** `fe8a727c6536399a9a3b683cb0d00f074d6f7c8b`  

---

## 1. Regression Testing Framework

All modifications introduced in Wave 3 must pass the full regression gate without exception:
1. Zero regressions against all 251 existing backend tests.
2. Zero regressions against all 35 Vitest package unit tests.
3. Zero TypeScript type errors across all 5 workspace packages.
4. Next.js production build must compile cleanly with 26+ static routes.
5. All 48 Playwright end-to-end browser tests must pass.
6. Multi-tenant Row-Level Security (`FORCE ROW LEVEL SECURITY`) must remain enforced on all tenant-owned database tables.
7. Zero binary float usage in financial computation paths.

---

## 2. Invariant Checklist

- [x] **Ledger Invariant:** Dual-leg double-entry equality ($\sum\text{Dr} - \sum\text{Cr} = 0.0000$) on all journal entries.
- [x] **Precision Invariant:** Explicit Python `Decimal` with quantized rounding (`ROUND_HALF_UP`) and PostgreSQL `NUMERIC(18, 4)` and `NUMERIC(28, 4)`.
- [x] **Tenant Barrier:** Fail-closed tenant context rejection when `app.current_tenant_id` is unset or invalid.
- [x] **Immutability Invariant:** Database trigger prevents updates or deletions of posted journal entries.
- [x] **FIFO Inventory Invariant:** Zero negative inventory allowance; acquisitions strictly match disposals chronologically.
- [x] **Document Separation Invariant:** Extracted OCR documents cannot post directly to the General Ledger without explicit user approval.
- [x] **Simulation Non-Mutation Invariant:** Planning scenarios and projections are purely analytical and never mutate posted financial records.
