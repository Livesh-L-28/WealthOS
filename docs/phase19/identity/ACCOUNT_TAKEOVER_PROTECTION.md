# WealthOS Phase 19 — Account Takeover Defense & Step-Up Authentication

## 1. Multi-Signal Login Risk Scoring
When authentication is attempted, the `SuspiciousLoginService` evaluates login entropy:

| Signal | Risk Weight | Description |
| :--- | :--- | :--- |
| `NEW_OR_UNTRUSTED_DEVICE` | +35 | Fingerprint not present in user's trusted devices |
| `ELEVATED_FAILED_LOGIN_FREQUENCY` | +20 | 2–4 failed password attempts in prior 60 minutes |
| `HIGH_FAILED_LOGIN_FREQUENCY` | +45 | $\ge 5$ failed attempts in prior 60 minutes |
| `ANONYMOUS_PROXY_OR_VPN` | +25 | Request IP associated with known datacenter / Tor exit node |

### Risk Tiers
- **0–29 (LOW)**: Seamless authentication permitted.
- **30–59 (MEDIUM)**: Requires Step-Up Multi-Factor Authentication (Passkey assertion or TOTP code).
- **60–100 (HIGH / CRITICAL)**: Requires Step-Up Auth + security notification email + session flagged for high-risk operations quarantine.

---

## 2. Scoped Developer & Automation API Keys
Automated integrations utilize cryptographically hashed tokens (`wos_<prefix>_<secret>`):
- The plaintext key is only returned at time of issuance.
- The backend persists only `key_prefix` (for efficient B-tree index lookup) and `key_hash` (SHA-256).
- Keys are restricted to granular read/write scopes (`accounting:read`, `analytics:read`, `sync:write`).

