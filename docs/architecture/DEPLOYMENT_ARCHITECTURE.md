# WealthOS — Production Deployment Architecture & Infrastructure Topology

**Programme:** WealthOS Enterprise Architecture & Production Readiness  
**Document:** Deployment Architecture  
**Date:** 2026-11-08  
**Status:** Architecture Specification  
**Author:** Cloud Infrastructure Engineer & Principal SRE  

---

## 1. Network Topology & Security Zoning

WealthOS enforces a three-tier network isolation topology adhering to the principle of least privilege:

```
[ Public Internet ]
        │
   Port 443 (HTTPS)
        ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Public DMZ / Edge Ingress Tier                           │
│    - NGINX Ingress Controller / Reverse Proxy               │
│    - TLS 1.3 Termination & Automated Let's Encrypt / ACM   │
│    - Web Application Firewall (WAF) & Rate Limiting        │
└───────────────────────┬─────────────────────────────────────┘
                        │ Internal Bridge (wealthos_ingress_net)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Private Application Tier (Isolated Subnet)               │
│    - Next.js Web Server Nodes (Port 3000)                  │
│    - FastAPI Backend Replicas (Port 8000, 8001...)          │
│    - Celery Background Worker Pool (Default, OCR, Market)   │
└───────────────────────┬─────────────────────────────────────┘
                        │ Internal Isolated Subnet (wealthos_data_net)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Secure Persistence Tier (Zero Internet Exposure)         │
│    - PgBouncer Connection Pooler (Port 6432)                │
│    - PostgreSQL 16 Primary Database (Port 5432)             │
│    - PostgreSQL 16 Read Replica Database (Port 5433)        │
│    - Redis 7.2 Cache & Broker (Port 6379)                   │
│    - MinIO Object Storage Vault (Port 9000)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Port Mapping & Network Interface Policy

| Service Name | Internal IP / DNS | Internal Port | External Port | Ingress Policy |
|---|---|---|---|---|
| **NGINX Ingress** | `nginx.wealthos.internal` | 80, 443 | 80, 443 | Publicly Accessible (HTTP redirects to HTTPS) |
| **Next.js Web** | `web.wealthos.internal` | 3000 | None | Accessible only by NGINX Ingress |
| **FastAPI API 1** | `api-1.wealthos.internal` | 8000 | None | Accessible only by NGINX Ingress and Web server |
| **FastAPI API 2** | `api-2.wealthos.internal` | 8000 | None | Accessible only by NGINX Ingress and Web server |
| **PgBouncer** | `pgbouncer.wealthos.internal` | 6432 | None | Accessible only by API Replicas and Celery Workers |
| **PostgreSQL Primary**| `postgres-primary.wealthos.internal` | 5432 | None | Accessible only by PgBouncer and Read Replica |
| **PostgreSQL Replica**| `postgres-replica.wealthos.internal` | 5432 | None | Accessible only by API Replicas (Read-only queries) |
| **Redis** | `redis.wealthos.internal` | 6379 | None | Accessible only by API Replicas and Celery Workers |
| **MinIO API** | `minio.wealthos.internal` | 9000 | None | Accessible only by API Replicas and Celery Workers |

> [!IMPORTANT]
> In production, host port bindings for ports 5432, 5433, 6379, 6432, 8000, 8001, and 9000 are disabled. Only ports 80 and 443 are mapped to the host gateway.

---

## 3. Container Resource Limits & Scaling Thresholds

| Container | CPU Request / Limit | Memory Request / Limit | Target Horizontal Scale | Scaling Metric Trigger |
|---|---|---|---|---|
| **NGINX Proxy** | 0.25 / 1.0 Core | 256MB / 512MB | 2 instances (HA) | Connection count > 10,000 |
| **Next.js Web** | 0.50 / 2.0 Cores | 512MB / 1.5GB | 2–5 instances | CPU > 75% or P95 Latency > 300ms |
| **FastAPI API** | 0.50 / 2.0 Cores | 512MB / 2.0GB | 2–8 instances | CPU > 70% or Active Conns > 100 |
| **Celery Default**| 0.25 / 1.0 Core | 256MB / 1.0GB | 2–4 workers | Queue depth > 500 messages |
| **Celery OCR** | 1.00 / 4.0 Cores | 1.0GB / 4.0GB | 2–6 workers | Queue depth > 50 documents |
| **Celery Market** | 0.25 / 1.0 Core | 256MB / 1.0GB | 1–2 workers | Scheduled cadence (every 60s) |
| **PgBouncer** | 0.50 / 1.0 Core | 256MB / 512MB | 2 instances | Active pooled clients > 300 |
| **PostgreSQL Prim**| 2.00 / 8.0 Cores | 4.0GB / 16.0GB | 1 Primary | Vertical scale + Read offload |
| **PostgreSQL Repl**| 2.00 / 8.0 Cores | 4.0GB / 16.0GB | 1–3 Replicas | Replica CPU > 70% |
| **Redis** | 0.50 / 2.0 Cores | 1.0GB / 4.0GB | 1 Primary + 1 Replica | Memory usage > 75% |

---

## 4. Health Check & Readiness Probes

### 1. Backend API (`wealthos_backend_api`)
- **Liveness Probe:** `GET /health/live`
  - Verifies Uvicorn event loop is responding.
  - Interval: 10s, Timeout: 3s, Failure Threshold: 3.
- **Readiness Probe:** `GET /health/ready`
  - Verifies database connection pool can execute `SELECT 1` and Redis responds to `PING`.
  - If database or Redis fails, traffic is immediately dropped from the upstream load balancer.
  - Interval: 5s, Timeout: 3s, Failure Threshold: 2.

### 2. PostgreSQL Primary (`wealthos_postgres`)
- **Probe:** `pg_isready -h localhost -p 5432 -U postgres`
- Interval: 5s, Timeout: 3s, Failure Threshold: 3.

### 3. PostgreSQL Read Replica (`wealthos_postgres_replica`)
- **Probe:** `pg_isready -h localhost -p 5432 -U postgres && psql -U postgres -c "SELECT pg_is_in_recovery();" | grep -q t`
- Verifies node is responsive and actively serving in recovery/read-replica mode.

---

## 5. Zero-Downtime Deployment & Rolling Updates

1. **Database Migrations First (Expand-Contract Pattern):**
   - Migrations in Alembic must be backward-compatible with the currently running application code.
   - Column additions must allow `NULL` or provide default values.
   - Column drops require a two-phase release (first deprecate in code, then drop in migration).
2. **Rolling Container Replacement:**
   - Deploy new API container instances (`api-v2`).
   - Run readiness probe; confirm healthy connection to PgBouncer.
   - NGINX gradually redirects traffic to `api-v2`.
   - Once all traffic is migrated, decommission old instances (`api-v1`).
3. **Rollback Strategy:**
   - If error rate exceeds 0.5% or P95 latency spikes > 500ms post-deployment, NGINX immediately reverses upstream routing to `api-v1`.

