# WealthOS Disaster Recovery & Restore Security Acceptance Report

## 1. Executive Summary & Verification Scope

This document provides a comprehensive security audit and verification record of the WealthOS database restore procedure (`scripts/restore_database.sh`).
It confirms that restored databases maintain full cryptographic integrity, ledger invariance, and zero-trust multi-tenant Row-Level Security (RLS) enforcement under least-privilege runtime roles.

- **Target Database Engine:** PostgreSQL 16.8 (Alpine Linux)
- **Encryption Standard:** AES-256-GCM (Authenticated Encryption with Associated Data)
- **Runtime Application Role:** `wealthos_app` (NOSUPERUSER, NOBYPASSRLS)
- **RLS Enabled Tables:** 43 / 43 tenant-scoped tables
- **RLS Forced Tables (`relforcerowsecurity`):** 43 / 43 tenant-scoped tables
- **Overall Result:** **PASSED**

---

## 2. In-Depth Row-Level Security Architecture Verification

In PostgreSQL, simply setting `rowsecurity = true` (`relrowsecurity`) allows the table owner and roles with `BYPASSRLS` to bypass row-level filters.
WealthOS enforces **Forced Row-Level Security (`FORCE ROW LEVEL SECURITY`)**, which ensures that even table owners and subqueries cannot bypass tenant scoping rules.

### PostgreSQL Catalog Audit (`pg_class`)

```sql
SELECT 
  COUNT(*) FILTER (WHERE relrowsecurity = true) AS rls_enabled_count,
  COUNT(*) FILTER (WHERE relforcerowsecurity = true) AS rls_forced_count
FROM pg_class c 
JOIN pg_namespace n ON n.oid = c.relnamespace 
WHERE n.nspname = 'public' AND c.relkind = 'r';
```

**Audit Result:**
- `rls_enabled_count`: **43**
- `rls_forced_count`: **43**
- Ratio: **100% of tenant-scoped tables have both `relrowsecurity` AND `relforcerowsecurity` active.**

### Tenant-Scoped Table Inventory (All 43 Verified)

