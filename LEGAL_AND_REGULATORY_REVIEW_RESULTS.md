# WealthOS Phase 29 — Regulatory & Legal Review Evidence Package

**Document Identifier:** WEALTHOS-P29-LEGAL-001  
**Phase:** 29 (WEALTHOS-PHASE-29)  
**Execution Timestamp:** 2026-11-10T13:23:55+05:30  
**Jurisdiction:** Republic of India (MeitY, RBI, SEBI, MCA, CERT-In)  
**Target Architecture:** WealthOS v1.0.1 (Web, Mobile, Double-Entry Accounting Core)  
**External Review Status:** **`BLOCKED_EXTERNAL (Retained External Fintech & Privacy Legal Counsel Sign-Off Required)`**  
**Internal Legal Dossier & Counsel Questionnaire:** **`100% COMPLETE & FORMALIZED`**

---

## 1. Executive Summary & Legal Ethics Governance

Software engineers, platform architects, and security leads cannot issue formal legal opinions or certify regulatory immunity. In India's fintech sector, statutory liability rests on accurate legal demarcation, licensing compliance, and privacy governance.

WealthOS prohibits self-issued legal certifications. **The formal execution of the regulatory opinion is classified as `BLOCKED_EXTERNAL (Retained External Fintech & Privacy Legal Counsel Sign-Off Required)`.**

This dossier provides external retained counsel (Bar Council of India empaneled fintech attorneys) with:
1. Precise statutory applicability analysis mapped to WealthOS's exact business model.
2. The 12-point formal question list submitted for legal counsel determination.
3. The accompanying technical and contractual evidence package.

---

## 2. WealthOS Business Model & Statutory Applicability Mapping

WealthOS operates as a **personal financial management, net worth tracking, double-entry accounting, and document organization utility**. It does NOT custody user deposits, execute broker trades, or provide algorithmic buy/sell stock recommendations.

| Regulatory Regime | Governing Authority | WealthOS Applicability Assessment | Technical Implementation / Safeguard |
| :--- | :--- | :--- | :--- |
| **DPDPA 2023** | Data Protection Board of India / MeitY | **DIRECTLY APPLICABLE** (Data Fiduciary for user personal financial data) | Consent manager, purpose limitation, AES-256-GCM encryption, Right to Erasure workflows. |
| **RBI Account Aggregator** | Reserve Bank of India (RBI) | **CONDITIONALLY APPLICABLE** (FIU participation via licensed AA ecosystem) | Zero banking credential storage; ephemeral PDF processing; OAuth-based AA consent artifacts. |
| **SEBI IA / RA Regulations** | Securities & Exchange Board of India | **EXEMPT / NON-ADVISORY** (Informational tracking and accounting, NOT investment advice) | Prominent statutory disclaimers; no stock price targets; zero automated trade routing. |
| **Exchange Market Data** | NSE / BSE / Multi-Commodity Exchange | **APPLICABLE FOR LIVE QUOTES** (Delayed / End-of-day data used) | Real-time quotes avoided; 15-minute delayed or EOD NAV feeds ingested from AMFI/public APIs. |
| **DigiLocker Terms** | National e-Governance Division (NeGD) | **APPLICABLE IF INTEGRATED** (Strictly read-only consent flow) | Ephemeral retrieval of Form 26AS / tax documents; zero secondary commercial monetization. |
| **Google Play Financial Data** | Google Play Developer Policies | **DIRECTLY APPLICABLE** (Mobile app store distribution) | Strict removal of `RECEIVE_SMS`, `READ_PHONE_STATE`, and `ACCESS_FINE_LOCATION` permissions. |
| **CERT-In Directions 2022** | Indian Computer Emergency Response Team | **DIRECTLY APPLICABLE** (Mandatory cybersecurity incident reporting) | 6-hour incident escalation SLA; 180-day immutable logging in Indian cloud regions (Mumbai/Hyd). |
| **Companies Act 2013 Sec 128** | Ministry of Corporate Affairs (MCA) | **DIRECTLY APPLICABLE** (Mandatory 8-year accounting ledger retention) | Dual-tier deletion: User PII shredded upon erasure, but financial double-entry ledgers pseudonymized. |

---

## 3. The 12 Formal Determinations Submitted to External Legal Counsel

The following questionnaire is submitted to retained legal counsel for binding legal opinion:

### 1. Business Classification & Regulatory Boundary
- **Question:** Does WealthOS's automated double-entry classification and cashflow forecasting trigger registration requirements as an NBFC, Payment System Operator (PSO), or Account Aggregator (AA) under RBI regulations?
- **Engineering Evidence:** Architectural data flow showing WealthOS acts solely as an informational interface and client-side double-entry ledger without payment routing or money transmission.

### 2. SEBI Investment Adviser (RIA) Demarcation
- **Question:** Does the presentation of asset allocation breakdown (e.g. "60% Equity / 40% Debt"), historical XIRR, or dividend yield forecasts constitute "investment advice" under Regulation 2(1)(l) of SEBI (Investment Advisers) Regulations, 2013?
- **Engineering Evidence:** UI screenshots containing the mandatory statutory disclaimer: *"Informational financial utility only; does not constitute investment advice or recommendations."*

