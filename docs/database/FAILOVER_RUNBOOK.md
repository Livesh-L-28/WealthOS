# WealthOS — Database Failover & High-Availability Runbook

**Programme:** WealthOS Enterprise Architecture & Production Readiness  
**Document:** Database Failover Runbook  
**Date:** 2026-11-08  
**Status:** Operational Runbook  
**Target RTO:** $< 15$ seconds  
**Target RPO:** $< 1.0$ second (Async) / $0$ seconds (Sync)  
**Author:** PostgreSQL Reliability Engineer & Incident Commander  

---

## 1. Trigger Conditions & Failure Classification

Failover must be initiated under the following conditions:
1. **Unrecoverable Primary Crash:** Host operating system panic, hardware failure, or container termination failing automated restart.
2. **Persistent Network Partition:** Primary host isolated from application VPC for $> 15$ consecutive seconds while replica remains reachable.
3. **Database Kernel Panic / Storage Corruption:** PostgreSQL terminates abruptly and fails crash recovery due to underlying disk volume degradation.

> [!CAUTION]
> **Split-Brain Prevention:**  
> Never promote a read replica until the former primary is guaranteed **fenced** (isolated, shut down, or network severed). Two nodes accepting writes simultaneously will irrecoverably corrupt the general ledger.

---

## 2. Standard Failover Procedure (Step-by-Step)

### Step 1: Fence the Failed Primary Node
Before initiating promotion, terminate or isolate the primary instance:
```bash
# Docker / Host level isolation
docker stop wealthos_postgres
# Or sever network interfaces / revoke cloud security group ingress
```

### Step 2: Verify Standby Catch-Up
Log in to the designated read replica node (`wealthos_postgres_replica`) and verify latest WAL replay:
```sql
-- Check if node is currently in standby recovery
SELECT pg_is_in_recovery();
-- Should return 't'

-- Verify last replayed transaction timestamp
SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;
```

### Step 3: Promote Read Replica to Standalone Primary
Execute the promotion command:
```sql
-- Via SQL interface (preferred)
SELECT pg_promote(wait := true, wait_seconds := 10);

-- Or via CLI trigger
-- pg_ctl promote -D /var/lib/postgresql/data
```
Verify promotion completion:
```sql
SELECT pg_is_in_recovery();
-- Must return 'f' (node is now in read/write primary mode)
```

### Step 4: Reconfigure PgBouncer Connection Pooler
Direct write traffic to the newly promoted node:
```bash
# Connect to PgBouncer admin console
psql -p 6432 -U pgbouncer -d pgbouncer

-- In PgBouncer console:
PAUSE wealthos;
-- Update database host to promoted replica
-- Reload configuration
RELOAD;
RESUME wealthos;
```

### Step 5: Verify Application Health & Financial Write Path
Run automated smoke test against the backend API:
```bash
# Execute health probe
curl -f http://localhost:8000/health/ready

# Verify double-entry write test
pytest backend/tests/test_ledger.py -k test_balanced_journal_entry
```

---

## 3. Post-Failover Recovery: Rebuilding Former Primary as Standby

Once the original primary hardware/host is recovered, it must be rejoined **strictly as a read replica** (using `pg_rewind` or `pg_basebackup`):

```bash
# 1. Stop former primary
docker stop wealthos_postgres_old

# 2. Run pg_rewind against new primary
pg_rewind \
  --target-pgdata=/var/lib/postgresql/data \
  --source-server="host=wealthos_postgres_promoted port=5432 user=replicator password=..."

# 3. Create standby signal file
touch /var/lib/postgresql/data/standby.signal

# 4. Configure primary_conninfo in postgresql.conf
echo "primary_conninfo = 'host=wealthos_postgres_promoted port=5432 user=replicator password=...'" >> /var/lib/postgresql/data/postgresql.conf

# 5. Start instance as new read replica
docker start wealthos_postgres_old
```

