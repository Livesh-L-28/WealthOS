# WealthOS Phase 27 — CI/CD Pipeline & Release Governance Framework

**Phase ID:** `WEALTHOS-PHASE-27`  
**Execution Timestamp:** 2026-11-10T12:09:00+05:30  
**Status:** **GOVERNANCE WORKFLOW CODIFIED & ENFORCED**

---

## 1. Executive Summary

To prevent accidental production deployments, financial data corruption, or unverified binary releases, WealthOS enforces a formal release governance pipeline.

### Core Release Rule:
> **No automated deployment to production on code merge.**  
> Code merged into `main` automatically deploys exclusively to Staging. Deployments to Production require an explicit manual GitHub Actions trigger (`workflow_dispatch`), pre-release quality gate passage, and a **Mandatory Human Approval Gate** configured under GitHub Environment protection rules.

---

## 2. Release Governance Lifecycle

```
[ Developer Branch ]
         |
         | Pull Request
         v
[ GitHub Actions CI (`ci.yml`) ]
  - Backend pytest suite (Lint, Mypy, Unit & Integration)
  - Next.js Web build & Vitest suite
  - React Native Mobile Vitest suite
  - PostgreSQL 16 migration graph validation
         |
         | Code Review (2 Approvals) + Automated Pass
         v
[ Merge to `main` ]
         |
         | Automatic Staging CD
         v
[ Staging Environment (Ports 8005 / 3005) ]
         |
         | Staging Smoke Tests & Disaster Recovery Drill
         v
[ Production Release Dispatch (`production-release.yml`) ]
         |
         | 1. Full Pre-Release Regression & Financial Parity Gate
         | 2. Automated Staging Restore & RTO Drill
         v
+---------------------------------------------------------------------------------+
|                        MANDATORY HUMAN APPROVAL GATE                            |
|  - Explicit review of release version (e.g. 1.0.2) and changelog                |
|  - Authorized by Principal Release Engineer & Security Lead                     |
+---------------------------------------------------------------------------------+
         |
         | Approval Confirmed in UI
         v
[ Production Deployment Execution (`docker-compose.prod.yml`) ]
         |
         v
[ Post-Deploy Production Smoke Test & Health Check ]
```

---

## 3. Mandatory Pre-Release Quality Gates

Before any production deployment can proceed to the human approval gate, the following automated checks must achieve 100% pass rates:
1. **Financial Trial Balance Invariant:** $\sum Dr = \sum Cr$ ($\Delta = 0.00$).
2. **PostgreSQL RLS Enforcement:** All 71 tenant tables verify `FORCE ROW LEVEL SECURITY`.
3. **Static Application Security Testing (SAST):** Zero unparameterized SQL queries, zero hardcoded production secrets.
4. **Binary Signature Verification:** Mobile APK signed using Android APK Signature Scheme v2.
5. **Alembic Migration Verification:** Clean execution of all forward and reverse migration steps.

---

## 4. Rollback & Emergency Abort Procedure

If post-deployment smoke tests detect a critical regression or SEV-0 incident:
1. **Immediate Ingress Drain:** Reverse proxy routes traffic to static maintenance page:
   ```bash
   caddy reload --config /etc/caddy/Caddyfile.maintenance
   ```
2. **Container Rollback:** Roll back to the preceding verified container tag:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --no-deps prod-backend-api:1.0.1
   ```
3. **Database Migration Downgrade (If Schema Changed):**
   ```bash
   alembic downgrade -1
   ```
4. **Sanity Verification:** Execute readiness probe `/api/v1/health` and verify trial balance parity before reopening ingress traffic.
