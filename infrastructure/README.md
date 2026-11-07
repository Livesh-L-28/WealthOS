# WealthOS Infrastructure Architecture (`infrastructure/`)

Provides container configurations, automated orchestration scripts, and database initialization logic.

---

## 1. Directory Structure

```
infrastructure/
├── docker/
│   └── postgres/
│       └── init-extensions.sql # PostgreSQL extensions (uuid-ossp, pgcrypto, btree_gist)
├── deployment/                 # Cloud deployment configurations
└── monitoring/                 # Prometheus & Grafana configurations
```

---

## 2. Docker Compose Topology

The root `docker-compose.yml` orchestrates 8 isolated container services:

| Container Name | Service | Internal Port | Host Port | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `wealthos_postgres` | `postgres` | 5432 | 5432 | PostgreSQL 16 relational database |
| `wealthos_redis` | `redis` | 6379 | 6379 | Cache & Celery task broker |
| `wealthos_minio` | `minio` | 9000, 9001 | 9000, 9001 | S3-compatible object storage |
| `wealthos_minio_init` | `minio-init` | N/A | N/A | One-shot bucket provisioner |
| `wealthos_backend_api` | `backend-api` | 8000 | 8000 | FastAPI REST API service |
| `wealthos_worker_default` | `celery-worker-default` | N/A | N/A | Transactional worker queue |
| `wealthos_worker_ocr` | `celery-worker-ocr` | N/A | N/A | Memory-isolated OCR worker |
| `wealthos_worker_market` | `celery-worker-market` | N/A | N/A | Market ticker feed worker |
| `wealthos_web` | `web` | 3000 | 3000 | Next.js 14 App Router UI |

---

## 3. Operational Commands

```bash
# Start all containers in the background
docker compose up -d

# Verify container health
docker compose ps

# Stop all containers (preserving persistent volumes)
docker compose down

# Destroy all containers and volumes (clean reset)
docker compose down -v
```

