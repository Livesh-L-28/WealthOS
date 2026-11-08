# WealthOS Enterprise Production Deployment & Operations Runbook

**Stage:** 11 — Full-System Integration, Production Hardening & Final Enterprise Release  
**Branch:** `feature/final-financial-intelligence-production`  
**Target Release Candidate:** `v1.0.0-rc1`  
**Deployment Strategy:** Blue/Green Zero-Downtime Deployment with Reversible Database Schema  
**Date:** 2026-11-08  
**Author:** Staff DevOps & Site Reliability Architect  

---

## 1. Scope and Mission

This runbook defines the verified, production-grade deployment and operational procedures for WealthOS. It details infrastructure provisioning, zero-downtime application rollout, secret envelope management, database migration safety gates, rollback procedures, and the external launch dependencies checklist.

> [!IMPORTANT]
> This runbook is prepared for execution approval. As per non-negotiable execution boundaries, production deployment, external credential rotation, and public release tagging require human executive signoff.

---

## 2. Architecture & Infrastructure Topology

```
Internet / Mobile Apps / Web Clients
                │
                ▼ (HTTPS / TLS 1.3 / HSTS)
       Cloudflare / AWS CloudFront CDN
                │
                ▼ (Private VPC Ingress)
          Reverse Proxy / Ingress NGINX
                │
      ┌─────────┴─────────┐
      ▼                   ▼
Next.js Web (Port 3000)   FastAPI Backend (Port 8000)
(Stateless Containers)     (Uvicorn Workers)
                          │
      ┌───────────────────┼───────────────────┐
      ▼                   ▼                   ▼
PostgreSQL 16+ Cluster   Redis 7.2 Cluster   Celery Asynchronous Workers
(Multi-AZ RDS / Patroni) (Primary + Replica) (Document OCR & Report Jobs)
- Forced RLS             - Authenticated     - Shared Object Storage (S3)
- Least-Privilege Roles  - Persistent AOF
```

---

## 3. Database Security & Least-Privilege Role Separation

Production enforces strict separation between schema migration operations and runtime application connections:

### 3.1 Migration Role (`wealthos_admin`)
- Used exclusively by CI/CD deployment pipelines and migration runners.
- Has `CREATETABLE`, `ALTERTABLE`, `CREATEINDEX` privileges.
- Executes `alembic upgrade head`.

### 3.2 Runtime Application Role (`wealthos_app`)
- Used by FastAPI backend and Celery workers.
- Has **NO DDL privileges** (`CANNOT CREATE, DROP, OR ALTER TABLES`).
- Restricted strictly to `SELECT, INSERT, UPDATE, DELETE` on application tables.
- Subject to kernel-enforced PostgreSQL Row-Level Security:
  ```sql
  ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE financial_transactions FORCE ROW LEVEL SECURITY;
  ```
- Session variable `app.current_tenant_id` is set immediately upon connection checkout and reset on check-in.

---

## 4. Pre-Deployment Verification Checklist

Before initiating the production rollout, execute the following verification steps:

- [ ] **Exact Branch HEAD Verified:** Verify current commit is clean on `feature/final-financial-intelligence-production`.
- [ ] **CI Pipeline Passed:** Verify GitHub Actions run for exact HEAD is 100% green.
- [ ] **Database Pre-Flight Backup:** Execute encrypted baseline backup:
  ```bash
  export WEALTHOS_BACKUP_ENCRYPTION_KEY="<production-backup-master-key>"
  ./scripts/backup_database.sh
  ```
- [ ] **General Ledger Balance Verified:** Confirm zero unbalanced entries in active database:
  ```sql
  SELECT SUM(functional_debit_amount) - SUM(functional_credit_amount) FROM journal_lines;
  -- Must return 0.0000
  ```
- [ ] **Redis Health & Connectivity:** Verify Redis ping with password authentication:
  ```bash
  redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
  -- Must return PONG
  ```
- [ ] **Object Storage Liveness:** Verify S3/MinIO bucket access and encryption keys for `wealthos-documents` and `wealthos-reports`.

---

## 5. Zero-Downtime Rollout Procedure (Step-by-Step)

### Step 1: Pre-Migration Database Schema Upgrade
All WealthOS database migrations are designed to be backward-compatible (additive columns with defaults, reversible operations).
1. Connect via deployment runner with `wealthos_admin` credentials.
2. Execute migration:
   ```bash
   cd backend
   alembic upgrade head
   ```
3. Verify migration status:
   ```bash
   alembic current
   -- Expected output: 0005_financial_foundation (head)
   ```

### Step 2: Deploy Asynchronous Workers (Celery)
1. Deploy new worker container images with updated codebase.
2. Gracefully drain existing workers:
   ```bash
   celery -A app.core.celery_app control warm_shutdown
   ```
