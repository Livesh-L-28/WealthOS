# WealthOS — Horizontal Autoscaling & Dynamic Capacity Policy

**Programme:** WealthOS Enterprise Architecture & Production Readiness  
**Document:** Autoscaling Policy Specification  
**Date:** 2026-11-08  
**Status:** Approved Infrastructure Standard  
**Author:** Principal SRE & Cloud Architect  

---

## 1. Autoscaling Objectives & Connection Guardrails

The WealthOS autoscaling policy dynamically adjusts compute capacity to match incoming traffic spikes while maintaining strict operational guardrails:

> [!CRITICAL]
> **Database Connection Budget Rule:**  
> The maximum permissible horizontal scale of API instances and workers is strictly bounded by the PgBouncer pooler capacity:
> $$N_{\text{api}}^{\max} \times \text{pool}_{\text{api}} + N_{\text{worker}}^{\max} \times \text{pool}_{\text{worker}} \le \text{PgBouncer Capacity (1,000 clients)}$$
> An autoscaler that spawns containers beyond this limit will saturate the pooler and cause system-wide 500 errors.

---

## 2. Horizontal Autoscaling Specifications (Kubernetes HPA / Cloud Groups)

### 2.1 Backend API Tier (`wealthos-api`)
- **Min Instances:** 2 (Zero-downtime HA minimum)
- **Max Instances:** 8
- **Scale-Out Triggers (OR condition):**
  - Average CPU utilization $> 70\%$ for 2 consecutive evaluation periods (60s).
  - P95 Request Latency $> 300\text{ms}$ over 3 minutes.
  - Active concurrent HTTP connections $> 150$ per instance.
- **Scale-In Triggers (AND condition):**
  - Average CPU utilization $< 30\%$ for 10 minutes.
  - P95 Request Latency $< 100\text{ms}$.
- **Stabilization / Cooldown Window:**
  - Scale-Out: 0 seconds (Immediate expansion).
  - Scale-In: 300 seconds (5 minutes cooldown to prevent oscillation/flapping).

### 2.2 Celery Asynchronous Worker Tiers
Workers scale independently based on **Queue Depth** in Redis:

| Worker Pool | Queue Monitored | Min Workers | Max Workers | Scale-Out Metric Trigger | Scale-In Metric Trigger |
|---|---|---|---|---|---|
| **Default Worker** | `default` | 2 | 4 | Queue Depth $> 500$ jobs | Queue Depth $< 50$ for 5 min |
| **OCR Heavy Worker** | `ocr_heavy` | 2 | 6 | Queue Depth $> 50$ documents | Queue Depth $< 5$ for 5 min |
| **Market Data Worker** | `market_data` | 1 | 2 | Scheduled sync spikes | Queue Depth $= 0$ |

---

## 3. Graceful Termination & Draining Lifecycle

When an instance scales down or is replaced during rolling updates:
1. **Deregistration:** The Load Balancer / Ingress stops routing new connections to the pod/container.
2. **SIGTERM Signal:** Container runtime delivers `SIGTERM` to Uvicorn / Celery.
3. **In-Flight Draining:**
   - FastAPI finishes in-flight HTTP requests within a 30-second graceful drain window.
   - Celery workers finish their current active job (`task_acks_late=True` guarantees that unacknowledged tasks are re-queued).
   - Database connections in SQLAlchemy pool are disposed cleanly via `close_db()`.
4. **Clean Exit:** Container terminates with exit code 0.
