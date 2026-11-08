# WealthOS — Phase 13 Operational Runbooks & Incident Response Playbooks

**Programme:** Wave 5 — Final Platform Integration and Acceptance  
**Phase:** Phase 13 — Enterprise Integration & Final Acceptance  
**Date:** 2026-11-08  

---

## Runbook 1: General Ledger Imbalance / Discrepancy Break (P0 Critical)

### Symptoms
- Health probe or audit monitor triggers alert: `UNBALANCED_JOURNAL_DETECTED`.
- Journal lines functional debits do not match functional credits.

### Immediate Action & Remediation
1. **Quarantine Tenant Transactions**:
   Place affected tenant in read-only maintenance mode:
   ```sql
   UPDATE tenants SET status = 'AUDIT_HOLD' WHERE id = '{tenant_id}';
   ```
2. **Identify Imbalanced Journal Entry**:
   ```sql
   SELECT je.id, je.entry_number, je.description, 
          SUM(jl.functional_debit_amount) AS total_dr, 
          SUM(jl.functional_credit_amount) AS total_cr
   FROM journal_entries je
   JOIN journal_lines jl ON je.id = jl.journal_entry_id
   WHERE je.tenant_id = '{tenant_id}'
   GROUP BY je.id, je.entry_number, je.description
   HAVING SUM(jl.functional_debit_amount) <> SUM(jl.functional_credit_amount);
   ```
3. **Execute Compensating Journal Entry**:
   Never execute raw `UPDATE` or `DELETE` on posted journal lines. Create an authorized reversing journal entry balancing the discrepancy.
4. **Restore Tenant Status**:
   ```sql
   UPDATE tenants SET status = 'ACTIVE' WHERE id = '{tenant_id}';
   ```

---

## Runbook 2: Provider Sync Failure & Webhook Replay Attack Detection (P1 High)

### Symptoms
- Inbound webhooks receiving HTTP 401 `Invalid webhook HMAC-SHA256 signature` or `Webhook timestamp expired`.
- External provider connection status transitions to `FAILED`.

### Remediation Steps
1. **Inspect Timestamp Skew**:
   Check server NTP sync status (`timedatectl`). Ensure drift is $\le 1\text{ second}$.
2. **Verify Provider Webhook Secret**:
   Check if provider rotated their webhook signing key. Update stored secret in `provider_credentials` if rotation occurred.
3. **Trigger Manual Incremental Re-Sync**:
   ```bash
   curl -X POST http://localhost:8000/api/v1/integrations/sync \
     -H "Authorization: Bearer $TOKEN" \
     -H "X-Tenant-ID: $TENANT_ID" \
     -H "Content-Type: application/json" \
     -d '{"connection_id": "'$CONN_ID'", "sync_mode": "INCREMENTAL"}'
   ```

---

## Runbook 3: Celery Task Queue Backlog & Worker Saturation (P2 Medium)

### Symptoms
- Delayed OCR statement processing or market quote refresh.
- Redis queue depth growing ($> 100\text{ tasks}$).

### Remediation Steps
1. **Check Worker Container Status**:
   ```bash
   docker ps | grep wealthos_worker
   ```
2. **Inspect Worker Logs**:
   ```bash
   docker logs --tail 100 wealthos_worker_ocr
   ```
3. **Scale Worker Concurrency**:
   Restart worker with increased concurrency:
   ```bash
   docker compose up -d --scale worker_ocr=2
   ```

---

## Runbook 4: Emergency Database Failover & Disaster Restoration (P0 Critical)

### Symptoms
- Unrecoverable database volume corruption or disk loss.
- PostgreSQL container failing health checks.

### Remediation Steps
1. Announce incident and declare disaster state.
2. Follow `docs/wave-5/PHASE_13_DISASTER_RECOVERY_PLAN.md`.
3. Execute `./scripts/restore_database.sh` using latest verified AES-256-GCM snapshot.
4. Verify trial balance zero-sum invariance ($\sum\text{Dr} = \sum\text{Cr}$).
5. Flush Redis and restart application containers.

