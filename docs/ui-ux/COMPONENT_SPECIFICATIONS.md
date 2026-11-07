# WEALTHOS — REUSABLE FINTECH COMPONENT SPECIFICATIONS

**Document Reference:** WOS-UX-CMP-001  
**Standard Compliance:** W3C WAI-ARIA 1.2 / WCAG 2.1 Level AA  
**Version:** 1.0.0-RELEASE-CANDIDATE  
**Status:** APPROVED / FROZEN BASELINE  
**Classification:** Product Design Specification  

---

## 1. COMPONENT DIRECTORY OVERVIEW

This specification defines the 22 core reusable components in the WealthOS design system. Every component is documented with:
- **Variants:** Visual treatments (Primary, Secondary, Destructive, Ghost, Outline).
- **Interactive States:** Default, Hover, Focus-Visible, Active, Disabled, Loading.
- **Keyboard Navigation & Accessibility:** ARIA roles, tabindex, keydown behaviors (`Enter`, `Space`, `Escape`, Arrow keys).
- **Responsive Adaptations:** Desktop to touch target sizing ($\ge 44\text{px} \times 44\text{px}$ on mobile).

---

## 2. ATOMIC & FORM CONTROLS

### 2.1 Button (`<Button />`)
- **Variants:**
  - `primary`: `#6366F1` background, `#FFFFFF` text. Main CTAs ("Confirm & Post", "Save Transaction").
  - `secondary`: `#1E293B` background, `1px solid #374151` border, `#F8FAFC` text. Standard actions ("Cancel", "Filter").
  - `destructive`: `#F43F5E` background, `#FFFFFF` text. Irreversible actions ("Revoke Access", "Delete Account").
  - `ghost`: Transparent background, hover to `#1F2937`. Table row action menus, icon buttons.
  - `outline`: Transparent background, `1px solid #4B5563` border. Export/download buttons.
- **Sizes:** `sm` (height 32px, text 12px), `md` (height 40px, text 14px), `lg` (height 48px, text 16px).
- **States:** Default, Hover, Focus-visible (ring 2px `#6366F1` offset 2px `#0B0F17`), Active, Disabled (opacity 0.4, cursor not-allowed), Loading (replaces label with spinner).
- **Accessibility:** `role="button"`, `tabindex="0"`, triggers on `Enter` and `Space`.

### 2.2 Text Input (`<Input />`)
- **Variants:** `default`, `currency` (features permanent left-adorned currency symbol like ₹ or $ with tabular monospaced input), `password` (toggleable eye icon), `search` (leading magnifying glass, trailing clear button).
- **States:** Default (border `#374151`, bg `#111827`), Hover (border `#4B5563`), Focus-visible (border `#6366F1`, ring 1px `#6366F1`), Error (border `#F43F5E`, error message container rendered below with `role="alert"`), Disabled.
- **Keyboard:** Standard text editing; `Escape` clears search inputs.

### 2.3 Select Dropdown (`<Select />`)
- **Architecture:** Built on Radix UI Primitive.
- **Display:** Trigger pill showing selected value; popover menu with search filter for large datasets (e.g., account picker, category selector).
- **Keyboard:** `Enter`/`Space` opens; `ArrowDown`/`ArrowUp` cycles options; typing characters jumps to matching item; `Escape` dismisses.
- **Accessibility:** `aria-haspopup="listbox"`, `aria-expanded="true/false"`, `role="listbox"`, `role="option"` with `aria-selected`.

### 2.4 Date & Range Picker (`<DatePicker />`)
- **Display:** Single date or range selector. Calendar popover with month/year navigation, quick presets ("This Month", "Last Quarter", "FY 2026-27").
- **Financial Formatting:** Explicitly formats as `DD MMM YYYY` (e.g., `07 Nov 2026`) to avoid `MM/DD` vs `DD/MM` international confusion.
- **Keyboard:** Arrow keys navigate grid; `PageUp`/`PageDown` jumps months.

---

## 3. DATA DISPLAY & FINANCIAL TABLES

