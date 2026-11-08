# WealthOS — Authentication & Identity Design

## 1. Authoritative Identity Principles

WealthOS uses a single unified backend identity service shared by web and mobile clients:
- **No Separate Incompatible Identity Rules**: Registration, password policies, MFA verification, and session invalidation rules are identical across web and mobile.
- **Client-Appropriate Credential Delivery**:
  - **Web**: Issues HttpOnly, SameSite=Lax, Secure session cookies (`wealthos_access_token`, `refresh_token`). Tokens are kept in memory only; zero persistent storage in browser `localStorage`.
  - **Mobile**: Issues access and refresh tokens stored in hardware-backed iOS Keychain and Android Keystore via Expo SecureStore. Silent storage fallbacks are prohibited (fail-closed).

---

## 2. Authentication Lifecycle

### 2.1 Password Hashing & NIST SP 800-63B Compliance
- Algorithm: Argon2id.
- Parameters: Memory = 64MB, Iterations = 3, Parallelism = 4.
- Complexity Rules: Minimum 12 characters, uppercase, lowercase, digit, special character.
- Password reset tokens: Cryptographically secure random tokens (SHA-256 hashed), 15-minute expiration, single-use.

### 2.2 Multi-Factor Authentication (MFA)
- Primary: TOTP (RFC 6238) with QR code provisioning and authenticator support (Google Authenticator, 1Password, Bitwarden).
- Secondary: 8 single-use cryptographically generated backup recovery codes.
- Step-Up Authentication: Modifying credentials, disabling MFA, exporting sensitive data, or deleting an account requires re-authenticating with current password or active TOTP code.

### 2.3 Session & Device Management
- Full session audit: IP address, User-Agent, device fingerprint, last active timestamp.
- Remote revocation: `/api/v1/auth/sessions/{id}` allows revoking suspicious or lost devices.
- Global logout: `/api/v1/auth/logout-all` revokes all active sessions and rotates refresh tokens.
