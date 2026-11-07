# WealthOS Troubleshooting & Diagnostics Guide

Common diagnostic procedures, error resolutions, and operational runbooks for local development.

---

## 1. Port Conflicts

### Symptom: `Bind for 0.0.0.0:5432 failed: port is already allocated` or port 6379 / 9000
- **Cause**: An existing PostgreSQL, Redis, or MinIO instance is running on the host machine.
- **Resolution**:
  ```bash
  # Identify PID occupying port
  lsof -i :5432
  lsof -i :6379
  lsof -i :9000

  # Stop conflicting containers or services
  docker ps
  docker stop <conflicting_container_name>
  ```

---

## 2. Database Connection Issues

### Symptom: `ConnectionRefusedError: [Errno 61] Connection refused`
- **Cause**: PostgreSQL container has not completed initialization.
- **Resolution**:
  ```bash
  # Check PostgreSQL health status
  docker compose ps postgres

  # View PostgreSQL initialization logs
  docker compose logs postgres
  ```

### Symptom: Alembic `Can't locate revision identified by '...'`
- **Cause**: Migration versions out of sync with database state.
- **Resolution**:
  ```bash
  cd backend
  alembic current
  alembic upgrade head
  ```

---

## 3. Celery & Redis Task Queue Issues

### Symptom: Tasks stuck in `PENDING` state
- **Cause**: No Celery worker is listening on the targeted queue (`default`, `ocr_heavy`, or `market_data`).
- **Resolution**:
  ```bash
  # Verify Redis broker connectivity
  redis-cli -h localhost -p 6379 ping

  # Check active workers
  celery -A app.infrastructure.celery_app.celery_app inspect active
  ```

---

## 4. Frontend & Monorepo Dependency Resolution

### Symptom: React Context Error: `Cannot read properties of null (reading 'useContext')`
- **Cause**: Multiple versions of `react` installed across monorepo workspace subdirectories.
- **Resolution**:
  ```bash
  # Ensure all package.json files specify identical React versions (18.2.0)
  npm dedupe
  npm run build
  ```

### Symptom: `npm error code ENOWORKSPACES`
- **Cause**: Running package-modifying commands inside an individual workspace directory without `--workspace` flag.
- **Resolution**:
  Run commands from the monorepo root:
  ```bash
  npm install --workspace=@wealthos/web <package>
  ```
