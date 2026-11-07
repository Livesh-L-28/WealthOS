# WealthOS — Reversals & Adjustments Policy

## 1. Immutability Principle
Under financial double-entry accounting standards (GAAP / IFRS), posted entries are never modified or deleted. Doing so compromises audit trails and leads to unreconcilable ledger corruption.

---

## 2. Reversal Mechanism
To correct a posted entry:
1. The original entry is marked `status = 'REVERSED'` and `reversed_by_entry_id = reversal_entry.id`.
2. A new journal entry is created with:
   - `source_type = 'REVERSAL'`
   - `reversal_of_entry_id = original_entry.id`
   - Description: `"Reversal of [entry_number]: [reason]"`
   - Mirrored journal lines: Every debit in the original becomes an equal credit; every credit becomes an equal debit.
3. Original and reversal entries are linked bidirectionally.
4. Duplicate reversals are strictly prohibited (an entry already marked `REVERSED` cannot be reversed again).

---

## 3. Adjustment Entries
Adjustments that do not completely undo a previous transaction are created as standard independent journal entries referencing the source transaction in `reference` or `memo`, providing full explanatory notes and auditable reasons.
