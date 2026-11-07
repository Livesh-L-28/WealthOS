# WealthOS Database Migration Guide

WealthOS uses Alembic with SQLAlchemy 2.0 async engine for database migrations.

---

## 1. Architecture & Design Principles

1. **Async Execution**: Migrations are executed using an asynchronous connection bridge in `backend/migrations/env.py`.
2. **Deterministic Revisions**: Every migration must define an explicit `upgrade()` and `downgrade()` function.
3. **Strict Invariants**:
   - Primary keys must use `UUID(as_uuid=True)`.
   - Monetary amounts must use `sa.Numeric(18, 4)` for currency amounts or `sa.Numeric(24, 8)` for crypto/unit balances. Floating-point types (`FLOAT`, `DOUBLE PRECISION`, `REAL`) are strictly prohibited for financial balances.
   - Timestamps must always include timezone (`DateTime(timezone=True)`).
   - Multi-tenant domain models must include `tenant_id` and `user_id` indexed columns.

---

## 2. Common Migration Workflows

### Generating a New Migration
When entity models in `backend/app/domains` are modified:

```bash
cd backend
alembic revision --autogenerate -m "create_bank_accounts_table"
```

### Reviewing Generated Migrations
Always inspect the generated file in `backend/migrations/versions/` before applying it. Ensure:
- No unintentional table or column drops occurred.
- Proper indexes, foreign key constraints, and cascade delete rules are specified.
- Reversible logic exists in `downgrade()`.

### Applying Migrations
```bash
# Upgrade database to latest revision
alembic upgrade head

# Upgrade by one step
alembic upgrade +1

# Downgrade by one step
alembic downgrade -1

# View current revision
alembic current

# View history of applied and pending migrations
alembic history --verbose
```

---

## 3. Production Deployment Guidelines

- Never run migrations inside horizontally scaled API server startup hooks.
- Execute migrations in CI/CD pipeline or via a dedicated Kubernetes migration Job / Docker Compose one-shot container before routing traffic to new application instances.
- For zero-downtime deployments, write backward-compatible migrations (expand-and-contract pattern).

