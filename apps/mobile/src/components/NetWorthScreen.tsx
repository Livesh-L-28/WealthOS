import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { theme } from '../theme';
import { formatINR } from '../formatters';
import {
  BALANCE_SHEET_ASSETS,
  BALANCE_SHEET_LIABILITIES,
  SAMPLE_AMORTIZATION_SCHEDULE,
} from '../data';

interface NetWorthScreenProps {
  onBack: () => void;
}

export const NetWorthScreen: React.FC<NetWorthScreenProps> = ({ onBack }) => {
  const [strategy, setStrategy] = useState<'AVALANCHE' | 'SNOWBALL'>('AVALANCHE');
  const [extraPayment, setExtraPayment] = useState<number>(10000);

  const totalAssets = BALANCE_SHEET_ASSETS.reduce((sum, a) => sum + a.amount, 0);
  const totalLiabilities = BALANCE_SHEET_LIABILITIES.reduce((sum, l) => sum + l.amount, 0);
  const netWorth = totalAssets - totalLiabilities;

  const interestSaved = strategy === 'AVALANCHE' ? 256500 + extraPayment * 4.2 : 218000 + extraPayment * 3.8;
  const monthsReduced = Math.min(48, Math.round(18 + extraPayment / 750));

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backLabel}>Overview</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Net Worth & Balance Sheet</Text>
        <View style={styles.topRightBadge}>
          <Text style={styles.topRightBadgeText}>AUDITED</Text>
        </View>
      </View>

      {/* Hero Balance Sheet Card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>CONSOLIDATED NET EQUITY</Text>
        <Text style={styles.heroValue}>{formatINR(netWorth)}</Text>
        <View style={styles.heroGrowthRow}>
          <View style={styles.growthBadge}>
            <Text style={styles.growthBadgeText}>+14.2% MoM</Text>
          </View>
          <Text style={styles.growthSubtext}>Double-entry verified across all asset classes</Text>
        </View>

        {/* Visual Balance Bar */}
        <View style={styles.balanceVisualBar}>
          <View
            style={[
              styles.balanceAssetPortion,
              { flex: totalAssets / (totalAssets + totalLiabilities) },
            ]}
          />
          <View
            style={[
              styles.balanceDebtPortion,
              { flex: totalLiabilities / (totalAssets + totalLiabilities) },
            ]}
          />
        </View>

        <View style={styles.balanceMetricsRow}>
          <View style={styles.balanceMetricCol}>
            <View style={styles.metricDotGreen} />
            <Text style={styles.metricLabel}>Total Assets</Text>
            <Text style={styles.metricValueAsset}>{formatINR(totalAssets)}</Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceMetricCol}>
            <View style={styles.metricDotRed} />
            <Text style={styles.metricLabel}>Total Liabilities</Text>
            <Text style={styles.metricValueDebt}>{formatINR(totalLiabilities)}</Text>
          </View>
        </View>
      </View>

      {/* Asset Breakdown Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>ASSET ALLOCATION BREAKDOWN</Text>
        <Text style={styles.sectionCount}>{BALANCE_SHEET_ASSETS.length} Classes</Text>
      </View>

      <View style={styles.cardGroup}>
        {BALANCE_SHEET_ASSETS.map((asset) => (
          <View key={asset.id} style={styles.assetItemRow}>
            <View style={styles.assetIconBox}>
              <Text style={styles.assetIcon}>
                {asset.category === 'Cash' ? '🏦' : asset.category === 'Investments' ? '📈' : asset.category === 'Fixed Income' ? '🪙' : '🏢'}
              </Text>
            </View>
            <View style={styles.assetInfoCol}>
              <View style={styles.assetTitleRow}>
                <Text style={styles.assetName}>{asset.name}</Text>
                <Text style={styles.assetAmount}>{formatINR(asset.amount)}</Text>
              </View>
              <View style={styles.assetBarTrack}>
                <View style={[styles.assetBarFill, { width: `${asset.share}%` }]} />
              </View>
              <View style={styles.assetSubRow}>
                <Text style={styles.assetCategory}>{asset.category}</Text>
                <Text style={styles.assetShare}>{asset.share}% of Wealth</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Liabilities Breakdown */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>DEBT OBLIGATIONS & LIABILITIES</Text>
        <Text style={styles.sectionCount}>{BALANCE_SHEET_LIABILITIES.length} Debts</Text>
      </View>

      <View style={styles.cardGroup}>
        {BALANCE_SHEET_LIABILITIES.map((debt) => (
          <View key={debt.id} style={styles.debtItemRow}>
            <View style={styles.debtIconBox}>
              <Text style={styles.debtIcon}>💳</Text>
            </View>
            <View style={styles.debtInfoCol}>
              <View style={styles.debtTitleRow}>
                <Text style={styles.debtName}>{debt.name}</Text>
                <Text style={styles.debtAmount}>{formatINR(debt.amount)}</Text>
              </View>
              <View style={styles.debtDetailsRow}>
                <View style={styles.aprPill}>
                  <Text style={styles.aprPillText}>{debt.rate}% APR</Text>
                </View>
                <Text style={styles.debtEmiText}>EMI: {formatINR(debt.emi)}/mo</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Debt Payoff Optimizer Engine */}
      <View style={styles.optimizerCard}>
        <View style={styles.optimizerHeaderRow}>
          <View style={styles.optIconBox}>
            <Text style={styles.optIcon}>⚡</Text>
          </View>
          <View style={styles.optTitleCol}>
            <Text style={styles.optimizerTitle}>Debt Payoff Acceleration Engine</Text>
            <Text style={styles.optimizerSub}>Algorithmic interest reduction strategy</Text>
          </View>
        </View>

        {/* Strategy Switcher */}
        <View style={styles.strategyTabs}>
          <TouchableOpacity
            style={[styles.strategyTab, strategy === 'AVALANCHE' && styles.strategyTabActive]}
            onPress={() => setStrategy('AVALANCHE')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.strategyTabText,
                strategy === 'AVALANCHE' && styles.strategyTabTextActive,
              ]}
            >
              Debt Avalanche (High APR)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.strategyTab, strategy === 'SNOWBALL' && styles.strategyTabActive]}
            onPress={() => setStrategy('SNOWBALL')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.strategyTabText,
                strategy === 'SNOWBALL' && styles.strategyTabTextActive,
              ]}
            >
              Debt Snowball (Low Balance)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Extra Payment Stepper */}
        <View style={styles.extraPaymentBlock}>
          <Text style={styles.extraPaymentLabel}>Extra Monthly Prepayment Contribution:</Text>
          <View style={styles.stepperRow}>
            {[5000, 10000, 20000].map((amt) => {
              const isSelected = extraPayment === amt;
              return (
                <TouchableOpacity
                  key={amt}
                  style={[styles.stepperPill, isSelected && styles.stepperPillActive]}
                  onPress={() => setExtraPayment(amt)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.stepperPillText,
                      isSelected && styles.stepperPillTextActive,
                    ]}
                  >
                    +{formatINR(amt)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Impact Results Box */}
        <View style={styles.impactResultsBox}>
          <View style={styles.impactCol}>
            <Text style={styles.impactLabel}>Projected Interest Saved</Text>
            <Text style={styles.impactValueGreen}>{formatINR(interestSaved)}</Text>
          </View>
          <View style={styles.impactDivider} />
          <View style={styles.impactCol}>
            <Text style={styles.impactLabel}>Debt Freedom Sooner</Text>
            <Text style={styles.impactValueBlue}>{monthsReduced} Months</Text>
          </View>
        </View>
      </View>

      {/* Amortization Schedule */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>LOAN AMORTIZATION SCHEDULE</Text>
        <Text style={styles.sectionCount}>Next 5 Installments</Text>
      </View>

      <View style={styles.amortizationGroup}>
        {SAMPLE_AMORTIZATION_SCHEDULE.map((item) => (
          <View key={item.installment} style={styles.amortItemRow}>
            <View style={styles.installmentBadge}>
              <Text style={styles.installmentBadgeText}>#{item.installment}</Text>
            </View>
            <View style={styles.amortContentCol}>
              <View style={styles.amortTopRow}>
                <Text style={styles.amortDueDate}>{item.dueDate}</Text>
                <View
                  style={[
                    styles.statusPill,
                    item.status === 'PAID' && styles.statusPaid,
                    item.status === 'DUE' && styles.statusDue,
                    item.status === 'UPCOMING' && styles.statusUpcoming,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      item.status === 'PAID' && styles.statusPaidText,
                      item.status === 'DUE' && styles.statusDueText,
                      item.status === 'UPCOMING' && styles.statusUpcomingText,
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>
              <View style={styles.amortValuesRow}>
                <Text style={styles.amortPrincipal}>
                  Principal: <Text style={styles.boldText}>{formatINR(item.principal)}</Text>
                </Text>
                <Text style={styles.amortInterest}>
                  Interest: <Text style={styles.boldText}>{formatINR(item.interest)}</Text>
                </Text>
                <Text style={styles.amortBalance}>
                  Bal: {formatINR(item.remaining)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingRight: 8,
  },
  backArrow: {
    fontSize: 22,
    color: theme.colors.primary,
    fontWeight: '700',
    marginTop: -2,
  },
  backLabel: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  topRightBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: theme.colors.primaryAlpha10,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  topRightBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    letterSpacing: 0.8,
  },
  heroValue: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginVertical: 6,
    letterSpacing: -0.5,
  },
  heroGrowthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  growthBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  growthBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  growthSubtext: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  balanceVisualBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: theme.colors.borderLight,
    marginBottom: 16,
  },
  balanceAssetPortion: {
    backgroundColor: theme.colors.primary,
  },
  balanceDebtPortion: {
    backgroundColor: theme.colors.danger,
  },
  balanceMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  balanceMetricCol: {
    flex: 1,
  },
  balanceDivider: {
    width: 1,
    height: 36,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: 16,
  },
  metricDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginBottom: 4,
  },
  metricDotRed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.danger,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  metricValueAsset: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: 2,
  },
  metricValueDebt: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.danger,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    letterSpacing: 0.8,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  cardGroup: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  assetItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    gap: 12,
  },
  assetIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  assetIcon: {
    fontSize: 18,
  },
  assetInfoCol: {
    flex: 1,
  },
  assetTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  assetName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  assetAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  assetBarTrack: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.surfaceElevated,
    overflow: 'hidden',
    marginBottom: 4,
  },
  assetBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2.5,
  },
  assetSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assetCategory: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  assetShare: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  debtItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    gap: 12,
  },
  debtIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  debtIcon: {
    fontSize: 18,
  },
  debtInfoCol: {
    flex: 1,
  },
  debtTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  debtName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  debtAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.danger,
  },
  debtDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aprPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  aprPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#991B1B',
  },
  debtEmiText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  optimizerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
  },
  optimizerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  optIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optIcon: {
    fontSize: 18,
  },
  optTitleCol: {
    flex: 1,
  },
  optimizerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  optimizerSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  strategyTabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  strategyTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  strategyTabActive: {
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  strategyTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  strategyTabTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  extraPaymentBlock: {
    marginBottom: 14,
  },
  extraPaymentLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepperPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stepperPillActive: {
    backgroundColor: theme.colors.primaryAlpha10,
    borderColor: theme.colors.primary,
  },
  stepperPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  stepperPillTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  impactResultsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  impactCol: {
    flex: 1,
    alignItems: 'center',
  },
  impactDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#BBF7D0',
  },
  impactLabel: {
    fontSize: 10,
    color: '#15803D',
    fontWeight: '600',
    marginBottom: 2,
  },
  impactValueGreen: {
    fontSize: 16,
    fontWeight: '800',
    color: '#15803D',
  },
  impactValueBlue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  amortizationGroup: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  amortItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    gap: 12,
  },
  installmentBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  installmentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  amortContentCol: {
    flex: 1,
  },
  amortTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  amortDueDate: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  statusPaid: {
    backgroundColor: '#DCFCE7',
  },
  statusPaidText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15803D',
  },
  statusDue: {
    backgroundColor: '#FEF3C7',
  },
  statusDueText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#B45309',
  },
  statusUpcoming: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  statusUpcomingText: {
    fontSize: 9,
    fontWeight: '600',
    color: theme.colors.textTertiary,
  },
  amortValuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amortPrincipal: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  amortInterest: {
    fontSize: 11,
    color: theme.colors.danger,
  },
  amortBalance: {
    fontSize: 10,
    color: theme.colors.textTertiary,
  },
  boldText: {
    fontWeight: '700',
  },
});
