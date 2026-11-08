# WealthOS Phase 19 — Tenant Resource Quota Specification

## 1. Schema & Defaults

```sql
CREATE TABLE tenant_resource_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    max_daily_ocr_documents INT NOT NULL DEFAULT 100,
    max_daily_ai_requests INT NOT NULL DEFAULT 500,
    max_daily_report_exports INT NOT NULL DEFAULT 50,
    max_concurrent_syncs INT NOT NULL DEFAULT 5,
    used_ocr_count INT NOT NULL DEFAULT 0,
    used_ai_count INT NOT NULL DEFAULT 0,
    used_report_count INT NOT NULL DEFAULT 0,
    quota_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 2. Resource Tiers
- **OCR Documents**: 100 pages/day per tenant (Standard Tier). Resets daily at 00:00 UTC.
- **AI Copilot Queries**: 500 requests/day per tenant.
- **Report PDF / XLSX Exports**: 50 exports/day per tenant.
- **Broker Concurrent Syncs**: Max 5 active parallel synchronization jobs per tenant.

