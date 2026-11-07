# ADR-001: MODULAR MONOLITH OVER MICROSERVICES ARCHITECTURE

**Status:** ACCEPTED  
**Date:** 2026-11-07  
**Deciders:** Principal Software Architect, Senior Full-Stack Engineer  
**Context:**  
WealthOS requires high data consistency for its double-entry general ledger, atomic financial posting, fast query performance across interconnected accounts and portfolios, and low operational overhead during early and commercial multi-tenant deployment. Distributed microservices introduce network latency, distributed transaction complexity (2PC / Saga pattern failure modes), and difficult cross-service reporting.

**Decision:**  
We adopt a **Modular Monolith** architecture deployed with a FastAPI backend, Celery asynchronous workers, PostgreSQL 16, and Redis.
- Domain boundaries (Identity, Accounts, Ledger, Investments, Documents, Copilot) are enforced through internal module interfaces and Python packaging.
- Synchronous cross-domain database transactions run within single PostgreSQL ACID boundaries.
- Asynchronous CPU-heavy tasks (document OCR, statement parsing, large export generation) are offloaded to Celery workers via Redis queues.

**Consequences:**  
- **Positive:** Guaranteed ACID transaction atomicity across all double-entry postings; zero distributed transaction failures; rapid local-first development; simplified CI/CD and deployment.
- **Negative:** Requires strict discipline to prevent domain boundary erosion; long-term domain decoupling must be maintained through explicit service layers.
