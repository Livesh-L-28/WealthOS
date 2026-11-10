# WealthOS Android Application Installation Guide

**Artifact Identifier:** `WEALTHOS-ANDROID-RELEASE-001`  
**Package Name:** `com.wealthos.app`  
**Version:** `1.0.2` (versionCode: `3`)  
**Build Target:** Android 14 (API level 34), Min SDK: Android 8.0 (API level 24)  
**Binary Name:** `wealthos-release.apk`  
**File Size:** 60,992,119 bytes (58.17 MB)  
**SHA-256 Hash:** `4ecaa292bc5453e29506caedcb09b5a28608a4b2bf80f5ed6e275a74f612a5f8`  

---

## 1. Overview & Architecture

The WealthOS Android application is built on React Native 0.74+ with Hermes JavaScript engine, native navigation, and offline-first capabilities:
- **Local Storage:** AES-256-GCM encrypted local SQLite database with biometric key derivation.
- **Offline Sync:** Automatic conflict resolution and idempotent multi-device synchronization engine.
- **Security:** Biometric authentication (Fingerprint / Face Unlock), strict SSL certificate pinning configuration template, and zero-knowledge local PIN protection.

---

## 2. Installation Methods

### Method A: Direct Sideloading (Physical Device)
1. Transfer `wealthos-release.apk` to your Android device via USB, Google Drive, email, or direct local download.
2. Open the device **Settings** -> **Security & Privacy** -> **Install Unknown Apps**.
3. Select your file browser (e.g., Files by Google or Chrome) and toggle **Allow from this source**.
4. Tap `wealthos-release.apk` in your file browser and tap **Install**.
5. *Play Protect Notice:* If Google Play Protect displays "Blocked by Play Protect / Unrecognized app developer", tap **More details** -> **Install anyway** (expected for pre-release sideloaded binaries not yet signed with a public Google Play Store signing key).

### Method B: ADB Command Line (Developers & QA)
Prerequisites: Android SDK Platform Tools installed (`adb` in PATH) and Developer Options / USB Debugging enabled on the device.

```bash
# 1. Verify connected device
adb devices

# 2. Install APK (with replace and downgrade flags enabled)
adb install -r -d wealthos-release.apk

# 3. (Optional) For physical devices connected via USB targeting a local staging backend:
adb reverse tcp:8005 tcp:8005
adb reverse tcp:3005 tcp:3005

# 4. Launch the application
adb shell monkey -p com.wealthos.app -c android.intent.category.LAUNCHER 1
```

---

## 3. Network Configuration & Backend Connection

By default, the APK is configured to communicate with the WealthOS staging backend.

| Environment | Backend Target URL | Configuration Note |
|---|---|---|
| **Staging Environment** | `http://<staging-host>:8005/api/v1` | Default configuration for QA validation |
| **Local Host via USB** | `http://localhost:8005/api/v1` | Requires `adb reverse tcp:8005 tcp:8005` |
| **Local Wi-Fi Network** | `http://192.168.x.x:8005/api/v1` | Device and server must share same subnet |
| **Production (Gated)** | `https://api.wealthos.com/api/v1` | Gated until Phase 30 external gates close |

---

## 4. Release Artifact Status Note (.apk vs .aab)

- **`wealthos-release.apk`:** Included and verified. Fully standalone, installable binary compiled for release testing and side-loaded distribution.
- **`wealthos-release.aab` (Android App Bundle):** Not included in this local build bundle. AAB generation is reserved for cloud CI/CD pipelines (e.g. GitHub Actions / Cloud Build) with access to dedicated Android build runners and hardware security modules (HSM) holding the organization's private Google Play release keystore.

---

## 5. Troubleshooting & Diagnostics

- **Installation Failure (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`):** An earlier build with a different signature key is present. Uninstall the previous version:
  ```bash
  adb uninstall com.wealthos.app
  adb install wealthos-release.apk
  ```
- **Network Connection Error on Startup:** Verify backend server is running and accessible from device browser:
  ```bash
  curl -I http://<BACKEND_HOST>:8005/health
  ```
- **Logcat Debugging:** To capture application logs:
  ```bash
  adb logcat -s ReactNativeJS:V WealthOS:V
  ```

