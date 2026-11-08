import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { formatINR } from '../formatters';

interface PortfolioAllocationCardProps {
  totalValue: number;
  totalInvested: number;
}

export const PortfolioAllocationCard: React.FC<PortfolioAllocationCardProps> = ({
  totalValue,
  totalInvested,
}) => {
  const totalPnl = totalValue - totalInvested;
  const pnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const allocations = [
    { label: 'Equities', pct: 42, color: theme.colors.charts.equity, amount: totalValue * 0.42 },
    { label: 'Mutual Funds', pct: 36, color: theme.colors.charts.mutualFund, amount: totalValue * 0.36 },
    { label: 'Gold (SGB)', pct: 12, color: theme.colors.charts.gold, amount: totalValue * 0.12 },
    { label: 'Fixed Income', pct: 10, color: theme.colors.charts.fixedIncome, amount: totalValue * 0.10 },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>PORTFOLIO ALLOCATION</Text>
          <Text style={styles.subtitle}>Multi-Asset Distribution & Unrealized Gains</Text>
        </View>
        <View style={styles.pnlBadge}>
          <Text style={styles.pnlBadgeText}>
            {totalPnl >= 0 ? '+' : ''}
            {pnlPct.toFixed(1)}% All-Time
          </Text>
        </View>
      </View>

      <View style={styles.valueRow}>
        <View>
          <Text style={styles.valueLabel}>Current Portfolio Value</Text>
          <Text style={styles.valueText}>{formatINR(totalValue)}</Text>
        </View>
        <View style={styles.pnlBox}>
          <Text style={styles.pnlLabel}>Unrealized Gain</Text>
          <Text style={styles.pnlText}>
            {totalPnl >= 0 ? '+' : ''}
            {formatINR(totalPnl)}
          </Text>
        </View>
      </View>

      {/* Segmented Color Allocation Bar */}
      <View style={styles.stackedBar}>
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
            <Text style={styles.legendLabel}>{a.label}</Text>
            <Text style={styles.legendPct}>{a.pct}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
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
    fontSize: 11,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  valueLabel: {
    fontSize: 10,
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
    fontSize: 10,
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
    height: 10,
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: theme.colors.borderLight,
    marginVertical: 8,
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
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  legendPct: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
});
