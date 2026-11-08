# WealthOS Phase 19 — Provider-to-Ledger Portfolio Reconciliation

## 1. Automated Drift Detection
Synchronization is not complete upon mere ingestion. WealthOS performs continuous, multi-dimensional holding reconciliation comparing broker holdings against internal double-entry FIFO investment holding lots.

---

## 2. Drift Classification
The reconciliation engine flags four discrete variance states:
1. `MATCH`: Internal ledger units equal broker feed units (tolerance $\le 0.0001$).
2. `QUANTITY_MISMATCH`: Security exists in both systems, but unit holdings differ (e.g., pending trade settlement, unrecorded off-market transfer).
3. `MISSING_IN_LEDGER`: Broker reports security holdings that have no corresponding FIFO lot in WealthOS.
4. `MISSING_IN_PROVIDER`: WealthOS records open holding lots, but broker reports 0 units (e.g. unrecorded off-platform sale or demat transfer).
