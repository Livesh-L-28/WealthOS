# WealthOS Phase 23 — External Integration & Open Banking Readiness Report

**Document Reference:** `docs/phase23/WEALTHOS_PHASE23_INTEGRATION_READINESS.md`  
**Phase ID:** `WEALTHOS-PHASE-23`  
**Audit Scope:** Account Aggregators (RBI AA), Brokerages (Zerodha Kite), Market Data (AMFI / NSE / BSE), DigiLocker, and SMS / Document Parsing Pipelines  
**Integration Status:** `SANDBOX_PRODUCTION_READY`  
**Execution Timestamp:** 2026-11-10T04:16:00+00:00  

---

## 1. Executive Summary

WealthOS interfaces with external financial ecosystem participants to ingest bank accounts, demat portfolios, mutual fund folios, and financial documents. To adhere to strict financial security and legal compliance, WealthOS follows an **adapter architecture with strict sandbox isolation**:
- All external API interactions are encapsulated in decoupled domain adapters with deterministic contract interfaces.
- In staging and local development, high-fidelity sandbox mocks simulate real-world asynchronous consent handshakes, webhook notifications, and paginated payload ingestion.
- Zero fake credentials or unauthorized API calls are permitted in test environments.
- Every adapter implements cryptographic signature verification (HMAC-SHA256), idempotency handling, rate quota tracking, and circuit-breaker fault tolerance.

---

## 2. Integration Adapters Inventory & Sandbox Fidelity

### 2.1 RBI Account Aggregator Ecosystem (ReBIT 1.1.2 Specification)

- **Adapter Implementation:** `backend/app/domains/integrations/adapters/account_aggregator_adapter.py`
- **Supported Aggregators:** Setu AA, OneMoney, Anumati (FinSec AA)
- **Specification Version:** ReBIT Technical Specifications v1.1.2
- **Consent Handshake Flow:**
  1. `POST /api/v1/integrations/aa/consent` initiates consent request with purpose code `101` (Wealth Management), date ranges, and requested data types (`TRANSACTIONS`, `PROFILE`, `SUMMARY`).
  2. User is redirected to AA Webview / SDK with a secure `ConsentHandle`.
  3. Webhook listener `POST /api/v1/integrations/aa/webhook` receives signed JWS notification (`CONSENT_READY`).
  4. Data fetch pipeline retrieves encrypted financial information (FI), decrypts using ECDH + AES-GCM, and persists transactions into `financial_transactions` under tenant RLS.
- **Sandbox Test Coverage:**
  - Mock FIPs (Financial Information Providers) implemented for HDFC Bank, State Bank of India (SBI), ICICI Bank, and Axis Bank.
  - Verified in `backend/tests/test_open_banking_sync.py` and `test_gate12_e2e_acceptance.py::test_wf11_open_banking_provider_sync`.
- **Live Onboarding Requirements:**
  1. Registration as Financial Information User (FIU) with Reserve Bank of India (RBI) / Sahamati.
  2. Signing Participant Agreement with licensed NBFC-AA (e.g. Setu / OneMoney).
  3. Installation of RBI-certified HSM for JWS digital signature signing and decrypting ephemeral AA session keys.

### 2.2 Brokerage Automated Ingestion (Zerodha Kite Connect v3)

- **Adapter Implementation:** `backend/app/domains/integrations/adapters/zerodha_adapter.py`
- **Specification Version:** Kite Connect API v3
- **Authentication & Ingestion Flow:**
  1. OAuth2 login flow with `api_key` and SHA-256 checksum: `checksum = SHA256(api_key + request_token + api_secret)`.
  2. Session exchange yields `access_token` and `public_token`.
  3. Ingestion endpoint `POST /api/v1/integrations/zerodha/sync` queries `/portfolio/holdings` and `/portfolio/positions`.
  4. Raw holdings are mapped into `investment_holding_lots` with authentic NSE/BSE symbols, ISINs, quantities, and cost basis.
- **Sandbox Test Coverage:**
  - Deterministic Kite sandbox mock returns mock equity and ETF holdings (e.g. TCS, INFY, HDFCBANK, NIFTYBEES) with authentic price timestamps.
  - Rate limiting handling: enforces 3 requests/second ceiling with exponential backoff.
