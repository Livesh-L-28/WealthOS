# WealthOS Phase 21 — Android Physical Device Acceptance Test Checklist

## Executive Summary

This document specifies the exact protocol, prerequisites, network configuration, and step-by-step test matrix required to validate `artifacts/android/wealthos-internal-beta.apk` on physical Android 14 and Android 15 hardware.

### Workstation Device State
```bash
adb devices -l
# List of devices attached
# (empty)
```
- **Current Operational Status**: **BLOCKED ON HARDWARE AVAILABILITY**.
- **Execution Instruction**: Once a physical test handset is connected via USB or an Android Virtual Device (AVD) is launched, execute the test procedures below and record results in this checklist.

---

## 1. Hardware & Environment Setup Protocol

### A. Device Preparation (Android 14 / 15)
1. Navigate to **Settings > About phone** and tap **Build number** 7 times to enable Developer Mode.
2. In **Settings > System > Developer options**:
   - Enable **USB debugging**.
   - Enable **Install via USB**.
   - Verify **Verify apps over USB** is active.
3. Connect the handset via USB-C cable and accept the RSA host authorization prompt.
4. Verify connection from the terminal:
   ```bash
   adb devices -l
   # Should report: <device-serial> device ... model:<DeviceModel>
   ```

### B. Network & Backend Connectivity
Because the staging backend is hosted locally or within an internal network:
- **Option 1 (Reverse Port Forwarding via ADB)**:
  ```bash
  adb reverse tcp:8000 tcp:8000
  ```
  Allows the physical phone to reach `http://localhost:8000` directly over the USB cable.
- **Option 2 (LAN Host IP)**:
  Set `EXPO_PUBLIC_API_URL` to `http://<WORKSTATION_LAN_IP>:8000` or configure an HTTPS staging reverse proxy.

---

## 2. APK Installation & Package Verification

Execute the fresh sideload command:
```bash
adb install -r artifacts/android/wealthos-internal-beta.apk
```
Expected output:
```text
Performing Streamed Install
Success
```

Verify installed package on device:
```bash
adb shell pm list packages | grep com.wealthos.app
# package:com.wealthos.app

adb shell dumpsys package com.wealthos.app | grep -E "versionName|versionCode"
# versionCode=1 minSdk=24 targetSdk=34
# versionName=1.0.0
```

---

## 3. Real-Device Acceptance Test Matrix (16 Screens + Core Scenarios)

| Step # | Screen / Scenario | Action / Interaction | Expected Behavior | Acceptance Criteria | Tested (Y/N) |
|---|---|---|---|---|---|
| **1** | **Cold Launch & Splash** | Tap WealthOS icon on home screen | App initializes splash, loads Hermes bundle, opens Auth screen | Clean launch under 1.5s; no ANR or crash | [ ] |
| **2** | **Biometric / PIN Login** | Authenticate via email or BiometricPrompt | Hardware keystore unlocks session token | Transitions to Dashboard with active tenant | [ ] |
| **3** | **Executive Dashboard** | View Net Worth, recent transactions, quick actions | Live asset totals render without formatting glitch | Net Worth cards display INR currency symbol (₹) | [ ] |
| **4** | **Strategic Goals (User Scenario 1)** | Navigate to **Budgets & Goals > Strategic Goals** | Goals listed ("Bike", "FIRE", "Luxury EV") | Clean cards without raw syntax; "+ Add Savings" button active | [ ] |
| **5** | **Goal Savings Modal (User Scenario 1)** | Tap **+ Add Savings** on "Bike" goal card | Deposit modal opens with quick chips (₹5k, ₹10k, ₹25k, ₹50k) and custom input | Modal animates smoothly above bottom navigation bar | [ ] |
| **6** | **Goal Funding Execution** | Enter ₹25,000 and select Funding Bank Account; confirm deposit | Journal posted to backend; goal balance increases by ₹25,000 | Goal progress updates from ₹0 to ₹25,000 (1% funded); Shortfall updates | [ ] |
| **7** | **Cash Flow Analytics (User Scenario 2)** | Navigate to **Cash Flow & Spend Analytics** | Outflows hero card, burn rate, 50/30/20 framework audit | **Strict Invariant**: Zero `{/* ... */}` comments visible anywhere in layout | [ ] |
| **8** | **Spending Envelopes** | Toggle Cadence (Daily, Weekly, Monthly, Yearly) | Dynamic recalculation of spend vs ceiling | Surplus / deficit progress bars render correctly | [ ] |
| **9** | **Liabilities & Debt** | View Loans & Credit lines | Displays outstanding principal, EMI calendar | Debt-to-asset ratio computed accurately | [ ] |
| **10** | **Investments & Portfolio** | Inspect Equity, Mutual Funds, Fixed Deposits | Asset class allocation pie chart / cards | Real-time valuation matched with staging API | [ ] |
| **11** | **Dividends & Income** | View upcoming dividend payouts and historical yield | Monthly dividend projection schedule | Payouts grouped by fiscal quarter | [ ] |
| **12** | **Household Wealth** | Switch family member profile / consolidated view | Multi-member net worth consolidation | Tenant boundary respected; no cross-tenant leakage | [ ] |
| **13** | **Financial Calendar** | View upcoming bills, SIPs, and tax deadlines | Date calendar dots and agenda feed | Events display correct timezone (IST) | [ ] |
| **14** | **Document Vault** | View tax returns, statements, insurance policies | Encrypted metadata view and upload picker | System storage picker opens safely | [ ] |
| **15** | **Reconciliation** | View uncleared transactions / ledger discrepancy alerts | Reconcile button triggers balance matching | In-balance indicator displays green status | [ ] |
| **16** | **AI Copilot** | Open WealthOS Copilot; submit financial inquiry | Streaming AI response or clear error if model offline | Zero false token fabrication; transparent error if down | [ ] |
| **17** | **Offline Mutation & Sync** | Enable Airplane mode; submit a new budget expense; disable Airplane mode | Mutation queued in SecureStore; processed upon reconnection | Queue drains automatically with valid HMAC verification | [ ] |
| **18** | **Session Logout & Keystore Purge** | Navigate to Settings > Logout | Session cleared; SecureStore keys purged | Returns to Auth screen; back-button cannot enter app | [ ] |

---

## 4. Live Log Monitoring & Diagnostic Commands

During physical testing, monitor the device runtime logs in a separate terminal:

```bash
# Filter specifically for React Native and WealthOS logs
adb logcat -v time -s ReactNativeJS:V WealthOS:* AndroidRuntime:E
```

### Crash Log Check
```bash
adb logcat -d -b crash
```
Verify that zero unhandled exceptions (`FATAL EXCEPTION`) occur during navigation across all 16 screens.

