# Phase 25 — Test Environment Discovery & Baseline Report

**Phase ID:** `WEALTHOS-PHASE-25`  
**Execution Timestamp:** 2026-11-10T10:40:00+05:30  
**Status:** **DISCOVERY_VERIFIED**

---

## 1. Environment Architecture & Staging Topology

The WealthOS staging environment has been discovered, audited, and verified as completely operational and isolated from production and local development instances.

```
                                  [ WealthOS Staging Topology ]
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
     [ Staging Next.js Web ]                                       [ Staging FastAPI Backend ]
      Port 3005 (PID: task-9647)                                    Port 8005 (PID: task-9343)
      Built with NEXT_PUBLIC_API_URL=http://localhost:8005          Profile: Full (FastAPI / Uvicorn)
                 │                                                             │
                 └──────────────────────────────┬──────────────────────────────┘
                                                ▼
     ┌──────────────────────────────────────────┼──────────────────────────────────────────┐
     ▼                                          ▼                                          ▼
[ PostgreSQL 17 Staging ]             [ Redis Partitioned ]                       [ MinIO Object Store ]
 Host: localhost:5432                  Host: localhost:6379                        Host: localhost:9000
 DB: wealthos_staging                  DB 10: Cache                                Bucket: wealthos-staging-documents
 User: wealthos_staging_app            DB 11: Celery Broker                        Bucket: wealthos-staging-vault
 Alembic Head: 0011                    DB 12: Celery Results                       Bucket: wealthos-staging-quarantine
 89 Tables (71 Force RLS)              Isolation: Strict Keyspace                  TLS: Disabled (Staging Internal)
```

---

## 2. Infrastructure Inventory & Health Audit

| Subsystem | Host & Port | Runtime Identity | Health Probe Response | Health Status |
| :--- | :--- | :--- | :--- | :--- |
| **Backend API** | `localhost:8005` | FastAPI / Python 3.14.6 | `HTTP 200 {"status":"ready","profile":"full"}` | **HEALTHY** |
| **Frontend Web** | `localhost:3005` | Next.js 14.2.35 / Node 20 | `HTTP 200 OK (HSTS, X-Frame-Options: DENY)` | **HEALTHY** |
| **Database** | `localhost:5432` | `wealthos_staging` (`wealthos_staging_app`) | `Alembic 0011_phase19_enterprise_trust (Head)` | **HEALTHY** |
| **Redis Cache** | `localhost:6379` | Database 10 | `PONG (Keys: 0, isolated namespace)` | **HEALTHY** |
| **MinIO Storage** | `localhost:9000` | S3-compatible service | `Buckets: wealthos-staging-{documents,vault,quarantine}` | **HEALTHY** |

### 2.1 Database Security & RLS Classification
- **Total Tables in Staging:** 89 public tables.
- **Tenant-Scoped Tables (Force RLS):** 71 tables.
  - Verification query: `SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity AND c.relforcerowsecurity;`
  - Output: `71`
- **System / Reference Tables (No RLS Justified):** 18 tables (e.g., `alembic_version`, `currencies`, `exchange_rates`, `subscription_tiers`, `system_metrics`).
- **Trigger Immutability:** Triggers `trg_journal_entries_immutable` and `trg_journal_lines_immutable` active and verified.

---

## 3. Mobile Binary & Artifact Verification

The baseline mobile APK and the staging release build were inspected, checksummed, and verified:

```
[Baseline Binary]
File:            apps/mobile/wealthos.apk
Size:            60,933,643 bytes
SHA-256:         decf78a080a7f633d49eb3821a766e76974676b7da2567d106b8788f2550269a
Status:          PRESERVED UNTOUCHED (Exact baseline backup preserved)

[Staging Binary]
File:            apps/mobile/wealthos-staging.apk
Size:            60,991,427 bytes (58.1 MB)
SHA-256:         d648c317374e072e8f182f44dbe939479876aa3e45e7df240d9816c830e9273b
Package:         com.wealthos.app
Version:         1.0.1 (versionCode 2)
Compile SDK:     35
Target SDK:      34
Min SDK:         24
Signature:       APK Signature Scheme v2 (VERIFIED)
Certificate:     SHA-256 fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c
Build Variant:   assembleRelease (Non-debuggable release build)
```

---

## 4. Hardware Connectivity Audit

`adb devices` output:
```text
List of devices attached
(No physical Android device connected)
```
- **Physical Device Status:** `PENDING_USB_ATTACHMENT`.
- **Operating Policy:** Physical device validation is recorded honestly without fabrication. All static analysis, APK signature verification, package inspection, and automated mobile unit/integration test suites are executed.

---

## 5. Automated Test Baseline Summary

| Test Harness | Target Subsystem | Total Tests | Passed | Failed | Execution Time |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Vitest Web** | `apps/web` | 47 | 47 | 0 | 250 ms |
| **Vitest Mobile** | `apps/mobile` | 94 | 94 | 0 | 1.82 s |
| **Pytest Backend** | `backend` targeted | 15 | 15 | 0 | 3.16 s |
| **Playwright E2E** | `apps/web/e2e/auth.spec.ts` | 4 | 4 | 0 | 1.90 s |
| **Playwright E2E** | `apps/web/e2e/authenticated-scenarios.spec.ts` | 15 | 15 | 0 | 4.70 s |

---

## 6. Phase 25.0 Signoff

The WealthOS staging environment has been thoroughly discovered and verified as healthy, isolated, and ready for full Phase 25 beta validation.

