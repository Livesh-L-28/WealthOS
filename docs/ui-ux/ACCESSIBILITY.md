# WEALTHOS — ACCESSIBILITY SPECIFICATIONS & WCAG 2.1 AA COMPLIANCE

**Document Reference:** WOS-UX-ACC-001  
**Standard Compliance:** WCAG 2.1 Level AA / Section 508 / WAI-ARIA 1.2  
**Version:** 1.0.0-RELEASE-CANDIDATE  
**Status:** AUDITED & WCAG 2.1 AA COMPLIANT  
**Classification:** Product Design Specification  

---

## 1. ACCESSIBILITY COMPLIANCE TARGET

WealthOS enforces **WCAG 2.1 Level AA** compliance across all web and mobile interfaces. Financial intelligence must be universally accessible to power users navigating via screen readers, keyboard-only operators, and users with visual or motor impairments.

All foreground and background token pairings are verified via the reproducible verification script: [`scripts/verify_contrast.py`](file:///Users/livesh/WEALTHOS/scripts/verify_contrast.py).

---

## 2. COLOR CONTRAST RATIO AUDIT (W3C RELATIVE LUMINANCE ALGORITHM)

Every text and interactive foreground token is measured against all dark application backgrounds using the official W3C relative luminance formula:

$$\text{Contrast Ratio} = \frac{L_1 + 0.05}{L_2 + 0.05}$$

### 2.1 Contrast Audit Matrix

| Foreground Token | Tested Background | Calculated Ratio | WCAG 2.1 AA Requirement | Compliance Status |
|---|---|---|---|---|
| `text_primary` (`#F8FAFC`) | `canvas` (`#0B0F17`) | **18.33 : 1** | $\ge 4.5 : 1$ (Normal Text) | **PASS (Exceeds AAA)** |
| `text_primary` (`#F8FAFC`) | `surface` (`#111827`) | **16.96 : 1** | $\ge 4.5 : 1$ (Normal Text) | **PASS (Exceeds AAA)** |
| `text_primary` (`#F8FAFC`) | `card` (`#1E293B`) | **13.98 : 1** | $\ge 4.5 : 1$ (Normal Text) | **PASS (Exceeds AAA)** |
| `text_primary` (`#F8FAFC`) | `card_hover` (`#243042`) | **12.73 : 1** | $\ge 4.5 : 1$ (Normal Text) | **PASS (Exceeds AAA)** |
| `text_secondary` (`#CBD5E1`)| `canvas` (`#0B0F17`) | **12.92 : 1** | $\ge 4.5 : 1$ (Normal Text) | **PASS (Exceeds AAA)** |
| `text_secondary` (`#CBD5E1`)| `card` (`#1E293B`) | **9.85 : 1** | $\ge 4.5 : 1$ (Normal Text) | **PASS (Exceeds AAA)** |
| `text_secondary` (`#CBD5E1`)| `card_hover` (`#243042`) | **8.97 : 1** | $\ge 4.5 : 1$ (Normal Text) | **PASS (Exceeds AAA)** |
| `text_muted` (`#94A3B8`) | `canvas` (`#0B0F17`) | **7.48 : 1** | $\ge 4.5 : 1$ (Normal Text) | **PASS (Exceeds AA)** |
| `text_muted` (`#94A3B8`) | `card` (`#1E293B`) | **5.71 : 1** | $\ge 4.5 : 1$ (Normal Text) | **PASS (Meets AA)** |
| `text_muted` (`#94A3B8`) | `card_hover` (`#243042`) | **5.20 : 1** | $\ge 4.5 : 1$ (Normal Text) | **PASS (Meets AA)** |
| `positive_fg` (`#34D399`) | `canvas` (`#0B0F17`) | **9.98 : 1** | $\ge 4.5 : 1$ (Normal Text) | **PASS (Exceeds AA)** |
| `positive_fg` (`#34D399`) | `card` (`#1E293B`) | **7.61 : 1** | $\ge 4.5 : 1$ (Normal Text) | **PASS (Exceeds AA)** |
| `negative_fg` (`#FB7185`) | `canvas` (`#0B0F17`) | **7.13 : 1** | $\ge 4.5 : 1$ (Normal Text) | **PASS (Exceeds AA)** |
| `negative_fg` (`#FB7185`) | `card` (`#1E293B`) | **5.44 : 1** | $\ge 4.5 : 1$ (Normal Text) | **PASS (Meets AA)** |
| `negative_fg` (`#FB7185`) | `card_hover` (`#243042`) | **4.95 : 1** | $\ge 4.5 : 1$ (Normal Text) | **PASS (Meets AA)** |
| `warning_fg` (`#FBBF24`) | `canvas` (`#0B0F17`) | **11.49 : 1** | $\ge 4.5 : 1$ (Normal Text) | **PASS (Exceeds AAA)** |
| `warning_fg` (`#FBBF24`) | `card` (`#1E293B`) | **8.76 : 1** | $\ge 4.5 : 1$ (Normal Text) | **PASS (Exceeds AA)** |
| `brand_link` (`#A5B4FC`) | `canvas` (`#0B0F17`) | **9.62 : 1** | $\ge 4.5 : 1$ (Normal Text) | **PASS (Exceeds AA)** |
| `brand_link` (`#A5B4FC`) | `card` (`#1E293B`) | **7.34 : 1** | $\ge 4.5 : 1$ (Normal Text) | **PASS (Exceeds AA)** |
| `brand_button_text` (`#FFF`)| `brand_btn` (`#4F46E5`)| **6.29 : 1** | $\ge 4.5 : 1$ (Normal Text) | **PASS (Exceeds AA)** |
| `border_default` (`#6B7280`)| `card` (`#1E293B`) | **3.03 : 1** | $\ge 3.0 : 1$ (UI Controls SC 1.4.11) | **PASS (Meets AA)** |
| `border_focus` (`#818CF8`) | `card` (`#1E293B`) | **4.90 : 1** | $\ge 3.0 : 1$ (UI Focus SC 1.4.11) | **PASS (Exceeds AA)** |

---

## 3. KEYBOARD NAVIGATION & FOCUS SPECIFICATIONS

1. **Unambiguous Visible Focus Indicators:**
   - Default browser outlines are removed and replaced with a high-contrast focus ring:
     ```css
     :focus-visible {
       outline: 2px solid var(--wos-color-border-focus); /* #818CF8 */
       outline-offset: 2px;
       border-radius: var(--wos-radius-sm);
     }
     ```
2. **Keyboard Trap in Modals & Dialogs:**
   - When a modal (`<Modal />`) or drawer (`<Drawer />`) opens, focus is programmatically shifted to the first focusable element inside the container.
   - Tabbing cycles exclusively through child interactive elements within the dialog.
   - Pressing `Escape` closes the modal and returns focus to the trigger button that launched it.
3. **Roving Tabindex in Data Tables & Segment Controls:**
   - Tab enters the data table container; Left/Right and Up/Down arrow keys move active cell focus without triggering page scroll.
4. **Skip Navigation Links:**
   - Every page features an invisible skip link at the top of the DOM: `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to main content</a>`.

---

## 4. SCREEN READER & WAI-ARIA RULES

1. **Semantic HTML Landmarks:**
   - All layouts use explicit landmarks: `<header role="banner">`, `<nav role="navigation">`, `<main id="main-content" role="main">`, `<aside role="complementary">`.
2. **Dynamic Live Regions:**
   - Asynchronous financial updates (document OCR completion, trade execution, dividend matches) announce status changes via `<div role="status" aria-live="polite">`.
   - Critical ledger errors or unbalance alerts announce immediately via `<div role="alert" aria-live="assertive">`.
3. **Financial Figures Accessible Labels:**
   - Monospaced numeric figures include explicit screen reader pronunciation:
     ```html
     <span class="font-mono tabular-nums" aria-label="One Crore Forty-Two Lakhs Eighty-Five Thousand Nine Hundred Twenty Rupees">
       ₹1,42,85,920.00
     </span>
     ```
4. **Accessible Chart Alternatives:**
   - Visual ECharts components are paired with an accessible HTML table rendered in an off-screen tab or toggled with a *"View Chart as Table"* button, providing full screen-reader scannability of historical time-series data.
