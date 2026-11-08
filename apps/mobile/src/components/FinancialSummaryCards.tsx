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
  totalAssets,
  totalLiabilities,
  monthlyInflows,
  monthlyOutflows,
  budgetAllocated,
}) => {
  const budgetUtilization = budgetAllocated > 0 ? ((monthlyOutflows / budgetAllocated) * 100).toFixed(1) : '84.2';

  const items = [
    {
      id: 'assets',
      label: 'TOTAL ASSETS',
      icon: '🏛️',
      amount: totalAssets,
      change: '+5.2%',
      isPositive: true,
      subtitle: 'Across 6 institutions',
      valueColor: theme.colors.textPrimary,
    },
    {
      id: 'liabilities',
      label: 'TOTAL LIABILITIES',
      icon: '💳',
      amount: totalLiabilities,
      change: '-2.1%',
      isPositive: true, // Debt reduction is positive
      subtitle: 'Mortgages & credit cards',
      valueColor: theme.colors.negative,
    },
    {
      id: 'inflows',
      label: 'MONTHLY INFLOWS',
      icon: '📥',
      amount: monthlyInflows,
      change: '+12.4%',
      isPositive: true,
      subtitle: 'Salary, advisory & dividends',
      valueColor: theme.colors.positive,
    },
    {
      id: 'outflows',
      label: 'MONTHLY OUTFLOWS',
      icon: '📤',
      amount: monthlyOutflows,
      change: '-9.9%',
      isPositive: true,
      subtitle: `${budgetUtilization}% of monthly budget`,
      valueColor: theme.colors.textPrimary,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeaderTitle}>FINANCIAL SUMMARY</Text>
      <View style={styles.grid}>
        {items.map((item) => (
          <View key={item.id} style={styles.summaryCard}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardLabel}>{item.label}</Text>
              <View style={styles.iconCircle}>
                <Text style={styles.cardIcon}>{item.icon}</Text>
              </View>
            </View>

            <Text style={[styles.cardValue, { color: item.valueColor }]}>
              {formatINR(item.amount)}
            </Text>

            <View style={styles.cardFooter}>
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
              <View style={styles.changeBadge}>
                <Text style={styles.changeBadgeText}>{item.change}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginVertical: 6,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    width: '48.4%',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.3,
    flex: 1,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: theme.colors.cardSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    fontSize: 13,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    gap: 4,
  },
  cardSubtitle: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  changeBadge: {
    backgroundColor: theme.colors.primaryLightSolid,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  changeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
});
