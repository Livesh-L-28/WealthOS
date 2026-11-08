# WealthOS Phase 19 — Operational Incident Management & P1 Escalation Runbook

## 1. Severity Classifications & Escalations

| Severity | Definition | Response SLA | Primary Responder |
| :--- | :--- | :--- | :--- |
| **P0 (Critical)** | Core ledger down, data corruption risk, widespread 5xx $> 5\%$ | $< 15\text{ mins}$ | Principal Architect & Lead SRE |
| **P1 (High)** | Degraded provider sync, delayed async OCR batching, high replica lag | $< 30\text{ mins}$ | On-Call Backend Engineer |
| **P2 (Medium)**| Non-critical feature degradation, individual report generation timeout | $< 4\text{ hours}$ | Domain Engineering Team |
| **P3 (Low)** | Cosmetic UI issue or minor telemetry discrepancy | Next Sprint | Product / Engineering Backlog |

---

## 2. P0 Emergency Runbook Steps
1. **Declare Incident**: Execute `SecurityIncidentService.declare_incident()` or trigger internal PagerDuty P0 alert.
2. **Halt Mutating Traffic**: If ledger corruption is suspected, activate `ContainmentAction.FREEZE_LEDGER`.
3. **Fenced Failover**: If primary database fails, execute `DatabaseTopologyController.promote_standby(candidate_id, fence_old_primary=True)`.
4. **Disaster Recovery**: If catastrophic corruption occurred, execute `./scripts/restore_database.sh` with latest verified AES-256-GCM container.
