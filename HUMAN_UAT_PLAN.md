# WealthOS Phase 27 — Human User Acceptance Testing (UAT) Plan & Cohort Execution Package

**Phase ID:** `WEALTHOS-PHASE-27`  
**Execution Timestamp:** 2026-11-10T12:10:00+05:30  
**Status:** **TEST PACKAGE PREPARED; EXTERNAL PARTICIPANTS PENDING HANDSET DISTRIBUTION (BLOCKED_EXTERNAL)**

---

## 1. Executive Summary

In adherence to Phase 27 mandatory operating rules:
> **Synthetic Accounts $\neq$ Human Participants:**  
> The 5 synthetic accounts provisioned in Phase 26 (`USR-BETA-01` through `USR-BETA-05`) serve as test data fixtures and automated journey validators. Genuine human user acceptance testing requires real humans executing defined test journeys on real hardware.  
> As physical handsets have not yet been distributed to external beta testers, the human UAT status is classified as **`BLOCKED_EXTERNAL` (Harness Prepared & Ready)**.

This document provides the complete, production-grade UAT package: consent documentation, test accounts, 14 mandatory user journeys, feedback forms, and data cleanup procedures.

---

## 2. Participant Informed Consent Statement

```
================================================================================
WEALTHOS INTERNAL BETA PILOT — INFORMED PARTICIPANT CONSENT AGREEMENT
================================================================================
Project: WealthOS Multi-Tenant Financial Intelligence Platform
Environment: Isolated Staging Cluster (Ports 8005 / 3005)

1. Purpose of Testing: You are invited to participate in evaluating the WealthOS 
   web and mobile software applications for financial clarity, usability, 
   performance, and offline synchronization resilience.

2. Fictitious Test Data Notice: DO NOT input your real personal banking passwords, 
   real PAN/Aadhaar numbers, or real UPI PINs. All testing must utilize either 
   the provisioned synthetic demo accounts or simulated figures.

3. Voluntary Participation: Your participation is entirely voluntary. You may 
   withdraw consent and discontinue testing at any time without penalty.

4. Right to Erasure: At the conclusion of testing, you may request complete 
   deletion of your test identity and test transactions via the in-app 
   /delete-account interface.

5. Feedback Usage: Feedback and defect reports submitted through this pilot will 
   be used exclusively to identify software bugs and refine usability prior to 
   production launch.

I have read and understand the terms above.
Participant Signature: _______________________ Date: ___________________
================================================================================
```

---

## 3. Provisioned Staging Cohort Accounts

The following 5 pre-configured personas are provisioned in staging database `wealthos_staging`:

| User ID | Email Address | Assigned Role & Persona | Starting Staging Balances | Default Password |
| :--- | :--- | :--- | :--- | :--- |
| `USR-BETA-01` | `beta.participant1@wealthos.internal` | Salaried Tech Executive (High Net Worth) | ₹18,50,000 Equities; ₹3,20,000 Savings | `VaultAccess#9921!` |
| `USR-BETA-02` | `beta.participant2@wealthos.internal` | Freelance Consultant & Active Trader | ₹4,50,000 Equities; ₹1,10,000 Checking | `VaultAccess#9921!` |
| `USR-BETA-03` | `beta.participant3@wealthos.internal` | Conservative Retiree / Pensioner | ₹45,000 Fixed Deposit; ₹12,000 Pension | `VaultAccess#9921!` |
| `USR-BETA-04` | `beta.participant4@wealthos.internal` | First-Time Earner / Debt Consolidator | ₹25,000 Checking; ₹85,000 Education Loan | `VaultAccess#9921!` |
| `USR-BETA-05` | `beta.participant5@wealthos.internal` | Family Wealth Manager (Multi-Entity) | ₹62,00,000 Real Estate; ₹14,00,000 Mutual Funds | `VaultAccess#9921!` |

---

## 4. Mandatory User Journey Test Scenarios (14 Steps)

1. **Journey 1: Registration & MFA Login:** Access web `http://localhost:3005` or mobile app. Log in with provisioned credentials. Verify dashboard loads with executive summary.
2. **Journey 2: Dashboard Exploration:** Verify net worth, liquid cash, and financial health indicators match persona expectations.
3. **Journey 3: Expense Recording:** Log a ₹1,200 expense under "Dining Out". Verify immediate debit from checking account and budget progress bar update.
4. **Journey 4: Inter-Account Transfer:** Transfer ₹10,000 from Savings to Checking. Verify total liquid cash remains constant (Transfer Neutrality).
5. **Journey 5: Budget Creation:** Create a new monthly budget of ₹25,000 for "Groceries & Essentials". Verify alert threshold indicator.
6. **Journey 6: Financial Goal Contribution:** Create a "Retirement Emergency Fund" goal with ₹5,00,000 target. Contribute ₹15,000 and verify progress percentage.
7. **Journey 7: Portfolio Review:** Navigate to Investments. Review asset allocation donut chart and sector breakdown.
8. **Journey 8: Investment Trade Simulation:** Record a purchase of 20 shares of INFOSYS at ₹1,500. Verify liquid cash decreases by ₹30,000 and portfolio value reflects new lot.
9. **Journey 9: Offline Expense Recording:** Turn on Airplane Mode on mobile or disconnect network. Record a ₹450 expense under "Transit". Verify badge renders "Pending Synchronization".
10. **Journey 10: Reconnection & Synchronization:** Reconnect network. Verify pending badge transitions from "Syncing" to "Sync Complete" without user intervention.
11. **Journey 11: Duplicate Prevention:** Rapidly click "Submit" twice on a manual transaction. Verify only one ledger record is created.
12. **Journey 12: Conflict Resolution:** Trigger an offline conflict (e.g. edit an allocation closed on server). Verify conflict modal presents side-by-side comparison and resolution buttons.
13. **Journey 13: Logout & Device Revocation:** Log out of session. Verify all cached financial figures are immediately wiped from view.
14. **Journey 14: Data Export & Deletion:** Log in as demo user, download CSV export of transactions, then navigate to `/delete-account` and execute permanent account wipe.

---

## 5. Participant Defect Severity Definitions & Feedback Form

Participants submit defects via internal portal or email (`beta-feedback@wealthos.internal`) using this classification:

- **P0 — Critical Blocker:** Financial balance corruption, inability to log in, unencrypted data exposure, or app crash on launch.
- **P1 — High Severity:** Core feature failure (e.g. transfer fails to execute, goal creation crashes), broken sync queue.
- **P2 — Medium Usability:** Confusing terminology, slow chart rendering, misalignment on specific screen resolution.
- **P3 — Low Cosmetic:** Typo, color inconsistency, or layout padding flaw.

---

## 6. Post-UAT Data Cleanup & Revocation Procedure

Upon conclusion of the beta testing window:
1. Run data sanitization script:
   ```bash
   python3 scripts/cleanup_beta_cohort.py --tenant-prefix USR-BETA-
   ```
2. Invalidate all issued JWT refresh tokens in Redis.
3. Purge all uploaded test PDFs from `wealthos-staging-vault`.
4. Restore clean migration baseline snapshot.
