# WEALTHOS — FORMAL DESIGN TOKENS DICTIONARY

**Document Reference:** WOS-UX-TOK-001  
**Version:** 1.0.0-RELEASE-CANDIDATE  
**Status:** APPROVED / FROZEN BASELINE  
**Classification:** Engineering Design Tokens Specification  

---

## 1. CSS CUSTOM PROPERTIES (ROOT DESIGN TOKENS)

The following design tokens define the global theme for WealthOS. They are framework-independent and can be ingested directly into Tailwind CSS, vanilla CSS, CSS Modules, or React Native theme providers.

```css
:root {
  /* ==========================================================================
     COLOR FOUNDATIONS (FINTECH DEEP NAVY THEME)
     ========================================================================== */
  --wos-color-bg-canvas: #0B0F17;
  --wos-color-bg-surface: #111827;
  --wos-color-bg-card: #1E293B;
  --wos-color-bg-card-hover: #2D3B4E;
  --wos-color-bg-subtle: #1F2937;

  --wos-color-border-subtle: #1F2937;
  --wos-color-border-default: #374151;
  --wos-color-border-hover: #4B5563;
  --wos-color-border-focus: #6366F1;

  --wos-color-text-primary: #F8FAFC;
  --wos-color-text-secondary: #94A3B8;
  --wos-color-text-muted: #64748B;
  --wos-color-text-disabled: #475569;

  /* ==========================================================================
     FINANCIAL SEMANTIC ACCENTS
     ========================================================================== */
  --wos-color-positive-fg: #10B981;
  --wos-color-positive-bg: rgba(16, 185, 129, 0.12);
  --wos-color-positive-border: rgba(16, 185, 129, 0.30);

  --wos-color-negative-fg: #F43F5E;
  --wos-color-negative-bg: rgba(244, 63, 94, 0.12);
  --wos-color-negative-border: rgba(244, 63, 94, 0.30);

  --wos-color-warning-fg: #F59E0B;
  --wos-color-warning-bg: rgba(245, 158, 11, 0.12);
  --wos-color-warning-border: rgba(245, 158, 11, 0.30);

  --wos-color-brand-primary: #6366F1;
  --wos-color-brand-hover: #4F46E5;
  --wos-color-brand-subtle: rgba(99, 102, 241, 0.15);

  /* ==========================================================================
     DATA VISUALIZATION / ECHARTS THEME PALETTE
     ========================================================================== */
  --wos-chart-color-1: #6366F1; /* Indigo (Equities) */
  --wos-chart-color-2: #10B981; /* Emerald (Mutual Funds) */
  --wos-chart-color-3: #F59E0B; /* Amber (Gold / Commodities) */
  --wos-chart-color-4: #38BDF8; /* Sky Blue (Fixed Deposits / Cash) */
  --wos-chart-color-5: #A855F7; /* Purple (Alternative / Real Estate) */
  --wos-chart-color-6: #F43F5E; /* Rose (Liabilities / Debt) */

  /* ==========================================================================
     TYPOGRAPHY TOKENS
     ========================================================================== */
  --wos-font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --wos-font-mono: 'JetBrains Mono', 'SF Mono', Consolas, Menlo, monospace;

  --wos-font-size-display: 2.0rem;    /* 32px */
  --wos-font-size-h1: 1.5rem;         /* 24px */
  --wos-font-size-h2: 1.25rem;        /* 20px */
  --wos-font-size-h3: 1.0rem;         /* 16px */
  --wos-font-size-body: 0.875rem;     /* 14px */
  --wos-font-size-caption: 0.75rem;   /* 12px */

  --wos-font-weight-regular: 400;
  --wos-font-weight-medium: 500;
  --wos-font-weight-semibold: 600;
  --wos-font-weight-bold: 700;

  /* ==========================================================================
     SPACING & LAYOUT (4PX BASE UNIT)
     ========================================================================== */
  --wos-space-1: 4px;
  --wos-space-2: 8px;
  --wos-space-3: 12px;
  --wos-space-4: 16px;
  --wos-space-5: 20px;
  --wos-space-6: 24px;
  --wos-space-8: 32px;
  --wos-space-10: 40px;
  --wos-space-12: 48px;
  --wos-space-16: 64px;

  /* ==========================================================================
     BORDER RADIUS
     ========================================================================== */
  --wos-radius-sm: 4px;
  --wos-radius-md: 6px;
  --wos-radius-lg: 8px;
  --wos-radius-xl: 12px;
  --wos-radius-full: 9999px;

  /* ==========================================================================
     Z-INDEX HIERARCHY
     ========================================================================== */
  --wos-z-base: 0;
  --wos-z-sticky: 100;
  --wos-z-dropdown: 200;
  --wos-z-modal-backdrop: 300;
  --wos-z-modal: 400;
  --wos-z-popover: 500;
  --wos-z-toast: 600;

  /* ==========================================================================
     MOTION & TRANSITIONS
     ========================================================================== */
  --wos-transition-fast: 150ms cubic-bezier(0.16, 1, 0.3, 1);
  --wos-transition-normal: 200ms cubic-bezier(0.16, 1, 0.3, 1);
  --wos-transition-slow: 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

---

## 2. TYPESCRIPT TOKEN DEFINITIONS

```typescript
export const WOS_DESIGN_TOKENS = {
  colors: {
    bg: {
      canvas: '#0B0F17',
      surface: '#111827',
      card: '#1E293B',
      cardHover: '#2D3B4E',
      subtle: '#1F2937',
    },
    border: {
      subtle: '#1F2937',
      default: '#374151',
      hover: '#4B5563',
      focus: '#6366F1',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
      muted: '#64748B',
      disabled: '#475569',
    },
    semantic: {
      positive: {
        fg: '#10B981',
        bg: 'rgba(16, 185, 129, 0.12)',
        border: 'rgba(16, 185, 129, 0.30)',
      },
      negative: {
        fg: '#F43F5E',
        bg: 'rgba(244, 63, 94, 0.12)',
        border: 'rgba(244, 63, 94, 0.30)',
      },
      warning: {
        fg: '#F59E0B',
        bg: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.30)',
      },
      brand: {
        primary: '#6366F1',
        hover: '#4F46E5',
        subtle: 'rgba(99, 102, 241, 0.15)',
      },
    },
    charts: [
      '#6366F1', // Indigo
      '#10B981', // Emerald
      '#F59E0B', // Amber
      '#38BDF8', // Sky Blue
      '#A855F7', // Purple
      '#F43F5E', // Rose
    ],
  },
  typography: {
    fonts: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    sizes: {
      display: '2.0rem',
      h1: '1.5rem',
      h2: '1.25rem',
      h3: '1.0rem',
      body: '0.875rem',
      caption: '0.75rem',
    },
  },
  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    6: '24px',
    8: '32px',
    12: '48px',
    16: '64px',
  },
} as const;
```
