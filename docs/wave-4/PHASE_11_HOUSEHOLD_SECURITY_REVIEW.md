# WealthOS — Phase 11: Household Wealth Security & Privacy Review

**Document Version:** 1.0.0  
**Status:** Certified Review  
**Domain:** Multi-User Collaboration & Data Privacy  

---

## 1. Security & Privacy Threat Model

| Threat Scenario | Risk Level | WealthOS Technical Defense |
| :--- | :--- | :--- |
| **Cross-Tenant Household Access** | CRITICAL | PostgreSQL Row-Level Security (`FORCE ROW LEVEL SECURITY`) with `tenant_id` session setting. Cross-tenant lookups return 0 rows. |
| **Unauthorized Member Escalation** | HIGH | Strict role validation on mutations. Only `OWNER` can delete household; only `OWNER`/`ADMIN` can manage members. |
| **Token Hijacking on Invitations** | HIGH | Invitations use cryptographically secure 256-bit random tokens with SHA-256 hash stored in database. Tokens expire after 7 days and can be revoked. |
| **Private Account Data Leakage** | CRITICAL | `PERSONAL_ONLY` resources are filtered at the repository layer. Even `OWNER` cannot view another user's `PERSONAL_ONLY` accounts or transactions. |
| **Joint Resource Double-Counting** | MEDIUM | Deduplication engine ensures joint assets/liabilities are recognized only once in consolidated net worth, weighted by `allocation_percentage`. |

---

## 2. Invariant Verification

- [x] All 7 household tables enforce `FORCE ROW LEVEL SECURITY`.
- [x] Invitation tokens use SHA-256 hash lookups.
- [x] Internal settlements prevent double-counting in income/expense reports.
- [x] Non-shared personal accounts remain strictly inaccessible to other household members.
