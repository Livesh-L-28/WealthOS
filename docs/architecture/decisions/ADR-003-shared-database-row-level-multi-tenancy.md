# ADR-003: SHARED DATABASE ROW-LEVEL MULTI-TENANCY

**Status:** ACCEPTED  
**Date:** 2026-11-07  
**Deciders:** Principal Software Architect, Database Architect  
**Context:**  
WealthOS is a multi-tenant SaaS serving individual users, household workspaces, and family offices. We evaluated three multi-tenancy models:
1. Database-per-tenant: Highest isolation, but enormous connection pool and schema migration overhead for thousands of tenants.
2. Schema-per-tenant: Complex migration orchestration, PostgreSQL search_path performance penalties.
3. Shared database with row-level isolation: Single schema, unified connection pool, optimal resource utilization, fast cross-workspace analytics for system administrators.

**Decision:**  
We adopt a **Shared Database with Row-Level Isolation**:
- Every relational table contains a mandatory `tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT`.
- Dedicated B-tree indexes are maintained on `(tenant_id, ...)`.
- The FastAPI application layer injects the verified `tenant_id` into every SQLAlchemy query via dependency injection.
- Automated tests verify cross-tenant data isolation at the API, repository, background worker, and storage levels.

**Consequences:**  
- **Positive:** Maximum hardware efficiency; effortless zero-downtime database migrations via Alembic; unified backups and monitoring.
- **Negative:** Strict enforcement required in application queries to prevent tenant leakage; mitigated via scoped session wrappers and CI tenant isolation test suites.
