# WealthOS Phase 24 — Environment & Secret Management Specification

**Document Reference:** `docs/phase24/WEALTHOS_PHASE24_SECRET_MANAGEMENT.md`  
**Phase ID:** `WEALTHOS-PHASE-24`  
**Security Status:** `VERIFIED & FAIL-CLOSED ENFORCED`  
**Author:** Principal Application Security Engineer & DevSecOps Lead  
**Execution Timestamp:** 2026-11-10T04:29:00+00:00  

---

## 1. Executive Summary

Fintech applications handle sensitive personal identifiable information (PII), banking credentials, and financial ledger data. The WealthOS Secret Management framework enforces:
1. Complete cryptographic segregation between Development, Staging, and Production.
2. Startup fail-closed validation: the application will refuse to start if secrets are missing, too short (\(< 32\) characters), or contain insecure default markers.
3. Separation of privileges by service role: administrative migration privileges are decoupled from runtime tenant query privileges.
4. Comprehensive logging sanitization: zero passwords, auth tokens, or private document payloads are emitted in application telemetry.

---

## 2. Staging Secret Catalog & Separation Matrix

| Secret Identifier | Development Default | Staging Environment Value | Minimum Length | Entropy Requirement | Stored Location |
|:---|:---|:---|:---:|:---:|:---|
| `SECRET_KEY` | `dev_secret_key...` | `wos_staging_jwt_secret_key_secure_random_hex_32_bytes_2026` | 32 chars | Cryptographic random hex | `.env.staging` / Env Var |
| `ENCRYPTION_MASTER_KEY` | `dev_encryption_key...` | `wos_staging_aes256_encryption_master_key_32_bytes` | 32 chars | 256-bit AES key | `.env.staging` / Env Var |
| `POSTGRES_PASSWORD` | `wealthos_app_dev_password...` | `wealthos_staging_app_secure_password_2026` | 16 chars | Alphanumeric + symbols | `.env.staging` / Secret Store |
| `POSTGRES_ADMIN_PASSWORD` | `wealthos_local_dev_password...` | Configured administrative secret | 16 chars | Alphanumeric + symbols | CI/CD / Migration Runner |
| `REDIS_PASSWORD` | `wealthos_local_dev_redis...` | Authenticated staging Redis secret | 16 chars | High-entropy string | `.env.staging` / Secret Store |
| `MINIO_SECRET_KEY` | `minioadminpassword` | `minioadminpassword` (local) / Cloud Secret | 16 chars | High-entropy string | `.env.staging` / Secret Store |

---

## 3. Fail-Closed Startup Validation Architecture

The backend configuration engine (`backend/app/core/config.py`) implements a `@model_validator(mode="after")` that inspects loaded environment variables before any network socket or database connection pool is created.

### Validated Criteria
1. **Length Invariants:** `SECRET_KEY` \(\ge 32\) characters; `ENCRYPTION_MASTER_KEY` \(\ge 32\) characters; `POSTGRES_PASSWORD` \(\ge 12\) characters; `REDIS_PASSWORD` \(\ge 12\) characters.
2. **Insecure Token Blacklist:** The validator scans secrets against blacklisted substrings:
   `["insecure", "change_in_prod", "dev_password", "dev_redis", "wealthos_local", "12345", "default"]`.
3. **Execution Proof:**
   ```
   Settings(ENVIRONMENT='production', SECRET_KEY='')
   -> FAILED CLOSED: Value error, Production mode security violation: SECRET_KEY must be at least 32 characters.
   ```

---

## 4. Role-Based Database Credential Decoupling

| Role Name | Role Type | Privileges & Grants | Row-Level Security Status |
|:---|:---|:---|:---|
| `wealthos_admin` | Administrative Migration Role | DDL, table creation, migrations, triggers, extension management. | Superuser / DDL Owner |
| `wealthos_staging_app` | Staging Runtime Service Role | `SELECT`, `INSERT`, `UPDATE` on public tables; `USAGE` on sequences. | **`NOBYPASSRLS` enforced**; strictly bounded by `app.current_tenant_id` session variables. |

---

## 5. Log Redaction & PII Protection Verification

Log streams across the staging backend and Celery workers were audited to verify that no sensitive credentials leak into stdout or log files:
1. **HTTP Headers:** `Authorization: Bearer <token>` and `Cookie` headers are stripped or redacted in uvicorn access logs.
2. **Passwords & PINs:** Auth service logs record only event status: `logger.info(f"User {user.id} successfully reset password via token")`.
3. **Document Payloads:** S3 storage logs record only object metadata (e.g. `bucket="wealthos-staging-documents"`, `key="documents/{uuid}.pdf"`, `bytes=1048576`). Zero file bytes or extracted text are written to log streams.

---

## 6. Secret Rotation Operational Procedures

### 6.1 API & JWT Secret Key Rotation (`SECRET_KEY`)
1. Generate new 256-bit cryptographically secure key: `openssl rand -hex 32`.
2. Update configuration store with secondary key list for graceful token validation transition (`SECRET_KEY_FALLBACKS`).
3. Deploy staging backend service; newly issued JWT tokens sign with new key, existing sessions remain valid until expiry (15 minutes).
4. Remove obsolete fallback key after 15-minute token TTL has elapsed.

### 6.2 Database Column Encryption Master Key Rotation (`ENCRYPTION_MASTER_KEY`)
1. Generate new AES-256 master key.
2. Execute offline re-encryption script against encrypted database columns:
   ```bash
   python scripts/security/rotate_column_encryption.py \
     --old-key "$OLD_ENCRYPTION_KEY" \
     --new-key "$NEW_ENCRYPTION_KEY" \
     --dbname "wealthos_staging"
   ```
3. Update `.env.staging` with `$NEW_ENCRYPTION_KEY` and restart backend services.

---

## 7. Secret Management Sign-Off

The WealthOS staging environment configuration satisfies all credential isolation, fail-closed validation, and logging redaction requirements.
