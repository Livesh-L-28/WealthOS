# WealthOS — Wave 4 Defect Register & Resolution Log

**Programme:** Wave 4 (Financial Copilot, Personal Financial Digital Twin, Household Wealth Management)  
**Status:** All Defects Resolved — 100% Certified Clean  

---

## 1. Defect Resolution Log

| Defect ID | Phase | Severity | Component | Root Cause | Status | Resolution |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-W4-01** | Phase 10 | CRITICAL | `twin/service.py`, `copilot/tools.py` | Query referenced `transaction_type` on `financial_transactions` instead of `direction IN ('DEBIT', 'CREDIT')`. | **RESOLVED** | Updated queries to use `direction = 'DEBIT'` (outflow) and `direction = 'CREDIT'` (inflow). |
| **DEF-W4-02** | Phase 10 | CRITICAL | `twin/service.py`, `copilot/tools.py` | Query referenced `monthly_payment` on `liabilities` instead of `emi_amount`. | **RESOLVED** | Updated query to use `emi_amount`. |
| **DEF-W4-03** | Phase 10 | MAJOR | `twin/service.py`, `copilot/tools.py` | Query referenced `overall_score` on `risk_assessments` instead of `health_score`. | **RESOLVED** | Updated query to use `health_score`. |
| **DEF-W4-04** | Phase 11 | CRITICAL | `household/models.py` | Models inherited from `TenantScopedMixin` which declared a non-existent `user_id` column on `households`. | **RESOLVED** | Models inherit from `Base` with explicit `tenant_id` foreign key. |
| **DEF-W4-05** | Migration | CRITICAL | `scripts/restore_database.sh` | Expected Alembic version defaulted to `0009_wave_3_intelligence` post-restore. | **RESOLVED** | Updated default to `0010_wave_4_intelligence` and retained backwards compatibility. |
| **DEF-W4-06** | Teardown | MAJOR | `tests/conftest.py` | `tenants` was truncated before `users`, causing triggers on `users` deletion to fail FK validation against `tenants`. | **RESOLVED** | Reordered teardown array so `users` is deleted before `tenants`. |
| **DEF-W4-07** | Frontend | MINOR | `apps/web/src/app/household/page.tsx` | `CardHeader` received JSX children instead of typed `title`, `subtitle`, and `action` props. | **RESOLVED** | Updated `CardHeader` invocations to use typed props. Typecheck: 0 errors. |
