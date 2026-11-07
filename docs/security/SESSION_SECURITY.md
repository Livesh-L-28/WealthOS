# WealthOS Session & Token Security Specification

## 1. Architectural Strategy

WealthOS employs a **Dual-Token with Refresh Token Rotation (RTR)** architecture designed to balance low latency for API queries with rapid revocation and proactive intrusion detection.

```
+----------------------------------------------------------------------------------------------------+
|                                    DUAL-TOKEN LIFECYCLE (RTR)                                      |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|    Client (Browser / Mobile)                           Backend API Gateway                         |
|         |                                                       |                                  |
|         | ----- (1) POST /auth/login {email, password} -------> |                                  |
|         | <---- (2) 200 OK + [Access JWT] + [Refresh Token] --- | (Stores SHA-256(RT_1) in DB)     |
|         |                                                       |                                  |
|         | ===== (3) Authorized API Request with Access JWT ===> | (Stateless JWT signature verify) |
|         | <==== (4) 200 OK (Financial Data / Workspace) ======= |                                  |
|         |                                                       |                                  |
|         | ... [15 Minutes elapse - Access JWT expires] ...      |                                  |
|         |                                                       |                                  |
|         | ----- (5) POST /auth/refresh {Refresh Token RT_1} --> | 1. Verifies SHA-256(RT_1)        |
|         |                                                       | 2. Revokes RT_1                  |
|         |                                                       | 3. Issues RT_2                   |
|         | <---- (6) 200 OK + [New Access JWT] + [RT_2] -------- | 4. Stores SHA-256(RT_2)          |
|         |                                                       |                                  |
|         | ... [Attacker attempts to replay stolen RT_1] ...     |                                  |
|         |                                                       |                                  |
|         | -x-x- (7) Attacker sends RT_1 ----------------------> | 1. Detects RT_1 is revoked!      |
|         |                                                       | 2. Flags REUSE ANOMALY!          |
|         |                                                       | 3. Revokes RT_2 & Session Family |
|         | <---- (8) 401 Unauthorized (Session Terminated) ----- | 4. Emits Security Audit Alert    |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Token Specifications & Cryptographic Invariants

### 2.1 Short-Lived Access Token (JWT)
- **Standard:** RFC 7519 (JSON Web Token)
- **Signature Algorithm:** HMAC-SHA256 (`HS256`) with a cryptographically secure 256-bit+ secret key (or asymmetric `RS256` / `Ed25519`).
- **Algorithm Fallback Ban:** The token verification engine explicitly rejects tokens with `alg: "none"` or mismatched algorithm headers.
- **Lifespan:** Exactly **15 minutes** (900 seconds).
- **Mandatory JWT Claims:**
  - `iss`: Token Issuer (`wealthos:auth`).
  - `sub`: User ID (UUIDv4 string).
  - `aud`: Intended Audience (`wealthos:api`).
  - `exp`: Expiration Unix epoch timestamp.
  - `iat`: Issued-at Unix epoch timestamp.
  - `nbf`: Not-before Unix epoch timestamp.
  - `jti`: Unique token identifier (UUIDv4) for blacklisting/tracing.
  - `sid`: User Session ID (`user_sessions.id`).
  - `tid`: Active Tenant ID (`tenants.id`).

### 2.2 Refresh Token
- **Format:** High-entropy string generated via `secrets.token_urlsafe(32)` (256 bits of cryptographic entropy).
- **Storage at Rest:** Plaintext refresh tokens are **never** persisted. WealthOS stores the SHA-256 hash:
  $$\text{Token Hash} = \text{SHA-256}(\text{Raw Refresh Token})$$
- **Lifespan:** 7 days standard idle timeout; 30 days maximum absolute session window.
- **Table:** `refresh_tokens` containing:
  - `id`: UUIDv4
  - `session_id`: FK to `user_sessions.id` (ON DELETE CASCADE)
  - `token_hash`: `VARCHAR(64)` unique index
  - `family_id`: UUIDv4 identifying the continuous lineage of rotated tokens
  - `is_revoked`: Boolean flag
  - `revoked_at`: Timestamp
  - `revoked_reason`: Reason string (e.g., `rotated`, `user_logout`, `reuse_detected`)
  - `expires_at`: Timestamp
  - `created_at`: Timestamp

---

## 3. Refresh Token Rotation (RTR) & Reuse Detection Algorithm

1. **Client Request:** Client submits raw refresh token `RT_current` to `/api/v1/auth/refresh`.
2. **Hash Lookup:** Compute `hash = SHA256(RT_current)` and query `refresh_tokens WHERE token_hash = hash`.
3. **Validity Checks:**
   - If token does not exist: Return generic HTTP 401 Unauthorized.
   - If token is expired (`now > expires_at`): Mark session expired, return HTTP 401 Unauthorized.
   - If token is already revoked (`is_revoked = true`):
     - **SECURITY ANOMALY DETECTED:** This indicates token theft or duplicate replay.
     - Look up all tokens matching `family_id = token.family_id`.
     - Transactionally set `is_revoked = true` on all tokens in that family.
     - Terminate the corresponding record in `user_sessions`.
     - Create an alert in `security_audit_logs` (`event_type: "suspicious_refresh_token_reuse"`).
     - Return HTTP 401 Unauthorized.
4. **Clean Rotation:**
   - Mark `token.is_revoked = true`, `token.revoked_at = now()`, `token.revoked_reason = 'rotated'`.
   - Generate new random string `RT_new`.
   - Insert new record with `family_id = token.family_id` and `token_hash = SHA256(RT_new)`.
   - Update `user_sessions.last_active_at = now()`.
   - Issue new Access JWT and return both tokens to client.

---

## 4. Browser Cookie & Transport Security

For web browser clients, refresh tokens and optionally access tokens are transported via HTTP Cookies:

```
Set-Cookie: wealthos_refresh_token=<token>;
            Path=/api/v1/auth;
            HttpOnly;
            Secure;
            SameSite=Lax;
            Max-Age=604800;
