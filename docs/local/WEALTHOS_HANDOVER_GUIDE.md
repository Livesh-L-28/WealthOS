# WealthOS — Engineering & Operations Handover Guide (Gate 14)

**Repository:** `Livesh-L-28/WealthOS`  
**Primary Branch:** `feature/final-financial-intelligence-production`  
**Target Version:** `v1.0.0-rc1` (Pending Human Approval)  
**Target Audience:** Release Managers, DevOps/SRE Engineers, Financial Systems Architects, Frontend & Backend Engineers

---

## 1. System Architecture & Component Topology

WealthOS is architected as an enterprise multi-tenant modular monolith backed by asynchronous task workers and an App Router web client:

```
[ Next.js 14 Web Frontend ]       [ React Native / Expo Mobile ]
           │                                      │
           └──────────────────┬───────────────────┘
                              ▼
                [ FastAPI Application Server ]
                  (Port 8000 · JWT / RLS)
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
[ PostgreSQL 16 + RLS ]  [ Redis 7 Cache ]  [ MinIO S3 Vault ]
  (Port 5432)              (Port 6379)         (Port 9000)
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
[ Celery Default ]    [ Celery OCR ]      [ Celery Market ]
  (Notifications)       (Document Intel)    (NAV & Stocks)
```

---

## 2. Local Environment Bootstrap & Verification

### 2.1 Starting the Containerized Platform
```bash
# Clone and enter workspace
git clone https://github.com/Livesh-L-28/WealthOS.git
cd WealthOS
git checkout feature/final-financial-intelligence-production

# Start infrastructure and application services
docker compose -f docker-compose.yml up -d

# Verify all 8 services report healthy
docker compose ps
```

### 2.2 Running Backend Verification Suites
```bash
cd backend
source .venv/bin/activate

# Execute complete 61-test acceptance suite across all gates
python3 -m pytest \
  tests/test_gate1_release_remediations.py \
  tests/test_gate3_database_migration_acceptance.py \
  tests/test_gate4_auth_security_acceptance.py \
  tests/test_gate5_financial_workflows_acceptance.py \
  tests/test_gate6_document_intelligence_acceptance.py \
  tests/test_gate7_copilot_acceptance.py \
  tests/test_gate10_reports_integrations_acceptance.py \
  tests/test_gate11_backup_restore_acceptance.py \
  tests/test_gate12_e2e_acceptance.py -v
```

### 2.3 Running Frontend Verification Suites & Build
```bash
# Return to repository root
cd ..

# Run all 28 frontend vitest unit and invariant tests
npm test

# Run strict TypeScript typecheck across all workspaces
npm run typecheck

# Run production Next.js App Router build
npm run build
```

---

## 3. Routine Operations & Maintenance Procedures

### 3.1 Authenticated Database Backup
```bash
export WEALTHOS_BACKUP_ENCRYPTION_KEY="your-strong-backup-key-minimum-16-chars"
export POSTGRES_ADMIN_PASSWORD="wealthos_local_dev_password_change_in_prod"

# Generates AES-256-GCM container in /tmp/wealthos_backups
./scripts/backup_database.sh
```

### 3.2 Database Restore into Target Environment
```bash
export WEALTHOS_BACKUP_ENCRYPTION_KEY="your-strong-backup-key-minimum-16-chars"
export POSTGRES_ADMIN_PASSWORD="wealthos_local_dev_password_change_in_prod"
export CONFIRM_RESTORE=true

# Restores and verifies all 4 post-restore integrity gates
./scripts/restore_database.sh /path/to/backup.dump.enc <target_database>
```

### 3.3 Executing Automated Disaster Recovery Drill
```bash
# Executes guarded drill on disposable database 'wealthos_dr_drill'
python3 scripts/disaster_recovery_exercise.py --force-drill
```

---

## 4. Release Governance & Sign-Off Protocol

> [!IMPORTANT] Production Release Protocol
> Do not generate a production git release tag (`v1.0.0`) or deploy container artifacts to production cloud clusters without human executive review and authorization.

### Handover Checklist:
- [x] All 89 automated tests passing with zero failures.
- [x] Complete Next.js App Router production build validated (25 static pages).
- [x] React Native / Expo SDK 51 configuration validated.
- [x] Forced PostgreSQL Row-Level Security active across 43 tables.
- [x] Mathematical ledger balance invariance enforced ($\Sigma\text{Dr} - \Sigma\text{Cr} = 0.0000$).
- [x] AES-256-GCM authenticated backup and restore verified.
- [x] CWE-1236 formula injection defense enforced across CSV/Excel exports.
- [x] India DPDP Act 2023 statutory consent logging implemented.
- [x] All 15 canonical E2E user journeys verified on real container stack.
