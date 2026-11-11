import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { theme, useTheme } from '../theme';
import { formatINR } from '../formatters';

interface FinancialSummaryCardsProps {
  totalAssets: number;
  totalLiabilities: number;
  monthlyInflows: number;
  monthlyOutflows: number;
  budgetAllocated: number;
  onPressInflows?: () => void;
  onPressOutflows?: () => void;
}

export const FinancialSummaryCards: React.FC<FinancialSummaryCardsProps> = ({
  monthlyInflows,
  monthlyOutflows,
  budgetAllocated,
  onPressInflows,
  onPressOutflows,
}) => {
  const { isDark } = useTheme();
  const budgetUtilization = budgetAllocated > 0 ? ((monthlyOutflows / budgetAllocated) * 100).toFixed(0) : '0';
  const hasInflows = monthlyInflows > 0;
  const hasOutflows = monthlyOutflows > 0;

  const cardBg = isDark ? '#111827' : '#FFFFFF';
  const borderColor = isDark ? '#1F2937' : '#E2E8F0';
  const labelColor = isDark ? '#94A3B8' : '#64748B';
  const subColor = isDark ? '#64748B' : '#94A3B8';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Inflows Card */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: cardBg, borderColor }]}
          onPress={onPressInflows}
          activeOpacity={onPressInflows ? 0.75 : 1}
          disabled={!onPressInflows}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.label, { color: labelColor }]}>MONTHLY INFLOWS</Text>
            <View
              style={[
                styles.iconCircleGreen,
                { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5' },
              ]}
            >
              <Text style={styles.iconGreen}>↓</Text>
            </View>
          </View>
          <Text style={[styles.valueGreen, { color: isDark ? '#34D399' : '#059669' }]}>
            {formatINR(monthlyInflows)}
          </Text>
          <View style={styles.footerRow}>
            <Text style={[styles.subtitle, { color: subColor }]}>
              {hasInflows ? 'Salary & Yield' : 'Awaiting Inflow'}
            </Text>
            <View
              style={[
                styles.badgeGreen,
                {
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
                },
              ]}
            >
              <Text style={styles.badgeTextGreen}>{hasInflows ? '+12.4%' : 'Fresh'}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Outflows Card */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: cardBg, borderColor }]}
          onPress={onPressOutflows}
          activeOpacity={onPressOutflows ? 0.75 : 1}
          disabled={!onPressOutflows}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.label, { color: labelColor }]}>MONTHLY OUTFLOWS</Text>
            <View
              style={[
                styles.iconCircleRed,
                { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2' },
              ]}
            >
              <Text style={styles.iconRed}>↑</Text>
            </View>
          </View>
          <Text style={[styles.valueRed, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
            {formatINR(monthlyOutflows)}
          </Text>
          <View style={styles.footerRow}>
            <Text style={[styles.subtitle, { color: subColor }]}>
              {hasOutflows ? `${budgetUtilization}% of budget` : '0% of budget'}
            </Text>
            <View
              style={[
                styles.badgeGreen,
                {
                  backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
                  borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE',
                },
              ]}
            >
              <Text style={[styles.badgeTextGreen, { color: isDark ? '#60A5FA' : '#2563EB' }]}>
                {hasOutflows ? '-9.9%' : '0% Burn'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 9.5,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.3,
  },
  iconCircleGreen: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: theme.colors.primaryLightSolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGreen: {
    color: theme.colors.positiveDark,
    fontSize: 12,
    fontWeight: '800',
  },
  iconCircleRed: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: theme.colors.negativeBgSolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRed: {
    color: theme.colors.negativeDark,
    fontSize: 12,
    fontWeight: '800',
  },
  valueGreen: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.positive,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
  },
  valueRed: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 9.5,
    color: theme.colors.textSecondary,
  },
  badgeGreen: {
    backgroundColor: theme.colors.primaryLightSolid,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeTextGreen: {
    fontSize: 8.5,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
});
