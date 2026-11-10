# WealthOS Phase 30 — End-User Installation & Getting Started Guide

**Document Identifier:** WEALTHOS-P30-USER-001  
**Phase:** 30 (WEALTHOS-PHASE-30)  
**Execution Timestamp:** 2026-11-10T13:54:25+05:30  
**Target Audience:** Retail Investors, Household Users, QA Testers  
**Target Outcome:** `FINAL_RELEASE_CANDIDATE_READY_FOR_USER_DELIVERY`  

---

## 1. Introduction

Welcome to WealthOS. WealthOS is an institutional-grade personal financial management, net worth tracking, double-entry accounting, and demat investment intelligence platform.

This guide provides end-users with simple, step-by-step instructions for installing the Android application, accessing the web platform, operating offline, protecting privacy in public, and managing data rights.

---

## 2. System & Device Requirements

| Platform | Minimum Requirement | Recommended Specification |
| :--- | :--- | :--- |
| **Android Handset** | Android 7.0 (API Level 24), 2 GB RAM, 100 MB storage | Android 13/14 (API Level 33/34), Biometric sensor (Fingerprint / Face Unlock), 4 GB RAM |
| **Web Browser** | Evergreen browser (Chrome 110+, Firefox 115+, Safari 16+, Edge 110+) | Chrome 124+ or Safari 17+ with hardware acceleration enabled |
| **Network** | Offline-capable; intermittent 3G/4G/5G/Wi-Fi for synchronization | Stable broadband or 4G LTE connection for initial sync |

---

## 3. Android Mobile Application Installation

The Android release artifact is packaged as a direct-install APK in [`release/android/wealthos-release.apk`](file:///Users/livesh/WEALTHOS/release/android/wealthos-release.apk).

### Sideloading Instructions:
1. **Download the APK:**
   - On your Android phone, open the browser and navigate to the staging download portal:
     `http://<server-ip>:8088/wealthos-staging.apk`
   - Alternatively, scan the QR code displayed at `http://<server-ip>:8088/apk_qr.png`.
2. **Authorize Installation:**
   - When prompted by Android: *"For your security, your phone is not allowed to install unknown apps from this source"*.
   - Tap **Settings** $\rightarrow$ Toggle **Allow from this source**.
3. **Install & Verify Checksum:**
   - Tap **Install**. Once complete, tap **Open**.
   - Advanced users can verify binary integrity via ADB:
     ```bash
     shasum -a 256 release/android/wealthos-release.apk
     # Verified SHA-256: d648c317374e072e8f182f44dbe939479876aa3e45e7df240d9816c830e9273b
     ```

---

## 4. Web Application Access & PWA Installation

1. **Accessing the Web Portal:**
   - Open your browser and navigate to:
     - Production: `https://wealthos.app`
     - Staging Node: `http://localhost:3005`
2. **Installing as a Progressive Web App (PWA):**
   - In Chrome/Edge: Click the **Install WealthOS** icon in the URL bar.
   - In Safari (iOS/macOS): Tap the Share button $\rightarrow$ Select **Add to Home Screen**.
   - WealthOS runs in a dedicated standalone window with offline caching.

---

## 5. First-Time Account Setup & Biometrics

1. **Create Your Account:**
   - Click **Create Account** on the welcome screen.
   - Enter your email address and choose a strong password (minimum 8 characters with letters, numbers, and symbols).
2. **Two-Factor Authentication (2FA):**
   - Scan the TOTP QR code using Google Authenticator, Authy, or 1Password.
   - Input the 6-digit confirmation code.
3. **Enable Biometric Unlock:**
   - On mobile, tap **Enable Biometrics** when prompted.
   - Your local database encryption key will be secured within the Android KeyStore / Secure Hardware Enclave.

---

## 6. Daily Usage & Key Features

### 6.1. Logging Transactions & Transfers
- **Cash Expense:** Tap the floating `+` button $\rightarrow$ Select **Record Expense** $\rightarrow$ Enter amount, merchant, and category.
- **Inter-Account Transfer:** Select **Transfer Between Accounts** $\rightarrow$ Choose Source (e.g. Checking) and Destination (e.g. Demat).
  > **Note:** Transfers are labeled *"Net Worth Neutral"* ($\Delta \text{Net Worth} = ₹0.00$). They do not distort your monthly expense budget.

### 6.2. Offline Airplane Mode Operation
- WealthOS works seamlessly without cellular connectivity.
- When offline, a top badge appears: *"Offline Mode — Pending local writes"*.
- You can create expenses, inspect balances, and review budgets.
- All offline changes are encrypted locally using AES-256-GCM.
- When network reconnects, background workers sync all pending writes automatically.

### 6.3. Public Privacy Mode (Masking Balances)
- When checking finances on public transit, flights, or coffee shops:
  - **Web:** Click the **Shield Icon** in the top navigation bar.
  - **Mobile:** Perform a three-finger tap gesture anywhere on screen.
  - All rupee amounts are masked with `••••••` while retaining allocation percentages.

---

## 7. Data Privacy, Export & Right to Erasure

Under the Digital Personal Data Protection Act, 2023 (DPDPA):
1. **Export Your Financial Data:**
   - Navigate to **Settings** $\rightarrow$ **Privacy & Security** $\rightarrow$ **Export My Data**.
   - A complete JSON package of your accounts, transactions, and holdings will download immediately.
2. **Delete Your Account:**
   - Navigate to **Settings** $\rightarrow$ **Privacy & Security** $\rightarrow$ **Delete Account**.
   - Confirm your 2FA authentication prompt.
   - All Personal Identifiable Information (PII) is permanently shredded. Historical accounting journals are pseudonymized to satisfy Section 128 Companies Act statutory audit requirements.

---

## 8. Support & Feedback

If you encounter an issue during beta testing:
- **Email:** `support@wealthos.app`
- **Bug Reports:** Tap **Settings** $\rightarrow$ **Submit Feedback** to include diagnostic logs (scrubbed of personal financial data).

