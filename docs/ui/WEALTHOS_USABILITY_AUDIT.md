# WealthOS — Usability Audit & Usability Issue Register

**Date:** 2026-11-08  
**Scope:** WealthOS Web Application (`apps/web`)  
**Target User Profiles:** First-time users, young professionals, multi-account managers, experienced investors, non-technical users.  
**Standard:** WCAG 2.2 Level AA Usability & Accessibility Standards.

---

## 1. Executive Summary

This UX audit evaluated the entire WealthOS application across 10 usability dimensions: dashboard comprehension, navigation predictability, discoverability, task completion clarity, form complexity, financial terminology barriers, chart legibility, error recovery, mobile ergonomics, and accessibility.

While WealthOS features a clean light financial palette (`#F7F9F7` canvas, `#FFFFFF` cards, `#16A36A` accents) and strict double-entry ledger integrity, the audit identified critical usability friction points that create barriers for non-expert users. The primary defect is the absence of guided, low-friction input workflows (action buttons do not open modal wizards), excessive jargon without contextual definitions ("FIFO lot consumption", "Solvency Ratio", "Unrealized P&L"), lack of a mobile navigation drawer, and absent dashboard personalization/period filters.

---

## 2. Evaluation Across 10 Core Usability Criteria

### 2.1 How easily users understand the dashboard
- **Current State:** The dashboard renders 10 cards simultaneously with dense financial metrics.
- **Friction Points:** First-time users cannot immediately answer the 5 core financial questions: (1) Total money, (2) What I own, (3) What I owe, (4) Inflow vs Outflow, (5) Goal progress. Jargon like "Σ(Dr - Cr) = 0.0000" and "Deterministic solvency ratios" confuses everyday savers.
- **Severity:** High.

### 2.2 Navigation predictability and label clarity
- **Current State:** Sidebar uses clustered enterprise names: "Executive Dashboard", "Net Worth Statement", "Accounts & Wallets", "Transaction Ledger", "Investment Portfolio", "Expense & Cash Flow", "Budgets & Envelopes", "Financial Goals", "Document Vault".
- **Friction Points:** Non-standard labels force users to read long compound phrases. On mobile (<768px), the sidebar remains a fixed block without an off-canvas drawer or hamburger menu toggle.
- **Severity:** High.

### 2.3 Information discoverability
- **Current State:** Quick Actions exist on the dashboard, but clicking "Add Transaction" or "Connect Account" navigates away to a full table view where the user must hunt for an action button.
- **Friction Points:** Deeply nested paths for security and audit settings.
- **Severity:** Medium.

### 2.4 Task completion without confusion
- **Current State:** "Add Account", "Add Folio", "New Budget Envelope" buttons lack interactive dialogs/wizards. Users click buttons with zero visual response.
- **Friction Points:** Incomplete interaction loops leave users stranded.
- **Severity:** Critical.

### 2.5 Form complexity and friction
- **Current State:** No inline transaction creation form exists on `/transactions`. Users cannot input cash expenses or bank transfers directly.
- **Friction Points:** Missing step-by-step guidance, category suggestions, and amount validation.
- **Severity:** Critical.

### 2.6 Financial terminology explanations
- **Current State:** Terms like "Net Worth", "Assets", "Liabilities", "Portfolio", "Cost Basis", "Realized Profit", "Unrealized Profit", "Cash Flow", "Asset Allocation", "Expense Ratio", "CAGR", "XIRR" are displayed without definitions or tooltips.
- **Friction Points:** Intimidates beginners and non-financial professionals.
- **Severity:** High.

### 2.7 Data visualization utility
- **Current State:** Charts display SVG shapes, but lack explicit currency notation (₹ INR), time period switches (1M, 3M, 6M, 1Y, ALL), and plain-English narrative summaries explaining the numbers.
- **Severity:** Medium.

### 2.8 Error recovery and guidance
- **Current State:** Errors display generic messages without explaining whether user data is safe, why the operation failed, or how to retry.
- **Severity:** High.

### 2.9 Mobile touch ergonomics
- **Current State:** On screen widths < 768px, horizontal scrolling occurs on transaction tables. Touch targets for several icon buttons are 28x28px (< 44x44px minimum).
- **Severity:** High.

### 2.10 Accessibility & WCAG 2.2 AA compliance
- **Current State:** Missing `aria-expanded` and `aria-controls` on mobile toggles, lack of tooltip keyboard focus accessibility, and insufficient contrast on muted badge text (`#9BA39D` on white = 2.4:1, fails AA 4.5:1).
- **Severity:** High.

---

## 3. Prioritized Usability Issue Register

