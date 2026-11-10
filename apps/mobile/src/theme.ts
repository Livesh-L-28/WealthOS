import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * WealthOS Mobile 2.0 Modern Fintech Design System
 * Clean Light & Consistent Dark Themes with WCAG 2.1 AA Compliance
 * Authoritative Blue Primary (#2563EB) & Neutral Slate Canvas (#F8FAFC / #0B0F19)
 */

export interface ThemeColors {
  canvas: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  card: string;
  cardHover: string;
  cardSubtle: string;
  cardHeader: string;

  border: string;
  borderLight: string;
  borderStrong: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  textWhite: string;

  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryLightSolid: string;
  primaryAlpha10: string;

  positive: string;
  positiveDark: string;
  positiveBg: string;
  positiveBgSolid: string;

  negative: string;
  negativeDark: string;
  negativeBg: string;
  negativeBgSolid: string;

  danger: string;
  dangerDark: string;
  dangerBg: string;
  dangerAlpha10: string;

  warning: string;
  warningDark: string;
  warningBg: string;
  warningBgSolid: string;

  accent: string;
  accentLight: string;
  blue: string;
  blueLight: string;

  charts: {
    equity: string;
    mutualFund: string;
    gold: string;
    fixedIncome: string;
    cash: string;
    realEstate: string;
    liability: string;
  };
}

export interface AppTheme {
  isDark: boolean;
  typography: {
    fontFamily: string;
    monoFont: string;
  };
  colors: ThemeColors;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  radius: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  shadow: {
    sm: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    md: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
}

export const lightTheme: AppTheme = {
  isDark: false,
  typography: {
    fontFamily: 'System',
    monoFont: 'monospace',
  },
  colors: {
    canvas: '#F8FAFC',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    card: '#FFFFFF',
    cardHover: '#F8FAFC',
    cardSubtle: '#F1F5F9',
    cardHeader: '#FFFFFF',

    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    borderStrong: '#CBD5E1',

    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#94A3B8',
    textMuted: '#64748B',
    textWhite: '#FFFFFF',

    primary: '#2563EB',
    primaryDark: '#1D4ED8',
    primaryLight: 'rgba(37, 99, 235, 0.08)',
    primaryLightSolid: '#EFF6FF',
    primaryAlpha10: 'rgba(37, 99, 235, 0.10)',

    positive: '#059669',
    positiveDark: '#047857',
    positiveBg: 'rgba(5, 150, 105, 0.10)',
    positiveBgSolid: '#ECFDF5',

    negative: '#DC2626',
    negativeDark: '#B91C1C',
    negativeBg: 'rgba(220, 38, 38, 0.10)',
    negativeBgSolid: '#FEF2F2',

    danger: '#DC2626',
    dangerDark: '#B91C1C',
    dangerBg: 'rgba(220, 38, 38, 0.10)',
    dangerAlpha10: 'rgba(220, 38, 38, 0.10)',

    warning: '#D97706',
    warningDark: '#B45309',
    warningBg: 'rgba(217, 119, 6, 0.10)',
    warningBgSolid: '#FFFBEB',

    accent: '#4F46E5',
    accentLight: 'rgba(79, 70, 229, 0.10)',
    blue: '#2563EB',
    blueLight: 'rgba(37, 99, 235, 0.10)',

    charts: {
      equity: '#2563EB',
      mutualFund: '#6366F1',
      gold: '#F59E0B',
      fixedIncome: '#059669',
      cash: '#0284C7',
      realEstate: '#8B5CF6',
      liability: '#DC2626',
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
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
  },
};

export const darkTheme: AppTheme = {
  isDark: true,
  typography: {
    fontFamily: 'System',
    monoFont: 'monospace',
  },
  colors: {
    canvas: '#0B0F19',
    background: '#0B0F19',
    surface: '#111827',
    surfaceElevated: '#1E293B',
    card: '#111827',
    cardHover: '#1E293B',
    cardSubtle: '#1E293B',
    cardHeader: '#111827',

    border: '#1E293B',
    borderLight: '#1E293B',
    borderStrong: '#334155',

    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    textMuted: '#64748B',
    textWhite: '#FFFFFF',

    primary: '#3B82F6',
    primaryDark: '#2563EB',
    primaryLight: 'rgba(59, 130, 246, 0.15)',
    primaryLightSolid: '#1E293B',
    primaryAlpha10: 'rgba(59, 130, 246, 0.15)',

    positive: '#10B981',
    positiveDark: '#059669',
    positiveBg: 'rgba(16, 185, 129, 0.15)',
    positiveBgSolid: 'rgba(16, 185, 129, 0.15)',

    negative: '#EF4444',
    negativeDark: '#DC2626',
    negativeBg: 'rgba(239, 68, 68, 0.15)',
    negativeBgSolid: 'rgba(239, 68, 68, 0.15)',

    danger: '#EF4444',
    dangerDark: '#DC2626',
    dangerBg: 'rgba(239, 68, 68, 0.15)',
    dangerAlpha10: 'rgba(239, 68, 68, 0.15)',

    warning: '#F59E0B',
    warningDark: '#D97706',
    warningBg: 'rgba(245, 158, 11, 0.15)',
    warningBgSolid: 'rgba(245, 158, 11, 0.15)',

    accent: '#818CF8',
    accentLight: 'rgba(129, 140, 248, 0.15)',
    blue: '#3B82F6',
    blueLight: 'rgba(59, 130, 246, 0.15)',

    charts: {
      equity: '#3B82F6',
      mutualFund: '#818CF8',
      gold: '#F59E0B',
      fixedIncome: '#10B981',
      cash: '#38BDF8',
      realEstate: '#A78BFA',
      liability: '#EF4444',
    },
  },
  spacing: lightTheme.spacing,
  radius: lightTheme.radius,
  shadow: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.35,
      shadowRadius: 6,
      elevation: 4,
    },
  },
};

// Default export maintains seamless backward compatibility
export const theme = lightTheme;

interface ThemeContextValue {
  theme: AppTheme;
  isDark: boolean;
  toggleTheme: () => void;
  setThemeMode: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: darkTheme,
  isDark: true,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => setIsDark((prev) => !prev);
  const setThemeMode = (dark: boolean) => setIsDark(dark);

  const currentTheme = isDark ? darkTheme : lightTheme;

  return React.createElement(
    ThemeContext.Provider,
    { value: { theme: currentTheme, isDark, toggleTheme, setThemeMode } },
    children
  );
};

export const useTheme = () => {
  try {
    const ctx = useContext(ThemeContext);
    if (ctx && ctx.theme) {
      return ctx;
    }
  } catch {
    // Graceful fallback
  }
  return {
    theme: darkTheme,
    isDark: true,
    toggleTheme: () => {},
    setThemeMode: () => {},
  };
};
