# WealthOS Phase 3 — Authentication & Multi-Tenant Threat Model

## 1. Threat Modeling Overview

This document presents the formal STRIDE and DREAD threat assessment for WealthOS Phase 3 (Identity, Authentication, Session Management, Multi-Tenancy, and RBAC). 

### 1.1 Threat Actors & Capabilities

| Threat Actor | Motivation | Access Level | Capabilities |
| :--- | :--- | :--- | :--- |
| **TA-1: Unauthenticated External Attacker** | Account takeover, credential theft, data theft, disruption | Internet / Public Network | Automated credential stuffing, brute force, network eavesdropping, timing attacks. |
| **TA-2: Malicious Authenticated Tenant (Cross-Tenant)** | Corporate espionage, competitor intelligence, unauthorized wealth visibility | Authenticated User in Tenant A | Parameter tampering, IDOR, session replay, header forging, manipulating tenant identifiers. |
| **TA-3: Malicious Tenant Collaborator (Privilege Escalation)** | Financial fraud, unauthorized transfers, audit evasion | Authenticated Member/Viewer in Tenant B | Privilege escalation, calling unauthorized admin APIs, attempting to modify roles or transfer ownership. |
| **TA-4: Man-in-the-Middle (MitM) / Network Adversary** | Session hijacking, token interception | Untrusted Wi-Fi, Transit Network | Intercepting unencrypted transit, exploiting cookie theft or missing TLS. |
| **TA-5: Compromised Infrastructure Worker** | Lateral movement, data exfiltration | Internal Docker Network / Redis | Reading task payloads, injecting unauthorized worker jobs, cache poisoning. |

---

## 2. STRIDE Threat Analysis & Architectural Mitigations

```
+--------------------+-------------------------------------------+-------------------------------------------------------------+
| Threat Category    | Attack Scenario                           | WealthOS Architectural Countermeasure                      |
+--------------------+-------------------------------------------+-------------------------------------------------------------+
| Spoofing           | Credential stuffing on login              | Redis sliding-window IP & email rate limiting, Argon2id     |
|                    | Forged JWT Access Token                   | Cryptographic signature check (HS256/RS256), strict secret  |
|                    | Replayed TOTP 2FA code                    | Redis atomic 30s replay lock per (user, code)              |
|                    | Replayed Refresh Token                    | Refresh Token Rotation (RTR) + token family invalidation    |
+--------------------+-------------------------------------------+-------------------------------------------------------------+
| Tampering          | Changing X-Tenant-ID header to Tenant B   | Backend membership verification; client IDs never authorize |
|                    | Tampering with Token payload              | Cryptographic signature validation with strict claims check |
|                    | Altering Audit Trail records              | Append-only database permissions; no UPDATE/DELETE on audit |
+--------------------+-------------------------------------------+-------------------------------------------------------------+
| Repudiation        | User denies changing workspace membership | Structured audit logging with IP, User-Agent & Request ID   |
|                    | Admin denies revoking user session        | Non-repudiable audit logs tied to verified user sessions    |
+--------------------+-------------------------------------------+-------------------------------------------------------------+
| Information        | User enumeration via login/reset timing   | Constant-time comparison & generic success/error messages   |
| Disclosure         | Plaintext password/token leak in logs     | Strict log scrubbing filter & hashed token storage at rest |
|                    | Cross-tenant cache data leakage           | Mandatory tenant ID prefixing on all Redis keys             |
|                    | TOTP secret key database leak             | AES-256-GCM envelope encryption using master key            |
+--------------------+-------------------------------------------+-------------------------------------------------------------+
| Denial of Service  | Registration endpoint exhaustion          | Rate limiting on /auth/register and /auth/login             |
|                    | Massive password hashing CPU exhaustion   | Asynchronous worker offloading or rate-limited auth endpoints|
|                    | Concurrent session explosion              | Active session limits per user (max 20 sessions)            |
+--------------------+-------------------------------------------+-------------------------------------------------------------+
| Elevation of       | Viewer attempts to invite new members     | Deny-by-default RBAC enforced via FastAPI Dependencies      |
| Privilege          | Member attempts to transfer tenant        | Step-up authentication required for elevated operations     |
|                    | Disabling MFA without password/code       | Strict dual-credential requirement for MFA deactivation    |
+--------------------+-------------------------------------------+-------------------------------------------------------------+
```

