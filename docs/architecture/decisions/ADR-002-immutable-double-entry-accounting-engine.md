# ADR-002: IMMUTABLE DOUBLE-ENTRY ACCOUNTING LEDGER

**Status:** ACCEPTED  
**Date:** 2026-11-07  
**Deciders:** Principal Software Architect, Financial Systems Engineer  
**Context:**  
Single-entry personal finance trackers calculate balances via simple mutable running totals or ad-hoc transaction queries. In such systems, deleted transactions or edit bugs lead to unexplained balance discrepancies, missing audit trails, and untraceable cash leaks. WealthOS requires enterprise-grade financial accounting accuracy.

**Decision:**  
We implement an **immutable double-entry general ledger**:
1. All financial activities (bank debits/credits, transfers, stock purchases, sales, dividends, fees) are recorded as a `JournalEntry` consisting of two or more `JournalLine` items.
2. The core ledger invariant is enforced strictly at both application and database levels:
   $$\sum \text{Debit} \equiv \sum \text{Credit}$$
3. Posted journal entries are strictly immutable. No `UPDATE` or `DELETE` operations are permitted on posted lines. Any corrections, voids, or adjustments must be made via an explicit reversing `JournalEntry` (`status = 'REVERSAL'`).

**Consequences:**  
- **Positive:** Mathematically verifiable financial integrity; zero unexplained balance drift; complete historical auditability; seamless generation of standard balance sheets and income statements.
- **Negative:** Increased data volume due to multiple lines per transaction; reversal entries require slightly more complex frontend UX for transaction edits.