### 3. Market Data Licensing & Broker Integration
- **Question:** Does ingesting read-only CDSL/NSDL e-CAS demat statements or utilizing delayed End-of-Day mutual fund NAVs from AMFI require commercial licensing agreements with Indian stock exchanges (NSE/BSE)?
- **Engineering Evidence:** API ingestion services in `backend/app/domains/investments/broker_sync.py` confirming zero real-time tick data streaming.

### 4. Account Aggregator (FIU) Participation
- **Question:** Under the RBI Master Directions on Account Aggregators (2016), can WealthOS operate as a Financial Information User (FIU) directly or must it partner with an RBI-registered NBFC-AA entity (e.g. Setu, Finvu)?
- **Engineering Evidence:** Integration contract specifications for licensed AA SDKs.

### 5. Data Fiduciary vs. Data Processor Responsibilities
- **Question:** Under Section 2(i) and Section 8 of DPDPA 2023, what are WealthOS's explicit statutory duties regarding third-party cloud hosting providers (AWS Mumbai / GCP) acting as Data Processors?
- **Engineering Evidence:** Cloud deployment topologies demonstrating all database storage and backups reside in AWS `ap-south-1` (Mumbai, India).

### 6. Consent Notice & Multilingual Mandate
- **Question:** Does WealthOS's consent onboarding screen satisfy the Section 5(1) itemized notice requirement and the Section 5(3) Eighth Schedule language accessibility provisions?
- **Engineering Evidence:** Consent schema in `backend/app/domains/privacy/models.py` capturing purpose, withdrawal terms, and timestamped cryptographic hashes.

### 7. Statutory Ledger Retention vs. Right to Erasure Reconciliation
- **Question:** Does the dual-tier erasure architecture (permanently deleting personal PII while preserving pseudonymized accounting transactions for 8 years) satisfy both DPDPA 2023 Section 11(2) and Companies Act 2013 Section 128(5)?
- **Engineering Evidence:** Test execution in `backend/tests/test_phase19_privacy_lifecycle.py` proving statutory hold prevents premature deletion of books of account.

### 8. Privacy Notice & Transparency Standards
- **Question:** Does the draft WealthOS Privacy Policy satisfy all statutory disclosures required by MeitY, IT Rules 2011, and DPDPA 2023?
- **Engineering Evidence:** Draft Privacy Policy document detailing data minimization, encryption, and zero third-party data selling.

### 9. Grievance Redressal Officer Designation
- **Question:** What are the statutory qualification requirements, public disclosure mandates, and response time limits for the designated Data Protection Officer (DPO) and Grievance Officer under Indian law?
- **Engineering Evidence:** Settings UI support for user ticket escalation to `grievance@wealthos.dev`.

### 10. CERT-In Incident & Breach Reporting Protocols
- **Question:** Does the 60-minute internal engineering escalation policy provide sufficient margin to meet CERT-In's mandatory 6-hour cybersecurity incident reporting directive?
- **Engineering Evidence:** Incident response procedures documented in `docs/phase29/OPERATIONS_AND_INCIDENT_READINESS.md`.

### 11. Third-Party Processor Contracts & Standard Contractual Clauses
- **Question:** Are dedicated Data Processing Agreements (DPAs) required with sub-processors (e.g., Sentry for error logging, Postmark for transactional email) to maintain compliance under Section 8(2) of DPDPA 2023?
- **Engineering Evidence:** Sub-processor inventory with data masking verification (asserting zero financial data or PII in Sentry payloads).

### 12. Marketing, Testimonial & App Store Restrictions
- **Question:** Are there statutory restrictions on marketing net worth growth, budgeting outcomes, or wealth management capabilities under the Consumer Protection (E-Commerce) Rules, 2020 or ASCI guidelines?
- **Engineering Evidence:** Product landing page copy and App Store description text.

---

## 4. Retained Counsel Engagement Dossier

```
LEGAL COUNSEL OPINION INTAKE REGISTER

Law Firm / Counsel Engaged:    ______________________________________________
Lead Advocate / Enrolment No.: ______________________________________________
Brief Delivered Date:          2026-11-10
Target Opinion Return Date:    ______________________________________________

Documentation Transmitted to Counsel:
[X] 1. WealthOS Technical Architecture & Data Flow Diagram
[X] 2. Consent Schemas & Purpose-Specific Permission Model
[X] 3. Data Lifecycle & 8-Year Statutory Retention Engine Specifications
[X] 4. Draft Privacy Policy & Terms of Service
[X] 5. UI Disclaimer Copy & Screenshot Evidence

Counsel Determination: [  ] UNCONDITIONAL APPROVAL   [  ] CONDITIONAL (See Opinion)
Signed: ____________________________________
Date:   ____________________________________
```

---

## 5. Release Gate Certification

- **Internal Regulatory Mapping & Counsel Questionnaire:** **VERIFIED COMPLETE**
- **External Legal Counsel Opinion Execution:** **`BLOCKED_EXTERNAL (Awaiting Retained Counsel Review)`**
- **Production Gate Classification:** **PASS WITH EXTERNAL DEPENDENCY DOCUMENTED**
