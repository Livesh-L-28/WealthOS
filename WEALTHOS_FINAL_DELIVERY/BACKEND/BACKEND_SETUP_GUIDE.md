# WealthOS Backend Setup & Operations Guide

**Artifact Identifier:** `WEALTHOS-BACKEND-RELEASE-001`  
**Framework:** FastAPI 0.111+ (Python 3.11+)  
**ORM / Database Engine:** SQLAlchemy 2.0 (asyncpg), PostgreSQL 16+  
**Cache & Task Queue:** Redis 7+, Celery 5.3+  
**Source Directory:** `source-package/`  
**Containerfile:** `Dockerfile`  

---

## 1. Overview & Architecture

The WealthOS backend services power all core fintech capabilities:
- **Double-Entry Accounting:** Immutability-enforced ledger with strict balanced-entry validation (variance = ₹0.0000).
- **Multi-Tenant Isolation:** PostgreSQL Row-Level Security (RLS) enforcement per tenant ID.
- **Offline Synchronization:** Bidirectional sync engine with vector clocks, HMAC verification, and conflict detection.
- **Enterprise Security:** JWT access + refresh tokens, argon2id password hashing, TOTP MFA, WebAuthn/passkey support, rate limiting, and automated security audit logging.

---

## 2. Prerequisites

- **Python:** 3.11 or 3.12
- **PostgreSQL:** 16+ (with `uuid-ossp` and `pgcrypto` extensions)
- **Redis:** 7.0+ (in-memory caching and message broker)
- **C Compiler & Dev Headers:** Required for `asyncpg` / `psycopg2-binary`

---

## 3. Local / Bare-Metal Installation

### Step 1: Create Virtual Environment
```bash
cd source-package
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -e .
```

### Step 2: Environment Configuration
Copy the configuration template:
```bash
cp ../../DEPLOYMENT/configuration-templates/.env.example .env
```
Ensure database and redis connection strings are populated:
```env
DATABASE_URL=postgresql+asyncpg://wealthos_user:wealthos_secure_password@localhost:5432/wealthos_db
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your_production_grade_random_256bit_hex_secret
ENVIRONMENT=production
```

### Step 3: Execute Database Migrations
Apply all schema versions up to head (`0011_phase19_enterprise_trust`):
```bash
alembic upgrade head
```

### Step 4: Run Application Server
```bash
# Production server with multiple uvicorn workers
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Step 5: (Optional) Run Celery Background Worker
```bash
celery -A app.infrastructure.celery_app worker --loglevel=info --concurrency=2
```

---

## 4. Docker Container Build & Run

### Step 1: Build Image
```bash
docker build -t wealthos-backend:1.0.1 -f Dockerfile .
```

### Step 2: Run Container
```bash
docker run -d \
  --name wealthos-api \
  --restart unless-stopped \
  -p 8000:8000 \
  --env-file ../DEPLOYMENT/configuration-templates/.env.production.example \
  wealthos-backend:1.0.1
```

---

## 5. Health Check & Verification

```bash
# Verify API availability
curl -s http://localhost:8000/health | jq .
```
Expected output:
```json
{
  "status": "healthy",
  "version": "1.0.1",
  "database": "connected",
  "redis": "connected"
}
```

