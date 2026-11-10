# WealthOS Mobile-to-Web Unification — Deliverable 6: Redesigned Web Component Inventory

**Status:** IMPLEMENTED | UNIT_TESTED | CROSS_PLATFORM_VERIFIED  
**Assigned Role:** Senior Next.js and React Engineer & Principal UI/UX Designer  

---

## 1. UI Primitives (`apps/web/src/components/ui`)

| Component | Path | Description & Mobile Parity Adaptations |
|---|---|---|
| `Card` | `src/components/ui/Card.tsx` | Base white card container (`rounded-2xl`, border `#E7ECE8`, subtle drop shadow). |
| `CardHeader` | `src/components/ui/Card.tsx` | Header bar with title, optional subtitle, and action buttons. |
| `Badge` | `src/components/ui/Badge.tsx` | Status pills (`positive`, `negative`, `warning`, `neutral`, `brand`) matching mobile badges. |
| `Button` | `src/components/ui/Button.tsx` | Primary (`#16A36A`), secondary, outline, danger buttons with accessible touch targets (min 44px for md). |
| `EmptyState` | `src/components/ui/EmptyState.tsx` | Consistent illustration, message, and action button for zero-state views. |
| `InfoTooltip` | `src/components/ui/InfoTooltip.tsx` | Interactive financial concept tooltip (Assets, Liabilities, Cash Flow). |

---

## 2. Layout Components (`apps/web/src/components/layout`)

| Component | Path | Description & Responsive Behavior |
|---|---|---|
| `AppShell` | `src/components/layout/AppShell.tsx` | Root layout container wrapping `Sidebar` and `Header` around page children. |
| `Sidebar` | `src/components/layout/Sidebar.tsx` | Adaptive navigation: full 64px desktop sidebar, 20px collapsed tablet mode, off-canvas mobile slide-over. |
| `Header` | `src/components/layout/Header.tsx` | Top application header with mobile hamburger, workspace switcher, and user profile avatar. |
| `NavContext`| `src/components/layout/NavContext.tsx`| React context for sidebar collapse and mobile drawer toggle state. |

---

## 3. Financial Modals (`apps/web/src/components/modals`)

| Modal Component | Path | Trigger & Double-Entry Alignment |
|---|---|---|
| `AddTransactionModal` | `src/components/modals/AddTransactionModal.tsx` | Fast double-entry journal transaction creation (Credit/Debit, accounts, categories). |
| `AddAccountModal` | `src/components/modals/AddAccountModal.tsx` | Connect institutional depository, demat, or credit account. |
| `AddInvestmentModal` | `src/components/modals/AddInvestmentModal.tsx` | Add equity, mutual fund, or SGB holding with purchase lot metadata. |
| `CreateBudgetModal` | `src/components/modals/CreateBudgetModal.tsx` | Define monthly spend envelope limit with overspending warnings. |
| `CreateGoalModal` | `src/components/modals/CreateGoalModal.tsx` | Create milestone goal with target date, target amount, and monthly savings. |
| `UploadDocumentModal`| `src/components/modals/UploadDocumentModal.tsx` | Upload bank statement / CAS PDF with OCR confidence & journal posting. |
| `AddSavingsModal` | `src/components/modals/AddSavingsModal.tsx` | Strategic goal savings deposit modal matching mobile "+ Add Savings" action. |

---

## 4. Charts & Visualizations (`apps/web/src/components/charts`)

| Chart Component | Path | Visual Language & Mobile Parity |
|---|---|---|
| `FinancialAreaChart` | `src/components/charts/FinancialAreaChart.tsx` | Net Worth smooth SVG area chart with gradient emerald fill. |
| `FinancialBarChart` | `src/components/charts/FinancialBarChart.tsx` | Inflow vs Outflow grouped vertical bars. |
| `FinancialHorizontalBarChart` | `src/components/charts/FinancialHorizontalBarChart.tsx` | Envelope progress & utilization bars with status colors. |
| `FinancialDonutChart`| `src/components/charts/FinancialDonutChart.tsx` | Portfolio asset allocation donut with interactive legend. |
| `FinancialWaterfallChart`| `src/components/charts/FinancialWaterfallChart.tsx` | Net worth change step-by-step waterfall diagram. |
| `FinancialHeatmap` | `src/components/charts/FinancialHeatmap.tsx` | Daily calendar spending intensity matrix. |
| `FinancialTableFallback`| `src/components/charts/FinancialTableFallback.tsx` | WCAG accessible tabular fallback for every financial chart. |

