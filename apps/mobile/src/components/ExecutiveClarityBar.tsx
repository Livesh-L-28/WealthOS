import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { theme, useTheme } from '../theme';
import { DashboardPeriod } from '../types';
import { formatINR } from '../formatters';

interface ExecutiveClarityBarProps {
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  monthlyInflows: number;
  monthlyOutflows: number;
  goalsFundedPct: number;
  onOpenNetWorth?: () => void;
}

export const ExecutiveClarityBar: React.FC<ExecutiveClarityBarProps> = ({
  period,
  onPeriodChange,
  netWorth,
  totalAssets,
  totalLiabilities,
  monthlyInflows,
  monthlyOutflows,
  goalsFundedPct,
  onOpenNetWorth,
}) => {
  const { theme, isDark } = useTheme();
  const netCashFlow = monthlyInflows - monthlyOutflows;
  const savingsRate = monthlyInflows > 0 ? ((netCashFlow / monthlyInflows) * 100).toFixed(1) : '0';
  const solvencyRatio = totalLiabilities > 0 ? (totalAssets / totalLiabilities).toFixed(2) : '∞';

  const periods: { id: DashboardPeriod; label: string }[] = [
    { id: '1M', label: 'This Month' },
    { id: '3M', label: 'Last 3M' },
    { id: 'YTD', label: 'YTD' },
    { id: 'ALL', label: 'All Time' },
  ];

  const cardBg = isDark ? '#111827' : '#FFFFFF';
  const borderColor = isDark ? '#1E293B' : '#E2E8F0';
  const splitBg = isDark ? '#1E293B' : '#F8FAFC';
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';

  return (
    <View style={styles.container}>
      {/* Period Segmented Control */}
      <View
        style={[
          styles.segmentedControl,
          {
            backgroundColor: isDark ? '#111827' : '#F1F5F9',
            borderColor: isDark ? '#1E293B' : '#E2E8F0',
          },
        ]}
      >
        {periods.map((p) => {
          const isSelected = period === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.segmentBtn,
                isSelected && [
                  styles.segmentBtnActive,
                  { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' },
                ],
              ]}
              onPress={() => onPeriodChange(p.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: textSecondary },
                  isSelected && [styles.segmentTextActive, { color: textPrimary }],
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Hero Net Worth Card */}
      <View style={[styles.heroCard, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.heroHeader}>
          <View style={styles.labelGroup}>
            <Text style={[styles.heroLabel, { color: textSecondary }]}>TOTAL NET WORTH</Text>
            <View
              style={[
                styles.actualBadge,
                { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' },
              ]}
            >
              <Text
                style={[
                  styles.actualBadgeText,
                  { color: isDark ? '#60A5FA' : '#1D4ED8' },
                ]}
              >
                ACTUAL
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={[
                styles.changeBadge,
                { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' },
              ]}
            >
              <Text
                style={[
                  styles.changeBadgeText,
                  { color: isDark ? '#34D399' : '#059669' },
                ]}
              >
                +5.2% MoM
              </Text>
            </View>
            {onOpenNetWorth && (
              <TouchableOpacity
                onPress={onOpenNetWorth}
                style={{
                  backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    fontSize: 9.5,
                    fontWeight: '700',
                    color: isDark ? '#60A5FA' : '#1D4ED8',
                  }}
                >
                  Sheet ›
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={[styles.heroAmount, { color: textPrimary }]}>{formatINR(netWorth)}</Text>
        <Text style={[styles.heroSubtitle, { color: textSecondary }]}>
          +₹3,72,400 surplus growth across 6 connected institutions
        </Text>

        {/* Balance Sheet Split Row */}
        <View style={[styles.splitRow, { backgroundColor: splitBg, borderColor }]}>
          <View style={styles.splitCol}>
            <Text style={[styles.splitLabel, { color: textSecondary }]}>TOTAL ASSETS</Text>
            <Text style={[styles.assetVal, { color: isDark ? '#34D399' : '#059669' }]}>
              {formatINR(totalAssets)}
            </Text>
            <Text style={[styles.splitSub, { color: textSecondary }]}>Cash, Demat & SGBs</Text>
          </View>

          <View style={[styles.splitDivider, { backgroundColor: borderColor }]} />

          <View style={styles.splitCol}>
            <Text style={[styles.splitLabel, { color: textSecondary }]}>TOTAL LIABILITIES</Text>
            <Text style={[styles.debtVal, { color: isDark ? '#F87171' : '#DC2626' }]}>
              {formatINR(totalLiabilities)}
            </Text>
            <Text style={[styles.splitSub, { color: textSecondary }]}>Home Loan & Card</Text>
          </View>
        </View>

        {/* 3-Pill Clarity Bar */}
        <View style={styles.clarityPillRow}>
          <View style={[styles.clarityPill, { backgroundColor: splitBg, borderColor }]}>
            <Text style={[styles.clarityPillLabel, { color: textSecondary }]}>Solvency</Text>
            <Text style={[styles.clarityPillValue, { color: textPrimary }]}>{solvencyRatio}x</Text>
          </View>
          <View style={[styles.clarityPill, { backgroundColor: splitBg, borderColor }]}>
            <Text style={[styles.clarityPillLabel, { color: textSecondary }]}>Savings</Text>
            <Text style={[styles.clarityPillValue, { color: textPrimary }]}>{savingsRate}%</Text>
          </View>
          <View style={[styles.clarityPill, { backgroundColor: splitBg, borderColor }]}>
            <Text style={[styles.clarityPillLabel, { color: textSecondary }]}>Goals</Text>
            <Text style={[styles.clarityPillValue, { color: textPrimary }]}>
              {goalsFundedPct.toFixed(0)}%
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#EEF2EF',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 14,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  segmentTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 106, 0.35)',
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  actualBadge: {
    backgroundColor: theme.colors.primaryLightSolid,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  actualBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    letterSpacing: 0.4,
  },
  changeBadge: {
    backgroundColor: theme.colors.primaryLightSolid,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  changeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  heroAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.8,
  },
  heroSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFCFA',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  splitCol: {
    flex: 1,
  },
  splitLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.4,
  },
  assetVal: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  debtVal: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.negative,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  splitSub: {
    fontSize: 9.5,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  splitDivider: {
    width: 1,
    height: 38,
    backgroundColor: theme.colors.border,
    marginHorizontal: 12,
  },
  clarityPillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  clarityPill: {
    flex: 1,
    backgroundColor: '#F0F4F1',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clarityPillLabel: {
    fontSize: 9.5,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  clarityPillValue: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    fontVariant: ['tabular-nums'],
  },
});
