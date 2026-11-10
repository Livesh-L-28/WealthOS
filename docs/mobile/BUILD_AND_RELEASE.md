# WealthOS Mobile — Build & Release Engineering Guide

> **Platforms:** Android (Native Gradle + Standalone APK) • iOS (Expo SDK 52 / EAS Cloud)  
> **Application Identifier:** `com.wealthos.app`  
> **Version:** `1.0.0` (Build 1)  
> **Status:** Production Build Configured  

---

## 1. Android Native Build Specification

### 1.1 Native Environment & Toolchain
- **Native Project Directory:** `apps/mobile/android/`
- **Gradle Version:** Gradle 8.8 (Gradle Wrapper `gradlew`)
- **Android Gradle Plugin (AGP):** `8.3.1`
- **Kotlin Version:** `1.9.25` (Enforced via `expo-build-properties` in `app.json`)
- **Compile SDK:** API 34 (Android 14)
- **Target SDK:** API 34 (Android 14 — Fully compliant with Google Play Store 2026 requirements)
- **Minimum SDK:** API 24 (Android 7.0 Nougat — Covers 98.2% of active global Android devices)

### 1.2 Android Permissions & Security Declarations
Configured in `app.json`:
- **Allowed Permissions:**
  - `INTERNET` (Required for encrypted API communication with WealthOS backend)
  - `ACCESS_NETWORK_STATE` (Required for offline queue detection and network reachability)
- **Blocked Sensitive Permissions:**
  - `android.permission.READ_PHONE_STATE` (Blocked: prevents IMEI/telephony fingerprinting)
  - `android.permission.RECEIVE_SMS` (Blocked: protects financial OTP privacy)
  - `android.permission.ACCESS_FINE_LOCATION` (Blocked: location tracking disabled)

### 1.3 Standalone Artifact Protection
- Existing release APK exists at: `apps/mobile/wealthos.apk` (60.9 MB).
- **Rule:** This artifact is permanently preserved and protected; it is **never** overwritten during local development or test runs.

### 1.4 Generating Production Android Builds
```bash
# Debug APK Build (Local Android SDK)
cd apps/mobile/android && ./gradlew assembleDebug

# Release Android App Bundle (AAB for Google Play Store)
cd apps/mobile/android && ./gradlew bundleRelease

# Cloud EAS Android Build
cd apps/mobile && eas build --platform android --profile production
```

---

## 2. iOS Build & Release Specification

### 2.1 Native Environment & Capabilities
- **Bundle Identifier:** `com.wealthos.app`
- **Supported Form Factors:** iPhone, iPad (Supports Tablet enabled in `app.json`)
- **UI User Interface Style:** `dark` default with dynamic runtime token switching
- **Security Capabilities:**
  - Native iOS Keychain integration via `expo-secure-store`
  - Deep link scheme handler: `wealthos://`
  - Associated Domains (Universal Links): `app.wealthos.com`

### 2.2 Local Prebuild & EAS Cloud Compilation
To generate native Xcode workspace locally:
```bash
# Run Expo Prebuild to generate apps/mobile/ios
cd apps/mobile && npx expo prebuild --platform ios

# Install CocoaPods
cd apps/mobile/ios && pod install

# Build via EAS Cloud (Preferred for CI/CD)
cd apps/mobile && eas build --platform ios --profile production
```

---

## 3. Store-Readiness & Compliance Checklist

| Store Requirement | Android (Google Play) | iOS (Apple App Store) | Implementation Evidence |
| :--- | :---: | :---: | :--- |
| **Target SDK / Deployment** | Target SDK 34 | iOS 15.1+ deployment | Configured in `app.json` and `build.gradle`. |
| **Account Deletion Flow** | Mandatory | Mandatory | Supported via `/api/v1/auth/me` and Settings Hub. |
| **Privacy Disclosures** | Mandatory Data Safety | Mandatory Privacy Nutrition Labels | Only encrypted session tokens & financial records collected. |
| **Cleartext Traffic** | Disallowed by default | ATS (App Transport Security) mandatory | Production builds enforce HTTPS only. |
| **Biometric Auth Security** | BiometricPrompt API | LocalAuthentication framework | Hardware-backed KeyStore/Keychain integration. |
| **Financial Security Notice** | Mandatory | Mandatory | App never asks for or stores debit/credit PINs or UPI credentials. |

