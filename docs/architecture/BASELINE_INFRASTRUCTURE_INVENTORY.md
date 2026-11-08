# WealthOS — Baseline Infrastructure Inventory & Risk Analysis

**Programme:** WealthOS Enterprise Architecture & Production Readiness  
**Document:** Baseline Infrastructure Inventory  
**Commit SHA:** `b221558f522b2d553d7b30ff6640a481c04ed135`  
**Active Branch:** `feature/final-financial-intelligence-production`  
**Date:** 2026-11-08  
**Author:** Cloud Infrastructure & SRE Lead  

---

## 1. Master Infrastructure Inventory Matrix

| Component | Existing Configuration | Risk Assessment | Recommended Action |
|---|---|---|---|
| **PostgreSQL** | PostgreSQL 16.8 container (`wealthos_postgres`), port 5432. Direct connections, 81 tables, 65 RLS policies. Single volume `wealthos_postgres_data`. | Single Point of Failure (SPOF). No read replicas. Connection pool exhaustion risk (max 100). No continuous WAL archiving to S3. | Deploy PgBouncer connection pooler; configure streaming replication with read replica; enable WAL archiving for sub-minute PITR. |
| **Redis** | Redis 7.2.7 container (`wealthos_redis`), port 6379, standard standalone configuration. Persistence via appendonly/dump. | Single instance without Sentinel or cluster. Loss of Redis clears token blacklist and delays Celery queues. | Configure Redis persistence (`appendonly yes`), healthchecks, and structured Redis failure handling in API. |
| **FastAPI Backend** | FastAPI on Python 3.11 (`wealthos_backend_api`), port 8000. Uvicorn with single worker in Docker. | Single instance, no load balancer. If process crashes, API is completely unavailable. Synchronous tasks block event loop. | Add NGINX reverse proxy, scale to multiple stateless API instances, dispatch heavy tasks to Celery background workers. |
| **Next.js Web** | Next.js 14.2.23 (`apps/web`), port 3000. Node.js 20. App Router with 27 compiled routes. | Sessions stored in `localStorage` vulnerable to XSS. Missing production HTTP security headers (CSP, HSTS). | Migrate session storage to `HttpOnly` cookies; configure security headers in `next.config.js`; add edge caching. |
| **React Native / Expo** | Expo SDK 51 (`apps/mobile`), React Native 0.74. Tested SecureStore adapter. Isolated UI mockup in `App.tsx`. | No native Android build (`android/`), no `eas.json`, no Target SDK 34/35 declarations. Cannot be submitted to Play Store. | Configure `app.json`, add `eas.json` build profiles, target Android SDK 34/35, implement real authenticated screens and account deletion. |
| **Celery Workers** | 3 worker containers in `docker-compose.yml` (`default`, `ocr_heavy`, `market_data`). | Workers run idle; OCR and market sync currently execute synchronously in API requests. | Dispatch OCR statement parsing and market data ingestion as async background jobs with progress tracking. |
| **Object Storage** | MinIO container (`wealthos_minio`), ports 9000 (API) and 9001 (Console). Volume `wealthos_minio_data`. | Local development credentials in `.env`. Bucket quarantine policies need strict presigned URL access. | Enforce strict presigned URL generation, quarantine bucket isolation, and server-side encryption at rest. |
| **Docker Compose** | Single `docker-compose.yml` declaring all 7 local services on internal bridge network `wealthos_network`. | Services directly map ports to host without firewall or reverse proxy routing. | Introduce NGINX ingress container as the sole public gateway; internalize backend and database ports. |
| **CI / CD** | GitHub Actions `.github/workflows/` (test and lint workflows). | Lacks automated container scanning, dependency vulnerability gates, and multi-stage release tagging. | Add security scanning steps (Trivy, pip-audit, npm audit) and automated staging deployment gates. |
| **Monitoring** | Basic `/metrics` endpoint returning static JSON. | No Prometheus scraper, no time-series storage, no Grafana dashboards, no automated alert rules. | Standardize `/metrics` to Prometheus exposition format; configure Prometheus scraper and Grafana dashboards. |

---

## 2. Container & Service Specifications

| Service Name | Container Name | Image / Base | Internal Port | Host Port | Volume Mount | Healthcheck |
|---|---|---|---|---|---|---|
| `postgres` | `wealthos_postgres` | `postgres:16-alpine` | 5432 | 5432 | `wealthos_postgres_data:/var/lib/postgresql/data` | `pg_isready -U postgres` (interval 5s, timeout 3s) |
| `redis` | `wealthos_redis` | `redis:7-alpine` | 6379 | 6379 | `wealthos_redis_data:/data` | `redis-cli ping` (interval 5s, timeout 3s) |
| `minio` | `wealthos_minio` | `minio/minio:RELEASE...` | 9000, 9001 | 9000, 9001 | `wealthos_minio_data:/data` | `/minio/health/live` (interval 10s) |
| `backend-api` | `wealthos_backend_api` | Custom Python 3.11 | 8000 | 8000 | `.` mounted in development | `/health` (interval 10s, timeout 5s) |
| `worker-default`| `wealthos_worker_default` | Custom Python 3.11 | - | - | `.` mounted in development | Celery inspect ping |
| `worker-ocr` | `wealthos_worker_ocr` | Custom Python 3.11 | - | - | `.` mounted in development | Celery inspect ping |
| `worker-market` | `wealthos_worker_market` | Custom Python 3.11 | - | - | `.` mounted in development | Celery inspect ping |
| `web-frontend` | Hosted as daemon task | Node.js 20 / Next.js | 3000 | 3000 | Monorepo root | `curl -f http://localhost:3000` |

---

## 3. Network Architecture & Security Boundaries

Currently, all containers communicate across a user-defined Docker bridge network (`wealthos_network`). However, ports `5432`, `6379`, `9000`, `9001`, and `8000` are bound directly to `0.0.0.0` on the host machine.

### Target Architecture Remediation
In the hardened production topology:
1. Only ports `80` / `443` (NGINX Reverse Proxy) and `3000` (Next.js) will be exposed externally.
2. PostgreSQL, Redis, MinIO, and backend API replicas will reside exclusively on an isolated internal network (`wealthos_internal`), inaccessible from the public internet.
3. API instances will communicate with PostgreSQL solely through PgBouncer connection pooler instances.

---

## 4. Storage & State Persistence Inventory

| Volume / Mount | Type | Underlying Host Location | Data Preserved | Retention / Backup Policy |
|---|---|---|---|---|
| `wealthos_postgres_data` | Docker Named Volume | Docker engine storage root | Complete relational database: transactions, accounts, users, RLS configurations. | Daily pg_dump; target: continuous WAL archiving to MinIO/S3. |
| `wealthos_redis_data` | Docker Named Volume | Docker engine storage root | Append-only file and RDB snapshots of revoked tokens and Celery queues. | Ephemeral persistence with fast startup recovery. |
| `wealthos_minio_data` | Docker Named Volume | Docker engine storage root | Quarantined financial documents, CAS PDFs, bank statements. | Immutable object storage with versioning and cryptographic checksums. |

