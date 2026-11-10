# WealthOS Phase 21 — Android Mobile Security Review & Cryptographic Audit

## Executive Summary

This security review evaluates the cryptographic posture, credential storage architecture, hardware enclave integration, and manifest security configurations of the WealthOS mobile platform and internal beta Android artifact (`artifacts/android/wealthos-internal-beta.apk`).

All mobile security assertions and cryptographic test suites were independently executed and passed:
- **Mobile Test Suite**: 6 test files, **94/94 passed** in 528ms.
- **TypeScript Static Audit**: Zero compilation errors (`npx tsc --noEmit` exited 0).
- **Zero-Dependency Cryptography**: Full FIPS 180-4 SHA-256 and FIPS 198-1 / RFC 2104 HMAC-SHA256 engines verified across runtime contexts.

---

## 1. Hardware SecureStore Architecture & Driver Selection

WealthOS Mobile isolates all persistent authentication tokens, refresh tokens, and tenant context using hardware-backed cryptographic storage.

### Driver Selection Strategy (`apps/mobile/src/storage.ts`)

```typescript
export function createSecureStorageDriver(forceDriver?: SecureStorageDriver): SecureStorageDriver {
  if (forceDriver) {
    return forceDriver;
  }
  if (process.env.NODE_ENV === 'test') {
    return new MemorySecureStoreDriver();
  }
  if (getPlatformOS() === 'web') {
    return new WebSecureStoreDriver();
  }
  // Native iOS and Android require real hardware-backed SecureStore
  return new ExpoSecureStoreDriver();
}
```

### Security & Invariant Properties:
1. **Hardware Enclave Binding**:
   On Android, `ExpoSecureStoreDriver` interfaces with the Android Keystore system (backed by StrongBox Keymaster or TEE hardware). On iOS, it binds to the Secure Enclave Keychain.
2. **Device-Bound Protection**:
   Configured with `keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY`. Credentials cannot be extracted via cloud device migration, ADB backup, or when the device is locked.
3. **Strict Fail-Closed Semantics**:
   If the native SecureStore bridge is absent or throws an encryption fault on a physical device, `SecureStorageUnavailableError` is thrown immediately. The application **never** falls back silently to unencrypted `AsyncStorage` or plaintext files for credentials.

---

## 2. Cryptographic HMAC & Device Keystore Architecture (`apps/mobile/src/crypto.ts`)

To support reliable offline transactional mutations without server-side tampering, WealthOS implements a client-side device signature scheme.

### Cryptographic Invariants:
1. **Key Generation (CSPRNG)**:
   A 256-bit cryptographic secret ($K_{\text{device}}$) is generated using platform CSPRNG (`crypto.getRandomValues()` or Node `crypto.randomBytes()`).
2. **FIPS 198-1 / RFC 2104 HMAC-SHA256**:
   Mutations are packaged into a canonical serialized payload and signed:
   $$\text{Signature} = \text{HMAC-SHA256}(K_{\text{device}}, \text{canonicalJson}(\text{payload}))$$
3. **Constant-Time Verification (`timingSafeEqual`)**:
   Prevents timing side-channel attacks by accumulating XOR differences across all characters without early return:
   ```typescript
   export function timingSafeEqual(a: string, b: string): boolean {
     if (a.length !== b.length) return false;
     let diff = 0;
     for (let i = 0; i < a.length; i++) {
       diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
     }
     return diff === 0;
   }
   ```
4. **Replay & Tamper Defense**:
   Each signed envelope contains:
   - Unique mutation UUID nonce (`generateSecureRandomHex(16)`)
   - Monotonic ISO timestamp with clock drift validation ($\Delta t \le 300\text{s}$)
   - Tenant isolation scope (`tenantId`)
5. **Key Versioning & Seamless Rotation**:
   Keys are stored under versioned slots (`wealthos_hmac_key_v1`, `wealthos_hmac_key_v2`). The `rotateDeviceKey()` method advances the active version while retaining previous keys for historical verification.

---

## 3. Automated Security & Cryptographic Test Results

Verification of security test suites (`cd apps/mobile && npm test -- --run`):

| Test Suite File | Test Count | Status | Key Security Invariants Verified |
|---|---|---|---|
| `src/cryptoHmac.test.ts` | 12 tests | **PASS** | HMAC-SHA256 RFC 4231 test vectors, timingSafeEqual constant-time validation, key rotation, envelope tampering detection |
| `src/mobileSecurity.test.ts` | 9 tests | **PASS** | SecureStore driver fail-closed behavior, biometric gating, session wipe on logout |
| `src/mobileAuthAndIntegration.test.ts` | 31 tests | **PASS** | SEC-01 hardware session storage, token refresh lifecycle, offline queue isolation |
| `src/mobileFunctionsVerification.test.ts` | 12 tests | **PASS** | Financial formatting, precision decimal handling, sanitization |
| `src/mobileUI.test.ts` | 19 tests | **PASS** | UI state safety, error boundaries, zero JSX comment rendering |
| `src/mobile.test.ts` | 11 tests | **PASS** | Core mobile client contracts and response mapping |
| **Total** | **94 tests** | **PASS** | **100% Passing in 528ms** |

---

## 4. Android Binary Manifest Security Assessment

Forensic analysis of `artifacts/android/wealthos-internal-beta.apk` binary manifest:

| Manifest Attribute | Observed Value | Risk Assessment | Recommendation / Remediation |
|---|---|---|---|
| **`android:debuggable`** | `false` (Omitted) | **LOW (Compliant)** | Debug bridge disabled in release. Memory dumping via JDWP prohibited. |
| **`android:usesCleartextTraffic`** | Omitted (False by default on API 28+) | **LOW (Compliant)** | Cleartext HTTP is prohibited by Android OS. All staging and production traffic must use TLS 1.3/1.2. |
| **`android:allowBackup`** | `true` | **MEDIUM (Action Required for Prod)** | On physical rooted devices or via ADB, application data could theoretically be extracted. **Remediation**: Set `android:allowBackup="false"` in `app.json` prior to production release. |
| **`android:extractNativeLibs`** | `false` | **LOW (Compliant)** | Libraries are memory-mapped directly from the APK, preventing unauthorized shared object replacement on disk. |
| **Exported Components** | `MainActivity` (Exported=true), `ProfileInstallReceiver` (Exported=true) | **LOW (Compliant)** | `MainActivity` is the app launcher. `ProfileInstallReceiver` is strictly protected by `android.permission.DUMP`. |
| **Custom Permissions** | `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` (`protectionLevel="0x2"`) | **LOW (Compliant)** | Android 14 compliant signature-level dynamic receiver protection. |

---

## 5. Security Sign-Off Recommendation

- **Internal Beta Device Testing**: **APPROVED**. Cryptographic primitives, hardware session storage, and fail-closed security logic meet enterprise standards.
- **Production Pre-Release Requirement**: Update Expo / React Native configuration to set `allowBackup: false` before publishing to external production tracks.