| ID | Module / Component | User Problem | Why It Causes Confusion | Proposed Improvement | Priority | Status |
|---|---|---|---|---|---|---|
| **ISS-01** | Global Navigation (`Sidebar.tsx`, `Header.tsx`) | Complex compound names ("Executive Dashboard", "Accounts & Wallets") | Users take longer to find basic pages; no hamburger drawer on mobile | Simplify navigation labels to standard 1-2 word terms: Overview, Accounts, Transactions, Investments, Cash Flow, Budgets, Goals, Documents, Reports, Financial Copilot. Add responsive mobile drawer. | **P0** | Planned |
| **ISS-02** | Terminology (`InfoTooltip.tsx`) | Unexplained financial jargon (Cost basis, Unrealized P&L, XIRR, Net Worth) | Beginners feel intimidated and unsure of their finances | Create reusable `<InfoTooltip />` with plain-English definitions and place next to all key financial terms. | **P0** | Planned |
| **ISS-03** | Core Workflows (`AddTransactionModal.tsx`) | No way to enter a transaction from dashboard or ledger | Users cannot record daily expenses or income | Build step-by-step guided modal: Type (Income/Expense), Amount, Account, Category suggestions, Date, Review & Confirm. | **P0** | Planned |
| **ISS-04** | Core Workflows (`AddAccountModal.tsx`) | "Link Account" button is non-interactive | Users cannot connect bank, demat, or credit cards | Build guided modal: Account Type selector, Institution, Balance, Currency, Review & Confirm. Never ask for PINs/passwords. | **P0** | Planned |
| **ISS-05** | Core Workflows (`CreateBudgetModal.tsx`) | "New Budget Envelope" button does nothing | Users cannot set spending targets | Build modal with category selection, monthly limit, threshold alert slider, and instant preview. | **P0** | Planned |
| **ISS-06** | Core Workflows (`CreateGoalModal.tsx`) | Missing Add Goal button on `/goals` | Users cannot define savings milestones | Build modal with goal name, target amount, target date, current savings, and trajectory projection. | **P0** | Planned |
| **ISS-07** | Core Workflows (`AddInvestmentModal.tsx`) | "Add Folio" button does nothing on `/investments` | Users cannot record MF schemes or stock purchases | Build modal for Asset Type (Mutual Fund, Stock, FD, Gold), Folio/Ticker, Quantity, Buy NAV, and Date. | **P0** | Planned |
| **ISS-08** | Core Workflows (`UploadDocumentModal.tsx`) | Document upload zone lacks multi-step progress & manual review | Users cannot preview extracted entries before posting to ledger | Add file format validation, simulated parsing progress, and explicit ledger posting approval step. | **P1** | Planned |
| **ISS-09** | Dashboard Architecture (`/dashboard`) | 10 dense cards without immediate 5-question clarity | High cognitive load for first-time visitors | Add 5-question Executive Summary bar, period selector (This Month, Last Quarter, Year-to-Date), and customizable section visibility toggles. | **P1** | Planned |
| **ISS-10** | Onboarding Guidance (`OnboardingChecklist.tsx`) | Static 4/4 badge without interactive checklist or re-open option | New users have no structured guided tour or way to track setup | Add collapsible, dismissible Onboarding Progress Banner with actionable links to add account, record expense, and set goal. | **P1** | Planned |
| **ISS-11** | Copilot Usability (`/copilot`) | Complex prompts required; lacks quick-start question chips | Beginners do not know what questions to ask | Add 6 curated beginner question chips with instant answers, source citations, and clear calculation explanations. | **P1** | Planned |
| **ISS-12** | Mobile Usability & Touch Targets | Fixed sidebar pushes content; touch targets < 44px | Uncomfortable on mobile devices; accidental clicks | Implement sliding off-canvas navigation drawer, bottom action bar, min 44x44px touch targets, and horizontal scroll indicators. | **P0** | Planned |
| **ISS-13** | Empty & Error States (`EmptyState.tsx`, Error alerts) | Empty tables show blank rows; errors lack recovery actions | User does not know what to do next or if data is safe | Standardize empty states with helpful illustrations and primary CTA buttons. Add clear error recovery and stale-data timestamp badges. | **P1** | Planned |
| **ISS-14** | Accessibility (WCAG 2.2 AA) | Muted text `#9BA39D` fails 4.5:1 contrast; missing keyboard focus indicators | Screen reader users and visually impaired users face barriers | Replace low-contrast gray with `#717D74` (4.8:1), add `focus-visible:ring-2 ring-[#16A36A]`, semantic landmarks, and ARIA labels. | **P1** | Planned |

---
