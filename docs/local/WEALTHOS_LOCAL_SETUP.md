# WealthOS Local Environment Setup & Operational Runbook

**Milestone:** Gate 2 — Clean Local Environment & Setup  
**Repository:** `Livesh-L-28/WealthOS`  
**Branch:** `feature/final-financial-intelligence-production`  
**Target Environment:** macOS (Apple Silicon arm64), Docker Desktop, Python 3.12+, Node.js 20+  
**Date:** 2026-11-08  
**Author:** WealthOS Principal DevOps & Systems Engineer  

---

## 1. Prerequisites & Host Specifications

Before booting the platform, verify that your local machine satisfies the runtime requirements:

| Tool / Runtime | Required Version | Verified Local Architecture | Verification Command |
|---|---|---|---|
| **Operating System** | macOS 14+ (Sonoma/Sequoia) | Darwin Kernel ARM64 (Apple M1 Pro) | `uname -a` |
| **Docker Desktop** | 24+ | 29.7.2 | `docker --version` |
| **Docker Compose** | v2.20+ | v5.5.1 | `docker compose version` |
| **Node.js** | v20 LTS | v20.15.1 | `node -v` |
| **npm** | 10+ | 10.7.0 | `npm -v` |
| **Python** | 3.12+ | 3.12.1 / 3.14.6 (.venv) | `python3 --version` |

---

## 2. Port & Network Allocation Matrix

WealthOS isolates local development services on dedicated localhost ports to prevent conflicts:

| Service | Internal Port | Local Host Mapping | Protocol | Default Credentials (Dev Profile) |
|---|---|---|---|---|
| **Next.js Web Frontend** | 3000 | `127.0.0.1:3000` | HTTP | Public access / authenticated routes |
| **FastAPI Backend API** | 8000 | `127.0.0.1:8000` | HTTP | Bearer JWT / API Key |
| **PostgreSQL 16** | 5432 | `127.0.0.1:5432` | TCP | User: `wealthos_admin` / Pass: `wealthos_local_dev_password_change_in_prod` / DB: `wealthos` |
| **Redis 7 (Auth)** | 6379 | `127.0.0.1:6379` | TCP | Pass: `wealthos_local_dev_redis_change_in_prod` |
| **MinIO API** | 9000 | `127.0.0.1:9000` | HTTP | User: `minioadmin` / Pass: `minioadminpassword` |
| **MinIO Console** | 9001 | `127.0.0.1:9001` | HTTP | Web UI Console |

> [!CAUTION]
> **Data Volume Safety:** Never execute `docker compose down -v` against local environments. Named volumes (`wealthos_postgres_data`, `wealthos_redis_data`, `wealthos_minio_data`) store your financial ledger and statement vaults.

---

## 3. Fast-Track Developer Boot Sequence

### Step 1: Clone & Configure Workspace
```bash
git clone https://github.com/Livesh-L-28/WealthOS.git
cd WealthOS
git checkout feature/final-financial-intelligence-production
cp .env.example .env
```

### Step 2: Install Monorepo Node Dependencies & Build Packages
```bash
npm install
npm run build:packages
```

### Step 3: Set up Backend Python Virtual Environment
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -e ".[dev]"
cd ..
```

### Step 4: Boot Infrastructure with Docker Compose
```bash
docker compose up -d
```

### Step 5: Verify Container Health
```bash
docker compose ps
```
Expected output: All 8 containers (`wealthos_postgres`, `wealthos_redis`, `wealthos_minio`, `wealthos_backend_api`, `wealthos_worker_default`, `wealthos_worker_ocr`, `wealthos_worker_market`, `wealthos_web`) report `Up (healthy)`.

---

## 4. Verification & Diagnostic Commands

### 4.1 PostgreSQL Health & Schema Version
```bash
docker exec wealthos_postgres psql -U wealthos_admin -d wealthos -c "
  SELECT version_num FROM alembic_version;
  SELECT count(*) AS rls_table_count FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;
"
```
*Expected: Version `0005_financial_foundation` and $\ge 40$ RLS tables.*

### 4.2 Redis Authentication & Ping
```bash
docker exec wealthos_redis redis-cli -a "wealthos_local_dev_redis_change_in_prod" ping
```
*Expected: `PONG`.*

### 4.3 MinIO Bucket Verification
```bash
backend/.venv/bin/python3 -c "
import boto3
s3 = boto3.client('s3', endpoint_url='http://127.0.0.1:9000', aws_access_key_id='minioadmin', aws_secret_access_key='minioadminpassword')
print('Buckets:', [b['Name'] for b in s3.list_buckets()['Buckets']])
"
```
*Expected: `['wealthos-documents', 'wealthos-quarantine', 'wealthos-vault']`.*

### 4.4 Celery Task Execution
```bash
backend/.venv/bin/python3 -c "
import os
os.environ['REDIS_PASSWORD'] = 'wealthos_local_dev_redis_change_in_prod'
from app.workers.health_tasks import health_ping
res = health_ping.apply_async(args=['local_probe'], queue='default')
print('Celery Ping Result:', res.get(timeout=5))
"
```
*Expected: `{'status': 'pong', 'payload': 'local_probe', 'queue': 'default', ...}`.*

### 4.5 Backend API Liveness & Readiness Probes
```bash
# Liveness (checks process execution)
curl -s http://127.0.0.1:8000/health/live

# Readiness (checks PostgreSQL, Redis, and Object Storage)
curl -s http://127.0.0.1:8000/health/ready

# Detailed Subsystem Diagnostics
curl -s http://127.0.0.1:8000/api/v1/health
```

### 4.6 Web Frontend Availability
```bash
curl -I http://127.0.0.1:3000/
```
*Expected: `HTTP/1.1 200 OK`.*

---

## 5. Graceful Teardown

To stop containers safely without data loss:
```bash
docker compose stop
```

To remove containers and networks while preserving database volumes:
```bash
docker compose down
```
*(Do NOT use `-v`)*

