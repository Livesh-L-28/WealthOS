# WealthOS — Wave 5 Defect & Risk Register

**Programme:** Wave 5 — Final Platform Integration and Acceptance  
**Status:** ACTIVE  
**Last Updated:** 2026-11-08  

---

## 1. Defect Classification Taxonomy

| Severity | Definition | SLA / Resolution Requirement |
| :--- | :--- | :--- |
| **P0 — Critical** | Data corruption, financial miscalculation, double-entry ledger imbalance, auth bypass, or test suite failure. | Immediate blocker. Must be resolved before proceeding. |
| **P1 — High** | Core flow broken, route inaccessible, API 500 error on valid input, or security policy violation. | Blocker for phase acceptance. Must be resolved within current phase. |
| **P2 — Medium** | Inconsistent UI terminology, accessibility defect, missing tooltips, or non-optimal UX transition. | Must be triaged and resolved before Wave 5 final sign-off. |
| **P3 — Low** | Minor visual alignment, cosmetic enhancement, or documentation clarification. | Tracked and addressed during polish gates. |

---

## 2. Active Defect & Technical Debt Register

| ID | Phase / Domain | Severity | Description | Current Status | Remediation Plan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-501** | Phase 12 / Shell | P2 | Navigation links in `Sidebar.tsx` form a long flat list of 13 items, causing cognitive overload for first-time users. | OPEN | Group navigation items into 8 functional sections (Overview, Money Management, Investments, Financial Planning, Debt, Documents & Tax, Intelligence, Household, Settings). |
| **DEF-502** | Phase 12 / Dashboard | P2 | Dashboard shows high-level metrics but lacks unified 5-Question answers linking directly to Digital Twin and risk alerts. | OPEN | Enhance `/dashboard` with 5-Question cockpit view, explicit `ACTUAL` vs `PROJECTED` badging, and freshness timestamps. |
| **DEF-503** | Phase 12 / Standards | P2 | Financial terms across different pages occasionally differ (e.g. "Net Burn" vs "Monthly Outflow", "Total Wealth" vs "Net Worth"). | OPEN | Author comprehensive `PHASE_12_FINANCIAL_METRIC_DICTIONARY.md` and standardize terminology across UI components. |
| **DEF-504** | Phase 13 / Integrations | P1 | External provider sync tables exist from Phase 0 (`financial_providers`, `provider_consents`, etc.) but lack a unified `ProviderAdapter` abstraction layer and webhook replay verification. | OPEN | Implement `backend/app/domains/integrations/` domain with standardized adapter interface, consent checks, and HMAC webhook verification. |
| **DEF-505** | Phase 13 / DR | P1 | Restore drill script defaults to earlier schema version in some places; must be verified and tested on `0010_wave_4_twin_household`. | RESOLVED | `scripts/restore_database.sh` updated to `0010_wave_4_twin_household` with backwards fallback chain. Verified in regression tests. |

---

## 3. Risk Mitigation Strategy

1. **Gate 0 Verification**: No code changes to production paths until Gate 0 audit is ratified and certified.
2. **Atomic Commits & Tests**: Every domain enhancement must be accompanied by automated unit/integration tests.
3. **Non-Destructive Navigation**: Navigation refactoring must not remove or rename any existing URLs, preserving all Playwright E2E test targets.
4. **Isolated Disaster Recovery**: Disaster recovery drill runs against an isolated database (`wealthos_dr_drill`) to avoid interrupting running backend or frontend processes.

