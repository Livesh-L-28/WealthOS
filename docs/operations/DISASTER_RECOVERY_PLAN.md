# WealthOS — Comprehensive Disaster Recovery & Business Continuity Plan

**Programme:** WealthOS Enterprise Architecture & Production Readiness  
**Document:** Disaster Recovery Plan  
**Date:** 2026-11-08  
**Status:** Approved Operational Protocol  
**Compliance Target:** ISO 27001 / SOC 2 Type II / RBI IT Governance Framework  
**Author:** Principal SRE & Application Security Lead  

---

## 1. Disaster Recovery Classification & Incident Team

When an infrastructure or data disaster occurs, the **Incident Management Team** is convened immediately:

| Incident Role | Responsibility | Designation |
|---|---|---|
| **Incident Commander (IC)** | Declares incident severity, coordinates engineering teams, authorizes failover or restore. | Principal SRE / VP Engineering |
| **Technical Lead (TL)** | Directs database promotion, infrastructure provisioning, and service redeployment. | Database Architect / Lead Backend Eng |
| **Security Lead (SecOps)** | Investigates compromised credentials, validates tamper seals, authorizes key rotation. | Application Security Lead |
| **Communications Lead** | Informs affected stakeholders and maintains external status page communications. | Product Operations Lead |

---

## 2. Disaster Recovery Scenario Catalog & Playbooks

### Scenario 1: Primary Database Host Failure
- **Impact:** Write operations fail; read queries to replica continue.
- **Action:** Execute `docs/database/FAILOVER_RUNBOOK.md`. Fence failed primary, promote standby replica via `pg_promote()`, reconfigure PgBouncer writer pool.
- **RTO:** $< 15$ seconds.
- **RPO:** $< 1.0$ second.

### Scenario 2: Read Replica Failure
- **Impact:** Analytical and heavy tax reporting queries fail or time out.
- **Action:** PgBouncer reader pool automatically marks replica offline and fails over read traffic to Primary. Spin up replacement replica per `docs/database/REPLICA_ADD_REMOVE_RUNBOOK.md`.
- **RTO:** $< 5$ seconds (automatic routing to Primary).
- **RPO:** 0 seconds (Primary is untouched).

### Scenario 3: Complete Database Data Center / Cluster Loss
- **Impact:** Total loss of all local database hardware and volumes.
- **Action:** Provision new PostgreSQL instance in alternate cloud region. Restore latest base backup from cross-region mirrored S3 bucket, apply continuous WAL archive stream to the second before failure per `docs/operations/PITR_RUNBOOK.md`.
- **RTO:** $< 30$ minutes.
- **RPO:** $< 60$ seconds.

### Scenario 4: Redis Outage / Crash
- **Impact:** Token blacklist queries fail; Celery worker task dispatch pauses.
- **Action:**
  - Redis container auto-restarts via Docker/Kubernetes policy (`restart: unless-stopped`).
  - Redis loads append-only file (AOF) from persisted disk volume.
  - WealthOS backend API implements graceful fallback: if Redis is unreachable during token check, API validates JWT cryptographically and logs a degraded warning rather than crashing all requests.
- **RTO:** $< 30$ seconds.
- **RPO:** 0 seconds.

### Scenario 5: MinIO / Object Storage Outage
- **Impact:** Document uploads and OCR statements cannot be fetched or saved.
- **Action:**
  - Core financial ledger and cash transactions continue unaffected.
  - Document upload endpoints return HTTP 503 ("Document Vault temporarily offline; transactions unaffected").
  - Switch endpoint DNS to warm secondary object storage cluster.
- **RTO:** $< 5$ minutes.
- **RPO:** 0 seconds.

### Scenario 6: API Container Fleet Crash
- **Impact:** HTTP 502 Bad Gateway returned by NGINX.
- **Action:** Docker / Kubernetes container runtime automatically restarts unhealthy API containers. If caused by a faulty code deployment, immediately execute blue/green rollback to previous stable image tag.
- **RTO:** $< 60$ seconds.
- **RPO:** 0 seconds.

### Scenario 7: Compromised Master Encryption Key
- **Impact:** Integration credentials potentially vulnerable to offline decryption.
- **Action:**
  1. Revoke existing `WEALTHOS_INTEGRATIONS_MASTER_KEY`.
  2. Generate new 256-bit cryptographically secure key.
  3. Execute automated re-encryption script: decrypt all stored provider credentials with old key and re-encrypt with new key under a single transaction.
  4. Rotate third-party API tokens with financial providers (RBI AA, NSE/BSE brokers).
- **RTO:** $< 2$ hours.
- **RPO:** 0 seconds.

### Scenario 8: Accidental Mass Data Deletion
- **Impact:** User records or accounts deleted via administrative error.
- **Action:** Execute Point-in-Time Recovery (PITR) to an isolated recovery node targeting 1 minute prior to the deletion timestamp. Extract deleted records and merge them back into the primary database.
- **RTO:** $< 20$ minutes.
- **RPO:** 0 seconds.

### Scenario 9: Failed Release Deployment
- **Impact:** Application errors spike, or migration introduces regression.
- **Action:** NGINX ingress immediately switches upstream traffic back to the previous stable container image (`blue`). If schema was expanded, old code continues working seamlessly under the expand-and-contract policy.
- **RTO:** $< 30$ seconds.
- **RPO:** 0 seconds.

### Scenario 10: Complete Cloud Region Outage
- **Impact:** Entire primary cloud region becomes unreachable.
- **Action:**
  1. Update global DNS (Route53 / Cloudflare) to route traffic to secondary region.
  2. Promote standby cluster in secondary region.
  3. Direct application traffic to regional ingress.
- **RTO:** $< 15$ minutes.
- **RPO:** $< 60$ seconds.

