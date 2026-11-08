# WealthOS — Authentication & Identity Lifecycle Design

**Programme:** WealthOS Enterprise Architecture & Production Readiness  
**Document:** Authentication Design Specification  
**Date:** 2026-11-08  
**Status:** Approved Specification  
**Standards:** NIST SP 800-63B, OWASP ASVS v4.0.3 L3  
**Author:** Identity & Access Management Lead  

---

## 1. Password Security & Credential Hashing

WealthOS hashes all user passwords using the state-of-the-art **Argon2id** algorithm (the winner of the Password Hashing Competition, resistant to both GPU and ASIC brute-force attacks):

### Argon2id Configuration Parameters
- **Type:** Argon2id (hybrid data-dependent and data-independent memory access)
- **Time Cost ($t$):** 3 iterations
- **Memory Cost ($m$):** 65,536 KiB (64 MiB)
- **Parallelism ($p$):** 4 threads
- **Hash Length:** 32 bytes
- **Salt:** 16 cryptographically secure random bytes per user

### NIST SP 800-63B Password Policy
1. **Length:** Minimum 12 characters, maximum 128 characters.
2. **Character Set:** Allows all Unicode characters including spaces, emoji, and symbols.
3. **Common Password Blacklist:** Evaluates candidates against a blacklist of top 100,000 breached passwords.
4. **Contextual Derivation Check:** Prohibits passwords containing user's email prefix or first/last name.
5. **No Composition Rules:** Rejects outdated rules (e.g. forcing periodic expiration or artificial punctuation counts) which encourage weak mnemonic substitutions.

---

## 2. Multi-Factor Authentication (MFA / 2FA)

WealthOS implements standard RFC 6238 Time-Based One-Time Passwords (TOTP):
1. **Enrollment:**
   - Server generates a 160-bit (20-byte) cryptographically secure random secret.
   - Secret is encrypted at rest using AES-256-GCM before storage in `mfa_credentials`.
   - Generates an `otpauth://` provisioning URI for Google Authenticator, Authy, or 1Password.
2. **Activation Verification:**
   - MFA is **not active** until the user proves possession by submitting a valid 6-digit code.
3. **Replay Prevention:**
   - Verified TOTP codes are stored in Redis (`totp_used:{user_id}:{code}`) with a 90-second TTL to prevent replay attacks during the valid time window.
4. **Backup Recovery Codes:**
   - 10 single-use 16-character recovery codes generated at enrollment.
   - Stored in `mfa_recovery_codes` as salted SHA-256 hashes.
   - Atomically consumed using `UPDATE ... WHERE is_used = False RETURNING id`.

---

## 3. Account Protection & Lockout Policy

To prevent automated credential stuffing and dictionary attacks:
- **Failed Login Threshold:** 5 consecutive failed attempts on an account locks authentication for 15 minutes.
- **Timing Attack Mitigation:** When an unrecognized email address is queried, the authentication engine executes a dummy Argon2id verification with equal computational latency, preventing user enumeration via timing discrepancies.
- **Rate Limiting:** IP and endpoint rate limiters enforce a maximum of 5 sensitive auth attempts per minute in production.

