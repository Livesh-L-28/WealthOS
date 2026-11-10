# WealthOS Phase 27 — Privacy, Legal & Regulatory Applicability Framework (India)

**Phase ID:** `WEALTHOS-PHASE-27`  
**Execution Timestamp:** 2026-11-10T12:07:00+05:30  
**Jurisdiction:** Republic of India  
**Status:** **ENGINEERING READINESS AUDITED; FORMAL LEGAL OPINION CLASSIFIED AS BLOCKED_EXTERNAL**

---

## 1. Executive Summary

This document evaluates the legal, regulatory, and privacy requirements applicable to WealthOS operating as an Indian fintech wealth intelligence, accounting, and portfolio analytics platform.

### Important Distinction:
> **Engineering Readiness vs. Legal Certification:**  
> This analysis establishes the engineering controls, data retention rules, consent architectures, and technical boundaries required by Indian statutes. It does **NOT** constitute formal legal advice. A formal legal opinion from qualified Indian fintech counsel is classified as **`BLOCKED_EXTERNAL`** pending business engagement.

---

## 2. Regulatory Applicability Matrix

| Regulatory Body / Act | Scope & Mandate | WealthOS Business Model Applicability | Implemented Engineering Controls | Status |
| :--- | :--- | :--- | :--- | :--- |
| **DPDPA, 2023** (Digital Personal Data Protection Act) | Governs processing of digital personal data within India; grants rights to Data Principals. | **MANDATORY APPLICABILITY** (WealthOS acts as Data Fiduciary for user financial and identity records). | - Purpose specification on collection<br>- Consent logging with versioning<br>- Account deletion (`/auth/delete-account`)<br>- India data localization | **ENGINEERING CONTROLS READY** (Awaiting DPDPA Rules notification) |
| **RBI Account Aggregator (AA) Master Directions** | Regulates retrieval and aggregation of financial information from Financial Information Providers (FIPs). | **APPLICABLE AS FIU** (Financial Information User). WealthOS must integrate via licensed RBI NBFC-AA. | - Consent-driven ephemeral fetch<br>- Zero storage of banking login credentials / OTPs<br>- FIU consent handle tracking | **ARCHITECTED FOR RBI-AA FIU** (Production requires certified AA partner) |
| **SEBI (Investment Advisers) Regulations, 2013** | Regulates entities providing personalized investment advice and portfolio recommendations. | **NOT APPLICABLE TO PLATFORM CORE; APPLICABLE IF ADVISORY ADDED.** WealthOS operates strictly as an execution-independent aggregation and tracking tool. | - No automated order routing without broker auth<br>- Prominent disclaimers: "WealthOS is a financial tracking tool, not a SEBI-registered Investment Adviser"<br>- Distinguishes factual calculations from estimates | **COMPLIANT VIA PASSIVE TRACKING BOUNDARY** |
| **DigiLocker Ecosystem (MeitY)** | Electronic document sharing under Information Technology Rules, 2016. | **APPLICABLE FOR TAX & KYC INGESTION.** | - Integration via certified DigiLocker Requester API<br>- No credential caching | **SANDBOX IMPLEMENTED; PRODUCTION REQUIRES MEITY ONBOARDING** |
| **Google Play Financial Data Policy** | Governs Android apps accessing sensitive SMS, financial records, or debt services. | **MANDATORY FOR PLAY STORE DISTRIBUTION.** | - Zero SMS scraping or device permission abuse<br>- In-app account deletion link (`/delete-account`)<br>- Prominent privacy policy on Play Console | **COMPLIANT WITH PLAY STORE POLICIES** |
| **CERT-In Cyber Directions (2022)** | Mandates reporting of cybersecurity incidents within 6 hours and maintaining ICT logs for 180 days. | **MANDATORY APPLICABILITY.** | - Structured JSON logs retained for 180+ days<br>- NTP synchronized system clocks (`UTC` / `IST`)<br>- Automated security alert triggers | **ENGINEERING CONTROLS READY** |

---

## 3. Privacy Engineering Architecture

### 3.1 Principles Enforced:
1. **Purpose Limitation:** User financial data is used solely to generate personal dashboards, double-entry reports, and user-initiated forecasting. Data is never sold, shared with advertisers, or used for automated credit profiling.
2. **Data Minimization:** Bank account masks (`••••4921`) are stored rather than full unmasked account numbers wherever possible.
3. **User Rights (Data Principal Autonomy):**
   - **Right to Access & Export:** Users can download full financial ledger, transaction history, and document metadata in structured CSV/JSON formats.
   - **Right to Erasure:** Executing `POST /api/v1/auth/delete-account` completely purges user identity, sessions, and associated personal documents, while archiving anonymized double-entry tax logs required by PMLA / Indian tax statutes.
   - **Right to Withdraw Consent:** Consent handles for AA or broker sync can be revoked in workspace settings with immediate cessation of API syncing.

---

## 4. External Integrations Production Requirements

| Integration Partner | Operational Mode | Production Licensing & Onboarding Prerequisites |
| :--- | :--- | :--- |
| **Zerodha Kite Connect** | Staging Sandbox Mock | Requires production Kite Connect Developer API App approval and SEBI-compliant user TOTP authorization. |
| **RBI Account Aggregator (Setu / Finvu / Sahamati)** | Staging Mock Adapter | Requires executing FIU agreement with licensed NBFC-AA, completing Sahamati Central Registry onboarding, and security audit. |
| **DigiLocker (MeitY)** | Mock Verification | Requires entity registration on DigiLocker API Portal, approval from MeitY, and static IP whitelisting. |
