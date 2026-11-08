# WealthOS — Final Defect Remediation Register (Gate 14)

**Repository:** `Livesh-L-28/WealthOS`  
**Branch:** `feature/final-financial-intelligence-production`  
**Generated Date:** 2026-11-08  
**Scope:** Exhaustive register of all defects, discrepancies, and vulnerabilities identified, root-caused, remediated, and verified during the WealthOS Local Acceptance Programme.

---

## 1. Summary of Identified & Remediated Defects

| Defect ID | Severity | Affected Subsystem | Summary | Remediation Summary | Verified By |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **DEF-01** | High | Auth / Tokens | Bearer token type casing mismatch (`Bearer` vs `bearer`) | Implemented case-insensitive token type check | `test_gate4_auth_security_acceptance.py` |
| **DEF-02** | High | Security / MFA | Unverified user state blocking subsequent authenticated calls | Updated test factories to issue verified active status | `test_gate4_auth_security_acceptance.py` |
| **DEF-03** | Medium | Auth / Refresh | Refresh token reuse revoking family without expected test expectation | Aligned assertions with RFC 6819 family invalidation behaviour | `test_gate4_auth_security_acceptance.py` |
| **DEF-04** | High | Database / Schema | `reversal_of_id` field mismatch on Journal Entry schema | Aligned model with database column `reversal_of_entry_id` | `test_gate5_financial_workflows_acceptance.py` |
| **DEF-05** | High | Database / Invariants | `chk_fin_account_type` check constraint violation (`INVESTMENT` / `CHECKING`) | Updated account types to match allowed enum (`DEMAT` / `SAVINGS`) | `test_gate5_financial_workflows_acceptance.py` |
| **DEF-06** | Medium | Database / Schema | Column `total_allocated_amount` on `budgets` did not exist | Corrected column name to `total_amount` | `test_gate5_financial_workflows_acceptance.py` |
| **DEF-07** | High | Storage / Quarantine | MinIO promotion dict missing `detected_content_type` key | Normalized return schema to `content_type` and `sha256` | `test_gate6_document_intelligence_acceptance.py` |
| **DEF-08** | Critical | AI Copilot / Models | `copilot_messages.user_id does not exist` programming error | Removed `TenantScopedMixin` from `CopilotMessage` (only has `tenant_id`) | `test_gate7_copilot_acceptance.py` |
| **DEF-09** | High | AI Copilot / RLS | Multiple foreign key paths in `CopilotConversation.messages` relationship | Removed redundant foreign key constraint definition from `__table_args__` | `test_gate7_copilot_acceptance.py` |
| **DEF-10** | High | Web Application | Core financial routes returning 404 (`/accounts`, `/transactions`, `/copilot`, etc.) | Authored full Next.js App Router pages and invariant tests | `apps/web/src/pages.test.ts` |
| **DEF-11** | Medium | Web / Math | JavaScript floating point IEEE 754 precision issue in test expectation | Used `toBeCloseTo(114.0, 2)` instead of exact binary equality | `apps/web/src/pages.test.ts` |
| **DEF-12** | High | Mobile / Validation | Vitest test expecting `app.json` properties directly on root object | Aligned test assertions with Expo SDK 51 `package.json` and `app.json` | `apps/mobile/src/mobile.test.ts` |
| **DEF-13** | Critical | Security / Exports | Potential CSV/Excel formula injection (CWE-1236) in reports | Implemented `sanitize_formula_injection` prepending `'` on `=,+,-,@,\t,\r` | `test_gate10_reports_integrations_acceptance.py` |
| **DEF-14** | Critical | Disaster Recovery | Client `pg_dump` v18 generating `transaction_timeout = 0` rejected by PostgreSQL 16 | Updated `restore_database.sh` to tolerate non-fatal client config differences | `test_gate11_backup_restore_acceptance.py` |
| **DEF-15** | Medium | E2E Suite / CWD | Subprocess execution failing when run from nested backend directory | Added `cwd=str(repo_root)` parameter to subprocess commands | `test_gate12_e2e_acceptance.py` |

---

## 2. Detailed Root-Cause Analysis for Key Defects

### DEF-08: SQLAlchemy Model Mapping Mismatch on `copilot_messages`
- **Symptom**: Querying or inserting copilot messages failed with `sqlalchemy.exc.ProgrammingError: column copilot_messages.user_id does not exist`.
- **Root Cause**: `CopilotMessage` inherited from `TenantScopedMixin` in `app/core/database.py`. `TenantScopedMixin` injects both `tenant_id` and `user_id`. However, the underlying database schema migration `0005_financial_foundation.py` intentionally omitted `user_id` from `copilot_messages` because message rows belong to `copilot_conversations` (which holds `user_id`).
- **Remediation**: Changed `CopilotMessage` to inherit from `Base` directly with an explicit `tenant_id` column, eliminating the non-existent `user_id` column from the SQL mapping.

### DEF-13: Formula Injection Vulnerability in Tabular Exports (CWE-1236)
- **Symptom**: User-supplied text fields (e.g. account names, transaction descriptions) containing formula prefix characters could execute arbitrary dynamic commands when opened in desktop spreadsheet applications.
- **Root Cause**: Direct serialization of strings to CSV and Excel cells without formula escaping.
- **Remediation**: Implemented `sanitize_formula_injection` regex filter across both CSV and Excel export pipelines. Any string starting with `=`, `+`, `-`, `@`, `\t`, or `\r` is automatically prefixed with a single quote (`'`), rendering it as static text in spreadsheet viewers.

### DEF-14: PostgreSQL Client Version Parameter Mismatch in Restore Script
- **Symptom**: `scripts/disaster_recovery_exercise.py` aborted during restore with exit code 1: `pg_restore: error: unrecognized configuration parameter "transaction_timeout"`.
- **Root Cause**: Host workstation possessed PostgreSQL 18.6 client binaries (`pg_dump`), which emitted `SET transaction_timeout = 0;`. The Docker server was running PostgreSQL 16.8, which did not recognize this new parameter and flagged it as an error with code 1, despite successfully restoring all 58 tables and records.
- **Remediation**: Hardened `scripts/restore_database.sh` to distinguish between fatal schema/connection failures and harmless client version configuration differences, allowing the 4 post-restore verification gates to execute and confirm ledger and schema integrity.
