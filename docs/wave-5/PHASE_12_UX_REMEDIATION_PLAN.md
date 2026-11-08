# WealthOS — Phase 12 UX Remediation & Unification Plan

**Programme:** Wave 5 — Final Platform Integration and Acceptance  
**Phase:** Phase 12 — Unified User Experience  
**Date:** 2026-11-08  

---

## 1. Remediation Objectives

1. **Information Architecture Unification**: Organize all 13 sidebar links into structured, functional sections to minimize cognitive load while preserving existing route paths and test selectors.
2. **Visual Status Badging**: Clearly distinguish between `ACTUAL` (settled, double-entry ledger verified) and `PROJECTED` (forecasted, actuarial, or what-if) financial figures across the dashboard and analytics.
3. **Data Freshness Disclosure**: Consistently display real-time sync timestamps and data provenance across all overview cards.
4. **Standardized Design Tokens**: Ensure consistent padding, typography sizes, border radii, and color palettes across all views.
5. **Accessibility Rigor**: Maintain 100% WCAG 2.2 AA conformance for keyboard navigation, focus indicators, ARIA attributes, and color contrast.

---

## 2. Navigation Architecture Plan

The navigation in `apps/web/src/components/layout/Sidebar.tsx` will be structured into distinct sections:

1. **Cockpit & Control**:
   - `Overview` (`/dashboard`, icon: `LayoutDashboard`)
   - `Control Centre` (`/reconciliation`, icon: `ShieldCheck`, badge: `Recon`)
2. **Cash & Money Management**:
   - `Accounts` (`/accounts`, icon: `Landmark`)
   - `Transactions` (`/transactions`, icon: `ArrowLeftRight`)
   - `Cash Flow` (`/analytics`, icon: `Wallet`)
   - `Budgets` (`/budgets`, icon: `PieChart`)
3. **Investments & Wealth**:
   - `Investments` (`/investments`, icon: `TrendingUp`)
   - `Reports` (`/net-worth`, icon: `FileSpreadsheet`)
4. **Planning & Goals**:
   - `Goals` (`/goals`, icon: `Target`)
5. **Intelligence & Collaboration**:
   - `Financial Copilot` (`/copilot`, icon: `Bot`, badge: `AI`)
   - `Household` (`/household`, icon: `Users`, badge: `Shared`)
   - `Documents` (`/documents`, icon: `FileText`)
6. **Settings & Preferences**:
   - `Security & Audit` (`/settings/security`, icon: `ShieldCheck`)
   - `Workspace Settings` (`/settings/workspaces`, icon: `Settings`)

---

## 3. Implementation Schedule

- **Step 1**: Author `PHASE_12_NAVIGATION_ARCHITECTURE.md` and `PHASE_12_FINANCIAL_METRIC_DICTIONARY.md`.
- **Step 2**: Refactor `Sidebar.tsx` with section grouping and section headings while maintaining exact labels, hrefs, icons, and test selectors.
- **Step 3**: Enhance `DashboardExecutiveSummary.tsx` with explicit `ACTUAL` and `PROJECTED` badges and data freshness indicators.
- **Step 4**: Author Accessibility & Responsive Acceptance documents.
- **Step 5**: Run full regression test suite (Pytest, Vitest, Typecheck, Next.js build, Playwright E2E) to certify zero regressions.

