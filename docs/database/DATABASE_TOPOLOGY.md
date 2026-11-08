# WealthOS — Database Topology & High-Availability Architecture

**Programme:** WealthOS Enterprise Architecture & Production Readiness  
**Document:** Database Topology Specification  
**Date:** 2026-11-08  
**Status:** Architecture Blueprint (Phase 2 & 3 Target)  
**Author:** Database Architect & Principal SRE  

---

## 1. High-Availability Database Topology

WealthOS adopts an enterprise-grade primary-replica PostgreSQL architecture designed for financial transactional consistency, dynamic read capacity, and high availability:

```mermaid
flowchart TD
    subgraph Clients["Application Tier"]
        API1["FastAPI Instance 1"]
        API2["FastAPI Instance 2"]
        Workers["Celery Asynchronous Workers"]
    end

    subgraph PoolTier["Connection Pooler Tier"]
        PgBouncerPrimary["PgBouncer (Writer Pool)<br/>Port 6432 (Transaction Mode)"]
        PgBouncerReplica["PgBouncer (Reader Pool)<br/>Port 6433 (Transaction Mode)"]
    end

    subgraph DBTier["Database Nodes Tier"]
        PGPrimary[("PostgreSQL 16 Primary<br/>Read/Write Leader (Port 5432)<br/>wal_level = replica<br/>archive_mode = on")]
        PGReplica1[("PostgreSQL 16 Read Replica 1<br/>Streaming Standby (Port 5433)<br/>hot_standby = on")]
        PGReplica2[("PostgreSQL 16 Read Replica 2<br/>(Optional Analytical Node)")]
    end

    subgraph BackupTier["Disaster Recovery & Storage"]
        MinIOWAL[("MinIO / S3 Continuous Archive<br/>Write-Ahead Log (WAL) Bucket")]
        DailySnapshots[("Encrypted Base Backups<br/>(Daily pg_dump / pg_basebackup)")]
    end

    API1 -->|Write Transactions & Critical Reads| PgBouncerPrimary
    API2 -->|Write Transactions & Critical Reads| PgBouncerPrimary
    Workers -->|State Mutations & Job Results| PgBouncerPrimary

    API1 -.->|Analytical / Reporting Reads| PgBouncerReplica
    API2 -.->|Analytical / Reporting Reads| PgBouncerReplica

    PgBouncerPrimary -->|Pooled DB Conns| PGPrimary
    PgBouncerReplica -->|Pooled DB Conns| PGReplica1

    PGPrimary -->|Physical Streaming Replication<br/>(WAL Sender / Receiver)| PGReplica1
    PGPrimary -.->|Physical Streaming Replication| PGReplica2

    PGPrimary -->|Continuous WAL Archiving<br/>archive_command| MinIOWAL
    PGPrimary -->|Scheduled Base Backup| DailySnapshots
```

---

## 2. Node Roles & Operational Responsibilities

### 2.1 PostgreSQL Primary (Writer Leader)
- **Role:** Authoritative single-writer node.
- **Responsibilities:**
  - All transactional state modifications (General Ledger journal entries, cash account balances, investment trades, loan amortization events, user registration, role assignments).
  - Enforces database integrity constraints (`PRIMARY KEY`, `FOREIGN KEY`, `CHECK`, and multi-tenant `ROW LEVEL SECURITY`).
  - Strict double-entry accounting balance verification ($\sum\text{Dr} - \sum\text{Cr} = 0$).
  - Generates continuous Write-Ahead Log (WAL) streams and ships archived segments to MinIO/S3 object storage.
  - Replicates WAL physical bytes to active streaming read replicas.

### 2.2 PostgreSQL Read Replica (Hot Standby)
- **Role:** Read-only secondary node running in `hot_standby = on` mode.
- **Responsibilities:**
  - Serves non-critical, read-heavy, and analytical queries (Tax schedules, Financial Planning Monte Carlo simulations, Historical audit reporting, Risk score aggregations).
  - Relieves connection and memory pressure from the Primary writer node.
  - Acts as a designated promotion candidate in the event of an unrecoverable Primary hardware or network failure.

> [!IMPORTANT]
> **Financial Read-After-Write Consistency Rule:**  
> All financial operations requiring read-after-write consistency (e.g. fetching account balances immediately after initiating a transfer or trade) **MUST** query the Primary database to prevent observing stale balances caused by replication lag.

---

## 3. Database Engine Configuration Tuning (`postgresql.conf`)

For a production container or VM with 4 vCPUs and 16 GB RAM:

```ini
# Memory Configuration
shared_buffers = 4GB                  # 25% of total system RAM
effective_cache_size = 12GB           # 75% of total system RAM
work_mem = 64MB                       # Per-query sort/hash memory
maintenance_work_mem = 512MB          # Vacuum and index creation memory

# Connection Settings
max_connections = 150                 # Capped; scaled via PgBouncer
superuser_reserved_connections = 5    # Preserved for DBA emergency access

# Write-Ahead Log (WAL) & Replication
wal_level = replica                   # Supports streaming replication & PITR
max_wal_size = 16GB
min_wal_size = 1GB
checkpoint_completion_target = 0.9    # Smooth I/O spikes
checkpoint_timeout = 15min
archive_mode = on                     # Enable continuous archiving
archive_command = 'test ! -f /var/lib/postgresql/wal_archive/%f && cp %p /var/lib/postgresql/wal_archive/%f'
max_wal_senders = 10                  # Simultaneous replication connections
wal_keep_size = 4096MB                # Minimum WAL retained for replicas

# Standby Read Replica Settings
hot_standby = on                      # Allow read-only queries during recovery
hot_standby_feedback = on             # Prevent vacuum cleanups causing replica query cancellations

# Autovacuum & Maintenance
autovacuum = on
autovacuum_max_workers = 4
autovacuum_naptime = 1min
autovacuum_vacuum_scale_factor = 0.05 # Aggressive vacuuming for high-churn tables
autovacuum_analyze_scale_factor = 0.02

# Query Logging & Diagnostics
log_destination = 'stderr'
logging_collector = on
log_min_duration_statement = 250      # Log all queries taking longer than 250ms
log_checkpoints = on
log_connections = off
log_disconnections = off
log_lock_waits = on                   # Log queries waiting on locks > 1s
deadlock_timeout = 1s
```
