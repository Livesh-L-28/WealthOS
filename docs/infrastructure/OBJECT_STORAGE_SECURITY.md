# WealthOS — Financial Document & Object Storage Security Architecture

**Programme:** WealthOS Enterprise Architecture & Production Readiness  
**Document:** Object Storage Security Specification  
**Date:** 2026-11-08  
**Status:** Approved Security Standard  
**Standards:** ISO 27001, OWASP File Upload Security Cheat Sheet  
**Author:** Application Security Lead & Cloud Architect  

---

## 1. Storage Isolation & Private Bucket Hierarchy

WealthOS enforces a multi-tier private bucket architecture in MinIO/S3. **Zero public bucket access is permitted.**

```mermaid
flowchart TD
    subgraph Ingress["Document Ingress & Validation"]
        ClientUpload["Client Upload (PDF / CSV / XLSX)"]
        ValidationGate["Pre-Upload Validation Gate<br/>- File Size <= 50MB<br/>- Content-Type Allowlist<br/>- Magic Bytes Inspection"]
    end

    subgraph StorageVault["Object Storage Vault (MinIO / S3)"]
        QuarantineBucket[("s3://wealthos-quarantine/<br/>Strictly Isolated Ingress<br/>No Direct Read Access")]
        VerifiedBucket[("s3://wealthos-documents/<br/>Encrypted Verified Archive<br/>SSE-S3 AES-256")]
        RejectedBucket[("s3://wealthos-rejected/<br/>Tainted / Malformed Files<br/>Auto-Purge 7 Days")]
    end

    subgraph WorkerPipe["Asynchronous Security Pipeline"]
        ScannerWorker["Celery OCR / Anti-Malware Worker"]
        SanityCheck["Arithmetic Statement Balance Check"]
        DomainPosting["Authorized Accounting Service"]
    end

    ClientUpload --> ValidationGate
    ValidationGate -->|Presigned PUT URL (15m expiry)| QuarantineBucket
    QuarantineBucket --> ScannerWorker
    ScannerWorker --> SanityCheck
    SanityCheck -->|Passed & Reconciled| VerifiedBucket
    SanityCheck -->|Failed or Imbalanced| RejectedBucket
    VerifiedBucket --> DomainPosting
```

---

## 2. File Verification & Anti-Exploit Pipeline

### 2.1 Magic Bytes & Signature Validation
Never trust client-supplied file extensions or `Content-Type` headers. WealthOS inspects the first 512 header bytes:

| Allowed File Format | Expected Magic Header Signature | Maximum Allowed Size |
|---|---|---|
| **PDF Statement / CAS** | `%PDF-` (`0x25 0x50 0x44 0x46 0x2D`) | 50 MiB |
| **Bank CSV Export** | Valid UTF-8 / ASCII text containing delimiter | 10 MiB |
| **Excel Spreadsheet** | `PK\x03\x04` (ZIP archive signature with OpenXML structure) | 25 MiB |

### 2.2 Archive-Bomb & Resource Exhaustion Defense
- For Excel (`.xlsx`) or compressed containers, decompression expansion ratios are bounded to a maximum of $10:1$.
- Any file exceeding 50 MB in memory or expanding beyond maximum limits is immediately aborted and quarantined.

---

## 3. Presigned URLs with Short Lifespan

Direct database or MinIO API credentials are never exposed to mobile apps or web browsers:
1. **Presigned Upload URLs:** Generated with a maximum TTL of **15 minutes**. Bounded to the exact object key and maximum content length.
2. **Presigned Download URLs:** Generated with a maximum TTL of **5 minutes** strictly after verifying that the caller's active tenant context matches the document path.

---

## 4. Separation of Document Ingestion and Ledger Posting

> [!CRITICAL]
> **Financial Accounting Guardrail:**  
> Document OCR statement extraction **MUST NEVER directly write journal entries or credit cash balances**.
> All extracted figures are staged in `document_extractions` in `PENDING_REVIEW` state. Balances are posted to the General Ledger **only after arithmetic reconciliation matching and explicit user confirmation**.

