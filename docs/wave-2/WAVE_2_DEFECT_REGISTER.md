# WealthOS — Wave 2 Master Implementation Defect Register

**Document Version:** 1.0.0  
**Status:** ALL DEFECTS RESOLVED & VERIFIED  

---

## Defect Log & Resolutions

| Defect ID | Phase | Description | Root Cause | Resolution | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-W2-01** | Gate 0 | Database restore schema version mismatch (`0005_financial_foundation` expected vs `0007_investment_accounting` actual) | Hardcoded version check in `scripts/restore_database.sh` | Configured backward-compatible version check defaulting to `0008_wave_2_intelligence`. | **CLOSED** |
| **DEF-W2-02** | Gate 0 | Database teardown table constraint ordering violation in `conftest.py` | New child tables (`loan_payment_schedules`, `budget_alerts`, etc.) deleted after parents | Reordered teardown array in `conftest.py` to delete dependent children first. | **CLOSED** |
| **DEF-W2-03** | Phase 4 | Tenant context lost on `db_session.commit()` during unit testing | Local transaction context cleared when transaction closes | Replaced intermediate commits with `await db_session.flush()` in unit service tests. | **CLOSED** |
| **DEF-W2-04** | Phase 5 | `NoReferencedTableError` on `loan_payment_schedules.transaction_id` | Foreign key string in Python model referenced unmapped table in Declarative Base | Retained column as `UUID | None` in Python model while preserving database-level FK constraint. | **CLOSED** |
| **DEF-W2-05** | Phase 5 | `MissingGreenlet` error on attribute access after `await session.refresh()` | `session.refresh` expires loaded attributes and triggers lazy loads | Removed redundant `session.refresh` calls in repository update methods. | **CLOSED** |
| **DEF-W2-06** | Phase 5 | `LiabilityCreate` rejected initial balance 0 for Credit Cards | Schema had `initial_principal: Decimal = Field(..., gt=0)` | Updated schema to `ge=0` to support zero-balance revolving cards and credit lines. | **CLOSED** |
| **DEF-W2-07** | Phase 6 | `ImportError: JournalSource` in documents service | `JournalSource` was not in `accounting_rules.py` | Used `source_type="IMPORT"` on `JournalEntry` matching model schema. | **CLOSED** |
| **DEF-W2-08** | Phase 6 | Database trigger blocked `INSERT INTO journal_lines` on POSTED entry | General ledger immutability trigger blocks modifying lines for posted entries | Created `JournalEntry` with status `'DRAFT'`, inserted lines, and then transitioned status to `'POSTED'`. | **CLOSED** |

---

**Total Defects Encountered:** 8  
**Total Defects Resolved:** 8  
**Open Defects:** 0
