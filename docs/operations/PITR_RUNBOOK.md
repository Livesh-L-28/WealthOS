# WealthOS — Point-in-Time Recovery (PITR) Operational Runbook

**Programme:** WealthOS Enterprise Architecture & Production Readiness  
**Document:** PITR Runbook  
**Date:** 2026-11-08  
**Status:** Approved Operational Procedure  
**Target RPO:** Sub-minute ($< 60$ seconds)  
**Author:** PostgreSQL Reliability Engineer & SRE Lead  

---

## 1. When to Use Point-in-Time Recovery (PITR)

Point-in-Time Recovery allows restoring the database to the exact state it was in at a specific second in time ($t_{\text{target}}$).

Use PITR for:
1. Reversing catastrophic human operational error (e.g., an accidental `DROP TABLE` or unintended mass `DELETE` executed by a superuser).
2. Rolling back data corruption caused by a failed application batch migration that bypassed validation rules.
3. Investigating forensic financial state at a specific historical audit timestamp.

---

## 2. Step-by-Step PITR Procedure

### Step 1: Identify Target Timestamp & Base Backup
Determine the exact UTC timestamp immediately preceding the incident:
```bash
TARGET_TIME="2026-11-08 14:32:15 UTC"
```
Locate the most recent encrypted base backup taken **before** `TARGET_TIME`:
```bash
aws s3 ls s3://wealthos-backups/base_backups/
# Example found: base_20261108_020000.tar.gz.gpg
```

### Step 2: Prepare Isolated Recovery Host / Directory
Never perform PITR on top of a running production database. Provision a staging or replacement recovery node:
```bash
# Ensure PostgreSQL is stopped on recovery host
systemctl stop postgresql
rm -rf /var/lib/postgresql/data/*
```

### Step 3: Restore Base Backup Snapshot
Decrypt and untar the base backup to the data directory:
```bash
aws s3 cp s3://wealthos-backups/base_backups/base_20261108_020000.tar.gz.gpg - | \
  gpg --decrypt --batch | \
  tar -xzf - -C /var/lib/postgresql/data/
```

### Step 4: Configure Recovery Signal & Target Settings
Create the recovery signal file to instruct PostgreSQL 16 to enter archive recovery mode:
```bash
touch /var/lib/postgresql/data/recovery.signal
```

Append recovery configuration to `/var/lib/postgresql/data/postgresql.conf` (or `postgresql.auto.conf`):
```ini
# Restore command fetches archived WAL files from MinIO / S3
restore_command = 'aws s3 cp s3://wealthos-backups/wal_archive/%f %p'

# Precise recovery target timestamp (UTC)
recovery_target_time = '2026-11-08 14:32:15 UTC'

# Stop replaying and pause when target is reached, allowing verification
recovery_target_action = 'pause'
```

### Step 5: Start PostgreSQL & Monitor Replay Logs
Start the PostgreSQL instance:
```bash
systemctl start postgresql
```
Tail the database log to monitor WAL replay:
```bash
tail -f /var/log/postgresql/postgresql-16-main.log
```
Expected log output:
```
LOG:  starting point-in-time recovery to 2026-11-08 14:32:15+00
LOG:  restored log file "000000010000000A00000021" from archive
...
LOG:  recovery stopping at restore point or timestamp 2026-11-08 14:32:15+00
LOG:  recovery has paused
LOG:  execute pg_wal_replay_resume() to promote
```

### Step 6: Validate Financial Integrity & Tenant Isolation
Connect to the paused recovery database and execute validation queries:
```sql
-- 1. Check double-entry balance
SELECT sum(debit) - sum(credit) AS balance_imbalance FROM journal_lines;
-- MUST return 0.0000

-- 2. Verify corrupted table or transaction is absent
SELECT count(*) FROM journal_entries WHERE created_at > '2026-11-08 14:32:15 UTC';
-- MUST return 0
```

### Step 7: Promote Database to Active Primary
Once data integrity is confirmed, resume recovery to promote the node:
```sql
SELECT pg_wal_replay_resume();
```
Verify node is out of recovery:
```sql
SELECT pg_is_in_recovery(); -- Returns 'f'
```
Update PgBouncer to point application traffic to the newly restored database.
