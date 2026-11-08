import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { formatINR } from '../formatters';

interface FinancialSummaryCardsProps {
  totalAssets: number;
  totalLiabilities: number;
  monthlyInflows: number;
  monthlyOutflows: number;
  budgetAllocated: number;
}

export const FinancialSummaryCards: React.FC<FinancialSummaryCardsProps> = ({
  monthlyInflows,
  monthlyOutflows,
  budgetAllocated,
}) => {
  const budgetUtilization = budgetAllocated > 0 ? ((monthlyOutflows / budgetAllocated) * 100).toFixed(0) : '84';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Inflows Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.label}>MONTHLY INFLOWS</Text>
            <View style={styles.iconCircleGreen}>
              <Text style={styles.iconGreen}>↓</Text>
            </View>
          </View>
          <Text style={styles.valueGreen}>{formatINR(monthlyInflows)}</Text>
          <View style={styles.footerRow}>
            <Text style={styles.subtitle}>Salary & Yield</Text>
            <View style={styles.badgeGreen}>
              <Text style={styles.badgeTextGreen}>+12.4%</Text>
            </View>
          </View>
        </View>

        {/* Outflows Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.label}>MONTHLY OUTFLOWS</Text>
            <View style={styles.iconCircleRed}>
              <Text style={styles.iconRed}>↑</Text>
            </View>
          </View>
          <Text style={styles.valueRed}>{formatINR(monthlyOutflows)}</Text>
          <View style={styles.footerRow}>
            <Text style={styles.subtitle}>{budgetUtilization}% of budget</Text>
            <View style={styles.badgeGreen}>
              <Text style={styles.badgeTextGreen}>-9.9%</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
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
