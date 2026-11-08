# WealthOS — Database Schema Migration & Zero-Downtime Strategy

**Programme:** WealthOS Enterprise Architecture & Production Readiness  
**Document:** Database Migration Strategy  
**Date:** 2026-11-08  
**Status:** Approved Engineering Standard  
**Author:** Database Architect & Lead Backend Engineer  

---

## 1. Migration Governance Principles

WealthOS manages all database schema revisions through version-controlled **Alembic** migrations located in `backend/alembic/versions/`. In a high-availability fintech environment, schema modifications must never cause service downtime, table lockouts, or financial data loss.

### Non-Negotiable Migration Rules
1. **Backward Compatibility First:** Every database change must remain fully compatible with the currently running application code (`N-1` code compatibility).
2. **Expand-and-Contract Pattern:** Destructive schema alterations (renaming columns, dropping columns, changing types) must be split into two separate releases across multiple deployment cycles.
3. **Lock Timeout Enforcement:** All migration transactions must configure `SET lock_timeout = '5s';` to prevent blocking concurrent transaction processing.
4. **Concurrent Indexing:** New indexes on high-volume tables (`journal_lines`, `transactions`, `audit_logs`) must be created using `CREATE INDEX CONCURRENTLY` outside of a single transaction block.

---

## 2. The Expand-and-Contract Migration Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor DBA as Deployment Pipeline
    participant DB as PostgreSQL Database
    participant V1 as App Version N (Running)
    participant V2 as App Version N+1 (New)

    Note over DB,V1: Stage 1: Expand Phase (Zero Downtime)
    DBA->>DB: Apply Migration: Add new column (nullable or default)
    DB-->>DB: Schema expanded (Old & new columns exist)
    DBA->>V2: Deploy App Version N+1
    Note over V2: Writes to BOTH old and new columns;<br/>reads from new column.
    
    Note over DB,V2: Stage 2: Backfill Phase
    DBA->>DB: Execute asynchronous batch backfill of historical rows
    DB-->>DB: 100% of rows populated in new column format

    Note over DB,V2: Stage 3: Contract Phase (Subsequent Release)
    DBA->>V2: Deploy App Version N+2 (Code references ONLY new column)
    DBA->>DB: Apply Migration: Drop deprecated old column
    DB-->>DB: Migration complete with zero downtime and zero lock contention
```

---

## 3. High-Risk Schema Changes & Mitigation Catalog

| Proposed Schema Mutation | Inherent Risk | Required Production Safe Pattern |
|---|---|---|
| **Add column with `DEFAULT`** | Naive migration in older Postgres takes table lock; may block writes. | In Postgres 11+, non-volatile defaults do not rewrite table. Ensure default expression is immutable. |
| **Add `NOT NULL` constraint** | Scans entire table while holding `SHARE UPDATE EXCLUSIVE` lock. | Add column as `NULL` $\rightarrow$ backfill existing rows $\rightarrow$ add `CHECK (col IS NOT NULL) NOT VALID` $\rightarrow$ validate asynchronously via `VALIDATE CONSTRAINT`. |
| **Create Index on large table** | Takes `SHARE` lock on table, blocking all concurrent `INSERT`, `UPDATE`, `DELETE`. | Use Alembic with `postgresql_concurrently=True` outside of transactional DDL. |
| **Rename Column** | Breaks running application instances reading old column name immediately. | Add new column $\rightarrow$ write dual-write trigger $\rightarrow$ migrate code $\rightarrow$ drop old column. |
| **Drop Column** | Immediate crashes if any active container or replica queries old column. | Remove all code references in Release $N$ $\rightarrow$ mark column unused $\rightarrow$ execute `DROP COLUMN` in Release $N+1$. |

---

## 4. Rollback & Forward Recovery Protocols

### Rollback Runbook (Standard Migration)
If an unexpected schema error occurs during deployment before code migration:
```bash
# Downgrade one revision cleanly
cd backend && alembic downgrade -1
```

### Forward-Recovery Protocol (High-Risk Migration)
When an expand-and-contract migration has already begun writing data in the new format:
- **Do NOT execute `alembic downgrade`**, as doing so drops the new column and destroys new financial transactions.
- **Execute Forward-Recovery:** Deploy a hotfix migration that patches the issue forward or marks the deprecated column active again without dropping the newly committed data.
