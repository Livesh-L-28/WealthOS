# WealthOS Mobile-to-Web Unification — Deliverable 2: Mobile Design System Extraction

**Status:** IMPLEMENTED | VISUALLY_REVIEWED | CROSS_PLATFORM_VERIFIED  
**Assigned Role:** Principal UI/UX Designer & Cross-Platform Design Systems Architect  

---

## 1. Color System Extraction

The WealthOS Mobile application uses an authoritative Emerald Fintech color palette optimized for high-contrast accessibility (WCAG 2.2 AA compliant):

| Token Name | Hex Code | Usage & Semantic Purpose |
|---|---|---|
| `fintech.primary` | `#16A36A` | Primary brand action, active pills, links, key metrics |
| `fintech.primaryDark` | `#087A50` | Primary buttons, active tab headings, high-contrast labels |
| `fintech.bg` / `canvas` | `#F7F9F7` / `#EEF2EF` | Main page background canvas, off-screen drawers |
| `fintech.card` / `surface`| `#FFFFFF` | Primary card background, dialog surfaces |
| `fintech.cardHover` | `#FAFCFA` / `#F0F4F1` | Card hover state, table row alternating tint |
| `fintech.border` | `#E7ECE8` | Standard card, divider, and input border |
| `fintech.borderStrong` | `#D1D9D3` | Focus rings, strong divider lines, active border |
| `fintech.text` | `#17231D` | Primary typography, headers, high-emphasis currency |
| `fintech.textSecondary` | `#758078` | Secondary labels, descriptions, timestamps |
| `fintech.textMuted` | `#9BA39D` | Inactive placeholders, disabled hints |
| `fintech.positive` | `#16A36A` | Positive yield, asset growth, surplus, reconciled status |
| `fintech.positiveBg` | `#E8F5EE` / `#ECFDF5` | Positive badge and notification pill backgrounds |
| `fintech.negative` | `#DC5B5B` | Outflows, debt, expenses, overdue alerts |
| `fintech.negativeBg` | `#FEF2F2` | Negative badge and warning pill backgrounds |
| `fintech.warning` | `#D99A32` | Approaching limits, upcoming obligations |
| `fintech.warningBg` | `#FFFBEB` | Warning callout backgrounds |
| `fintech.accent` | `#6475D8` | AI Copilot features, investments, mutual funds |
| `fintech.accentBg` | `#EEF0FA` | Copilot message badge background |

---

## 2. Typography Extraction

- **Primary Font Family:** `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Monospace Financial Family:** `'JetBrains Mono', 'SF Mono', monospace`
- **Tabular Figures:** Always enabled via CSS `font-variant-numeric: tabular-nums` for clean currency column alignment.
- **Currency Symbol Standard:** Indian Rupee `₹` formatted with Indian Numbering System (`en-IN` commas: Lakhs/Crores, e.g. `₹75,37,901.25`).

### Hierarchy & Scale:
- **Display 1 (Net Worth Hero):** `text-3xl` / `32px` font-black (`font-extrabold`), letter-spacing `-0.02em`
- **Section Heading:** `text-2xl` / `24px` font-bold, letter-spacing `-0.015em`
- **Card Title:** `text-sm` / `14px` font-bold, uppercase tracking-wide
- **Body Regular:** `text-xs` / `12px` font-medium, leading `1.5`
- **Caption / Pill:** `text-[10px]` or `text-[9px]` font-bold, tracking-wide

---

## 3. Spacing, Radius & Elevation

- **Base Radius:** `rounded-2xl` (`16px`) for primary cards and modal dialogs; `rounded-xl` (`12px`) for buttons and badges; `rounded-full` for pill tags.
- **Card Border:** `1px solid #E7ECE8` with subtle drop shadow `0 1px 3px 0 rgba(23, 35, 29, 0.04)`.
- **Card Padding:** `p-5` (`20px`) on desktop/tablet, `p-4` (`16px`) on mobile viewports.
- **Grid Layout:** 1-column on mobile (<640px), 2-column on tablet/laptop (640px–1024px), 3–4 column on wide desktop (>1024px).

---

## 4. Interaction Patterns

- **Segmented Control Tabs:** Outer pill `#EEF2EF` with border `#E7ECE8`, active item elevated white card `#FFFFFF` with text `#17231D` and subtle shadow.
- **Quick Action Floating / Header Buttons:** Rounded buttons with icon + bold label, hover scale/tint transition.
- **Double-Entry Journal Reference Badges:** Monospace `JE-YYYY-MMDD-NNN` tags with verified reconciliation indicators.
- **Drilldown Modals:** Sheet overlay with slide-up animation and instant accounting feedback.

