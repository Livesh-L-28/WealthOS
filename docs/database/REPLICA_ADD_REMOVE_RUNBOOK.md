# WealthOS — Read Replica Provisioning & Decommissioning Runbook

**Programme:** WealthOS Enterprise Architecture & Production Readiness  
**Document:** Replica Add / Remove Operational Runbook  
**Date:** 2026-11-08  
**Status:** Approved Standard Operating Procedure (SOP)  
**Author:** Database Administrator & Infrastructure Engineer  

---

## 1. Procedure: Adding a New PostgreSQL Read Replica

This runbook outlines the zero-downtime addition of a new streaming read replica to expand analytical read throughput.

### Step 1: Create Replication Role and Slot on Primary
Execute on the Primary writer database (`wealthos_postgres`):
```sql
-- Create dedicated replication user if not already existing
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'wealthos_replicator') THEN
        CREATE ROLE wealthos_replicator WITH REPLICATION LOGIN ENCRYPTED PASSWORD 'replicator_secure_password_123';
    END IF;
END $$;

-- Create a permanent physical replication slot for the new replica
SELECT pg_create_physical_replication_slot('replica_node_2_slot');
```

### Step 2: Provision Replica Data Directory via `pg_basebackup`
On the new replica host or container:
```bash
# Clean target directory
rm -rf /var/lib/postgresql/data/*

# Stream base backup directly from primary
pg_basebackup \
  -h wealthos_postgres \
  -p 5432 \
  -U wealthos_replicator \
  -D /var/lib/postgresql/data \
  -Fp \
  -Xs \
  -P \
  -R \
  --slot=replica_node_2_slot
```
> [!NOTE]
> The `-R` flag automatically creates `standby.signal` and configures `primary_conninfo` in `postgresql.auto.conf`.

### Step 3: Configure Standby Parameters & Start Node
Verify `/var/lib/postgresql/data/postgresql.conf` contains:
```ini
hot_standby = on
hot_standby_feedback = on
primary_slot_name = 'replica_node_2_slot'
```
Start the replica container:
```bash
docker start wealthos_postgres_replica_2
```

### Step 4: Verify Replication Stream & Synchronization
On the Primary, verify the replica is actively streaming:
```sql
SELECT application_name, client_addr, state, sync_state, replay_lag 
FROM pg_stat_replication 
WHERE application_name = 'replica_node_2_slot';
```
On the Replica, verify recovery status:
```sql
SELECT pg_is_in_recovery(); -- Returns 't'
```

### Step 5: Register with Reader Pool & Application Router
Add the new replica's IP to the PgBouncer reader pool (`pgbouncer_reader.ini`) and reload:
```bash
psql -p 6433 -U pgbouncer -d pgbouncer -c "RELOAD;"
```

---

## 2. Procedure: Safely Decommissioning a Read Replica

### Step 1: Pre-Decommissioning Safety Checks
1. Confirm the target node is **NOT** the primary:
   ```sql
   SELECT pg_is_in_recovery(); -- MUST return 't'
   ```
2. Confirm sufficient remaining read capacity exists on other replicas or the primary.

### Step 2: Drain Active Client Traffic
Remove the replica IP from the PgBouncer reader pool:
```bash
# In pgbouncer_reader.ini, comment out the replica host
# Reload PgBouncer
psql -p 6433 -U pgbouncer -d pgbouncer -c "RELOAD;"
```
Wait for existing read queries to finish (graceful connection drain, typically 30–60 seconds).

### Step 3: Stop Replica Container / VM Cleanly
```bash
docker stop wealthos_postgres_replica_2
```

### Step 4: Drop Replication Slot on Primary
To prevent the Primary from indefinitely accumulating WAL files for an inactive standby, drop the slot:
```sql
SELECT pg_drop_replication_slot('replica_node_2_slot');
```
Verify disk space on Primary `pg_wal` is healthy:
```sql
SELECT count(*) AS wal_file_count FROM pg_ls_waldir();
```
