# WealthOS Phase 19 — Answer Provenance & Financial Citations

## 1. Provenance Schema
Every answer produced by the Copilot is accompanied by an immutable `AnswerProvenanceRecord`:
- `answer_id`: Cryptographically random identifier (`ans_...`).
- `citations`: Array of structured evidence elements:
  - `entity_type`: `account_balance` | `journal_entry` | `investment_holding_lot` | `reconciliation_record`.
  - `entity_id`: UUID of referenced internal database row.
  - `label`: Human-readable description.
  - `verified_value`: The exact ledger-verified figure.
- `confidence_score`: Algorithmic score (0.00 – 1.00) based on source verification and RAG retrieval similarity.

## 2. Interactive Front-End Citations
Users can click on any citation pill in the Copilot UI to open a side drawer directly displaying the source voucher, statement transaction, or FIFO lot.
