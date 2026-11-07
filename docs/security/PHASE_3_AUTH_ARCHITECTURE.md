# WealthOS Security Architecture — Phase 3 Enterprise Authentication & Identity

## 1. Overview & Scope

WealthOS Phase 3 delivers the foundational security, identity, session management, multi-tenancy, and access control subsystem. This subsystem serves as the security perimeter for all financial, investment, and document intelligence capabilities introduced in subsequent phases.

The architecture is built upon a **Defense-in-Depth** and **Zero-Trust** philosophy, adhering strictly to:
- **OWASP ASVS v4.0.3 Level 3** (Application Security Verification Standard)
- **NIST SP 800-63B** (Digital Identity Guidelines: Authentication and Lifecycle Management)
- **RFC 6749 / RFC 6750** (OAuth 2.0 Authorization & Bearer Tokens)
- **RFC 6238** (TOTP: Time-Based One-Time Password Algorithm)
- **RFC 7519** (JSON Web Token - JWT)

```
+----------------------------------------------------------------------------------------------------+
|                                    TRUST BOUNDARIES & ZONES                                        |
+----------------------------------------------------------------------------------------------------+
|  [Zone 0: Public / Untrusted Internet]                                                            |
|    - Unauthenticated web client / mobile requests                                                  |
|    - Registration, Login, Forgot Password, Invitation Acceptance                                  |
|         |                                                                                          |
|         v (TLS 1.3 Termination, Reverse Proxy, Global Rate Limiter)                                |
|  [Zone 1: Perimeter & Edge Security]                                                              |
|    - Header validation, Correlation ID injection, CORS policy, IP rate limiting                   |
|         |                                                                                          |
|         v (FastAPI Authentication & Session Middleware)                                            |
|  [Zone 2: Authenticated User Context]                                                              |
|    - JWT Access Token validation (Signature, Expiry, Issuer, Audience, Revocation check)           |
|    - Active user status verification (Suspended / Deactivated accounts blocked)                    |
|         |                                                                                          |
|         v (Tenant Resolution & RBAC Gate)                                                          |
|  [Zone 3: Tenant-Scoped Authorization Context]                                                     |
|    - Tenant membership verification (Client-provided Tenant ID validated against memberships)      |
|    - Granular permission matrix check (Deny-by-default)                                            |
|    - Transactional DB session tenant binding (PostgreSQL session setting)                          |
|         |                                                                                          |
|         v (Elevated Action Gate - Step-up Authentication)                                          |
|  [Zone 4: Elevated Security Operations]                                                            |
|    - Password change, MFA disable, Ownership transfer, API credential creation                     |
|    - Requires fresh re-authentication (< 5 minutes) or valid MFA challenge confirmation           |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Core Security Subsystems

### 2.1 Identity & Credential Management
- **User Record:** Unique immutable UUIDv4, case-insensitive normalized email address (`lower(trim(email))`), display name, account status (`pending_verification`, `active`, `suspended`, `deactivated`).
- **Password Storage:** Industry-standard **Argon2id** algorithm (`m=65536` [64 MiB memory], `t=3` iterations, `p=4` parallelism) via `argon2-cffi`.
- **NIST SP 800-63B Password Policy:** Minimum 12 characters, checked against top 100,000 compromised passwords, no arbitrary periodic forced resets (which encourage weak mutations).
- **Generic Feedback:** All login and recovery endpoints respond with generic error messages (e.g., *"Invalid email or password"*, *"If an account exists, a reset link has been dispatched"*) with constant-time responses to prevent timing-based user enumeration.

### 2.2 Dual-Token Session Lifecycle & Rotation
- **Access Tokens:** Short-lived JWTs (15 minutes lifespan) signed with HMAC-SHA256 (`HS256`) or asymmetric `RS256`. Token claims strictly require `iss`, `sub` (User ID), `aud`, `exp`, `iat`, `jti`, and `tid` (Active Tenant ID).
- **Refresh Tokens:** High-entropy cryptographically secure random strings (32 bytes / 256 bits URL-safe Base64), valid for 7 days (or 30 days rolling).
- **Hashed Token at Rest:** Refresh tokens are never stored in plaintext; only their SHA-256 digests are persisted in PostgreSQL (`refresh_tokens` table).
- **Refresh Token Rotation (RTR):** Every token refresh operation immediately revokes the used refresh token and issues a new access/refresh pair.
- **Reuse Detection (Replay Protection):** If a previously consumed or revoked refresh token is presented, WealthOS immediately flags a potential token compromise, terminates the entire active session family, revokes all related refresh tokens, and records a high-severity security audit event.

### 2.3 Multi-Factor Authentication (MFA / 2FA)
- **Algorithm:** RFC 6238 TOTP using 30-second time steps, HMAC-SHA1 (or SHA256), 6-digit codes.
- **Envelope Encryption:** The shared TOTP secret key is encrypted at rest using AES-256-GCM before storage in PostgreSQL (`mfa_credentials`), authenticated via `ENCRYPTION_MASTER_KEY`.
- **Safe Enrollment:** MFA is **never** activated until the user submits a valid TOTP code proving successful authenticator app configuration.
- **Replay Protection:** Re-submitting the same TOTP code within the same 30-second window is rejected via Redis atomic locking (`totp:{user_id}:{code}`).
- **One-Time Recovery Codes:** Upon enrollment, 10 cryptographically random 10-character recovery codes are generated. Only their SHA-256 hashes are stored. When used, the specific code is permanently consumed.

### 2.4 Multi-Tenancy & Workspace Scoping
- **Tenant Types:**
  1. `personal`: Default workspace provisioned upon user registration.
  2. `household`: Family workspace shared with spouses, partners, or dependents.
  3. `organization`: Legal entity, trust, or enterprise wealth workspace.
- **Membership Scoping:** Every operation requires an active membership in the target tenant.
- **Client Identifier Distrust:** A client passing `X-Tenant-ID: <uuid>` is treated purely as a request hint. The backend verifies that the authenticated user possesses an active, un-revoked membership for that tenant before granting access.
- **Ownership Transfer Safeguards:** Transferring workspace ownership requires step-up authentication and explicit target confirmation to prevent accidental loss of control.

### 2.5 Role-Based Access Control (RBAC)
- **Built-in System Roles:**
  - `owner`: Full workspace control, billing, tenant deletion, ownership transfer.
  - `admin`: Member invitation, role assignment, configuration management.
  - `member`: Standard workspace collaborator (read/write access to financial objects in later phases).
  - `viewer`: Read-only observer (reports, dashboards, audits).
- **Custom Roles:** Support for tenant-specific role definitions with granular permission assignments.
- **Deny-by-Default:** Endpoints require explicit permission tokens (e.g., `members:invite`, `tenant:update`). If a user lacks the permission in their active tenant role, an HTTP 403 Forbidden is returned.

### 2.6 Tenant Isolation & Defense-in-Depth
- Isolation is enforced across five architectural tiers:
  1. **REST API Middleware & Dependencies:** Injects validated tenant context into the request lifecycle.
  2. **Repository Layer:** Enforces `WHERE tenant_id = :tenant_id` on every query, update, and deletion.
  3. **PostgreSQL Session Context:** `SET LOCAL app.current_tenant_id = :tenant_id` for row-level verification.
  4. **Celery Worker Pipelines:** Asynchronous tasks carry authenticated, tamper-proof job payloads containing the verified tenant ID.
  5. **Cache & Object Storage:** Key-level namespacing:
     - Redis: `tenant:{tenant_id}:{resource}:{id}`
     - MinIO: `tenants/{tenant_id}/{bucket}/{key}`

### 2.7 Security Audit Trail
- Immutable, append-only `security_audit_logs` table tracking authentication, authorization, session, and membership events.
- All events record: `event_id`, `tenant_id`, `user_id`, `event_type`, `ip_address`, `user_agent`, `status` (`success`/`failure`), `details` (JSON without sensitive secrets), `correlation_id`, and `created_at` (UTC).

---

## 3. Threat Modeling Summary & OWASP ASVS Mapping

| ASVS Category | Requirement Ref | Architecture Mitigation |
| :--- | :--- | :--- |
| **V2: Authentication** | 2.1.1, 2.1.7, 2.8.1 | Argon2id hashing, 12+ char password policy, NIST weak password blocklist. |
| **V3: Session Management** | 3.1.1, 3.3.1, 3.4.1 | 15-min JWT access token, Refresh Token Rotation (RTR), reuse detection, secure HttpOnly cookies. |
| **V4: Access Control** | 4.1.1, 4.1.2, 4.2.1 | Multi-tenant RBAC, deny-by-default, client tenant ID distrust, row-level tenant boundaries. |
| **V5: Malicious Input** | 5.1.1, 5.1.2 | Pydantic v2 strict schemas, normalized emails, SQL injection prevention via SQLAlchemy 2.0. |
| **V6: Cryptography** | 6.2.1, 6.2.3 | AES-256-GCM envelope encryption for TOTP secrets, CSPRNG for all tokens and recovery codes. |
| **V7: Error Handling & Logging** | 7.1.1, 7.1.2 | Generic error messages, zero credential logging, Request Correlation IDs. |
| **V8: Data Protection** | 8.3.1, 8.3.2 | Password/token digests at rest (SHA-256/Argon2id), encrypted MFA keys. |
| **V13: API & Web Service** | 13.1.1, 13.2.1 | Strict HTTP method enforcement, CSRF headers for cookie-based state-changing requests. |
