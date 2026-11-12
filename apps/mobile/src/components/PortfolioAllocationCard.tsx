import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme, useTheme } from '../theme';
import { formatINR } from '../formatters';

interface PortfolioAllocationCardProps {
  totalValue: number;
  totalInvested: number;
}

export const PortfolioAllocationCard: React.FC<PortfolioAllocationCardProps> = ({
  totalValue,
  totalInvested,
}) => {
  const { theme, isDark } = useTheme();
  const totalPnl = totalValue - totalInvested;
  const pnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const allocations = [
    { label: 'Equities', pct: 42, color: theme.colors.charts.equity },
    { label: 'Mutual Funds', pct: 36, color: theme.colors.charts.mutualFund },
    { label: 'Gold (SGB)', pct: 12, color: theme.colors.charts.gold },
    { label: 'Fixed Income', pct: 10, color: theme.colors.charts.fixedIncome },
  ];

  const cardBg = isDark ? '#111827' : '#FFFFFF';
  const borderColor = isDark ? '#1E293B' : '#E2E8F0';
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const pnlBg = isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5';
  const pnlTextColor = isDark ? '#34D399' : '#059669';

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: textSecondary }]}>PORTFOLIO ALLOCATION</Text>
            <Text style={[styles.subtitle, { color: isDark ? '#64748B' : '#94A3B8' }]}>
              Multi-Asset Distribution & Returns
            </Text>
          </View>
          <View style={[styles.pnlBadge, { backgroundColor: pnlBg }]}>
            <Text style={[styles.pnlBadgeText, { color: pnlTextColor }]}>
              {totalPnl >= 0 ? '+' : ''}
              {pnlPct.toFixed(1)}% All-Time
            </Text>
          </View>
        </View>

        <View style={styles.valueRow}>
          <View>
            <Text style={[styles.valueLabel, { color: textSecondary }]}>Current Valuation</Text>
            <Text style={[styles.valueText, { color: textPrimary }]}>{formatINR(totalValue)}</Text>
          </View>
          <View style={styles.pnlBox}>
            <Text style={[styles.pnlLabel, { color: textSecondary }]}>Unrealized Gain</Text>
            <Text
              style={[
                styles.pnlText,
                { color: totalPnl >= 0 ? (isDark ? '#34D399' : '#059669') : (isDark ? '#F87171' : '#DC2626') },
              ]}
            >
              {totalPnl >= 0 ? '+' : ''}
              {formatINR(totalPnl)}
            </Text>
          </View>
        </View>

        {/* Segmented Color Allocation Bar */}
        <View style={[styles.stackedBar, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
          {allocations.map((a) => (
            <View
              key={a.label}
              style={[
                styles.barSegment,
                { width: `${a.pct}%`, backgroundColor: a.color },
              ]}
            />
          ))}
        </View>

        {/* Allocation Legend */}
        <View style={styles.legendGrid}>
          {allocations.map((a) => (
            <View key={a.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: a.color }]} />
              <Text style={[styles.legendLabel, { color: textSecondary }]}>{a.label}</Text>
              <Text style={[styles.legendPct, { color: textPrimary }]}>{a.pct}%</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 14,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontSize: 10.5,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  pnlBadge: {
    backgroundColor: theme.colors.primaryLightSolid,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pnlBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  valueLabel: {
    fontSize: 9.5,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  valueText: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
    marginTop: 2,
  },
  pnlBox: {
    alignItems: 'flex-end',
  },
  pnlLabel: {
    fontSize: 9.5,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  pnlText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.positive,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  stackedBar: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: theme.colors.borderLight,
    marginVertical: 6,
  },
  barSegment: {
    height: '100%',
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendLabel: {
    fontSize: 10.5,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  legendPct: {
    fontSize: 10.5,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
});
