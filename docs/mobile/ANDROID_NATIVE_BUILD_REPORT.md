# Android Native APK Build Report — Internal Beta

## Executive Summary

The fresh native Android internal-beta APK for WealthOS Mobile has been compiled, assembled, verified, and packaged into `artifacts/android/wealthos-internal-beta.apk`. The build was executed using Gradle 8.10.2 with OpenJDK 17, Android SDK Platforms 34/35, NDK 26.1.10909125, CMake 3.22.1, and Hermes JS Bytecode engine.

The baseline pre-existing APK (`apps/mobile/wealthos.apk`) was strictly preserved and verified untouched.

---

## 1. Build Identification & Environment

| Property | Value |
|---|---|
| **Git Branch** | `feature/final-financial-intelligence-production` |
| **Commit SHA** | `665248af05caaa730a695a8b6bf4b315fcca6d96` |
| **Build Task** | `./gradlew assembleRelease --stacktrace` |
| **Gradle Version** | 8.10.2 (Kotlin 1.9.24 / 1.9.25) |
| **Java Runtime** | OpenJDK 17.0.21.0.3 (Homebrew) |
| **Build Result** | **BUILD SUCCESSFUL in 12m 19s** (370 tasks: 360 executed, 10 up-to-date) |
| **Compilation Timestamp** | 2026-11-09T22:56:22+05:30 |

---

## 2. Artifact Comparison & Baseline Protection

| Artifact | Location | File Size | SHA-256 Checksum | Status |
|---|---|---|---|---|
| **Baseline APK** | `apps/mobile/wealthos.apk` | 58.1 MB (60,996,959 bytes) | `decf78a080a7f633d49eb3821a766e76974676b7da2567d106b8788f2550269a` | **Preserved & Untouched** |
| **Internal Beta APK** | `artifacts/android/wealthos-internal-beta.apk` | 58.2 MB (60,995,840 bytes) | `adbe0ddd874d96a92f24300b58693d6a3ce3a351f901eaeb2715876efc045f2a` | **Freshly Compiled** |

---

## 3. Package & Manifest Inspection (`aapt dump badging`)

- **Package Name**: `com.wealthos.app`
- **Version Name**: `1.0.0`
- **Version Code**: `1`
- **Target SDK**: `34` (Android 14)
- **Compile SDK**: `35` (Android 15)
- **Min SDK**: `24` (Android 7.0 Nougat)
- **Application Label**: `WealthOS`
- **Launchable Activity**: `com.wealthos.app.MainActivity`
- **Native ABI Architectures**:
  - `arm64-v8a` (64-bit ARM)
  - `armeabi-v7a` (32-bit ARM)
  - `x86` (32-bit Intel/AMD)
  - `x86_64` (64-bit Intel/AMD)
- **Permissions**:
  - `android.permission.INTERNET`
  - `android.permission.ACCESS_NETWORK_STATE`
  - `android.permission.USE_BIOMETRIC`
  - `android.permission.USE_FINGERPRINT`
  - `android.permission.VIBRATE`
  - `android.permission.READ_EXTERNAL_STORAGE`
  - `android.permission.WRITE_EXTERNAL_STORAGE`
  - `com.wealthos.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`

---

## 4. Hermes Bytecode & Native Module Bundle Inspection

Inspection of the compiled archive confirms:
- **`assets/index.android.bundle`**: 1,760,436 bytes (1,154 bundled modules compiled to Hermes bytecode).
- **Hermes Shared Libraries**:
  - `lib/arm64-v8a/libhermes.so` (2.27 MB)
  - `lib/armeabi-v7a/libhermes.so` (1.50 MB)
  - `lib/x86/libhermes.so` (2.83 MB)
  - `lib/x86_64/libhermes.so` (2.29 MB)
- **Dex Files**:
  - `classes.dex`: 11,356,008 bytes
  - `classes2.dex`: 9,857,352 bytes
  - `classes3.dex`: 1,899,092 bytes
- **Expo Native Modules**:
  - `:expo`
  - `:expo-modules-core`
  - `:expo-secure-store`
  - `:expo-asset`
  - `:expo-constants`
  - `:react-native-safe-area-context`
  - `:react-native-svg`

---

## 5. Verification Sign-Off

The Android build succeeds deterministically from source with 0 errors. The artifact is signed with the internal beta debug keystore and ready for direct installation on Android devices and emulators running API level 24 through 35.

