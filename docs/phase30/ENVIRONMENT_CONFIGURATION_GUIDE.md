# WealthOS Phase 30 — Environment Configuration & Secret Management Guide

**Document Identifier:** WEALTHOS-P30-ENV-001  
**Phase:** 30 (WEALTHOS-PHASE-30)  
**Execution Timestamp:** 2026-11-10T13:51:15+05:30  
**Templates Location:** `release/deployment/configuration-templates/`  
**Security Standard:** Zero Hardcoded Secrets; Explicit Startup Failure on Missing Keys  
**Target Outcome:** `FINAL_RELEASE_CANDIDATE_READY_FOR_USER_DELIVERY`  

---

## 1. Executive Summary

Configuring a financial platform requires strict isolation between environments (development, staging, production) and unambiguous secret management. Hardcoded fallbacks, default passwords, or permissive CORS policies create catastrophic security risks.

This guide documents every configuration variable used by the WealthOS platform, explains its purpose and security implications, provides generation instructions for cryptographic keys, and verifies that the backend fails-closed if any production secret is omitted.

---

## 2. Complete Environment Variable Reference Matrix

| Variable Name | Required In | Type | Purpose & Security Implications | Safe Placeholder Example |
| :--- | :---: | :---: | :--- | :--- |
| `ENVIRONMENT` | All | String | Controls error verbosity, docs endpoints, and security flags (`development`, `staging`, `production`). | `production` |
| `DEBUG` | All | Boolean | **Must be `false` in staging/prod** to prevent stack trace leaks. | `false` |
| `SECRET_KEY` | All | Hex String | HMAC key for signing JWT authentication tokens. Minimum 32 bytes (64 hex characters). | `<GENERATE_64_HEX_CHAR_SECRET_KEY>` |
| `ENCRYPTION_MASTER_KEY` | All | Hex String | Master key for AES-256-GCM envelope encryption. Minimum 32 bytes. | `<GENERATE_64_HEX_CHAR_MASTER_KEY>` |
| `DATABASE_URL` | Backend | URL | Asyncpg PostgreSQL connection string with least-privilege user credentials. | `postgresql+asyncpg://user:pass@host:5432/db` |
| `DATABASE_SYNC_URL` | Backend | URL | Psycopg connection string for Alembic schema migrations. | `postgresql+psycopg://user:pass@host:5432/db` |
| `DB_POOL_SIZE` | Backend | Integer | Base database connection pool size (Default: 20 in prod). | `20` |
| `DB_MAX_OVERFLOW` | Backend | Integer | Maximum overflow connections during traffic bursts (Default: 30). | `30` |
| `REDIS_URL` | Backend | URL | Redis connection URL for caching, rate limiting, and session state. | `redis://:pass@host:6379/0` |
| `CELERY_BROKER_URL` | Backend | URL | Redis URL for asynchronous task message queuing. | `redis://:pass@host:6379/1` |
| `CELERY_RESULT_BACKEND`| Backend | URL | Redis URL for storing background task execution results. | `redis://:pass@host:6379/2` |
| `MINIO_ROOT_USER` | Storage | String | Administrative user for MinIO / S3 document vault. | `wealthos_storage_admin` |
| `MINIO_ROOT_PASSWORD` | Storage | String | High-entropy password for storage admin access. | `<STRONG_STORAGE_ROOT_PASSWORD>` |
| `MINIO_DOCUMENTS_BUCKET`| Backend | String | S3 bucket name for encrypted user financial documents. | `wealthos-prod-documents` |
| `CORS_ORIGINS` | Backend | JSON Array| Whitelist of trusted frontend origins. Never set to `["*"]` in production. | `["https://wealthos.app"]` |
| `NEXT_PUBLIC_API_URL` | Web | URL | Public browser URL pointing to the WealthOS API gateway. | `https://api.wealthos.app/api/v1` |
| `EXPO_PUBLIC_API_URL` | Mobile | URL | Public mobile API endpoint configured for reverse proxy / CDN. | `https://api.wealthos.app/api/v1` |

---

## 3. Cryptographic Key Generation SOP

Production secrets must never be hand-typed. System administrators generate high-entropy keys using OpenSSL:

```bash
# Generate 32-byte (64 hex characters) JWT SECRET_KEY
openssl rand -hex 32

# Generate 32-byte (64 hex characters) AES-GCM ENCRYPTION_MASTER_KEY
openssl rand -hex 32

# Generate 24-character alphanumeric database password
openssl rand -base64 18 | tr -dc 'a-zA-Z0-9' | head -c 24
```

---

## 4. Fail-Closed Startup Validation

WealthOS employs strict Pydantic v2 settings validation in `backend/app/core/config.py`.

If `ENVIRONMENT=production` is set and `SECRET_KEY` or `ENCRYPTION_MASTER_KEY` is missing or matches known development defaults (e.g. `wealthos_local_insecure_development_secret_key`), the backend **terminates immediately on startup** with an explicit error:
```
ValidationError: In production, SECRET_KEY must be a cryptographically random string of at least 32 bytes.
Startup halted. Refusing to run in insecure configuration.
```

---

## 5. Delivery Verdict

All environment templates are safely prepared in `release/deployment/configuration-templates/` with zero committed secrets and complete configuration documentation.

