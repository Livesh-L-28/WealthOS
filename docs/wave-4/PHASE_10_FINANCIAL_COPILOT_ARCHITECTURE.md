# WealthOS — Phase 10: Financial Copilot Architecture

**Document Version:** 1.0.0  
**Status:** Certified Architecture  
**Domain:** `app.domains.copilot`  

---

## 1. Architectural Mission & Core Invariants

The WealthOS AI Financial Copilot provides a natural-language conversational interface that makes complex multi-domain financial information intuitive, actionable, and transparent for end users.

### Core Non-Negotiable Invariants:
1. **Financial Source of Truth Separation:** LLM models do **not** calculate balances, tax liabilities, or investment returns from ungrounded text. All authoritative calculations are computed by deterministic backend services.
2. **Strict Read-Only Execution:** The Copilot is an analytical advisor. It has zero capability to mutate accounting ledgers, execute wire transfers, open accounts, delete debts, or elevate permissions.
3. **Evidence Citations:** Every quantitative claim made by the Copilot is tied to structured source references (`assets_and_liabilities_ledger`, `financial_accounts`, `budget_allocations`, `investment_holding_lots`, `tax_computations`, `risk_alerts`).
4. **Tenant Isolation:** All underlying queries pass through `tenant_id` boundaries protected by PostgreSQL Row-Level Security (`FORCE ROW LEVEL SECURITY`).
5. **Prompt Injection Defense:** Input text is systematically sanitized and tested against adversarial jailbreaks and privilege escalation attempts before domain processing.

---

## 2. Request Processing Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Router as Copilot Router
    participant Service as Copilot Service
    participant Sanitize as Prompt Injection Filter
    participant Tools as Allowlisted Tool Registry
    participant DB as Postgres with RLS

    User->>Router: POST /api/v1/copilot/conversations/{id}/messages
    Router->>Service: process_user_query(text)
    Service->>Sanitize: inspect_for_prompt_injection(text)
    alt Adversarial Pattern Detected
        Sanitize-->>Service: Raise Security Violation
        Service->>DB: Store Refusal Record
        Service-->>Router: Refusal Response ("I cannot fulfill this request...")
        Router-->>User: Refusal Message
    else Clean Query
        Service->>Tools: Match Intent & Invoke Allowlisted Read-Only Tools
        Tools->>DB: SELECT queries scoped to tenant_id
        DB-->>Tools: Typed Decimal records
        Tools-->>Service: Structured tool output & source citations
        Service->>Service: Synthesize grounded response
        Service->>DB: Store User & Assistant Messages
        Service-->>Router: Return Grounded Response with Citations
        Router-->>User: Display Response + Citation Pills
    end
```

---

## 3. Conversational Context & Memory Management

- Conversations are structured into threads stored in `copilot_conversations`.
- Messages are sequenced in `copilot_messages` with timestamps, `tool_calls` audit metadata, and structured `citations`.
- Recent context (last $N$ messages) is provided to maintain dialogue continuity without bloating context window.
- Thread isolation ensures users cannot read or inject messages across workspace tenants or cross-household boundaries.
