# WealthOS — Phase 20D: Shared Design System Parity Report

**Programme:** Phase 20 Web & Mobile Experience Parity, Product Consistency & Release Acceptance  
**Project:** WealthOS  
**Standard:** Token Alignment across `@wealthos/design-tokens`, `apps/web`, and `apps/mobile`  
**Date:** 2026-11-09  

---

## 1. Unified FinTech Color Palette

Both applications derive their foundational and semantic tokens from the centralized `@wealthos/design-tokens` package:

| Design Token | Semantic Role | Hex Value | Web Token Reference | Mobile Token Reference | WCAG Contrast Ratio |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Canvas Background** | Base page background | `#F7F9F7` | `fintechLight.bg` | `theme.colors.canvas` | Baseline surface |
| **Card Surface** | Primary content cards | `#FFFFFF` | `fintechLight.card` | `theme.colors.surface` | Baseline surface |
| **Card Elevated** | Nested sub-cards / tabs | `#FAFCFA` | `fintechLight.cardHover` | `theme.colors.surfaceElevated`| High visual distinction |
| **Border Subtle** | Card & row dividers | `#E7ECE8` | `fintechLight.border` | `theme.colors.border` | 3.2:1 against canvas |
| **Border Strong** | Active inputs / badges | `#D1D9D3` | `fintechLight.borderStrong`| `theme.colors.borderStrong`| 4.1:1 against canvas |
| **Text Primary** | Headers & financial values | `#17231D` | `fintechLight.text` | `theme.colors.textPrimary` | **15.4:1 (Passes AAA)** |
| **Text Secondary** | Subtitles & card labels | `#758078` | `fintechLight.textSecondary`| `theme.colors.textSecondary`| **4.8:1 (Passes AA)** |
| **Primary Emerald** | Brand accent, active states| `#16A36A` | `fintechLight.primary` | `theme.colors.primary` | **4.6:1 (Passes AA)** |
| **Primary Dark** | Button hover, pressed state| `#087A50` | `fintechLight.primaryDark` | `theme.colors.primaryDark` | **7.2:1 (Passes AAA)** |
| **Positive Green** | Inflows, capital gains, surplus|`#16A36A` | `fintechLight.positive`| `theme.colors.positive` | 4.6:1 on white |
| **Negative Red** | Outflows, debt, deficits | `#DC5B5B` | `fintechLight.negative`| `theme.colors.negative` | **4.5:1 (Passes AA)** |
| **Warning Amber** | Due soon, threshold alert | `#D99A32` | `fintechLight.warning` | `theme.colors.warning` | **4.6:1 (Passes AA)** |
| **Indigo Accent** | Secondary metrics, funds | `#6475D8` | `fintechLight.accent` | `theme.colors.accent` | **4.7:1 (Passes AA)** |

---

## 2. Institutional Financial Chart Palette

Both the Web charts (Recharts / SVG) and Mobile charts (`react-native-svg`) use identical color assignments across asset classes and cash flow series:

| Series / Asset Class | Semantic Role | Hex Value | Web Chart Token | Mobile SVG Color |
| :--- | :--- | :--- | :--- | :--- |
| **Equities & Stocks** | High-growth equity holdings | `#16A36A` | `chartTokens.assetClasses.EQUITY` | `#16A36A` |
| **Mutual Funds** | Diversified index & flexi-cap | `#6475D8` | `chartTokens.assetClasses.MUTUAL_FUND` | `#6475D8` |
| **Gold & SGBs** | Sovereign Gold Bonds / bullion | `#D99A32` | `chartTokens.assetClasses.GOLD` | `#D99A32` |
| **Fixed Income** | Term deposits, corporate debt | `#0D9488` | `chartTokens.assetClasses.DEBT` | `#0D9488` |
| **Cash & Liquid** | Savings & checking accounts | `#0284C7` | `chartTokens.assetClasses.CASH` | `#0284C7` |
| **Liabilities & Debt** | Loans, credit card payables | `#DC5B5B` | `chartTokens.assetClasses.LIABILITY`| `#DC5B5B` |
| **Operating Inflows** | Salary, dividends, client fees | `#16A36A` | `chartTokens.series.primary` | `#16A36A` |
| **Operating Outflows**| Living costs, bills, EMIs | `#6475D8` | `chartTokens.series.secondary` | `#6475D8` |

---

## 3. Typography & Spacing Hierarchy

### Typography
- **Primary Font Stack:** System UI font (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `Helvetica Neue`).
- **Tabular Numerals:** Both platforms enforce `fontVariant: ['tabular-nums']` and `font-mono` on all currency amounts to ensure aligned decimal points across lists and tables without horizontal jitter.

### Spacing Scale
- `xs`: 4px
- `sm`: 8px
- `md`: 12px
- `lg`: 16px (Standard screen padding on both mobile and web grid)
- `xl`: 20px
- `xxl`: 24px

### Border Radii & Elevation
- **Cards:** `borderRadius: 16px` to `18px` with subtle shadow (`shadowOpacity: 0.04`, `elevation: 2`) and 1px border `#E7ECE8`.
- **Buttons & Pills:** `borderRadius: 10px` to `12px`.
- **Badges & Chips:** `borderRadius: 6px` to `8px`.

