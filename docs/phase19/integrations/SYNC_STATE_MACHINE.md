# WealthOS Phase 19 — Provider Sync State Machine Design

## 1. Sync Job Finite State Machine (`SyncStateMachine`)

```
               ┌───────────┐
               │  PENDING  │
               └─────┬─────┘
                     │ start_job()
                     ▼
             ┌───────────────┐  interim checkpoint()
             │  IN_PROGRESS  │ <─────────────────────┐
             └───────┬───────┘                       │
                     │                               │
        ┌────────────┴────────────┐                  │
        │                         │                  │
        ▼ complete_job()          ▼ fail_job()       │
  ┌───────────┐             ┌────────────┐           │
  │ COMPLETED │             │   FAILED   │ ──────────┘
  └───────────┘             └────────────┘  auto-retry after jitter backoff
```

## 2. Checkpoint Structure (`SyncJobCheckpoint`)
- `job_id`: Unique identifier (e.g., `sync_zerodha_4f1b2c3d`).
- `tenant_id`: Owning tenant.
- `provider`: Target broker / bank (e.g. `ZERODHA`, `UPSTOX`, `CAMSKFINTECH`).
- `cursor_timestamp`: Timestamp of most recently ingested event.
- `cursor_offset`: Pagination page index.
- `items_processed`: Successfully ingested new financial records.
- `duplicates_skipped`: Existing records skipped via cryptographic deduplication.