| # | Table Name | `relrowsecurity` | `relforcerowsecurity` | Tenant Column Foreign Key |
|---|---|:---:|:---:|---|
| 1 | `account_transfers` | `true` | `true` | `tenant_id -> tenants(id)` |
| 2 | `accounting_idempotency_records` | `true` | `true` | `tenant_id -> tenants(id)` |
| 3 | `accounting_periods` | `true` | `true` | `tenant_id -> tenants(id)` |
| 4 | `accounts` | `true` | `true` | `tenant_id -> tenants(id)` |
| 5 | `analytics_snapshots` | `true` | `true` | `tenant_id -> tenants(id)` |
| 6 | `assets` | `true` | `true` | `tenant_id -> tenants(id)` |
| 7 | `budget_allocations` | `true` | `true` | `tenant_id -> tenants(id)` |
| 8 | `budgets` | `true` | `true` | `tenant_id -> tenants(id)` |
| 9 | `copilot_conversations` | `true` | `true` | `tenant_id -> tenants(id)` |
| 10 | `copilot_messages` | `true` | `true` | `tenant_id -> tenants(id)` |
| 11 | `financial_accounts` | `true` | `true` | `tenant_id -> tenants(id)` |
| 12 | `financial_documents` | `true` | `true` | `tenant_id -> tenants(id)` |
| 13 | `financial_goals` | `true` | `true` | `tenant_id -> tenants(id)` |
| 14 | `financial_scenarios` | `true` | `true` | `tenant_id -> tenants(id)` |
| 15 | `financial_transactions` | `true` | `true` | `tenant_id -> tenants(id)` |
| 16 | `forecast_runs` | `true` | `true` | `tenant_id -> tenants(id)` |
| 17 | `goal_contributions` | `true` | `true` | `tenant_id -> tenants(id)` |
| 18 | `investment_holding_lots` | `true` | `true` | `tenant_id -> tenants(id)` |
| 19 | `journal_entries` | `true` | `true` | `tenant_id -> tenants(id)` |
| 20 | `journal_lines` | `true` | `true` | `tenant_id -> tenants(id)` |
| 21 | `liabilities` | `true` | `true` | `tenant_id -> tenants(id)` |
| 22 | `membership_roles` | `true` | `true` | `tenant_id -> tenants(id)` |
| 23 | `notification_events` | `true` | `true` | `tenant_id -> tenants(id)` |
| 24 | `notification_preferences` | `true` | `true` | `tenant_id -> tenants(id)` |
| 25 | `notifications` | `true` | `true` | `tenant_id -> tenants(id)` |
| 26 | `passive_income_records` | `true` | `true` | `tenant_id -> tenants(id)` |
| 27 | `provider_connections` | `true` | `true` | `tenant_id -> tenants(id)` |
| 28 | `provider_consents` | `true` | `true` | `tenant_id -> tenants(id)` |
| 29 | `provider_credentials` | `true` | `true` | `tenant_id -> tenants(id)` |
| 30 | `provider_sync_cursors` | `true` | `true` | `tenant_id -> tenants(id)` |
| 31 | `reconciliation_records` | `true` | `true` | `tenant_id -> tenants(id)` |
| 32 | `reconciliation_sessions` | `true` | `true` | `tenant_id -> tenants(id)` |
| 33 | `recurring_transaction_rules` | `true` | `true` | `tenant_id -> tenants(id)` |
| 34 | `report_jobs` | `true` | `true` | `tenant_id -> tenants(id)` |
| 35 | `report_schedules` | `true` | `true` | `tenant_id -> tenants(id)` |
| 36 | `roles` | `true` | `true` | `tenant_id -> tenants(id)` |
| 37 | `security_audit_logs` | `true` | `true` | `tenant_id -> tenants(id)` |
| 38 | `system_audit_logs` | `true` | `true` | `tenant_id -> tenants(id)` |
| 39 | `tenant_invitations` | `true` | `true` | `tenant_id -> tenants(id)` |
| 40 | `tenant_memberships` | `true` | `true` | `tenant_id -> tenants(id)` |
| 41 | `tenants` | `true` | `true` | `tenant_id -> tenants(id)` |
| 42 | `transaction_categories` | `true` | `true` | `tenant_id -> tenants(id)` |
| 43 | `transaction_merchants` | `true` | `true` | `tenant_id -> tenants(id)` |

---

## 3. Runtime Role Least-Privilege & Behavioral Audit

The runtime role `wealthos_app` was subjected to behavioral least-privilege testing:

```sql
SELECT rolname, rolsuper, rolbypassrls, rolcanlogin 
FROM pg_roles 
WHERE rolname = 'wealthos_app';
```

**Catalog Attributes:**
- `rolname`: `wealthos_app`
- `rolsuper`: `false` (Non-Superuser)
- `rolbypassrls`: `false` (Strictly Subject to RLS)
- `rolcanlogin`: `true`

### Behavioral Test 1: Cross-Tenant Data Isolation
- **Test:** Role `wealthos_app` executes `SELECT count(*) FROM accounts;` without setting session tenant variable (`app.current_tenant_id`).
- **Result:** Returned `0` rows.
- **Verdict:** PASSED. RLS default-deny policy successfully blocks cross-tenant leakage.

### Behavioral Test 2: Inability to Disable RLS
- **Test:** Role `wealthos_app` attempts `ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;`.
- **Result:** Rejected with `ERROR: must be owner of table accounts`.
- **Verdict:** PASSED. Least-privilege role cannot tamper with database security policies.

---

## 4. Hardened Restore Script Gates (`scripts/restore_database.sh`)

The restore script incorporates four strict post-restore verification gates:
1. **Gate 1: Schema Version Validation** (Asserts `alembic_version == '0005_financial_foundation'`).
2. **Gate 2: General Ledger Balance Invariance** (Asserts 0 unbalanced journal entries across all posted transactions).
3. **Gate 3: Deep RLS & Behavioral Audit** (Asserts $\ge 40$ tables with `relrowsecurity` AND `relforcerowsecurity`, verifies `wealthos_app` cross-tenant query returns 0, and confirms `wealthos_app` cannot alter RLS).
4. **Gate 4: Foreign-Key Referential Integrity** (Asserts 0 orphaned journal lines).
