/**
 * WealthOS Dual-Font Typography Scale & Weights
 */
export const typography = {
  fonts: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'JetBrains Mono', 'SF Mono', Consolas, Menlo, monospace",
  },
  sizes: {
    display: {
      fontSize: '2.0rem', // 32px
      lineHeight: '2.5rem', // 40px
      letterSpacing: '-0.02em',
      fontWeight: '700',
    },
    h1: {
      fontSize: '1.5rem', // 24px
      lineHeight: '2.0rem', // 32px
      letterSpacing: '-0.015em',
      fontWeight: '600',
    },
    h2: {
      fontSize: '1.25rem', // 20px
      lineHeight: '1.75rem', // 28px
      letterSpacing: '-0.01em',
      fontWeight: '600',
    },
    h3: {
      fontSize: '1.0rem', // 16px
      lineHeight: '1.5rem', // 24px
      letterSpacing: '0em',
      fontWeight: '500',
    },
    body: {
      fontSize: '0.875rem', // 14px
      lineHeight: '1.25rem', // 20px
      letterSpacing: '0em',
      fontWeight: '400',
    },
    caption: {
      fontSize: '0.75rem', // 12px
      lineHeight: '1.0rem', // 16px
      letterSpacing: '+0.01em',
      fontWeight: '400',
    },
  },
} as const;
