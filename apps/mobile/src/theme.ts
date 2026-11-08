/**
 * WealthOS Mobile Design System
 * Matched 1:1 with WealthOS Web Fintech Light Theme
 * WCAG 2.1 AA Compliant
 */

export const theme = {
  colors: {
    // Surface & Canvas
    canvas: '#F7F9F7',
    background: '#F7F9F7',
    surface: '#FFFFFF',
    surfaceElevated: '#FAFCFA',
    card: '#FFFFFF',
    cardHover: '#FAFCFA',
    cardSubtle: '#F0F4F1',
    cardHeader: '#FAFCFA',

    // Borders & Dividers
    border: '#E7ECE8',
    borderLight: '#EEF2EF',
    borderStrong: '#D1D9D3',

    // Typography
    textPrimary: '#17231D',
    textSecondary: '#758078',
    textTertiary: '#9BA39D',
    textMuted: '#9BA39D',
    textWhite: '#FFFFFF',

    // Brand Primary (Emerald / Forest Green)
    primary: '#16A36A',
    primaryDark: '#087A50',
    primaryLight: 'rgba(22, 163, 106, 0.10)',
    primaryLightSolid: '#E8F5EE',
    primaryAlpha10: 'rgba(22, 163, 106, 0.10)',

    // Semantics & Errors
    positive: '#16A36A',
    positiveDark: '#087A50',
    positiveBg: 'rgba(22, 163, 106, 0.10)',
    positiveBgSolid: '#E8F5EE',

    negative: '#DC5B5B',
    negativeDark: '#B91C1C',
    negativeBg: 'rgba(220, 91, 91, 0.10)',
    negativeBgSolid: '#FEE2E2',

    danger: '#DC5B5B',
    dangerDark: '#B91C1C',
    dangerBg: 'rgba(220, 91, 91, 0.10)',
    dangerAlpha10: 'rgba(220, 91, 91, 0.10)',

    warning: '#D99A32',
    warningDark: '#B45309',
    warningBg: 'rgba(217, 154, 50, 0.10)',
    warningBgSolid: '#FEF3C7',

    accent: '#6475D8',
    accentLight: 'rgba(100, 117, 216, 0.10)',
    blue: '#3B82F6',
    blueLight: 'rgba(59, 130, 246, 0.10)',

    // Charts & Asset Classes
    charts: {
      equity: '#16A36A',
      mutualFund: '#6475D8',
      gold: '#D99A32',
      fixedIncome: '#0D9488',
      cash: '#0284C7',
      realEstate: '#8B5CF6',
      liability: '#DC5B5B',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  shadow: {
    sm: {
      shadowColor: '#17231D',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
    card: {
      shadowColor: '#17231D',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    lg: {
      shadowColor: '#17231D',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
  },
} as const;

export type Theme = typeof theme;
