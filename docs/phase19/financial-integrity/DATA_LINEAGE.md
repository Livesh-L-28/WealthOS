# WealthOS Phase 19 — Financial Data Lineage & Provenance Architecture

## Overview
Every calculated balance, tax line item, investment lot disposal, and risk metric in WealthOS traces back to its root evidence source. The `FinancialDataLineage` model creates an immutable directed acyclic graph (DAG) of financial provenance.

---

## 1. Lineage Graph Model

```sql
CREATE TABLE financial_data_lineage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    target_entity_type VARCHAR(100) NOT NULL,
    target_entity_id UUID NOT NULL,
    source_entity_type VARCHAR(100) NOT NULL,
    source_entity_id UUID NOT NULL,
    transformation_type VARCHAR(100) NOT NULL,
    metadata_payload JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL
);

CREATE INDEX idx_lineage_target ON financial_data_lineage (tenant_id, target_entity_type, target_entity_id);
CREATE INDEX idx_lineage_source ON financial_data_lineage (tenant_id, source_entity_type, source_entity_id);
```

## 2. Lineage Traversal & Audit Traceability
The `DataLineageService` exposes recursive graph traversal methods:
- `record_lineage(tenant_id, target_entity, source_entities, transformation_type, metadata)`
- `get_entity_lineage(tenant_id, target_entity_type, target_entity_id)`
- `trace_source(tenant_id, root_source_type, root_source_id)`

### Example Provenance Trace
```
Bank Statement PDF Upload (DocID: 101)
       │
       ▼ (DOCUMENT_EXTRACTION)
Parsed Transaction Item (ItemID: 204)
       │
       ▼ (RECONCILIATION_MATCH)
Double-Entry Journal Entry (JE: 501)
       │
       ▼ (GENERAL_LEDGER_POSTING)
Bank Ledger Account Balance (Acct: 77)
       │
       ▼ (DIGITAL_TWIN_COMPUTATION)
User Net Worth Snapshot (NW: 900)
```

Through this graph, any user or auditor inspecting their Net Worth or Tax Report can click to reveal the exact raw bank statement, extraction confidence score, and intermediate journal voucher that gave rise to the value.

