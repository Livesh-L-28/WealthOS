# WealthOS Testing Architecture & Verification Guide

This guide establishes testing standards, conventions, and execution workflows for the WealthOS platform.

---

## 1. Testing Philosophy & Standards

- **Zero Mocking in Production**: Mocks are exclusively permitted within unit test harnesses to simulate external service failures or isolated subsystem conditions.
- **Strict Financial Calculation Audits**: Monetary balances and ledger reconciliations must verify invariants with exact decimal arithmetic (`Decimal`).
- **Comprehensive Coverage**: All API endpoints, middleware, authentication flows, and background workers must be covered by automated test suites.

---

## 2. Backend Testing with Pytest

### Running the Test Suite
```bash
cd backend
pytest -v
```

### Running with Code Coverage
```bash
cd backend
pytest -v --cov=app --cov-report=term-missing --cov-report=html
```

### Test Organization
```
backend/tests/
├── conftest.py          # Application fixtures, ASGI client, test settings
├── test_config.py       # Configuration and URL construction tests
├── test_health.py       # Liveness, readiness, health diagnostic tests
├── test_storage.py      # S3/MinIO upload, presigned URL tests
└── test_celery.py       # Worker queue routing and task execution tests
```

---

## 3. Frontend & Shared Package Testing

### Typechecking Monorepo Packages
```bash
# Typecheck all packages and workspaces
npm run typecheck

# Target specific workspace
npm run --workspace=@wealthos/web typecheck
npm run --workspace=@wealthos/shared-types typecheck
npm run --workspace=@wealthos/api-client typecheck
```

### Building Monorepo Packages
```bash
npm run build
```

---

## 4. End-to-End Infrastructure Validation

Validate that the complete Docker Compose infrastructure boots and passes all healthchecks:

```bash
docker compose up -d
docker compose ps
curl -s http://localhost:8000/healthz | jq
curl -s http://localhost:8000/readyz | jq
curl -s http://localhost:8000/api/v1/health | jq
```
