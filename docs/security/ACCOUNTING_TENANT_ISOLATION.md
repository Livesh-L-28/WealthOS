# WealthOS — Accounting Tenant Isolation & PostgreSQL RLS Policy

## 1. Security Baseline

All accounting tables are protected by PostgreSQL Row-Level Security (RLS) and `FORCE ROW LEVEL SECURITY`.

Tables:
- `accounts`
- `journal_entries`
- `journal_lines`
- `accounting_periods`
- `accounting_idempotency_records`
- `reconciliation_records`

---

## 2. Invariants Enforced at the Database Level
1. **Application Role:** Runtime connects as `wealthos_app` (`NOSUPERUSER NOBYPASSRLS`).
2. **Context Binding:** Queries filter against `app.current_tenant_id`.
3. **Cross-Tenant Prevention:**
   - Attempting to query another tenant's account or journals returns 0 rows.
   - Attempting to reference another tenant's account in a journal line fails RLS validation.
   - Attempting to mutate or delete another tenant's record affects 0 rows.
   - Missing tenant context results in complete fail-closed denial.
