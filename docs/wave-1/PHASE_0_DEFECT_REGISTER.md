# Wave 1 — Phase 0: Defect & Risk Register

**Project:** WealthOS  
**Wave:** Wave 1  
**Date:** 2026-11-08  
**Baseline Commit:** `057fc1a3564d5f21e02eeb19b94b51b8f93a1198`

---

## 1. Defect Register

| Defect ID | Severity | Module | Description | Impact | Target Resolution | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-001** | Low | FastAPI Routing | Starlette deprecation warning (`HTTP_422_UNPROCESSABLE_ENTITY` vs `HTTP_422_UNPROCESSABLE_CONTENT`) in auth error handler. | Cosmetic warning in test logs; no functional breakage. | Refactor Starlette status constant in `app/main.py`. | **Identified** |
| **DEF-002** | Medium | Auth Rate Limiting | Consecutive logins (>5/min) trip Redis rate limiter during rapid automated E2E test runs. | False-positive 429 errors if tests don't share auth token. | Token reuse pattern via `page.addInitScript()` implemented in E2E. | **Mitigated** |
| **DEF-003** | High | Domain APIs | Schema gap: 34 tables from migration 0005 lack dedicated SQLAlchemy ORM domain services and `/api/v1/*` routers. | Frontend must query direct SQL or use mock states. | Wave 1 Phases 1, 2, and 3 build domain layers. | **In Progress** |

---

## 2. Architectural Risk Mitigation

| Risk | Likelihood | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Double Counting in Cash & Investments** | Medium | Critical | All investment purchases and account transfers must maintain transfer neutrality ($\Delta\text{NetWorth} = 0$). Handled via `PostingService`. |
| **Silent Discrepancy Auto-Correction** | Low | High | Financial Control Centre forbids silent database mutations. Discrepancy resolutions must create auditable adjustment journal entries. |
| **Cross-Tenant Data Leakage** | Low | Critical | PostgreSQL RLS enabled with `FORCE ROW LEVEL SECURITY`. Every query verifies `app.current_tenant_id` session context. |
