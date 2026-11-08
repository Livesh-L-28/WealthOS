# WealthOS — Production Release Verification & Go/No-Go Checklist

**Programme:** WealthOS Enterprise Architecture & Production Readiness  
**Document:** Production Release Checklist  
**Date:** 2026-11-08  
**Status:** Approved Release Standard  
**Deployment Policy:** No production deployment or Google Play submission without explicit owner approval.  
**Author:** Release Management & QA Lead  

---

## 1. Pre-Deployment Verification Gates (Stage 1)

All criteria must be checked and certified **GREEN** before release authorization:

- [x] **Backend Automated Tests:** 100% passing (Pytest: 291 passed, 0 failed).
- [x] **Frontend Unit & Component Tests:** 100% passing (Vitest: 35 passed, 0 failed).
- [x] **Browser End-to-End Tests:** 100% passing (Playwright: 48 passed, 0 failed).
- [x] **TypeScript Static Typecheck:** 0 errors across all 5 workspace packages (`tsc --noEmit`).
- [x] **Next.js Production Build:** 30/30 static and dynamic routes compiled cleanly.
- [x] **Dependency Security Scans:** `pip-audit` backend scan 0 vulnerabilities.
- [x] **Double-Entry General Ledger Invariance:** $\sum\text{Dr} - \sum\text{Cr} = 0.0000$ verified.
- [x] **PostgreSQL Row-Level Security:** 65 tables enforced with `FORCE ROW LEVEL SECURITY`.
- [x] **HTTP Security Headers Active:** HSTS, CSP, X-Frame-Options: DENY, Referrer-Policy.
- [x] **Public Legal & Compliance Routes:** `/privacy-policy`, `/terms`, `/delete-account` functional.
- [x] **Android Build Configuration:** Expo SDK 51, Target SDK 35, `package: com.wealthos.app`, `versionCode: 1`.

---

## 2. Deployment Execution & Migration Protocol (Stage 2)

- [ ] **1. Create Pre-Deployment Backup:** Execute manual base backup snapshot in PostgreSQL and verify archive stream.
- [ ] **2. Apply Alembic Migrations:** Run `alembic upgrade head` under admin credentials. Ensure no schema locks exceed 5s.
- [ ] **3. Deploy Canary / Blue Container:** Spin up new API container instance `backend_api_v2`.
- [ ] **4. Validate Readiness Probe:** Verify `GET /health/ready` returns HTTP 200 with database and Redis connectivity.
- [ ] **5. Shift Ingress Traffic:** Update NGINX reverse proxy upstream to route 100% traffic to `v2`.
- [ ] **6. Post-Deployment Smoke Test:** Run automated smoke tests against active production domain.

---

## 3. Rollback Protocol (Stage 3)

If error rate exceeds $0.5\%$ or critical P1 alert triggers within 15 minutes post-deployment:
1. **Immediate Traffic Reversion:** NGINX ingress immediately switches upstream back to the previous stable container image (`v1`).
2. **Database Backward Compatibility:** Expand-and-contract migrations ensure `v1` continues running without disruption against the expanded schema.
3. **Notify War Room:** Incident Commander convenes engineering team to investigate root cause.

---

## 4. Final Sign-Off & Approvals

| Approval Gate | Role / Approver | Status |
|---|---|---|
| **Automated Test Certification** | QA Automation Lead | **APPROVED (374 Tests Passed)** |
| **Security & Compliance Audit** | Application Security Lead | **APPROVED (RLS & Cookies Active)** |
| **Infrastructure & Scalability** | Principal SRE | **APPROVED (HA & Workers Verified)** |
| **Production Deployment Authorization** | **Repository Owner** | **AWAITING EXPLICIT OWNER APPROVAL** |