3. Start updated workers (`celery_worker` and `celery_beat`).

### Step 3: Deploy Backend API (Blue/Green Rollout)
1. Launch Green backend containers running candidate version.
2. Validate internal health check on Green containers:
   ```bash
   curl -f http://green-backend:8000/health
   -- Expected: {"status":"healthy","database":"connected","redis":"connected"}
   ```
3. Shift ingress traffic from Blue to Green backend instances.
4. Monitor error rates, latencies, and connection pools for 5 minutes.

### Step 4: Deploy Web Application (Next.js)
1. Launch updated Next.js frontend containers.
2. Validate SSR route rendering and assets CDN availability.
3. Switch web traffic router to updated containers.
4. Decommission legacy Blue instances after 15 minutes of zero-traffic observation.

---

## 6. Rollback Procedures (Disaster Recovery & Failure Scenarios)

### Scenario A: Application-Level Defect (Database Unaffected)
If a critical runtime bug occurs immediately after traffic switch:
1. Instantly switch ingress traffic back to Blue backend and frontend instances (RTO < 30 seconds).
2. Green containers isolated for forensic logging analysis.

### Scenario B: Database Migration Defect
If schema migration fails or causes unrecoverable lock contention:
1. Route traffic back to Blue application.
2. Execute automated schema downgrade:
   ```bash
   cd backend
   alembic downgrade -1
   ```
3. Verify database schema and test ledger balance:
   ```sql
   SELECT SUM(functional_debit_amount) - SUM(functional_credit_amount) FROM journal_lines;
   ```

### Scenario C: Catastrophic Database Corruption
In the unlikely event of unrecoverable database corruption:
1. Put application into Maintenance Mode (NGINX HTTP 503 Maintenance Page).
2. Execute restore script from pre-deployment encrypted backup:
   ```bash
   export TARGET_DB="wealthos_prod"
   export WEALTHOS_BACKUP_ENCRYPTION_KEY="<production-backup-master-key>"
   ./scripts/restore_database.sh /path/to/backup_manifest.json
   ```
3. Verify ledger balance post-restore.
4. Deactivate Maintenance Mode.

---

## 7. Secrets Management & Envelope Encryption Architecture

1. **Master Key Storage:** Master Encryption Key (MEK) is stored in AWS KMS / HashiCorp Vault / Azure Key Vault.
2. **Data Encryption Keys (DEKs):** Each sensitive field (financial provider access tokens, API secrets) is encrypted using a unique DEK via AES-256-GCM.
3. **Environment Injection:** Secrets are injected at runtime via container orchestrator secrets (Docker Secrets / Kubernetes Secrets / AWS Secrets Manager) and never written to disk or logged.
4. **Log Redaction:** All application logging pipelines pass through the `TenantSafeRedactionFormatter`, which scrubs:
   - Passwords, TOTP seeds, JWTs.
   - Bank account numbers, PAN numbers, Aadhaar numbers.
   - Provider credentials, access tokens, refresh tokens.

---

## 8. External Launch Dependencies Matrix

Before declaring final general availability (GA), the following external operational requirements must be satisfied:

| Launch Dependency | Owner | Requirement | Verification Method | Status |
|---|---|---|---|---|
| **Production Account Aggregator** | Finvu / Setu | Production FIU/FIP API keys & digital certificates | Sandbox verified, awaiting production cert signing | **Pending GA Signoff** |
| **Market Data Provider** | Refinitiv / NSE | Production WebSocket feed & daily NAV feed license | Mock/Staging verified, awaiting production API quota | **Pending GA Signoff** |
| **Apple Developer Enterprise** | Mobile Ops | Production iOS Distribution Certificate & Provisioning | Bundle ID `com.wealthos.app` reserved | **Ready for Submission** |
| **Google Play Console** | Mobile Ops | Production Play Console service account & keystore | Keystore generated, SHA-256 fingerprint registered | **Ready for Submission** |
| **Production TLS & Domains** | SRE | DNS wildcards for `api.wealthos.com` & `app.wealthos.com` | Let's Encrypt / Cloudflare Edge TLS verified | **Ready for Cutover** |
| **Transactional Email Service** | SecOps | SendGrid / AWS SES domain DKIM, SPF, DMARC alignment | Verified in staging | **Ready for Production** |
| **Legal & Compliance Review** | General Counsel | Terms of Service, Privacy Policy, RBI NBFC-AA compliance | Legal signoff in review | **Pending GA Signoff** |

---

## 9. Runbook Certification

This Production Deployment Runbook is certified **COMPLETE** and ready for release candidate deployment upon human executive approval.
