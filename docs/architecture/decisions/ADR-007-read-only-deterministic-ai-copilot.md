# ADR-007: READ-ONLY DETERMINISTIC AI FINANCIAL COPILOT

**Status:** ACCEPTED  
**Date:** 2026-11-07  
**Deciders:** Principal Software Architect, AI/ML Engineer, Application Security Engineer  
**Context:**  
Large Language Models (LLMs) are prone to hallucinations, arithmetic errors, and prompt injection vulnerabilities. Giving an LLM direct SQL write access or allowing it to execute ledger mutations creates catastrophic risks of financial record corruption, unauthorized account balance changes, and cross-tenant data leakage.

**Decision:**  
We implement a **Read-Only, Deterministic AI Financial Copilot**:
1. **Zero Write Capability:** The Copilot operates strictly in a read-only execution context. No tools exist that modify, insert, or delete database records or ledger entries.
2. **Deterministic Financial Tools:** Arithmetic and aggregation queries (e.g., net worth, monthly spending by category, dividend yield, top expenses) are executed via pre-compiled, parameter-validated Python service methods, NOT by asking the LLM to calculate arithmetic.
3. **Strict Tenant-Scoped Context:** All data retrieval is bounded by the user's active `tenant_id`. The LLM never receives database credentials, schema modification tools, or cross-tenant query capabilities.
4. **Grounded Citations:** Every response must cite underlying record identifiers (e.g., specific transaction dates, account IDs, or holding records) to allow immediate user verification.

**Consequences:**  
- **Positive:** Zero risk of ledger corruption or unauthorized money movement; elimination of arithmetic hallucinations; complete auditability of assistant responses.
- **Negative:** Assistant cannot perform complex autonomous writes (e.g., "create a transaction for me"); user must confirm actions via standard UI dialogs.
