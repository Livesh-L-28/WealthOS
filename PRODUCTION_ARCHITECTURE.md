# WealthOS Phase 27 — Production Infrastructure & Topology Architecture

**Phase ID:** `WEALTHOS-PHASE-27`  
**Execution Timestamp:** 2026-11-10T12:06:00+05:30  
**Status:** **ARCHITECTED & VALIDATED (DEPLOYMENT UNAUTHORIZED)**

---

## 1. Executive Summary

This specification establishes the production infrastructure architecture for WealthOS. In compliance with mandatory operating rules:
- **Production release is STRICTLY PROHIBITED without separate explicit approval.**
- All production credentials, networks, databases, storage buckets, and key vaults are completely isolated from staging and development.
- Staging and production configurations share zero secrets or persistent state.

---

## 2. Environment Isolation Matrix

| Dimension | Local Development | Staging & Beta | Production (Prepared Architecture) |
| :--- | :--- | :--- | :--- |
| **Network Boundary** | `localhost` bridge | `wealthos_staging_network` | `wealthos_prod_network` (VPC with private subnets) |
| **API Host / Port** | `0.0.0.0:8000` | `localhost:8005` | Ingress TLS `https://api.wealthos.internal` (443) |
| **Web Host / Port** | `0.0.0.0:3000` | `localhost:3005` | Ingress TLS `https://app.wealthos.internal` (443) |
| **Database Instance**| `wealthos` (port 5432) | `wealthos_staging` (port 5432/5435) | Primary (`prod-postgres-primary`) + Read-Replica (`prod-postgres-replica`) |
| **DB Runtime User** | `wealthos_app` | `wealthos_staging_app` | `wealthos_prod_app` (Least privilege, `NOBYPASSRLS`) |
| **Redis DB Index** | DB 0 | DB 10 (cache), DB 11 (Celery), DB 12 (results) | Dedicated production Redis cluster with TLS & Auth |
| **Object Storage** | `localhost:9000` | `wealthos-documents-staging` | AES-256 encrypted private S3/MinIO bucket |
| **Master Secrets** | Local dev defaults | Staging UUIDs | Hardware Security Module / Vault KMS (AWS KMS / GCP KMS) |
| **Logging & Tracing**| Stdout console | JSON with correlation ID | Centralized Graylog / Datadog / OpenTelemetry with PII masking |

---

## 3. Production Deployment Topology

The production architecture (`docker-compose.prod.yml`) separates concerns into three distinct tiers:

1. **Edge & Ingress Tier:**
   - Caddy / Nginx reverse proxy with automated TLS termination via Let's Encrypt / ACME.
   - HTTP/2, TLS 1.3, strict HSTS (`max-age=31536000; includeSubDomains; preload`).
   - Rate limiting via Redis sliding window (100 req/min for general API, 5 req/min for auth).

2. **Application Tier:**
   - Horizontally scalable stateless FastAPI API nodes running under Gunicorn / Uvicorn workers.
   - Next.js Web frontend nodes serving prerendered React Server Components.
   - Dedicated Celery worker nodes processing financial document parsing and OCR in background queues.

3. **Authoritative Data & Caching Tier:**
   - **PostgreSQL 16 Primary:** Write-master for ACID double-entry journal postings, budget revisions, and user records.
   - **PostgreSQL 16 Read Replica:** Dedicated replica for heavy analytical queries, historical trend reporting, and export generation.
   - **Authenticated Redis 7:** In-memory session tracking, rate-limiting tokens, and Celery broker queues.

---

## 4. Production Security Hardening Invariants

1. **Least-Privilege Database Roles:** The runtime application connects exclusively as `wealthos_prod_app`. It cannot alter table schemas, grant permissions, or bypass RLS (`rolsuper = False`, `rolbypassrls = False`).
2. **Fail-Closed Credential Validation:** `backend/app/core/config.py` automatically halts container startup if any default or insecure marker (`dev`, `local`, `change_in_prod`) is detected in `SECRET_KEY`, `POSTGRES_PASSWORD`, or `REDIS_PASSWORD`.
3. **Immutability of Financial Records:** Database triggers reject `UPDATE` or `DELETE` on posted journal entries. All adjustments must occur through compensating ledger transactions.
