# WealthOS — Database Design & Schema Governance Review

**Programme:** WealthOS Enterprise Architecture & Production Readiness  
**Document:** Database Design Review  
**Date:** 2026-11-08  
**Status:** Audit & Standard Specification  
**Author:** Database Architect & Accounting Integrity Lead  

---

## 1. Schema Design Standards

All WealthOS relational entities conform to strict fintech schema design guidelines:

### 1.1 Primary Keys & Identifiers
- **Format:** Universally Unique Identifiers (UUIDv4) stored as native PostgreSQL `UUID`.
- **Rationale:** Prevents integer enumeration attacks (IDOR), enables client-side ID pre-generation for offline transaction queues, and guarantees global uniqueness without coordination across shards or databases.
- **Index:** Clustered B-tree primary key index on all tables.

### 1.2 Multi-Tenant Organization & Tenant Scoping
- Every tenant-scoped entity inherits `TenantScopedMixin`:
  - `tenant_id: UUID NOT NULL` (indexed)
  - `user_id: UUID NOT NULL` (indexed)
- **Composite Tenant-Aware Foreign Keys:** Where feasible, child tables enforce compound foreign keys `(tenant_id, parent_id)` referencing the parent table, ensuring cross-tenant foreign key relationships are mathematically impossible.
- **Database Row-Level Security:** 65 high-sensitivity tables have `FORCE ROW LEVEL SECURITY` active with the `tenant_isolation_policy` predicate.

### 1.3 Financial Data Precision Standards
- **Rule:** **Zero Floating-Point Data Types.** No `REAL`, `FLOAT`, or `DOUBLE PRECISION` columns are permitted for currency amounts, quantities, unit prices, tax percentages, or interest rates.
- **PostgreSQL Column Type:** `NUMERIC(20, 4)` or `NUMERIC(24, 8)` for fractional crypto/mutual fund units.
- **Application Type:** Python `Decimal` instantiated strictly from strings or integers (`Decimal("100.50")`), never from binary floats.
- **Rounding Strategy:** `ROUND_HALF_EVEN` (Banker's rounding) across all allocation and interest calculations.

### 1.4 Temporal & Timezone Invariants
- All timestamp columns use PostgreSQL `TIMESTAMP WITH TIME ZONE` (`TIMESTAMPTZ`).
- All application services generate timestamps exclusively using `datetime.now(UTC)`.
- Client display layers format localized timestamps based on the authenticated user's time zone preference.

---

## 2. High-Volume Table Analysis & Scalability Profiling

| Table Name | Estimated Annual Rows (per 10k users) | Growth Category | Index Strategy | Partitioning Candidate |
|---|---|---|---|---|
| `journal_lines` | 2,400,000 | Very High | B-Tree `(tenant_id, account_id, created_at)` | Yes (Range by year/quarter) |
| `journal_entries` | 1,200,000 | Very High | B-Tree `(tenant_id, entry_date)`, `(id)` | Yes (Range by year) |
| `transactions` | 1,200,000 | Very High | B-Tree `(tenant_id, account_id, date)` | Yes (Range by year) |
| `audit_logs` | 5,000,000 | Extreme | B-Tree `(tenant_id, created_at, action)` | Yes (Monthly range partitioning) |
| `investment_transactions`| 350,000 | Moderate | B-Tree `(tenant_id, holding_id, trade_date)`| No |
| `portfolio_snapshots`| 3,650,000 | High | B-Tree `(tenant_id, snapshot_date)` | Yes (Range by year) |
| `document_quarantine` | 100,000 | Low-Moderate | B-Tree `(tenant_id, file_hash, status)` | No |
| `notifications` | 800,000 | Moderate | B-Tree `(tenant_id, user_id, is_read)` | No (TTL auto-purge policy) |

---

## 3. High-Growth Table Partitioning Evaluation

### 3.1 Audit Logs (`audit_logs`)
- **Profile:** Write-once, read-rarely, massive growth trajectory.
- **Partitioning Method:** Declarative range partitioning by `created_at` in monthly intervals.
- **Retention Strategy:** Partitions older than 7 years (statutory requirement) can be detached and archived to MinIO/S3 cold storage as compressed Parquet files, keeping active index footprints minimal.

### 3.2 General Ledger Lines (`journal_lines`)
- **Evaluation:** At current scale ($< 1,000,000$ rows), composite B-Tree indexes on `(tenant_id, account_id, created_at)` provide sub-millisecond query latency ($< 3\text{ms}$).
- **Recommendation:** Defer physical table partitioning until total row count exceeds 10,000,000 rows. Premature partitioning complicates foreign key constraints and cross-partition balancing assertions.

---

## 4. Referential Integrity & Deletion Governance

- **Immutable Financial Records:** Financial transactions, posted journal entries, and investment trades **MUST NEVER** have cascading deletes (`ON DELETE CASCADE` is prohibited on financial core tables).
- **Soft Deletion (`SoftDeleteMixin`):** Accounts, budgets, and user preferences implement `is_deleted: bool = False` with `deleted_at: datetime | None`.
- **Right-to-be-Forgotten Compliance:** When a user requests account deletion, personal identifiers (name, email, phone) are pseudonymized and overwritten with random hashes, while immutable journal transaction figures are retained in anonymized format to satisfy statutory accounting audit obligations.
