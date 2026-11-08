# WealthOS Phase 19 — Multi-Level Reconciliation Engine Design

## Executive Summary
WealthOS implements a multi-level automated reconciliation architecture that matches statement imports, broker syncs, and manual entries against immutable double-entry journal records.

---

## 1. Multi-Tier Reconciliation Matching Pipeline

```
  [ External Feed / Statement / Broker Sync ]
                        │
                        ▼
            [ SHA-256 Deduplication ]
                        │
                        ▼
      [ Tier 1: Deterministic Exact Match ]
      - UTR / Reference ID match
      - Exact Date, Amount, Account ID
                        │ (Unmatched)
                        ▼
      [ Tier 2: Fuzzy Window Match ]
      - Amount match within +/- 3 business days
      - Normalized description tokens (Levenshtein distance >= 0.85)
                        │ (Unmatched)
                        ▼
      [ Tier 3: Split / Aggregate Match ]
      - 1-to-N or N-to-1 sum equivalency
                        │ (Unmatched)
                        ▼
      [ Discrepancy Queue & Review Workflow ]
      - Pending User Action / Audit Flag
```

## 2. Invariants & Rules
1. **Immutable Match Records**: Once a reconciliation record is marked `RECONCILED`, it links the external `source_reference` with internal `journal_entry_id`.
2. **Discrepancy Segregation**: Unmatched or disputed entries are held in an isolated state until resolved by explicit user action or offsetting correction entries.
3. **Audit Trail**: Every discrepancy resolution generates a structured audit log entry tracking user id, timestamp, prior state, new state, and reason code.

