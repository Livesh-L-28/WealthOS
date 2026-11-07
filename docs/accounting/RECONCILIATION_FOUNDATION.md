# WealthOS — Reconciliation Foundations

## 1. Overview
Reconciliation provides deterministic primitives to match external financial artifacts (bank statements, broker contract notes, payment receipts) against posted double-entry journal entries.

---

## 2. Statuses
- **UNMATCHED:** External item imported but not linked to a journal entry.
- **MATCHED:** Fully reconciled; expected amount matches posted journal line within tolerance.
- **PARTIALLY_MATCHED:** Partial reconciliation against multiple journal entries.
- **DISCREPANCY:** Flagged discrepancy between external reference and internal ledger.
