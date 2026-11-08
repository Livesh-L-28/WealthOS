# WealthOS — Mobile Application Security Report

## 1. Scope & Verification Standard

This report details mobile application security controls for the React Native & Expo SDK 51 client (`apps/mobile`), benchmarked against **OWASP MASVS** (Mobile Application Security Verification Standard) and **MASTG**.

---

## 2. Implemented Mobile Controls & Verification

### 2.1 Hardware-Backed Secure Storage (MASVS-STORAGE)
- **Implementation** (`apps/mobile/src/storage.ts`):
  - Uses iOS Keychain and Android Keystore via Expo SecureStore.
  - Configured with `WHEN_UNLOCKED_THIS_DEVICE_ONLY` to block extraction from unauthenticated device backups.
  - **Fail-Closed Semantics**: `ExpoSecureStoreDriver` throws `SecureStorageUnavailableError` if hardware module is missing or inaccessible. Never silently falls back to unencrypted storage.
  - Complete logout purge deletes `auth_token`, `refresh_token`, and `active_tenant_id`.

### 2.2 Network Security & Cleartext Traffic (MASVS-NETWORK)
- **Configuration** (`apps/mobile/app.json`):
  - Android configuration strictly enforces `usesCleartextTraffic: false`.
  - All communication directed over TLS 1.3 to production endpoints.

### 2.3 Deep Link Validation & Open Redirect Defense (MASVS-PLATFORM)
- **Implementation** (`apps/mobile/src/deeplink.ts`):
  - Strictly allowlists protocol scheme `wealthos://` and domain `app.wealthos.com`.
  - Enforces route allowlist (`/auth/callback`, `/dashboard`, `/verify-email`, `/reset-password`).
  - Rejects URLs containing sensitive credentials (`access_token`, `token`, `password`).
  - Validates `state` parameter on authentication callbacks to prevent CSRF / session fixation.
  - Detects and rejects open redirect targets (`//attacker.com`, `https://...`).

### 2.4 Offline Queue Cryptographic Tamper Defense (MASVS-CRYPTO)
- **Implementation** (`apps/mobile/src/storage.ts`):
  - Every queued offline mutation computes a cryptographic payload checksum upon creation.
  - The offline sync runner verifies the checksum before transitioning state to `SYNCING`.
  - If payload alteration is detected, the mutation is transitioned to `FAILED_FATAL` and synchronization halts.

### 2.5 Verification Evidence
- Verified in `apps/mobile/src/mobile.test.ts` and `apps/mobile/src/mobileSecurity.test.ts` (20 passing tests).