```

### Invariants:
1. **HttpOnly:** JavaScript cannot access `document.cookie`, preventing exfiltration via Cross-Site Scripting (XSS).
2. **Secure:** Cookies are strictly transmitted over TLS 1.3 / HTTPS. In development on localhost, `Secure` is conditionally relaxed only when `ENVIRONMENT=development` and plain HTTP is detected.
3. **SameSite=Lax:** Prevents Cross-Site Request Forgery (CSRF) on cross-origin top-level navigation while permitting standard internal navigation.
4. **CSRF Protection:** State-changing endpoints (`POST`, `PUT`, `DELETE`, `PATCH`) require the custom header `X-CSRF-Token` or `Authorization: Bearer <token>`. Browsers enforce the Same-Origin Policy on custom headers, eliminating classic CSRF attacks.

---

## 5. Session Invalidation Lifecycle

A session tracked in `user_sessions` is invalidated immediately under the following operational triggers:

| Event Trigger | Scope of Invalidation | Rationale |
| :--- | :--- | :--- |
| **User Logout (`POST /auth/logout`)** | Current session only | Normal user termination of active device. |
| **User Logout All (`POST /auth/logout-all`)** | All sessions for User | User perceives security compromise or lost device. |
| **Remote Session Revocation (`DELETE /auth/sessions/{id}`)** | Specified session | User terminates unrecognized device from security dashboard. |
| **Password Change / Reset** | All active sessions | Credential update must terminate potentially compromised devices. |
| **MFA Deactivation** | All other active sessions | High-risk security setting modification. |
| **Account Suspension** | All active sessions | Administrative action to isolate malicious actor. |
| **Token Reuse Detection** | Token family and active session | Immediate automated containment of intercepted credentials. |
