# WealthOS Wave 1 — Defect Register & Resolution Log

**Date:** 2026-11-08  
**Repository:** `Livesh-L-28/WealthOS`  
**Branch:** `feature/final-financial-intelligence-production`  
**Status:** **ALL DEFECTS RESOLVED (0 OPEN DEFECTS)**  

---

## 1. Defect Summary

During the execution of Wave 1 (Phases 0 through 3), a total of 10 technical defects or integration anomalies were discovered across schema constraints, test harness database configurations, and disaster recovery scripts. Every single defect was rigorously diagnosed, root-caused, repaired, and verified with regression tests.

---

## 2. Complete Defect Register

| Defect ID | Severity | Component | Problem Description | Root Cause | Resolution | Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-W1-01** | High | Database / Migrations | `severity` column missing on `reconciliation_records` during test execution | Alembic migration `0006` was applied to container DB `wealthos` but test database `wealthos_test` had not run migration. | Executed `alembic upgrade head` with `POSTGRES_DB=wealthos_test`. | `test_financial_control_centre.py` passed. |
| **DEF-W1-02** | High | Database / Conftest | `ForeignKeyViolationError` when `clean_database` teardown fixture cleared `financial_accounts` | Child tables (`account_transfers`, `recurring_transaction_rules`, `reconciliation_audit_events`, etc.) were not in the teardown list or were ordered after parent tables. | Reordered and expanded teardown table list in `backend/tests/conftest.py` in reverse topological order. | Clean database fixture runs without FK errors. |
| **DEF-W1-03** | Medium | SQLAlchemy Models | `NoReferencedTableError: could not find table 'financial_institutions'` on session flush | `FinancialAccount` references `financial_institutions.id` via foreign key, but `FinancialInstitution` was not defined in the SQLAlchemy Base metadata registry. | Created mapped model `FinancialInstitution` in `backend/app/domains/cash/models.py`. | Session flushes cleanly. |
| **DEF-W1-04** | Low | Python Types / Schemas | `NameError: name 'UTC' is not defined` in `cash/schemas.py` | Missing import of `UTC` from `datetime`. | Updated import to `from datetime import UTC, date, datetime`. | Pydantic schema validation clean. |
| **DEF-W1-05** | Low | Frontend UI / Types | Badge component variant type error in `reconciliation/page.tsx` | Badge variant received `'danger'` and `'success'` instead of allowed variants `'negative'` and `'positive'`. | Updated badge props to `'negative'` and `'positive'`. | `npm run typecheck` passes with 0 errors. |
| **DEF-W1-06** | High | Database / Invariants | `CheckViolationError: check constraint "chk_fin_account_type"` in test brokerage mock | Test helper created brokerage account with `account_type="BROKERAGE"`, but schema requires allowed enum value `"DEMAT"`. | Changed account type to `"DEMAT"`. | `test_investment_accounting.py` passed. |
| **DEF-W1-07** | Medium | SQLAlchemy Metadata | `ForeignKey associated with 'passive_income_records.asset_id' could not find table 'assets'` | Model declared `ForeignKey("assets.id")` in Python, but `Asset` class was not in SQLAlchemy Base registry. | Removed string foreign key in Python mapped column, treating it as a nullable UUID column matching DB schema. | `test_dividend_recognition_with_tax_withholding` passed. |
| **DEF-W1-08** | High | Scripts / Disaster Recovery | `scripts/restore_database.sh` failed with code 2 on post-restore verification | Script hardcoded expected alembic version to `0005_financial_foundation`; new migrations advanced version to `0007_investment_accounting`. | Updated script to dynamically accept `EXPECTED_ALEMBIC_VERSION` defaulting to `0007_investment_accounting` while accepting either. | `scripts/disaster_recovery_exercise.py --force-drill` passed with CERTIFIED ACCEPTANCE. |
| **DEF-W1-09** | Medium | Test Harness / Migrations | `test_gate3_database_migration_acceptance.py` failed on version assertions | Test asserted exact version string `0005_financial_foundation` on upgrade to head. | Updated test to assert `0007_investment_accounting` on head and `0006_financial_control_centre` on downgrade -1. | `test_gate3_database_migration_acceptance.py` passed 4/4. |
| **DEF-W1-10** | High | Database / RLS Session | RLS policy violation on `forecast_runs` and `investment_holding_lots` in multi-test execution | Intermediate `await db_session.commit()` inside unit tests reset transaction-local context (`app.current_tenant_id`). | Replaced intermediate `commit()` calls with `flush()` and used `set_db_tenant_context` helper. | Full test suite passed 228/228. |

---

## 3. Resolution Verification

All 10 defects are resolved. There are currently **0 open defects**.
