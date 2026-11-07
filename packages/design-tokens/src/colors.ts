/**
 * WealthOS Foundational and Semantic FinTech Color Tokens
 * Human-designed for high contrast, scannability, and dignified calm.
 */
export const colors = {
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
    '#6366F1', // Indigo (Equities)
    '#10B981', // Emerald (Mutual Funds)
    '#F59E0B', // Amber (Gold / Commodities)
    '#38BDF8', // Sky Blue (Fixed Income / Cash)
    '#A855F7', // Purple (Alternative / Real Estate)
    '#F43F5E', // Rose (Liabilities / Debt)
  ],
} as const;
