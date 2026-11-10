# WealthOS Database Setup & Migration Guide

**Artifact Identifier:** `WEALTHOS-DATABASE-RELEASE-001`  
**Database Engine:** PostgreSQL 16+  
**Migration Tool:** Alembic (SQLAlchemy ORM)  
**Migration Target (Head):** `0011_phase19_enterprise_trust.py`  
**Initialization Scripts:** `initialization/init-extensions.sql`  
**Migrations Directory:** `migrations/`  

---

## 1. Overview & Schema Architecture

The WealthOS persistence tier enforces strict financial consistency, cryptographic isolation, and regulatory retention:
- **Ledger Immutability:** Append-only journal entries and lines with non-destructive balance recalculation.
- **Multi-Tenant Isolation (RLS):** Every core table enforces PostgreSQL Row-Level Security filtered by `tenant_id`.
- **Foreign Key Integrity:** Cascading foreign keys, unique constraints on idempotency keys, and check constraints preventing negative balance anomalies on restricted accounts.

### Migration Lineage (11 Revisions)

1. `0001_initial_schema.py`: Base user, tenant, and audit tables.
2. `0002_auth_and_tenant_security.py`: Argon2id hashes, MFA secrets, API keys, WebAuthn credentials.
3. `0003_rls_and_security_hardening.py`: PostgreSQL RLS policies, tenant context functions.
4. `0004_accounting_engine.py`: Double-entry core (journal entries, lines, chart of accounts, accounting periods).
5. `0005_financial_foundation.py`: Bank accounts, institutions, automated transaction categorizations.
6. `0006_financial_control_centre.py`: Reconciliation records, variance logs, integrity verification locks.
7. `0007_investment_accounting.py`: Securities, holdings, corporate actions, tax lots, asset valuations.
8. `0008_wave_2_budgets_liabilities_documents.py`: Budget limits, amortized loans, encrypted document vaults.
9. `0009_wave_3_planning_tax_risk.py`: Financial goals, tax deductions, risk profile scores.
10. `0010_wave_4_twin_household.py`: Financial digital twin scenario models, household shared accounts.
11. `0011_phase19_enterprise_trust.py` **(HEAD)**: Consent lifecycle, offline sync state, retention policies, audit ledger.

---

## 2. Pre-Requisites & Database Initialization

### Step 1: Install PostgreSQL 16+
Ensure PostgreSQL 16 or later is installed and running.

### Step 2: Create Role and Database
```sql
CREATE USER wealthos_user WITH ENCRYPTED PASSWORD 'your_secure_password';
CREATE DATABASE wealthos_db OWNER wealthos_user;
GRANT ALL PRIVILEGES ON DATABASE wealthos_db TO wealthos_user;
```

### Step 3: Install Required PostgreSQL Extensions
Connect as a superuser (e.g., `postgres`) to `wealthos_db`:
```bash
psql -U postgres -d wealthos_db -f initialization/init-extensions.sql
```
Or execute directly in `psql`:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

---

## 3. Running Database Migrations

### Step 1: Configure Connection
Set `DATABASE_URL` pointing to your target PostgreSQL instance:
```bash
cd migrations
export DATABASE_URL="postgresql+asyncpg://wealthos_user:your_secure_password@localhost:5432/wealthos_db"
```

### Step 2: Apply All Migrations
```bash
alembic upgrade head
```

### Step 3: Verify Migration Revision
```bash
alembic current
```
Expected output:
```
0011_phase19_enterprise_trust (head)
```

---

## 4. Verification & Integrity Inspection

Verify that tables and RLS are active:
```sql
-- Connect to database
\c wealthos_db

-- Check installed tables
\dt

-- Check Row Level Security status on accounts table
SELECT relname, relrowsecurity, relforcerowsecurity 
FROM pg_class 
WHERE relname IN ('accounts', 'journal_entries', 'journal_lines');
```
Expected output: `relrowsecurity = true` and `relforcerowsecurity = true` across all multi-tenant tables.