---

## 3. DREAD Risk Assessment & Scoring Matrix

Risk Rating: $DREAD = \frac{D + R + E + A + D}{5}$ (Scale: 1 to 10; Critical: 8.0–10.0, High: 6.0–7.9, Medium: 4.0–5.9, Low: 1.0–3.9).

| ID | Threat Description | D | R | E | A | D | Score | Severity | Mitigation Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **TH-01** | **Cross-Tenant IDOR:** Authenticated user in Tenant A accesses Tenant B resources by spoofing `X-Tenant-ID` header. | 9 | 8 | 8 | 9 | 8 | **8.4** | **CRITICAL** | **Enforced:** Client header is treated as an unverified hint. Backend membership check validates access before querying. All queries filtered by tenant ID. |
| **TH-02** | **Refresh Token Interception & Replay:** Stolen refresh token used to generate perpetual unauthorized access. | 8 | 8 | 7 | 8 | 7 | **7.6** | **HIGH** | **Enforced:** Refresh Token Rotation (RTR). Storing only SHA-256 digests. Presenting an already-used token invalidates the entire session family. |
| **TH-03** | **Credential Stuffing / Brute Force:** Automated botnet testing breached password dumps against login endpoint. | 8 | 7 | 8 | 8 | 7 | **7.6** | **HIGH** | **Enforced:** Redis rate limiter (5 attempts per 60s per IP/email). Argon2id computational work factor. |
| **TH-04** | **TOTP Secret Key Database Exfiltration:** Database compromise reveals TOTP seeds, enabling MFA bypass. | 9 | 6 | 6 | 8 | 6 | **7.0** | **HIGH** | **Enforced:** TOTP secrets encrypted with AES-256-GCM. Master key stored in environment, not database. |
| **TH-05** | **User Account Enumeration:** Attacker enumerates registered user emails via error responses or response times. | 5 | 8 | 8 | 6 | 7 | **6.8** | **MEDIUM** | **Enforced:** Constant-time password validation (dummy hash evaluated on missing user). Unified generic response messages. |
| **TH-06** | **CSRF on Cookie-Authenticated Session:** Malicious site forces browser to execute state-changing requests using session cookies. | 8 | 6 | 6 | 7 | 6 | **6.6** | **MEDIUM** | **Enforced:** `SameSite=Lax` cookie policy, custom request header requirement (`X-CSRF-Token` or Bearer header). |
| **TH-07** | **Unauthorized Privilege Escalation:** Tenant Member crafts API request to assign `owner` role to self. | 8 | 6 | 6 | 6 | 6 | **6.4** | **MEDIUM** | **Enforced:** FastAPI RBAC dependencies evaluate permissions server-side. Ownership transfer requires Owner role and step-up auth. |
| **TH-08** | **TOTP Replay Attack:** Valid 6-digit TOTP code captured in transit and replayed within 30-second window. | 7 | 6 | 6 | 6 | 6 | **6.2** | **MEDIUM** | **Enforced:** Redis atomic lock records used codes with 60s TTL. Codes cannot be reused twice in valid window. |
| **TH-09** | **Orphaned Sessions After Password Change:** Stolen sessions remain active after victim updates password. | 8 | 6 | 6 | 6 | 5 | **6.2** | **MEDIUM** | **Enforced:** Password change operation transactionally invalidates all active sessions for the user. |
| **TH-10** | **Cross-Tenant Worker Job Pollution:** Celery task dispatched with forged tenant context processing another tenant's data. | 8 | 5 | 5 | 7 | 5 | **6.0** | **MEDIUM** | **Enforced:** Background tasks accept only authenticated, system-generated payloads with verified tenant scope. |
