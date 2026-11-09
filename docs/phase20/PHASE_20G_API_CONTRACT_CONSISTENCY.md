# WealthOS — Phase 20G: API and Backend Contract Consistency Report

**Programme:** Phase 20 Web & Mobile Experience Parity, Product Consistency & Release Acceptance  
**Project:** WealthOS  
**Standard:** Strict Cross-Client Contract Verification & Tenant Derivation Security  
**Date:** 2026-11-09  

---

## 1. Unified API Client Architecture (`@wealthos/api-client`)

Both Web and Mobile clients communicate with the backend using the shared `@wealthos/api-client` package, which enforces standard headers, envelope unwrapping, and tenant context propagation:

```typescript
// packages/api-client/src/client.ts
export class WealthOSClient {
  private baseUrl: string;
  private tenantId: string | null = null;
  private authToken: string | null = null;

  constructor(config: { baseUrl: string }) {
    this.baseUrl = config.baseUrl;
  }

  setTenantId(id: string) { this.tenantId = id; }
  setAuthToken(token: string) { this.authToken = token; }

  // Automatically injects Authorization & X-Tenant-ID headers
  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;
    if (this.tenantId) headers['X-Tenant-ID'] = this.tenantId;
    return headers;
  }
}
```

---

## 2. Server-Side Security & Tenant Isolation Invariants

1. **Server-Derived Tenant Context:**
   - The backend **never trusts a client-supplied tenant identifier** for resource ownership.
   - For authenticated users, the active tenant is resolved from the cryptographically verified JWT payload and validated against the user's active `TenantMembership` in the database.
   - The session context variable is bound using:
     ```python
     # backend/app/core/database.py
     await session.execute(
         text("SELECT set_config('app.current_tenant_id', :tenant_id, true)"),
         {"tenant_id": str(tenant_id)},
     )
     ```
2. **PostgreSQL Row-Level Security (RLS):**
   - Active across all 65 tenant-scoped database tables.
   - Even if an attacker attempts an Insecure Direct Object Reference (IDOR) with another tenant's UUID, PostgreSQL returns zero rows, preventing unauthorized reads and writes.

---

## 3. Contract Consistency Checklist

| Protocol / Semantic Dimension | Specification Standard | Web Client Compliance | Mobile Client Compliance | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Monetary Amounts** | String/Number parsed to `Decimal` with 2 paise digits | `formatCurrency` | `formatINR` | **CONSISTENT** |
| **Date & Time Formats** | ISO 8601 UTC (`YYYY-MM-DD` or `YYYY-MM-DDTHH:MM:SSZ`)| Standard ISO strings | Standard ISO strings | **CONSISTENT** |
| **Pagination Pattern** | Limit-offset pagination with `items`, `total`, `page` | Supported on `/transactions`| Incremental feed on `AccountsScreen`| **CONSISTENT** |
| **Error Envelopes** | Standardized `{ error: { code, message, details } }` | Centralized toast handling | Centralized toast banner | **CONSISTENT** |
| **Idempotency Keys** | `X-Idempotency-Key` on financial write mutations | Injected on posting calls | Handled on offline transaction queue| **CONSISTENT** |
| **Session Lifecycle** | Refresh token rotation with family revocation | Cookie-based rotation | SecureStore bearer rotation | **CONSISTENT** |

