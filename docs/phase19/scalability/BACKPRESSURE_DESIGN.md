# WealthOS Phase 19 — Backpressure & Resilient Traffic Control Design

## 1. Circuit Breaker Finite State Machine (`CircuitBreaker`)

```
      [ Normal Traffic ]
              │
              ▼
        ┌───────────┐  5 consecutive failures
        │  CLOSED   │ ────────────────────────> ┌──────────┐
        └───────────┘                           │   OPEN   │
              ▲                                 └──────────┘
              │ 2 consecutive successes               │
              │                                       │ 30s recovery timeout
        ┌───────────┐                                 │
        │ HALF-OPEN │ <───────────────────────────────┘
        └───────────┘
```

### Invariant Guarantees:
- **Fail Fast**: When `OPEN`, subsequent requests are rejected instantly with `CircuitBreakerOpenError` and a `Retry-After` estimate, avoiding hung threads or connection leaks.
- **Probe Healing**: In `HALF-OPEN`, traffic is throttled to single probe requests until 2 successful responses confirm downstream recovery.
- **Cascading Failure Prevention**: Applied across all outbound broker APIs (Zerodha Kite, Upstox, NSE India corporate actions feeds).
