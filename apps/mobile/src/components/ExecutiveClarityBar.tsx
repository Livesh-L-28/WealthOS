import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from '../theme';
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
}) => {
  const netCashFlow = monthlyInflows - monthlyOutflows;
  const savingsRate = monthlyInflows > 0 ? ((netCashFlow / monthlyInflows) * 100).toFixed(1) : '0';
  const solvencyRatio = totalLiabilities > 0 ? (totalAssets / totalLiabilities).toFixed(2) : '∞';

  const periods: { id: DashboardPeriod; label: string }[] = [
    { id: '1M', label: 'This Month' },
    { id: '3M', label: 'Last 3M' },
    { id: 'YTD', label: 'Year-to-Date' },
    { id: 'ALL', label: 'All Time' },
  ];

  return (
    <View style={styles.container}>
      {/* Period Selector Bar */}
      <View style={styles.periodRow}>
        <View style={styles.periodPillContainer}>
          {periods.map((p) => {
            const isSelected = period === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.periodPill, isSelected && styles.periodPillActive]}
                onPress={() => onPeriodChange(p.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.periodText, isSelected && styles.periodTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 5-Question Clarity Carousel / Cards */}
      <Text style={styles.sectionHeaderTitle}>5-QUESTION EXECUTIVE CLARITY</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardsScrollContent}
      >
        {/* Card 1: Net Worth */}
        <View style={[styles.clarityCard, styles.cardBorderGreen]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.questionNumber}>1. TOTAL NET WORTH</Text>
            <View style={styles.tagActual}>
              <Text style={styles.tagActualText}>ACTUAL</Text>
            </View>
          </View>
          <Text style={styles.cardPrimaryVal}>{formatINR(netWorth)}</Text>
          <Text style={styles.cardChangeTextPositive}>+₹3,72,400 (+5.2%) MoM</Text>
          <Text style={styles.cardHelperText}>Consolidated Double-Entry Ledger</Text>
        </View>

        {/* Card 2: What I Own (Assets) */}
        <View style={styles.clarityCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.questionNumber}>2. WHAT I OWN (ASSETS)</Text>
            <View style={styles.tagActual}>
              <Text style={styles.tagActualText}>ACTUAL</Text>
            </View>
          </View>
          <Text style={styles.cardPrimaryVal}>{formatINR(totalAssets)}</Text>
          <Text style={styles.cardSubHighlight}>₹13.3L Liquid · ₹76.9L Invested</Text>
          <Text style={styles.cardHelperText}>6 Institutions Synced</Text>
        </View>

        {/* Card 3: What I Owe (Debts) */}
        <View style={[styles.clarityCard, styles.cardBorderRed]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.questionNumber}>3. WHAT I OWE (DEBTS)</Text>
            <View style={styles.tagActual}>
              <Text style={styles.tagActualText}>ACTUAL</Text>
            </View>
          </View>
          <Text style={[styles.cardPrimaryVal, styles.debtVal]}>{formatINR(totalLiabilities)}</Text>
          <Text style={styles.cardSubHighlight}>Solvency Ratio: {solvencyRatio}x</Text>
          <Text style={styles.cardHelperText}>Low risk: 5x asset buffer</Text>
        </View>

        {/* Card 4: Net Cash Flow */}
        <View style={styles.clarityCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.questionNumber}>4. NET CASH FLOW</Text>
            <View style={styles.tagActual}>
              <Text style={styles.tagActualText}>ACTUAL</Text>
            </View>
          </View>
          <Text style={[styles.cardPrimaryVal, styles.cashFlowVal]}>
            {netCashFlow >= 0 ? '+' : ''}
            {formatINR(netCashFlow)}
          </Text>
          <Text style={styles.cardSubHighlight}>{savingsRate}% Savings Rate</Text>
          <Text style={styles.cardHelperText}>
            In {formatINR(monthlyInflows)} · Out {formatINR(monthlyOutflows)}
          </Text>
        </View>

        {/* Card 5: Goals Progress */}
        <View style={styles.clarityCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.questionNumber}>5. GOALS PROGRESS</Text>
            <View style={styles.tagProjected}>
              <Text style={styles.tagProjectedText}>PROJECTED</Text>
            </View>
          </View>
          <Text style={styles.cardPrimaryVal}>{goalsFundedPct.toFixed(1)}%</Text>
          <View style={styles.miniProgressBar}>
            <View
              style={[
                styles.miniProgressBarFill,
                { width: `${Math.min(100, goalsFundedPct)}%` },
              ]}
            />
          </View>
          <Text style={styles.cardHelperText}>₹40.3L saved of ₹99.0L milestone targets</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  periodRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  periodPillContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEF2EF',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  periodPill: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 9,
  },
  periodPillActive: {
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  periodText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  periodTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: theme.colors.textSecondary,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  cardsScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 6,
  },
  clarityCard: {
    width: 230,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardBorderGreen: {
    borderColor: 'rgba(22, 163, 106, 0.4)',
  },
  cardBorderRed: {
    borderColor: 'rgba(220, 91, 91, 0.3)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  questionNumber: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.3,
  },
  tagActual: {
    backgroundColor: theme.colors.primaryLightSolid,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  tagActualText: {
    fontSize: 8,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    letterSpacing: 0.5,
  },
  tagProjected: {
    backgroundColor: theme.colors.blueLight,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  tagProjectedText: {
    fontSize: 8,
    fontWeight: '800',
    color: theme.colors.blue,
    letterSpacing: 0.5,
  },
  cardPrimaryVal: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  debtVal: {
    color: theme.colors.negative,
  },
  cashFlowVal: {
    color: theme.colors.positive,
  },
  cardChangeTextPositive: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.positiveDark,
    marginTop: 2,
  },
  cardSubHighlight: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  cardHelperText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  miniProgressBar: {
    height: 4,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 2,
    marginVertical: 4,
    overflow: 'hidden',
  },
  miniProgressBarFill: {
    height: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
});
