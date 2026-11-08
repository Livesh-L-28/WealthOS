# WealthOS Phase 19 — Database Topology Controller Design

## 1. Responsibilities
The `DatabaseTopologyController` (`backend/app/core/topology_controller.py`) acts as the state manager for all database instances in the WealthOS infrastructure cluster:
1. **Dynamic Routing**: Dispatches write traffic strictly to `PRIMARY` and read queries to the lowest-lag healthy `STANDBY`.
2. **Safe Draining**: Permits zero-downtime rolling upgrades and vacuum maintenance by draining nodes (marking `is_drained = True` while letting existing in-flight connections finish).
3. **Split-Brain Prevention & Fencing**: Enforces single-writer invariant. Promoting a new primary mandates demoting, draining, and fencing the existing primary.

---

## 2. Split-Brain Prevention State Machine

```
              ┌────────────────────────┐
              │  Candidate Standby     │
              │  (Healthy, Lag < 1s)   │
              └───────────┬────────────┘
                          │
                          ▼
            [ Pre-Promotion Fencing Gate ]
       Does an active PRIMARY already exist?
               │ YES               │ NO
               ▼                   │
    [ Demote & Fence Old Primary ] │
    - role = STANDBY               │
    - is_drained = True            │
    - add to fenced_nodes set      │
               │                   │
               └─────────┬─────────┘
                         ▼
             [ Promote to PRIMARY ]
             - role = PRIMARY
             - replication_lag = 0.0
             - open write channel
```

## 3. Node Attributes
- `node_id`: Unique identifier (e.g., `pg-node-az1-primary`).
- `role`: `PRIMARY` | `STANDBY`.
- `health`: `HEALTHY` | `DEGRADED` | `UNAVAILABLE`.
- `readiness`: Readiness probe flag (must be `True` for traffic routing).
- `replication_lag_ms`: Measured replication latency in milliseconds.
- `is_drained`: Maintenance draining flag.
- `active_requests`: Concurrency load tracking.

