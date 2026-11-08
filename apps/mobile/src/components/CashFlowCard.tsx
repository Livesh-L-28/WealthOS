import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { theme } from '../theme';
import { formatINR } from '../formatters';

interface CashFlowCardProps {
  monthlyInflows: number;
  monthlyOutflows: number;
  onOpenAnalytics?: () => void;
}

export const CashFlowCard: React.FC<CashFlowCardProps> = ({
  monthlyInflows,
  monthlyOutflows,
  onOpenAnalytics,
}) => {
  const surplus = monthlyInflows - monthlyOutflows;
  const outflowRatio = monthlyInflows > 0 ? (monthlyOutflows / monthlyInflows) * 100 : 0;
  const savingsRate = monthlyInflows > 0 ? ((surplus / monthlyInflows) * 100).toFixed(0) : '0';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>MONTHLY CASH FLOW</Text>
            <Text style={styles.subtitle}>Double-Entry Verified Ledger Postings</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={styles.surplusBadge}>
              <Text style={styles.surplusText}>
                Surplus: {surplus >= 0 ? '+' : ''}
                {formatINR(surplus)}
              </Text>
            </View>
            {onOpenAnalytics && (
              <TouchableOpacity
                onPress={onOpenAnalytics}
                style={{
                  backgroundColor: theme.colors.surfaceElevated,
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 9.5, fontWeight: '700', color: theme.colors.primaryDark }}>
                  Analytics ›
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.inflowLabel}>Total Inflows (+)</Text>
            <Text style={styles.inflowValue}>{formatINR(monthlyInflows)}</Text>
            <Text style={styles.statHelp}>Salary & Dividends</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statBox}>
            <Text style={styles.outflowLabel}>Total Outflows (-)</Text>
            <Text style={styles.outflowValue}>{formatINR(monthlyOutflows)}</Text>
            <Text style={styles.statHelp}>Rent, EMIs & Bills</Text>
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
            Retaining <Text style={styles.boldText}>{savingsRate}%</Text> of cash income as surplus
          </Text>
          <Text style={styles.ratioText}>{outflowRatio.toFixed(0)}% Spent</Text>
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
    marginBottom: 12,
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
    fontVariant: ['tabular-nums'],
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
    fontSize: 9.5,
    fontWeight: '700',
    color: theme.colors.positiveDark,
    letterSpacing: 0.3,
  },
  inflowValue: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.positive,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
    marginVertical: 2,
  },
  outflowLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: theme.colors.negative,
    letterSpacing: 0.3,
  },
  outflowValue: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.negative,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
    marginVertical: 2,
  },
  statHelp: {
    fontSize: 9.5,
    color: theme.colors.textSecondary,
  },
  progressTrack: {
    height: 6,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 3,
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
    fontSize: 10.5,
    color: theme.colors.textSecondary,
  },
  boldText: {
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  ratioText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});
