# WealthOS Security Foundation & Architecture Policy

This document establishes the foundational security controls, cryptographic standards, access control policies, and infrastructure hardening implemented across the WealthOS platform.

---

## 1. Zero-Trust Tenant Isolation

Every financial domain model in WealthOS inherits from `TenantScopedMixin`:

```python
class TenantScopedMixin:
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
```

- **Invariants**:
  1. Direct database queries must explicitly filter by `tenant_id`. Global cross-tenant reads or writes are strictly prohibited.
  2. The `X-Tenant-ID` header is extracted and injected into the async `contextvars` context on every request.

---

## 2. Cryptographic Security Standards & Production Credential Rejection

1. **Production Secret Enforcement (`backend/app/core/config.py`)**:
   - `app.core.config.Settings` strictly validates all credentials via `validate_production_secrets()`.
   - When running in `production` mode:
     - `SECRET_KEY`: Minimum 32 characters, rejects default markers (`insecure`, `change_in_prod`, `12345`, `default`).
     - `ENCRYPTION_MASTER_KEY`: Minimum 32 characters, rejects default development master keys.
     - `POSTGRES_PASSWORD`: Minimum 12 characters, rejects default dev passwords.
     - `REDIS_PASSWORD`: Minimum 12 characters, rejects unauthenticated or default dev passwords.
     - `MINIO_ACCESS_KEY` & `MINIO_SECRET_KEY`: Rejects `minioadmin` and `minioadminpassword`.
     - Explicit `DATABASE_URL` and `CELERY_BROKER_URL`: Validated for weak/default embedded credentials.
   - **Zero Credential Leaks**: Validation errors explicitly state the offending configuration field but never print the actual credential or token into logs or exceptions.
2. **Passwords**: Argon2id hashing with minimum 64MB memory cost, 3 iterations, and 4 degrees of parallelism.
3. **Secrets & Tokens**: AES-256-GCM authenticated encryption for sensitive integration secrets at rest.
4. **Session Tokens**: JWT with HMAC-SHA256 or asymmetric Ed25519 signing. Short-lived access tokens (15 minutes), rotating refresh tokens (7 days).

---

## 3. Redis Authentication & Task Broker Hardening

1. **Mandatory Authentication**:
   - Redis requires authentication via `--requirepass "${REDIS_PASSWORD}"`.
   - Unauthenticated client connections are immediately rejected with `AuthenticationError: NOAUTH Authentication required.`
2. **Atomic Lock Ownership Tokens**:
   - Distributed task locks use `SET NX EX` with a unique owner token (`worker-id:uuid4`), preventing lock hijacking across timeout boundaries.
3. **Atomic Lua Compare-and-Delete**:
   - Lock release executes an atomic Lua script (`RELEASE_LOCK_LUA_SCRIPT`) that checks key value matches caller's owner token before deleting.
4. **Fail-Closed Redis Policy**:
   - If Redis connection or execution fails during lock acquisition or release, `CeleryLockError` is raised immediately.
   - Tasks fail closed rather than proceeding unverified to protect financial ledgers from duplicate execution.

---

## 4. Object Storage Security & Quarantine Lifecycle (MinIO / S3)

1. **Storage Quarantine Architecture**:
   - Incoming files upload into an isolated quarantine area (`wealthos-quarantine`).
   - Presigned upload URLs (`generate_presigned_quarantine_upload_url`) target exclusively the quarantine bucket.
   - Presigned uploads never directly enter verified document storage.
2. **Server-Side Inspection & Promotion**:
   - Quarantined files undergo rigorous server-side validation:
     - File size <= 50MB (`FileTooLargeError`).
     - Binary magic bytes matching declared format (`InvalidSignatureError`).
     - Detection and rejection of MIME spoofing (e.g. scripts disguised as PDFs).
   - Only validated documents are promoted to verified storage (`wealthos-documents`); failed documents are rejected and purged.
3. **Private Buckets & Strict Allowlist**:
   - All buckets (`wealthos-documents`, `wealthos-vault`, `wealthos-quarantine`) are private with public access blocks enabled.
   - Bucket access is strictly validated against an approved allowlist via `validate_bucket()`, raising `BucketNotAllowedError` for unauthorized buckets.
4. **Path Traversal & Key Sanitization**:
   - Object keys are validated via `validate_object_key()`.
   - Rejects directory traversal sequences (`..`), leading/trailing slashes, consecutive slashes (`//`), null bytes, or disallowed special characters, raising `InvalidObjectKeyError`.
5. **Signed URLs**:
   - Download access requires short-lived presigned URLs bounded between 60 seconds and 3600 seconds (default 15 minutes).
6. **Log Sanitization**:
   - Sensitive document contents, financial balances, and passwords are never output to application logs.

---

## 5. Host Port Hardening

All container ports exposed on the host machine are explicitly bound to `127.0.0.1`:
- PostgreSQL: `127.0.0.1:5432:5432`
- Redis: `127.0.0.1:6379:6379`
- MinIO: `127.0.0.1:9000:9000` & `127.0.0.1:9001:9001`
- Backend API: `127.0.0.1:8000:8000`
- Web Frontend: `127.0.0.1:3000:3000`
This prevents external interfaces on local networks or development devices from accessing infrastructure services.
