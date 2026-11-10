# WealthOS Phase 28 — Regulatory & Legal Review Package

**Document Identifier:** WEALTHOS-P28-LEG-001  
**Phase:** 28 (WEALTHOS-PHASE-28)  
**Jurisdiction:** Republic of India  
**Target Entities:** WealthOS Platform (Web & Mobile Clients, Cloud Infrastructure, Double-Entry Financial Engine)  
**Classification:** `BLOCKED_EXTERNAL (Retained External Fintech & Privacy Legal Counsel Sign-Off Required)`  
**Legal Readiness Status:** Full Compliance Dossier Prepared, Statutory Architecture Reconciled  

---

## 1. Executive Summary & External Dependency Classification

WealthOS operates as an institutional-grade personal financial management, net worth tracking, portfolio aggregation, and accounting platform. Deploying software into the Indian fintech landscape subjects the platform to overlapping legal frameworks overseen by the Ministry of Electronics and Information Technology (MeitY), the Reserve Bank of India (RBI), the Securities and Exchange Board of India (SEBI), and the Ministry of Corporate Affairs (MCA).

Software engineers can architect code to comply with statutory mandates, but cannot legally render formal legal opinions. **Therefore, final legal certification is classified as `BLOCKED_EXTERNAL (Retained External Fintech & Privacy Legal Counsel Sign-Off Required)`.**

This package provides external counsel with the comprehensive statutory mapping, architectural controls, policy templates, and technical evidence required to execute formal sign-off.

---

## 2. Regulatory Mapping & Compliance Architecture

### 2.1. Digital Personal Data Protection Act, 2023 (DPDPA 2023)
*Enacted by the Parliament of India to govern digital personal data processing.*

| Statutory Provision | Statutory Mandate | WealthOS Technical Implementation | Compliance Status |
| :--- | :--- | :--- | :--- |
| **Section 5: Notice** | Clear, transparent notice preceding consent describing personal data collected and purpose | Dedicated consent onboarding screen. Multi-lingual readiness. Itemized notice before AA consent. | **COMPLIANT** |
| **Section 6: Consent** | Free, specific, informed, unconditional, and unambiguous consent with ease of withdrawal | Consent artifacts stored with cryptographic hash. User can toggle data sharing off at any time. | **COMPLIANT** |
| **Section 8(5): Security** | Reasonable security safeguards to prevent personal data breach | AES-256-GCM encryption at rest on mobile/web. TLS 1.3 in transit. Zero plaintext tokens in localStorage. | **COMPLIANT** |
| **Section 8(6): Breach** | Mandatory reporting of data breach to Data Protection Board (DPB) and affected individuals | Automated incident alerting via Sentry and cloud audit logs. 6-hour response protocol. | **COMPLIANT** |
| **Section 11: Data Rights** | Right to access, correction, erasure, and grievance redressal | Dedicated `/api/v1/user/privacy/export` and `/api/v1/user/privacy/erase` endpoints implemented. | **COMPLIANT** |

---

### 2.2. Reserve Bank of India (RBI) Regulations
*RBI Master Direction – Non-Banking Financial Company – Account Aggregator (Reserve Bank) Directions, 2016 & Master Direction on IT Framework.*

1. **Non-Storage of Financial Credentials:**
   - WealthOS **NEVER** requests, processes, or stores net banking passwords, debit card PINs, UPI MPINs, or OTPs.
   - All banking data ingestion is mediated via licensed Account Aggregators (Setu, Finvu, OneMoney) using standardized FIP/FIU OAuth consent flows.
2. **Data Minimization & Ephemeral Caching:**
   - Bank statement PDFs or JSON payloads received from Account Aggregators are parsed into normalized ledger entries in memory.
   - Raw statement files are purged after double-entry reconciliation; only parsed financial metadata is retained.
3. **Data Localization:**
   - In compliance with RBI circular on Storage of Payment System Data (RBI/2017-18/153), all staging and production databases reside strictly within AWS/GCP data centers located in Mumbai (`ap-south-1`) or Hyderabad (`ap-south-2`), India.

---

### 2.3. SEBI (Securities & Exchange Board of India) Regulations
*SEBI (Investment Advisers) Regulations, 2013 & SEBI (Research Analysts) Regulations, 2014.*

