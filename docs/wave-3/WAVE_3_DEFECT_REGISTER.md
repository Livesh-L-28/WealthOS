# WealthOS — Wave 3: Closed Defect Register

**Document Version:** 1.0.0  
**Programme:** Wave 3 Master Implementation  
**Status:** ALL DEFECTS RESOLVED & VERIFIED  
**Date:** 08-Nov-2026  

---

## 1. Closed Defects Log

| Defect ID | Phase | Summary / Symptom | Root Cause | Resolution & Verification | Status |
|---|---|---|---|---|---|
| **W3-DEF-001** | Phase 7 | `InvalidRequestError: Table 'forecast_runs' is already defined for this MetaData instance` | `ForecastRun` and `FinancialScenario` models were previously defined in `app.domains.cash.models`. Redefining them in `app.domains.planning.models` violated SQLAlchemy declarative metadata unique table names. | Imported `ForecastRun` and `FinancialScenario` directly from `app.domains.cash.models` instead of redefining table schemas. Verified clean import and session handling. | **CLOSED** |
| **W3-DEF-002** | Phase 7 | `fixture 'test_tenant' not found` in tests | Test function signature used non-existent fixture `test_tenant` instead of the project standard `test_user_factory`. | Updated test suite to use `user, tenant, token = await test_user_factory(...)` and bound context via `set_db_tenant_context`. Verified 8/8 tests pass. | **CLOSED** |
| **W3-DEF-003** | Phase 8 | `AttributeError: type object 'InvestmentHoldingLot' has no attribute 'status'` | `InvestmentHoldingLot` uses column name `lot_status` (not `status`) and `purchase_date` (not `acquisition_date`). | Updated `TaxService.aggregate_income_breakdown` to query `lot_status == "CLOSED"` and calculate holding days from `purchase_date`. Verified capital gains tests pass. | **CLOSED** |
| **W3-DEF-004** | Phase 8 | `TypeError: 'code' is an invalid keyword argument for Account` | Chart of Accounts model `Account` uses `account_code` and `account_name` (not `code` and `name`). | Updated test fixture and tax service to instantiate `Account` using `account_code` and `account_name`. Verified test passes. | **CLOSED** |
| **W3-DEF-005** | Phase 8 | `Cannot insert or modify journal lines for a posted or reversed entry` | Trigger on `journal_lines` prevents inserting lines into an entry whose status is already `'POSTED'`. | Created `JournalEntry` in `'DRAFT'` status, added lines, executed `await db_session.flush()`, then updated status to `'POSTED'` and flushed. Verified test passes. | **CLOSED** |
| **W3-DEF-006** | Phase 8 | `CheckViolationError: new row for relation "journal_lines" violates check constraint "chk_single_sided_functional"` | Single-sided constraint requires `functional_debit_amount` or `functional_credit_amount` to match the debit/credit amount. Defaulting them to 0 violated the constraint. | Explicitly populated `functional_debit_amount` on debit lines and `functional_credit_amount` on credit lines. Verified test passes. | **CLOSED** |
| **W3-DEF-007** | Phase 9 | `ForeignKeyViolationError: insert or update on table "financial_accounts" violates foreign key constraint "financial_accounts_institution_id_fkey"` | Unit test passed a random non-existent UUID as `institution_id` in `FinancialAccount`. | Changed `institution_id=None` (nullable foreign key column) in unit test. Verified all 6 risk tests pass. | **CLOSED** |

---

## 2. Summary
- Total Defects Identified: 7
- Total Defects Resolved: 7
- Open Defects: 0
- Defect Clearance Rate: 100%
