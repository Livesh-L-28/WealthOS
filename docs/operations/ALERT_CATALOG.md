# WealthOS — Alert Catalog & Escalation Policy

**Programme:** WealthOS Enterprise Architecture & Production Readiness  
**Document:** Alert Catalog  
**Date:** 2026-11-08  
**Status:** Approved Operational Policy  
**Notification Targets:** PagerDuty, Slack (#ops-alerts, #security-alerts), Opsgenie  
**Author:** Lead SRE & Incident Commander  

---

## 1. Alert Severity Matrix & SLA Response Times

| Severity Level | Definition & Business Impact | Notification Channel | Response SLA | Escalate After |
|---|---|---|---|---|
| **P1 — Critical** | Service outage, financial ledger imbalance, primary DB failure. | PagerDuty (Phone call + SMS), Slack #ops-p1 | **$< 5$ minutes** | 10 minutes to VP Eng |
| **P2 — High** | Elevated error rate, replication lag $> 10$s, connection pool $> 85\%$. | PagerDuty (Push notification), Slack #ops-p2 | **$< 15$ minutes** | 30 minutes to Tech Lead |
| **P3 — Medium** | Background worker queue backlog, minor provider sync timeouts. | Slack #ops-alerts, Email | **$< 2$ hours** | 4 hours to Domain Lead |
| **P4 — Warning** | Non-critical disk threshold (75%), temporary cache miss spike. | Daily Digest, Slack #ops-info | **$< 24$ hours** | N/A |

---

## 2. Production Prometheus Alert Rules Catalog

```yaml
groups:
  - name: wealthos_financial_integrity_alerts
    rules:
      - alert: FinancialLedgerImbalanceDetected
        expr: wealthos_accounting_imbalance_total != 0
        for: 0m # Immediate trigger - zero tolerance
        labels:
          severity: critical
          tier: P1
        annotations:
          summary: "CRITICAL: General Ledger Double-Entry Imbalance Detected!"
          description: "General ledger sum(debit) != sum(credit). Potential financial corruption or race condition."
          runbook: "docs/database/FAILOVER_RUNBOOK.md"

  - name: wealthos_database_alerts
    rules:
      - alert: PostgreSQLPrimaryUnreachable
        expr: pg_up == 0
        for: 15s
        labels:
          severity: critical
          tier: P1
        annotations:
          summary: "PostgreSQL Primary Database Unreachable"
          description: "Primary database connection probe failed for > 15 seconds. Automatic failover may be required."
          runbook: "docs/database/FAILOVER_RUNBOOK.md"

      - alert: PostgreSQLReplicationLagHigh
        expr: wealthos_db_replication_lag_seconds > 10
        for: 2m
        labels:
          severity: high
          tier: P2
        annotations:
          summary: "Database Replication Lag Exceeds 10 Seconds"
          description: "Read replica replay lag is currently {{ $value }}s, risking stale analytical reads."
          runbook: "docs/database/REPLICATION_STRATEGY.md"

      - alert: PgBouncerPoolSaturation
        expr: (wealthos_db_pool_active_connections / 25) > 0.85
        for: 1m
        labels:
          severity: high
          tier: P2
        annotations:
          summary: "PgBouncer Connection Pool > 85% Saturated"
          description: "Pooled connections reaching physical limits. Review slow queries or scale pool size."
          runbook: "docs/database/CONNECTION_POOLING_STRATEGY.md"

  - name: wealthos_api_alerts
    rules:
      - alert: HighHTTP5xxErrorRate
        expr: sum(rate(wealthos_http_requests_total{status_code=~"5.."}[2m])) / sum(rate(wealthos_http_requests_total[2m])) > 0.01
        for: 1m
        labels:
          severity: high
          tier: P2
        annotations:
          summary: "HTTP 5xx Server Error Rate Exceeds 1%"
          description: "API instances returning elevated server error rates. Check backend application logs."

      - alert: ElevatedP95Latency
        expr: histogram_quantile(0.95, sum(rate(wealthos_http_request_duration_seconds_bucket[5m])) by (le)) > 0.3
        for: 3m
        labels:
          severity: high
          tier: P2
        annotations:
          summary: "P95 Request Latency Exceeds 300ms"
          description: "P95 response time is {{ $value }}s. Check database query performance or worker scaling."

  - name: wealthos_worker_alerts
    rules:
      - alert: CeleryOCRQueueBacklog
        expr: wealthos_celery_queue_depth{queue="ocr_heavy"} > 100
        for: 5m
        labels:
          severity: medium
          tier: P3
        annotations:
          summary: "OCR Queue Depth Exceeds 100 Documents"
          description: "Document ingestion worker backlog accumulating. Trigger horizontal worker autoscale."
          runbook: "docs/infrastructure/AUTOSCALING_POLICY.md"
```
