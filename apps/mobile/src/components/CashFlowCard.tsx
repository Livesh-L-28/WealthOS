import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { formatINR } from '../formatters';

interface CashFlowCardProps {
  monthlyInflows: number;
  monthlyOutflows: number;
}

export const CashFlowCard: React.FC<CashFlowCardProps> = ({
  monthlyInflows,
  monthlyOutflows,
}) => {
  const surplus = monthlyInflows - monthlyOutflows;
  const outflowRatio = monthlyInflows > 0 ? (monthlyOutflows / monthlyInflows) * 100 : 0;
  const savingsRate = monthlyInflows > 0 ? ((surplus / monthlyInflows) * 100).toFixed(1) : '0';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>MONTHLY CASH FLOW</Text>
          <Text style={styles.subtitle}>Consolidated Double-Entry Ledger Inflows & Outflows</Text>
        </View>
        <View style={styles.surplusBadge}>
          <Text style={styles.surplusText}>
            Surplus: {surplus >= 0 ? '+' : ''}
            {formatINR(surplus)}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.inflowLabel}>Total Inflows (+)</Text>
          <Text style={styles.inflowValue}>{formatINR(monthlyInflows)}</Text>
          <Text style={styles.statHelp}>Salary & Investment Yields</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statBox}>
          <Text style={styles.outflowLabel}>Total Outflows (-)</Text>
          <Text style={styles.outflowValue}>{formatINR(monthlyOutflows)}</Text>
          <Text style={styles.statHelp}>Rent, EMIs, Dining & Cards</Text>
        </View>
      </View>

      {/* Visual Proportion Bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFillInflow,
            { width: `${Math.min(100, Math.max(10, 100 - outflowRatio))}%` },
          ]}
        />
        <View
          style={[
            styles.progressFillOutflow,
            { width: `${Math.min(100, Math.max(10, outflowRatio))}%` },
          ]}
        />
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>
          Retaining <Text style={styles.boldText}>{savingsRate}%</Text> of income as retained wealth
        </Text>
        <Text style={styles.ratioText}>{outflowRatio.toFixed(0)}% Spent</Text>
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
    marginBottom: 12,
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
  surplusBadge: {
    backgroundColor: theme.colors.primaryLightSolid,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  surplusText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  statBox: {
    flex: 1,
  },
  divider: {
    width: 1,
    height: 38,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: 12,
  },
  inflowLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.positiveDark,
  },
  inflowValue: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.positive,
    fontVariant: ['tabular-nums'],
    marginVertical: 2,
  },
  outflowLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.negative,
  },
  outflowValue: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.negative,
    fontVariant: ['tabular-nums'],
    marginVertical: 2,
  },
  statHelp: {
    fontSize: 9,
    color: theme.colors.textSecondary,
  },
  progressTrack: {
    height: 8,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 4,
    marginTop: 12,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressFillInflow: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  progressFillOutflow: {
    height: '100%',
    backgroundColor: theme.colors.negative,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  footerText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  boldText: {
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  ratioText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});
