# WealthOS — Phase 13 Disaster Recovery & Business Continuity Plan

**Programme:** Wave 5 — Final Platform Integration and Acceptance  
**Phase:** Phase 13 — Enterprise Integration & Final Acceptance  
**Date:** 2026-11-08  

---

## 1. Disaster Classification & Incident Declaration

Disaster recovery execution is formally initiated upon any of the following triggers:
- **Catastrophic Infrastructure Failure**: Complete loss of the primary database host, disk corruption, or cloud region outage.
- **Data Corruption Event**: Unauthorized tampering or logical corruption of the double-entry General Ledger requiring Point-in-Time rollback.
- **Ransomware / Malicious Destruction**: Compromise of primary operational volumes.

**Incident Commander**: System Lead Architect / VP of Engineering.

---

## 2. Step-by-Step Restoration Procedure

### Step 1: Quarantine & Pre-Restore Health Check
1. Immediately terminate active traffic at the load balancer or API ingress by returning HTTP 503 (`MAINTENANCE_MODE`).
2. Disconnect active database connection pools (`ALTER DATABASE wealthos WITH ALLOW_CONNECTIONS = false;`).
3. Terminate running background Celery workers to avoid concurrent writes.

### Step 2: Retrieve & Cryptographically Verify Backup Archive
1. Download latest encrypted snapshot (`wealthos_db_YYYYMMDD_HHMMSSZ.dump.enc`) and companion manifest (`.manifest.json`) from immutable S3 storage.
2. Validate SHA-256 archive checksum against manifest signature.
3. Validate GCM authentication tag:
   ```bash
   openssl enc -d -aes-256-gcm -in backup.dump.enc -out backup.dump -K $KEY -iv $IV -tag $TAG
   ```

### Step 3: Execute Restoration Script
Run the certified restore script `./scripts/restore_database.sh`:
```bash
export POSTGRES_HOST=127.0.0.1
export POSTGRES_PORT=5432
export POSTGRES_USER=wealthos_admin
export POSTGRES_ADMIN_PASSWORD="[ADMIN_PASSWORD]"
export CONFIRM_RESTORE=true
export WEALTHOS_BACKUP_ENCRYPTION_KEY="[RESTORE_KEY]"

./scripts/restore_database.sh /path/to/backup.dump.enc wealthos
```

### Step 4: Verify Post-Restore Invariants
Before re-enabling public traffic, execute the automated invariant verification:
1. **Trial Balance Check**:
   ```sql
   SELECT SUM(functional_debit_amount) - SUM(functional_credit_amount) FROM journal_lines;
   -- Must return 0.0000 exactly
   ```
2. **Schema Version Check**:
   ```sql
   SELECT version_num FROM alembic_version;
   -- Must match current expected migration revision
   ```
3. **RLS Verification**:
   ```sql
   SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;
   -- Must be >= 46
   ```

### Step 5: Resume Traffic & Notify Stakeholders
1. Flush Redis cache to prevent stale query responses.
2. Restart backend API and Celery workers.
3. Remove 503 maintenance mode page.
4. Record post-incident review in incident log.

