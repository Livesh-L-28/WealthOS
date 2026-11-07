# ADR-005: ASYNCHRONOUS DOCUMENT INTELLIGENCE PIPELINE & HUMAN REVIEW GATE

**Status:** ACCEPTED  
**Date:** 2026-11-07  
**Deciders:** Principal Software Architect, AI/ML Engineer  
**Context:**  
Document parsing (PDFs, multi-megabyte Excel files, scanned receipts) involves compute-intensive OCR, table extraction, and classification that takes between 2 to 30 seconds. Synchronous processing blocks HTTP server threads, causes client timeouts, and risks unvalidated or hallucinated financial records posting directly into the immutable ledger.

**Decision:**  
We implement a decoupled, asynchronous document intelligence pipeline with an explicit **human review and approval gate**:
1. Files are uploaded to private MinIO/S3 storage with SHA-256 deduplication and MIME validation.
2. Background Celery workers consume the job from Redis, classify the document, and extract structured line items into a temporary staging entity (`document_extractions` and `extraction_line_items`).
3. Extracted data is evaluated for mathematical consistency ($\text{Opening} + \text{Inflows} - \text{Outflows} \stackrel{?}{=} \text{Closing}$) and assigned a confidence score.
4. **Mandatory Human Gate:** Extracted records are NEVER posted directly to the general ledger. They remain in `PENDING_REVIEW` until an authenticated user inspects the extracted items side-by-side with the source document and clicks **Confirm & Post**.

**Consequences:**  
- **Positive:** HTTP APIs remain responsive ($< 200\text{ ms}$); prevents corrupt or hallucinated data from contaminating the accounting ledger; establishes a clear audit chain of human authorization.
- **Negative:** Requires users to take an explicit review action; requires robust background worker orchestration and websocket/polling status updates.
