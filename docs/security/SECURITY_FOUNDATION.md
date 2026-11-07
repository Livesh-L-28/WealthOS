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

1. **Production Secret Enforcement**:
   - `app.core.config.Settings` validates credentials via a model validator.
   - When running in `production` or `prod` mode, any known development placeholder markers (e.g. `insecure`, `change_in_prod`, `dev_password`, `12345`) in `SECRET_KEY`, `ENCRYPTION_MASTER_KEY`, or `POSTGRES_PASSWORD` immediately abort startup with an explicit validation error.
2. **Passwords**: Argon2id hashing with minimum 64MB memory cost, 3 iterations, and 4 degrees of parallelism.
3. **Secrets & Tokens**: AES-256-GCM authenticated encryption for sensitive integration secrets at rest.
4. **Session Tokens**: JWT with HMAC-SHA256 or asymmetric Ed25519 signing. Short-lived access tokens (15 minutes), rotating refresh tokens (7 days).

---

## 3. Object Storage Security (MinIO / S3)

1. **Private Buckets & Strict Allowlist**:
   - All buckets (`wealthos-documents`, `wealthos-vault`) are private by default with no public anonymous read or list policies.
   - All operations validate bucket names against an explicit allowlist via `validate_bucket()`, raising `BucketNotAllowedError` for unauthorized buckets.
2. **Path Traversal & Key Sanitization**:
   - Object keys are validated via `validate_object_key()`.
   - Rejects directory traversal sequences (`..`), leading/trailing slashes, consecutive slashes (`//`), null bytes, or disallowed special characters, raising `InvalidObjectKeyError`.
3. **MIME Magic Byte Verification**:
   - Files are validated against magic byte signatures via `validate_file_magic_bytes()` to prevent MIME spoofing:
     - PDF: `%PDF-`
     - PNG: `\x89PNG\r\n\x1a\n`
     - JPEG: `\xff\xd8\xff`
     - XLSX: `PK\x03\x04`
     - CSV: Text decoding verification and null-byte (`\x00`) rejection.
4. **Stream & Payload Size Limits**:
   - 50MB (`MAX_DOCUMENT_SIZE_BYTES`) limit strictly enforced for both seekable files and non-seekable streams, raising `FileTooLargeError`.
5. **Signed URLs**:
   - Download access requires short-lived presigned URLs bounded between 60 seconds and 3600 seconds (default 15 minutes).
   - Upload access requires presigned POST policies enforcing exact `Content-Type` matching and content length range bounds `[1, 52428800]`.
6. **Log Sanitization**:
   - Sensitive document contents, financial balances, and passwords are never output to application logs.

---

## 4. Distributed Task Idempotency & Fail-Closed Concurrency

1. **Atomic Lock Ownership Tokens**:
   - Distributed task locks use `SET NX EX` with a unique owner token (`worker-id:uuid4`), preventing lock hijacking across timeout boundaries.
2. **Atomic Lua Compare-and-Delete**:
   - Lock release executes an atomic Lua script (`RELEASE_LOCK_LUA_SCRIPT`) that checks key value matches caller's owner token before deleting.
3. **Fail-Closed Redis Policy**:
   - If Redis connection or execution fails during lock acquisition or release, `CeleryLockError` is raised immediately.
   - Tasks fail closed rather than proceeding unverified to protect financial ledgers from duplicate execution.

---

## 5. Container & Infrastructure Hardening

1. **Localhost Port Restrictions**:
   - All host ports exposed by Docker Compose (`5432`, `6379`, `9000`, `9001`, `8000`, `3000`) are strictly bound to `127.0.0.1`.
2. **Non-Root Execution**:
   - Dockerfiles run as dedicated unprivileged system users (`wealthos` UID 1001, `nextjs` UID 1001).
3. **Isolated Networks**:
   - Internal bridge network (`wealthos_network`) prevents external inspection of internal database and broker traffic.
4. **Healthcheck Boundaries**:
   - Readiness and liveness probes verify backing services without exposing sensitive credentials or stack traces.
