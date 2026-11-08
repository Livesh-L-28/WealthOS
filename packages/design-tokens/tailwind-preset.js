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
          bg: '#F7F9F7',
          card: '#FFFFFF',
          cardHover: '#FAFCFA',
          primary: '#16A36A',
          primaryDark: '#087A50',
          text: '#17231D',
          textSecondary: '#758078',
          textMuted: '#9BA39D',
          border: '#E7ECE8',
          borderStrong: '#D1D9D3',
          positive: '#16A36A',
          negative: '#DC5B5B',
          warning: '#D99A32',
          accent: '#6475D8',
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
