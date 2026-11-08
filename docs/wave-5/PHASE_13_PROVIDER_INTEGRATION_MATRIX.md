# WealthOS — Phase 13 External Financial Provider Integration Matrix

**Programme:** Wave 5 — Final Platform Integration and Acceptance  
**Phase:** Phase 13 — Enterprise Integration & Final Acceptance  
**Date:** 2026-11-08  

---

## 1. Provider Integration Architecture Overview

WealthOS implements a normalized, decoupled provider abstraction layer (`backend/app/domains/integrations/`) allowing seamless integration with external financial networks while strictly isolating core General Ledger invariants.

Every provider adheres to four non-negotiable architectural mandates:
1. **Mandatory DPDP Consent**: Prior to fetching any financial record, explicit, granular user consent must be recorded under India DPDP Act 2023 notice versions.
2. **AES-256-GCM Envelope Encryption**: Third-party OAuth tokens, client secrets, and API keys are envelope-encrypted using master keys derived via PBKDF2/HMAC-SHA256 with 96-bit unique IVs and 128-bit authentication tags.
3. **HMAC-SHA256 Webhook Security & Replay Prevention**: All inbound webhook events require cryptographic signature verification and timestamp checking ($\le 300\text{ seconds}$) to prevent replay attacks.
4. **Idempotent Cursor-Based Synchronization**: Sync feeds use incremental pagination cursors to guarantee idempotency and prevent duplicate transaction creation.

---

## 2. Supported Financial Provider Matrix

| Provider Key | Provider Name | Category | Primary Protocol | Integration Status | Supported Financial Products | Authentication & Security |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `rbi_account_aggregator` | RBI Account Aggregator (Sahamati Ecosystem: Setu, Finvu, Anumati) | `ACCOUNT_AGGREGATOR` | REST / Sahamati AA FIP Specs | **SANDBOX VERIFIED** | Bank Accounts, Savings, Current, Term Deposits, Mutual Fund Holdings | OAuth2 + PKCE; DPDP Act consent artifact; XML/JSON FIP encryption |
| `nse_bse_market_feed` | NSE / BSE & AMFI Market Data Feed | `MARKET_DATA` | REST / WebSocket Quotes | **SANDBOX VERIFIED** | Equity Stock Prices, Benchmark Indices (NIFTY 50, SENSEX), Mutual Fund NAVs | API Key; In-memory Redis caching with 15-minute TTL; Stale-fallback |
| `cas_broker_adapter` | CAMS / KFintech / Zerodha Broker CAS Feed | `BROKER` | REST / Batch CAS Ingestion | **SANDBOX VERIFIED** | Demat Holdings, Stock Trades, Mutual Fund Folios, Corporate Actions | OAuth2 / CAS Parser quarantine; SHA-256 deduplication hash |
| `razorpay_webhook` | Payment Gateway & Inbound Reconciliations | `PAYMENT_GATEWAY` | Webhook HTTP POST | **SANDBOX VERIFIED** | Mandate debits, subscription payments, payment links | HMAC-SHA256 signature (`X-WealthOS-Signature`), timestamp replay window |

---

## 3. Integration Readiness Status Taxonomy

- **LIVE VERIFIED**: Connected to production API endpoints with active enterprise production credentials.
- **SANDBOX VERIFIED**: Fully implemented adapter with validated protocol schemas, automated mock/sandbox test suites passing, error handling, and token lifecycle management.
- **MOCK ONLY**: Stubbed responses without cryptographic token or network verification.
- **NOT CONFIGURED**: Architecture modeled in database schemas but adapter not initialized.

> [!NOTE]
> In accordance with production readiness governance, all external providers in this repository are classified as **SANDBOX VERIFIED**. No unverified production credentials have been hardcoded or deployed.

