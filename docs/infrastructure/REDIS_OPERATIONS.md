# WealthOS — Redis Operational Architecture & Reliability Runbook

**Programme:** WealthOS Enterprise Architecture & Production Readiness  
**Document:** Redis Operations  
**Date:** 2026-11-08  
**Status:** Approved Operational Runbook  
**Author:** Principal SRE & Database Architect  

---

## 1. Production Redis Engine Configuration (`redis.conf`)

WealthOS deploys Redis 7.2 with memory bounds, authentication, and hybrid persistence (RDB snapshots + AOF):

```ini
# Network & Security
bind 0.0.0.0
port 6379
protected-mode yes
requirepass "wealthos_production_redis_auth_token_replace_in_secret_store"
rename-command FLUSHALL ""            # Disable dangerous commands
rename-command FLUSHDB ""
rename-command DEBUG ""

# Memory Management & Eviction
maxmemory 2gb
maxmemory-policy volatile-lru         # Evict only keys with an explicit TTL set
maxmemory-samples 5

# Persistence Configuration (Hybrid RDB + AOF)
save 900 1                            # Snapshot if 1 key changed in 15 mins
save 300 10                           # Snapshot if 10 keys changed in 5 mins
save 60 10000                         # Snapshot if 10k keys changed in 1 min
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /data

appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec                  # Max 1 second data loss on power outage
no-appendfsync-on-rewrite yes
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Client & Connection Limits
maxclients 10000
timeout 300
tcp-keepalive 60
```

---

## 2. Health Monitoring & Key Diagnostic Commands

### Active Liveness Check
```bash
redis-cli -a "$REDIS_PASSWORD" ping
# Response: PONG
```

### Memory Utilization & Eviction Monitoring
```bash
redis-cli -a "$REDIS_PASSWORD" info memory
```
Key metrics to monitor:
- `used_memory_human`: Current RAM consumption.
- `used_memory_peak_human`: Peak memory usage.
- `evicted_keys`: Number of evicted keys. If $> 0$, assess if `maxmemory` needs vertical scaling.

---

## 3. Disaster Recovery: Redis Snapshot Backup & Restore

### Backup Runbook
```bash
# 1. Trigger background save
redis-cli -a "$REDIS_PASSWORD" bgsave

# 2. Verify completion
redis-cli -a "$REDIS_PASSWORD" lastsave

# 3. Copy dump.rdb to S3 backup bucket
aws s3 cp /data/dump.rdb s3://wealthos-backups/redis/dump_$(date +%Y%m%d).rdb
```

### Restore Runbook
```bash
# 1. Stop Redis service
systemctl stop redis-server

# 2. Download snapshot
aws s3 cp s3://wealthos-backups/redis/dump_latest.rdb /data/dump.rdb
chown redis:redis /data/dump.rdb

# 3. Start Redis service
systemctl start redis-server
```