### 3.1 Financial Metric Card (`<FinancialStatCard />`)
- **Purpose:** Primary metric KPI card on dashboards.
- **Layout:**
  - Header: Label (e.g., "Total Net Worth") + Context info tooltip.
  - Main Value: `text-display` or `text-mono-lg` with explicit currency symbol (`₹1,42,85,920.00`).
  - Secondary Row: Delta Pill (`+₹4,20,500.00 (+3.03%)` in `#10B981` with trend arrow) + Comparison label (`vs last month`).
  - Bottom: Micro-sparkline (SVG path showing 30-day trajectory).
- **Interactive:** Entire card is clickable if drilldown exists; hover elevation shifts to `bg-card-hover`.

### 3.2 Financial Data Table (`<DataTable />`)
- **Purpose:** High-density display of transactions, holdings, and lots.
- **Features:**
  - **Fixed Header:** Sticks during vertical scrolling.
  - **Column Alignment:** Text aligned Left; Categories/Status aligned Center; Monetary amounts and quantities strictly aligned **Right** with `font-mono tabular-nums`.
  - **Sortable Columns:** Clicking column header toggles Ascending / Descending with arrow indicator.
  - **Zebra Striping:** Optional alternating background (`#111827` and `#141C2E`) for 50+ row datasets.
  - **Row Selection:** Checkbox column with "Select All" header for bulk actions.
  - **Row Action Menu:** `•••` trigger revealing contextual actions (View Journal, Split, Download Receipt).
- **Responsive:** On mobile screens ($< 768\text{px}$), complex 7-column tables collapse into vertical card list items without loss of underlying data.

### 3.3 Chart Container (`<ChartContainer />`)
- **Layout:**
  - Header: Chart title, description, time-range segment control (`1M`, `6M`, `1Y`, `3Y`, `ALL`).
  - Legend: Color-coded dots with category names and current values.
  - Body: Apache ECharts container with auto-resize observer.
  - Fallback / Accessibility: Accessible toggle button: *"View as Table"* to switch chart into an accessible tabular view for screen readers.

---

## 4. CONTAINERS, MODALS & FEEDBACK CONTROLS

### 4.1 Modal Dialog (`<Modal />`)
- **Layout:** Backdrop overlay (`rgba(11, 15, 23, 0.85)` with backdrop-blur 4px); Centered dialog box (max-width 560px for standard, 840px for complex financial builders).
- **Header:** Title (`text-h2`), description (`text-secondary`), close button (`X`).
- **Footer:** Action buttons right-aligned (Secondary action first, Primary action last).
- **Keyboard:** Traps focus inside modal; `Escape` closes modal (unless non-dismissable confirmation); restores focus to trigger element on dismiss.

### 4.2 Slide-over Drawer (`<Drawer />`)
- **Layout:** Slides in from right edge (width 440px on desktop, 100% on mobile).
- **Usage:** Transaction details, split builders, Copilot panel, audit logs.
- **Keyboard:** `Escape` closes; maintains internal scroll independent of background body.

### 4.3 Alert Banner (`<Alert />`)
- **Variants:**
  - `info`: Blue `#38BDF8` rim, information circle icon.
  - `positive`: Emerald `#10B981` rim, checkmark circle icon.
  - `warning`: Amber `#F59E0B` rim, alert triangle icon. Used for arithmetic mismatches and upcoming bill due dates.
  - `destructive`: Rose `#F43F5E` rim, alert octagon icon. Used for failed ledger validations and sync errors.
- **Accessibility:** `role="alert"` or `role="status"`.

### 4.4 Toast Notification (`<Toast />`)
- **Layout:** Fixed bottom-right notification pill with auto-dismiss (default 4 seconds).
- **Features:** Success message, optional action link (e.g., *"Undo"* or *"View Ledger Entry"*).

### 4.5 Empty State (`<EmptyState />`)
- **Layout:** Centered icon (in `#374151` circular container), clear heading (`text-h3`), explanation (`text-secondary`), and a single prominent primary CTA button (e.g., *"+ Upload Bank Statement"*).
- **Rule:** Never display a completely blank container or generic "No data" text without an actionable path forward.

### 4.6 Loading Skeleton (`<LoadingSkeleton />`)
- **Layout:** Pulse-animated rectangular and text-line placeholders matching exact typography heights and card dimensions (`#1F2937` to `#374151` gradient pulse).
- **Rule:** Eliminates layout shift (CLS = 0) during API data fetching.
