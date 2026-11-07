# WealthOS Docker & Containerization Guide

This document describes the container architecture, multi-stage builds, volume topologies, networking design, and security isolation of the WealthOS infrastructure.

---

## 1. Container Service Architecture

The local development cluster defined in `docker-compose.yml` includes 9 isolated services, with all exposed host ports strictly bound to `127.0.0.1`:

| Service Name | Base Image / Context | Internal Port | Host Port (Localhost Only) | Purpose | Health Check |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `postgres` | `postgres:16.8-alpine` | `5432` | `127.0.0.1:5432` | Primary transactional relational database | `pg_isready -U wealthos_admin -d wealthos` |
| `redis` | `redis:7.2.7-alpine` | `6379` | `127.0.0.1:6379` | Authenticated in-memory cache and task queue broker | `redis-cli -a "$$REDIS_PASSWORD" ping` |
| `minio` | `ghcr.io/coollabsio/minio:RELEASE.2025-10-15T17-29-55Z` | `9000`, `9001` | `127.0.0.1:9000`, `127.0.0.1:9001` | S3-compatible financial statement and document storage | TCP socket probe on port 9000 |
| `minio-init` | `ghcr.io/coollabsio/minio:RELEASE.2025-10-15T17-29-55Z` | N/A | None (Internal) | One-shot bucket provisioner (`wealthos-documents`, `wealthos-vault`, `wealthos-quarantine`) | Exits `0` upon bucket creation |
| `backend-api` | Multi-stage `backend/Dockerfile` | `8000` | `127.0.0.1:8000` | FastAPI REST API service | `curl -f http://localhost:8000/healthz` |
| `celery-worker-default` | Multi-stage `backend/Dockerfile` | N/A | None (Internal) | Celery daemon for default transactional queue | `celery inspect ping` |
| `celery-worker-ocr` | Multi-stage `backend/Dockerfile` | N/A | None (Internal) | Celery daemon for isolated, memory-intensive OCR extraction | `celery inspect ping` |
| `celery-worker-market` | Multi-stage `backend/Dockerfile` | N/A | None (Internal) | Celery daemon for market data feed polling and updates | `celery inspect ping` |
| `web` | Multi-stage `apps/web/Dockerfile` | `3000` | `127.0.0.1:3000` | Next.js 14 Web Application | `curl -f http://127.0.0.1:3000/` |

---

## 2. Multi-Stage Dockerfile Strategy

### Backend Dockerfile (`backend/Dockerfile`)
1. **Builder Stage**:
   - Uses `python:3.12-slim` with build dependencies (`build-essential`, `libpq-dev`, `curl`).
   - Compiles binary wheels into `/build/wheels` including `greenlet` and `packaging`.
2. **Runner Stage**:
   - Uses clean `python:3.12-slim` containing only minimal runtime libraries (`libpq5`, `curl`).
   - Installs pre-built wheels without leaving build tools or caches.
   - Runs as non-root user `wealthos` (UID 1001) for strict security compliance.

### Web Dockerfile (`apps/web/Dockerfile`)
1. **Deps Stage**:
   - Uses `node:20-alpine` with `libc6-compat`.
   - Copies monorepo package configurations and runs `npm ci`.
2. **Builder Stage**:
   - Builds shared workspace packages (`@wealthos/design-tokens`, `@wealthos/shared-types`, `@wealthos/api-client`).
   - Compiles Next.js production bundle with SWC optimizations.
3. **Runner Stage**:
   - Copies production assets, `.next` output, and dependency trees.
   - Installs `curl` for container health monitoring.
   - Runs Next.js server under non-root `nextjs` user (UID 1001) on port 3000.

---

## 3. Storage Persistence & Named Volumes

All stateful data is preserved in named volumes:
- `wealthos_postgres_data`: Database tables, indexes, write-ahead logs.
- `wealthos_redis_data`: Append-only file (AOF) persistence for cache and jobs.
- `wealthos_minio_data`: Ingested PDF statements, attachments, and encrypted artifacts.

To wipe local development state completely:
```bash
docker compose down -v
```

---

## 4. Container Healthchecks & Dependency Graph

Containers boot in strict dependency order:
```
postgres (healthy) ──┐
redis (healthy)    ──┼──> backend-api (healthy) ──┬──> celery-worker-default (healthy)
minio (healthy)    ──┤                            ├──> celery-worker-ocr (healthy)
minio-init (done)  ──┘                            ├──> celery-worker-market (healthy)
                                                  └──> web (healthy)
```
- PostgreSQL: `pg_isready -U wealthos_admin -d wealthos`
- Redis: `redis-cli ping`
- MinIO: TCP socket probe on `127.0.0.1:9000`
- Backend API: `curl -f http://localhost:8000/healthz`
- Celery Workers: `celery -A app.infrastructure.celery_app.celery_app inspect ping`
- Web Next.js: `curl -f http://127.0.0.1:3000/`

---

## 5. Local Development Operations

Start the entire stack in the background:
```bash
docker compose up -d --build
```

Inspect service health:
```bash
docker compose ps
```

Tail logs from all services:
```bash
docker compose logs -f
```

Stop the environment gracefully:
```bash
docker compose down
```
