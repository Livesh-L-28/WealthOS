# WealthOS — Final Known Limitations & Environmental Dependencies

**Programme:** Wave 5 — Final Platform Integration and Acceptance  
**Date:** 2026-11-08  
**Scope:** Transparent Disclosure of System Boundaries  

---

## 1. External Financial Provider Dependencies
- **Sandbox / Mock Operating Mode**: All external providers (RBI Account Aggregator, NSE/BSE Market Data Feed, CAMS/KFintech Broker Adapter) are implemented and validated in **SANDBOX VERIFIED** mode.
- **Production Prerequisites**: Deploying live real-money synchronization requires:
  1. Commercial license agreements and FIP API onboarding with RBI-licensed Account Aggregators (e.g., Setu, Finvu, Anumati).
  2. Exchange data vendor licensing from NSE and BSE for live tick feeds.
  3. CAMS / KFintech institutional API credentials for automated broker statement sync.

---

## 2. Infrastructure & Continuous Archival Boundaries
- **Point-in-Time Recovery (PITR)**: The local and containerized PostgreSQL environment relies on periodic full snapshot backups encrypted via AES-256-GCM. Continuous sub-minute PITR requires configuring continuous Write-Ahead Log (WAL) archiving to an S3 bucket using tools like `pgBackRest` or `wal-g`.
- **Worker Auto-Scaling**: Background Celery workers are containerized in Docker Compose (`worker_ocr`, `worker_market`, `worker_default`). In high-volume cloud production ($> 100,000\text{ users}$), workers should be migrated to Kubernetes with Horizontal Pod Autoscaling (HPA) driven by Redis queue depth metrics.

---

## 3. Regulatory & Legal Boundaries
- **Non-Authoritative Tax Reporting**: The India Tax Readiness engine calculates capital gains, statutory deductions, and dual-regime comparisons according to the Finance Act 2024 / 2026.1 rules. The resulting reports carry an explicit statutory disclaimer and are intended to assist preparation, not substitute for licensed Chartered Accountant (CA) filing.
- **Investment Advisory Disclaimer**: WealthOS provides factual accounting, performance metrics, and deterministic simulations. It does not provide SEBI-registered Registered Investment Advisor (RIA) recommendations or guarantee future investment returns.

