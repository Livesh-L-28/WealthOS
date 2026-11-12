/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        wos: {
          canvas: '#0B0F17',
          surface: '#111827',
          card: '#1E293B',
          cardHover: '#2D3B4E',
          subtle: '#1F2937',
          borderSubtle: '#1F2937',
          borderDefault: '#374151',
          borderHover: '#4B5563',
          borderFocus: '#6366F1',
          textPrimary: '#F8FAFC',
          textSecondary: '#94A3B8',
          textMuted: '#64748B',
          positive: '#10B981',
          negative: '#F43F5E',
          warning: '#F59E0B',
          brand: '#6366F1',
          brandHover: '#4F46E5',
        },
        fintech: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          cardHover: '#F8FAFC',
          primary: '#10B981',
          primaryDark: '#059669',
          text: '#0F172A',
          textSecondary: '#475569',
          textMuted: '#64748B',
          border: '#E2E8F0',
          borderStrong: '#CBD5E1',
          positive: '#10B981',
          negative: '#EF4444',
          warning: '#F59E0B',
          accent: '#6366F1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
};