- **Live Onboarding Requirements:**
  1. Commercial Kite Connect developer app subscription (`api_key` and `api_secret`).
  2. User explicit daily consent via TOTP / Kite Login as mandated by SEBI guidelines.

### 2.3 Mutual Fund & Market Data Ingestion (AMFI & Exchange Feeds)

- **Adapter Implementation:** `backend/app/domains/investments/adapters/amfi_adapter.py`
- **Data Sources:**
  - Association of Mutual Funds in India (AMFI) daily official NAV text portal (`https://www.amfiindia.com/spages/NAVAll.txt`).
  - Consolidated Account Statement (CAS) PDF/CAMS/KFintech eCAS ingestion parser.
- **Processing Architecture:**
  - Automated cron task downloads official NAV file at 21:30 IST daily.
  - Updates `current_price` and `price_updated_at` in global `financial_instruments` table without locking tenant transactions.
- **Sandbox Test Coverage:**
  - Verified with AMFI NAV fixtures for Parag Parikh Flexi Cap Fund (ISIN: `INF879O01019`), Mirae Asset Large Cap, and SBI Bluechip.

### 2.4 DigiLocker National Gateway (MeitY)

- **Adapter Implementation:** `backend/app/domains/integrations/adapters/digilocker_adapter.py`
- **Integration Scope:** Automated retrieval of Form 26AS, Aadhaar, PAN Verification Record, and Vehicle RC for asset verification.
- **Authentication & Consent Flow:**
  - OAuth 2.0 PKCE flow authorized by user via DigiLocker Government Gateway.
  - Pull URI requests specific issued document URI; response returns base64 signed XML or PDF.
- **Sandbox Test Coverage:**
  - Mock DigiLocker server returns verified Aadhaar and PAN documents with valid SHA-256 hashes.
- **Live Onboarding Requirements:**
  - Application for DigiLocker Requester Organization registration with MeitY / Digital India Corporation.
  - Security audit and VAPT certification of WealthOS endpoints by CERT-In empaneled auditor.

### 2.5 Automated Bank SMS Parser Pipeline

- **Adapter Implementation:** `backend/app/domains/integrations/adapters/sms_parser_adapter.py`
- **Parsing Scope:** Ingestion of SMS notification texts sent by Indian scheduled commercial banks (HDFC, SBI, ICICI, Axis, Kotak, Citi, Standard Chartered).
- **Security & Privacy Defense:**
  - Zero PII transmission: regex extraction occurs strictly on-device (in React Native mobile app) or isolated in client session.
  - OTP and sensitive authentication messages are matched by negative regex filter (`otp|code|password|verification|pin`) and discarded immediately.
- **Live Onboarding Requirements:**
  - Android APK submission requires Google Play Store "Default SMS Handler" or "Financial App SMS Permission Declaration" approval.

---

## 3. Resilience, Security & Fault Tolerance Controls

| Control Area | Architectural Implementation | Verification Method |
|:---|:---|:---|
| **Idempotency** | Every external ingest requires `X-Idempotency-Key: UUIDv4`. Incoming keys are logged in `api_idempotency_records`. | `test_accounting_idempotency.py` |
| **HMAC Signatures** | Webhook payloads from Account Aggregators and payment gateways require SHA-256 HMAC signature verification. | `test_cryptoHmac.test.ts` |
| **Circuit Breaker** | External HTTP calls use resilience decorators (fail-fast after 3 consecutive 5xx errors; 30s half-open cooling period). | `test_open_banking_sync.py` |
| **Rate Limit Quotas** | Multi-tiered rate limiters protect tenant resources (`tenant_resource_quotas`) from upstream throttling. | `test_enterprise_trust.py` |
| **Data Lineage** | Ingested records record provenance source (`wos-investments-live-fifo`, `aa-setu-sandbox`, `zerodha-kite-v3`). | `test_audit.py` |

---

## 4. Production Release Conclusion

The external integration subsystem is **SANDBOX_PRODUCTION_READY**. All adapter protocols, data pipelines, and error handlers are tested and verified. Flipping to live production requires only injecting live institutional credentials and executing external partner sandbox certifications.

