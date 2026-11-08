# WealthOS Phase 19 — FIDO2 / WebAuthn Passkey Architecture

## 1. Overview
WealthOS implements passwordless, phishing-resistant authentication based on the W3C WebAuthn / FIDO2 standard. Users can register biometric platform authenticators (Apple Touch ID / Face ID, Windows Hello, Android Biometrics) or hardware security keys (YubiKey).

---

## 2. Cryptographic Registration Protocol

```
Client (Browser / Native App)                         WealthOS Backend API
             │                                                  │
             │   1. POST /api/v1/auth/passkeys/register/init   │
             │ ───────────────────────────────────────────────> │
             │                                                  │
             │   2. PublicKeyCredentialCreationOptions (JSON)   │
             │ <─────────────────────────────────────────────── │
             │   (Cryptographic 32-byte challenge, RP info)     │
             │                                                  │
[ Biometric Prompt / Key Sign ]                                 │
             │                                                  │
             │   3. POST /api/v1/auth/passkeys/register/finish  │
             │ ───────────────────────────────────────────────> │
             │   (credential_id, raw public_key, sign_count=0)  │
             │                                                  │
             │                                      [ Store in PostgreSQL ]
             │                                      [ webauthn_credentials ]
```

## 3. Authenticator Clone Detection
WealthOS enforces monotonic signature counter verification during authentication:
- When an authenticator signs an assertion, it returns a 32-bit counter (`sign_count`).
- If a received `sign_count` is less than or equal to the recorded `sign_count`, the request is immediately rejected with `AuthenticatorCloneDetectedError`.
- An alert is raised indicating potential hardware authenticator cloning or replay attack.
