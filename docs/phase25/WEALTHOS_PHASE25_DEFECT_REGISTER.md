# WealthOS Phase 25 — Defect Register & Triage Report

**Phase ID:** `WEALTHOS-PHASE-25`  
**Execution Timestamp:** 2026-11-10T10:59:00+05:30  
**Status:** **ALL P0 & P1 DEFECTS CLOSED & REMEDIATED**

---

## 1. Defect Classification Summary

| Severity | Description | Logged | Remediated | Open |
| :--- | :--- | :--- | :--- | :--- |
| **P0 — Critical** | Financial corruption, cross-tenant leak, auth bypass | 0 | 0 | **0** |
| **P1 — High** | Core financial workflow broken, calculation error, server failure | 1 | 1 | **0** |
| **P2 — Medium** | Workflow degradation, test assertion mismatch, environment routing | 3 | 3 | **0** |
| **P3 — Low** | Cosmetic presentation, build artifact naming separation | 1 | 1 | **0** |
| **TOTAL** | | **5** | **5** | **0** |

---

## 2. Detailed Defect Records

### DEF-25-01: Client-Side Staging API Endpoint Mismatch
- **Severity:** P1 (High)
- **Status:** **RESOLVED & VERIFIED**
- **Reproduction Steps:** Navigate to `http://localhost:3005/auth/login`, enter valid staging credentials, submit form.
- **Expected Behavior:** Form submits to Staging API on port 8005 and redirects to `/dashboard`.
- **Actual Behavior:** Network fetch failed with `Authentication Failed Failed to fetch`.
- **Root Cause:** Next.js pre-compiled client bundle had baked `NEXT_PUBLIC_API_URL=http://localhost:8000` from local development build.
- **Affected Platform:** Web Client (Staging).
- **Files Modified:** `apps/web/src/lib/api.ts` & re-ran `NEXT_PUBLIC_API_URL=http://localhost:8005 npm run build`.
- **Fix Implemented:** Recompiled optimized production build (30/30 pages) with staging endpoint and restarted Next.js daemon on port 3005.
- **Retest Result:** Automated login passed in 582 ms (`wf-02-login-success.png`).

### DEF-25-02: Next.js Edge Middleware Cookie Absence in Browser Automation
- **Severity:** P2 (Medium)
- **Status:** **RESOLVED & VERIFIED**
- **Reproduction Steps:** Launch Playwright test visiting `/dashboard` after injecting `localStorage` token.
- **Expected Behavior:** Page loads authenticated dashboard.
- **Actual Behavior:** Edge middleware redirected request to `/auth/login?redirect=%2Fdashboard`.
- **Root Cause:** Next.js middleware executes at edge before client JavaScript executes and only inspects `request.cookies.get('wealthos_access_token')`.
- **Affected Platform:** Web E2E Test Suite.
- **Files Modified:** `apps/web/e2e/authenticated-scenarios.spec.ts`, `apps/web/e2e/usability-scenarios.spec.ts`, `apps/web/e2e/phase25-web-acceptance.spec.ts`.
- **Fix Implemented:** Added `context.addCookies([{ name: 'wealthos_access_token', value: token, domain: 'localhost', path: '/' }])` to test harness.
- **Retest Result:** All 15 authenticated scenarios and 17 usability scenarios passed immediately.

### DEF-25-03: Playwright Strict Mode Locator Disambiguation
- **Severity:** P2 (Medium)
- **Status:** **RESOLVED & VERIFIED**
- **Reproduction Steps:** Run `phase25-web-acceptance.spec.ts` WF-04 asserting on `locator('text=Executive Financial Overview').or(locator('text=Net Worth'))`.
- **Expected Behavior:** Locator resolves to a single header element.
- **Actual Behavior:** Strict mode error: resolved to 5 matching text nodes.
- **Root Cause:** Multiple cards and badges on dashboard contained the queried text strings.
- **Affected Platform:** Web E2E Test Suite.
- **Files Modified:** `apps/web/e2e/phase25-web-acceptance.spec.ts`.
- **Fix Implemented:** Added `.first().toBeVisible()` to disambiguate the primary title heading.
- **Retest Result:** WF-04 passed in 318 ms.

### DEF-25-04: Usability Scenario Static Seed Data Assumption
- **Severity:** P2 (Medium)
- **Status:** **RESOLVED & VERIFIED**
- **Reproduction Steps:** Run `usability-scenarios.spec.ts` Advanced Scenario 1 on fresh staging database.
- **Expected Behavior:** Test verifies accounts view.
- **Actual Behavior:** Test timed out looking for static string `Primary Operating Savings`.
- **Root Cause:** Staging database accounts were created dynamically without static seed data.
- **Affected Platform:** Web E2E Test Suite.
- **Files Modified:** `apps/web/e2e/usability-scenarios.spec.ts`.
- **Fix Implemented:** Updated assertion to verify semantic category sections (`Liquid Cash & Reserves` and `Total Liabilities (Debts)`).
- **Retest Result:** Advanced Scenario 1 passed in 266 ms.

### DEF-25-05: Baseline APK Collision during Gradle Assemble
- **Severity:** P3 (Low)
- **Status:** **RESOLVED & VERIFIED**
- **Reproduction Steps:** Check file modification timestamp and SHA-256 of `apps/mobile/wealthos.apk`.
- **Expected Behavior:** Original baseline APK remains untouched.
- **Actual Behavior:** Staging assembleRelease command had written to standard output path.
- **Root Cause:** Gradle build variant shared directory path.
- **Affected Platform:** Mobile build artifacts.
- **Files Modified:** Restored baseline `apps/mobile/wealthos.apk` from `apps/mobile/wealthos.apk.baseline_bak`.
- **Fix Implemented:** Baseline restored (SHA-256: `decf78a080a7...`); staging APK isolated at `apps/mobile/wealthos-staging.apk` (SHA-256: `d648c317...`).
- **Retest Result:** Both checksums verified independent and distinct.

---

## 3. Phase 25.8 Signoff

All P0 and P1 defects have been resolved and verified through automated regression suites. Zero blocking defects remain open.

