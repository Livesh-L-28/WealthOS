# WealthOS Master Defect Register

**Milestone:** Local Runtime Acceptance & End-to-End Verification  
**Repository:** `Livesh-L-28/WealthOS`  
**Branch:** `feature/final-financial-intelligence-production`  
**Current HEAD:** `8eaf9ee6472fab80861efed324c8c47b997a7bd3`  
**Date:** 2026-11-08  
**Lead QA Architect & SRE:** WealthOS Acceptance Engineering Team  

---

## 1. Overview & Classification Standard

This register records all defects, security gaps, and operational anomalies identified across the WealthOS platform during independent audit, local runtime acceptance, and multi-gate end-to-end verification.

Severity Levels:
- **Critical:** Prevents safe execution, violates financial invariants, bypasses tenant isolation, or causes silent data loss.
- **High:** Significant functional failure, security policy violation, or inability to run a core workflow.
- **Medium:** Degraded edge case, incomplete user workflow, or non-fatal configuration issue.
- **Low:** Cosmetic defect, non-blocking warning, or documentation discrepancy.
- **Informational:** Known operational constraint, external licensing requirement, or third-party dependency.

---

## 2. Master Defect Ledger

| Defect ID | Severity | Component | Summary | Status | Remediation Commit | Verification Evidence |
|---|---|---|---|---|---|---|
| **DEF-01** | **Critical** | `scripts/restore_database.sh` | Suppressed `pg_restore` non-zero exit code using `\|\| true`; lacked exit cleanup trap for decrypted archive; failed to verify target database existence. | **RESOLVED** | `22a2db6` | `backend/tests/test_gate1_release_remediations.py`<br>Target verification rejects missing DB; exit trap wipes decrypted archive; `pg_restore` failure fails closed. |
| **DEF-02** | **Critical** | `backend/app/api/v1/health.py`<br>`backend/app/main.py`<br>`backend/app/core/config.py` | Readiness probe (`/health/ready`) only checked DB and Redis, ignoring Object Storage (MinIO); startup warnings continued silently without failing readiness or enforcing profile dependencies. | **RESOLVED** | `dfd667d` | `backend/tests/test_health.py`<br>Readiness fails (HTTP 503) when mandatory storage is down; profile-aware checks for `full`, `minimal`, and `api`. |
| **DEF-03** | **High** | `scripts/security_exceptions.json`<br>`scripts/audit_dependencies.py` | Exception entries lacked required metadata (`owner`, `justification`); auditor did not fail closed on expired, malformed, or duplicate entries. | **RESOLVED** | `dfd667d` | `backend/tests/test_gate1_release_remediations.py`<br>Auditor rejects expired date (`2020-01-01`), malformed missing fields, and duplicates. |
| **DEF-04** | **Medium** | `docs/local/` | Missing definitive local developer setup runbook (`WEALTHOS_LOCAL_SETUP.md`) and environment report. | **RESOLVED IN GATE 2** | Pending Gate 2 | Comprehensive runbook created with exact commands and port mappings. |
| **DEF-05** | **Medium** | `scripts/disaster_recovery_exercise.py` | DR script requires explicit confirmation flag and dedicated disposable DB naming to ensure developer safety. | **RESOLVED** | `416912b` | Script requires `--force-drill`, restricts host to localhost, and uses disposable database `wealthos_dr_drill`. |
| **DEF-06** | **Low** | Backend test suite | Starlette deprecation warnings regarding `HTTP_422_UNPROCESSABLE_ENTITY` vs `HTTP_422_UNPROCESSABLE_CONTENT`. | **MONITORED** | In-progress | FastApi/Starlette deprecation notice in Python 3.14 tests; non-breaking. |
| **DEF-07** | **Informational** | External Integrations | Production Account Aggregator / Demat broker live connections require regulatory certificates and external API keys not available in local environment. | **DOCUMENTED LIMITATION** | Controlled Sandbox / Mocks | Handled via controlled mock fixtures in Gate 10. |

---

## 3. Defect Detail Profiles

### DEF-01: Restore Script Error Suppression and Incomplete Cleanup
- **Root Cause:** Script invoked `pg_restore ... 2>&1 || true` to suppress warnings, unintentionally swallowing fatal table creation or permission errors. Decrypted `.dump` file was only removed at the end of normal execution; an abort or SIGINT left plaintext data on disk.
- **Affected Components:** [`scripts/restore_database.sh`](file:///Users/livesh/WEALTHOS/scripts/restore_database.sh)
- **Resolution:**
  - Removed `|| true` and replaced with `$?` exit-code check.
  - Implemented `trap cleanup EXIT INT TERM` wiping `${DECRYPTED_FILE}` and `${RESTORE_LOG}` on all termination paths.
  - Added target reachability verification and protected system database name blocking.
- **Verification:** Tested in `test_restore_script_rejects_missing_target`, `test_restore_script_rejects_system_catalog_target`, and `test_restore_script_requires_explicit_confirmation`.

### DEF-02: Profile-Aware Readiness Probe & Storage Validation
- **Root Cause:** Health probe only inspected `check_database_health()` and `check_redis_health()`. MinIO availability was unverified.
- **Affected Components:** [`backend/app/api/v1/health.py`](file:///Users/livesh/WEALTHOS/backend/app/api/v1/health.py), [`backend/app/core/config.py`](file:///Users/livesh/WEALTHOS/backend/app/core/config.py), [`backend/app/main.py`](file:///Users/livesh/WEALTHOS/backend/app/main.py)
- **Resolution:**
  - Added `RUNTIME_PROFILE` (`full`, `minimal`, `api`), `REQUIRE_REDIS`, and `REQUIRE_STORAGE`.
  - Added MinIO object storage health check to `/health/ready` probe.
  - Added fail-fast validation in `main.py` lifespan in production.
- **Verification:** Tested in `test_health_ready_probe_healthy`, `test_health_ready_probe_degraded_db`, `test_health_ready_probe_degraded_storage`, and `test_health_ready_probe_minimal_profile_ignores_optional`.

### DEF-03: Supply-Chain Security Policy Enforcement
- **Root Cause:** `scripts/security_exceptions.json` lacked explicit `owner` and `justification` fields; `scripts/audit_dependencies.py` silently ignored expiration dates.
- **Affected Components:** [`scripts/security_exceptions.json`](file:///Users/livesh/WEALTHOS/scripts/security_exceptions.json), [`scripts/audit_dependencies.py`](file:///Users/livesh/WEALTHOS/scripts/audit_dependencies.py)
- **Resolution:**
  - Enforced schema validation: required `package`, `advisory`, `severity`, `owner`, `justification`, `mitigation`, `expiry`.
  - Added duplicate detection and fail-closed expiration checking.
- **Verification:** Tested in `test_audit_dependencies_passes_on_current_repo`, `test_audit_dependencies_rejects_expired_exception`, `test_audit_dependencies_rejects_malformed_exception`, and `test_audit_dependencies_rejects_duplicate_exception`.

---

## 4. Verification Signoff

All P0 Critical and P1 High defects are completely resolved with automated regression test coverage. No unresolved critical defects remain.

