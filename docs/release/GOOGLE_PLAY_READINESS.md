# WealthOS — Android & Google Play Store Publication Readiness Specification

**Programme:** WealthOS Enterprise Architecture & Production Readiness  
**Document:** Google Play Readiness  
**Date:** 2026-11-08  
**Status:** **PUBLICATION READY (Awaiting Explicit Owner Approval)**  
**Application ID:** `com.wealthos.app`  
**Version Code:** 1  
**Version Name:** `1.0.0`  
**Target Android SDK:** Android 15 (API Level 35) / Android 14 (API Level 34)  
**Minimum Android SDK:** Android 8.0 (API Level 26)  
**Author:** Google Play Release & Android Compliance Engineer  

---

## 1. Compliance Audit & Google Play Policy Certification

WealthOS conforms to all 2026 Google Play Developer Program Policies:

| Policy Area | Policy Requirement | WealthOS Implementation & Compliance Evidence | Status |
|---|---|---|---|
| **Target API Level** | Target SDK $\ge$ 34/35 for new submissions. | Declared in `apps/mobile/app.json` with Expo SDK 51. | **COMPLIANT** |
| **Permissions Policy** | Principle of least privilege; zero unnecessary permissions. | Declared permissions: only `INTERNET` and `ACCESS_NETWORK_STATE`. Dangerous permissions (`RECEIVE_SMS`, `READ_PHONE_STATE`, `LOCATION`) explicitly blocked. | **COMPLIANT** |
| **Account Deletion** | Mandatory in-app deletion option + public external web page. | In-app deletion via `DELETE /api/v1/auth/me` and public web route `/delete-account`. Purges PII and credentials. | **COMPLIANT** |
| **Data Safety Section** | Accurate, truthful declaration of all collected and shared data. | Form answers documented in Section 2 below. Zero data sharing with ad brokers. | **COMPLIANT** |
| **Financial Features** | Explicit declaration of fintech features and non-advisory nature. | Disclaimers embedded; no high-risk loan origination; clear non-advisory statements. | **COMPLIANT** |
| **Secure Token Storage** | Hardware-backed keystore for session credentials. | `ExpoSecureStoreDriver` using Android Keystore `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. Zero tokens in plain AsyncStorage. | **COMPLIANT** |
| **Release Signing** | Google Play App Signing (PEP) ready. | Configured via `apps/mobile/eas.json` for Android App Bundle (`.aab`) production distribution. | **COMPLIANT** |

---

## 2. Google Play Data Safety Form Declarations

When completing the Play Console Data Safety questionnaire, submit the following exact declarations:

### Data Collection & Purpose
1. **Financial Info:**
   - *Types:* User payment info, bank account numbers, transaction history, net worth.
   - *Purposes:* App functionality (accounting, double-entry ledger calculation, budgeting, portfolio tracking).
   - *Ephemeral:* No.
   - *Encrypted in transit:* Yes (TLS 1.3).
   - *Encrypted at rest:* Yes (PostgreSQL RLS + AES-256-GCM).
   - *Users can request deletion:* Yes (In-app + web portal).
2. **Personal Info:**
   - *Types:* Name, email address.
   - *Purposes:* Account management, fraud prevention, security audit logging.
   - *Encrypted:* Yes.
   - *Users can request deletion:* Yes.

### Data Sharing
- **Does your app share user data with other companies or organizations?**  
  **NO.** WealthOS does not share any user data with third-party advertisers, data aggregators, or marketing networks.

---

## 3. Financial Features Declaration

In the Play Console "Financial Features" declaration:
- Category: **Personal Finance Management (PFM) / Expense Tracking / Portfolio Management**.
- WealthOS **does NOT** issue payday loans, microloans, or personal credit.
- WealthOS **does NOT** act as a depository financial institution or digital wallet holding customer funds.
- WealthOS provides informational accounting intelligence, cash flow forecasts, and bank statement reconciliation.

---

## 4. Production AAB Generation & Signing Runbook

```bash
# 1. Install EAS CLI (if not already present)
npm install -g eas-cli

# 2. Login to EAS
eas login

# 3. Configure Google Play credentials
# Ensure google-services-key.json is mounted or configured in EAS Secrets

# 4. Trigger Production Android App Bundle (.aab) Build
cd apps/mobile
eas build --platform android --profile production
```

> [!WARNING]
> **Owner Approval Policy Reminder:**  
> In accordance with the non-negotiable Deployment Policy, **NO production release tag, public Play Console submission, or internal track promotion will be triggered without explicit authorization from the repository owner.**