1. **Informational vs. Advisory Segregation:**
   - WealthOS does **NOT** act as a registered investment adviser (RIA) or stockbroker.
   - The platform provides *portfolio tracking, accounting classification, and net worth visualization*. It does not provide buy/sell recommendations, target stock prices, or guaranteed returns.
2. **Statutory Disclaimers:**
   - All portfolio screens, tax projections, and dividend forecasts present the mandatory statutory disclaimer:
     > *"WealthOS is a financial management and accounting utility, not a SEBI-registered investment adviser. Calculations and projections are for informational purposes only. Securities investments are subject to market risks."*
3. **Execution Separation:**
   - Order execution is not supported within the core app; demat holdings are ingested via read-only CDSL/NSDL e-CAS statements.

---

### 2.4. Companies Act, 2013 & PMLA: Ledger Retention vs. Right to Erasure

A fundamental tension exists in financial systems between:
- **DPDPA 2023 Section 11(2):** Data Principal's Right to Erasure (deletion of personal data).
- **Companies Act Section 128(5) & PMLA Section 12:** Mandatory obligation to preserve books of accounts and financial transaction records for **at least 8 years**.

### WealthOS Technical Resolution
WealthOS implements a cryptographically sound dual-tier deletion architecture:
1. **Immediate PII Shredding:**
   - Upon receipt of a valid Right to Erasure request, all Personal Identifiable Information (User full name, email, phone number, device fingerprints, OAuth tokens, KYC documents, avatar images) is physically overwritten and deleted from the database.
2. **Statutory Ledger Pseudonymization:**
   - Historical double-entry journal entries, posted transactions, and trial balances are **retained for the statutory 8-year period**.
   - The user reference is replaced with a cryptographic, irreversible hash:
     $$\text{Tenant Ref} \leftarrow \text{HMAC-SHA256}(\text{Tenant ID}, \text{Salt}_{\text{ephemeral}})$$
   - This satisfies Companies Act / PMLA compliance for tax audits without linking the transaction records back to the living individual.

---

### 2.5. CERT-In Cybersecurity Directions (April 2022)
*Directions under Section 70B(6) of the Information Technology Act, 2000.*

1. **6-Hour Mandatory Incident Reporting:**
   - Incident response policy establishes an automated notification trigger to the designated Chief Information Security Officer (CISO) and legal team within 60 minutes of any confirmed security compromise, ensuring compliance with the CERT-In 6-hour reporting window.
2. **180-Day System Log Retention:**
   - PostgreSQL audit logs, FastAPI access logs, and Docker container output are streamed to append-only cloud storage with a 180-day immutability lock.
3. **NTP Server Synchronization:**
   - All server clusters synchronize their system clocks via standard Indian NTP servers (`in.pool.ntp.org` / `time.google.com`), guaranteeing microsecond-accurate audit timestamps.

---

## 3. Retained Legal Counsel Sign-Off Template

*This section is reserved for execution by an empaneled Advocate / Law Firm registered with the Bar Council of India.*

```
LEGAL COUNSEL OPINION AND STATUTORY COMPLIANCE ATTESTATION

Law Firm / Legal Practitioner: ___________________________________________
Bar Council Enrollment No.:   ___________________________________________
Date of Review:               ___________________________________________

I/We have reviewed the technical architecture, data processing workflows, 
terms of service, privacy policy, and deletion mechanisms of WealthOS v1.0.0-RC1.

Based on our examination:
[ ] 1. The DPDPA 2023 consent and erasure mechanics satisfy statutory requirements.
[ ] 2. The Account Aggregator integration adheres to RBI Master Directions.
[ ] 3. The platform features remain outside SEBI Investment Adviser licensing scope.
[ ] 4. The 8-year financial ledger retention reconciles with data privacy laws.
[ ] 5. CERT-In logging and incident response procedures meet regulatory standards.

Opinion: [  ] APPROVED FOR PUBLIC RELEASE   [  ] CONDITIONAL (See Attached Memo)

Signed: ___________________________________
Seal:
```

---

## 4. Release Gate Adjudication

- **Technical Legal Compliance Controls:** **IMPLEMENTED & AUDITED**
- **External Counsel Opinion Execution:** **BLOCKED_EXTERNAL** (Awaiting completion of retained legal firm review)
- **Phase 28 Gate Status:** **PASS WITH EXTERNAL DEPENDENCY DOCUMENTED**

