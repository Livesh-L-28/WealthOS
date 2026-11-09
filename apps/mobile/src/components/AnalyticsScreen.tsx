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

interface AnalyticsScreenProps {
  onBack: () => void;
}

type Cadence = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

const CADENCE_DATA: Record<Cadence, {
  totalSpend: number;
  ceiling: number;
  previousSpend: number;
  periodLabel: string;
  needs: number;
  wants: number;
  investments: number;
  dailyBurn: number;
}> = {
  DAILY: {
    totalSpend: 4850,
    ceiling: 7500,
    previousSpend: 6200,
    periodLabel: 'Today (8 Nov 2026)',
    needs: 2900,
    wants: 1100,
    investments: 850,
    dailyBurn: 4850,
  },
  WEEKLY: {
    totalSpend: 34200,
    ceiling: 45000,
    previousSpend: 39500,
    periodLabel: 'This Week (W45)',
    needs: 19500,
    wants: 7800,
    investments: 6900,
    dailyBurn: 4885,
  },
  MONTHLY: {
    totalSpend: 148250,
    ceiling: 180000,
    previousSpend: 162400,
    periodLabel: 'November 2026',
    needs: 84200,
    wants: 28450,
    investments: 35600,
    dailyBurn: 4941,
  },
  YEARLY: {
    totalSpend: 1680000,
    ceiling: 2160000,
    previousSpend: 1790000,
    periodLabel: 'FY 2026-27 (YTD)',
    needs: 960000,
    wants: 320000,
    investments: 400000,
    dailyBurn: 4602,
  },
};

const CATEGORIES = [
  { name: 'Housing & Mortgage', amount: 45000, pct: 30.3, color: '#3B82F6' },
  { name: 'Investments & SIPs', amount: 35600, pct: 24.0, color: '#10B981' },
  { name: 'Discretionary Dining', amount: 28450, pct: 19.2, color: '#EC4899' },
  { name: 'Food & Groceries', amount: 22400, pct: 15.1, color: '#F59E0B' },
  { name: 'Tech & Infrastructure', amount: 14250, pct: 9.6, color: '#8B5CF6' },
  { name: 'Fuel & Mobility', amount: 12150, pct: 8.2, color: '#6366F1' },
];

const RECURRING_ITEMS = [
  { name: 'HDFC Home Loan EMI', amount: 22894, cadence: 'Monthly', date: 'Due 1st' },
  { name: 'AWS Cloud Hosting Services', amount: 14250, cadence: 'Monthly', date: 'Due 7th' },
  { name: 'Axis Bank Credit Card Min', amount: 12500, cadence: 'Monthly', date: 'Due 15th' },
  { name: 'Health & Term Insurance', amount: 8400, cadence: 'Monthly', date: 'Due 22nd' },
];

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ onBack }) => {
  const [cadence, setCadence] = useState<Cadence>('MONTHLY');
  const data = CADENCE_DATA[cadence];

  const savingsRate = Math.round((data.investments / (data.totalSpend + data.investments)) * 100);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backLabel}>Overview</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Cash Flow & Spend Analytics</Text>
        <View style={styles.topRightBadge}>
          <Text style={styles.topRightBadgeText}>REAL-TIME</Text>
        </View>
      </View>

      {/* Cadence Selector Tabs */}
      <View style={styles.cadencePillsRow}>
        {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as Cadence[]).map((c) => {
          const isSelected = cadence === c;
          return (
            <TouchableOpacity
              key={c}
              style={[styles.cadencePill, isSelected && styles.cadencePillActive]}
              onPress={() => setCadence(c)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.cadencePillText,
                  isSelected && styles.cadencePillTextActive,
                ]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Spend Executive KPI Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeaderRow}>
          <View>
            <Text style={styles.heroEyebrow}>OUTFLOWS ({data.periodLabel})</Text>
            <Text style={styles.heroAmount}>{formatINR(data.totalSpend)}</Text>
          </View>
          <View style={styles.diffBadge}>
            <Text style={styles.diffBadgeText}>-8.7% vs Prior</Text>
          </View>
        </View>

        {/* Budget Ceiling Bar */}
        <View style={styles.ceilingContainer}>
          <View style={styles.ceilingLabelsRow}>
            <Text style={styles.ceilingLabel}>Spend vs Budget Ceiling</Text>
            <Text style={styles.ceilingValues}>
              {formatINR(data.totalSpend)} / {formatINR(data.ceiling)}
            </Text>
          </View>
          <View style={styles.ceilingTrack}>
            <View
              style={[
                styles.ceilingFill,
                { width: `${Math.min(100, (data.totalSpend / data.ceiling) * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.ceilingRemaining}>
            {formatINR(data.ceiling - data.totalSpend)} budget surplus remaining
          </Text>
        </View>

        {/* Burn Rate & Runway Indicators */}
        <View style={styles.burnRow}>
          <View style={styles.burnCol}>
            <Text style={styles.burnLabel}>Daily Burn Rate</Text>
            <Text style={styles.burnValue}>{formatINR(data.dailyBurn)}/day</Text>
          </View>
          <View style={styles.burnDivider} />
          <View style={styles.burnCol}>
            <Text style={styles.burnLabel}>Net Savings Rate</Text>
            <Text style={styles.burnValueGreen}>{savingsRate}%</Text>
          </View>
          <View style={styles.burnDivider} />
          <View style={styles.burnCol}>
            <Text style={styles.burnLabel}>Cash Runway</Text>
            <Text style={styles.burnValueBlue}>6.2 Mos</Text>
          </View>
        </View>
      </View>

      {/* 50 / 30 / 20 Framework Card */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>50 / 30 / 20 BUDGET ALLOCATION RULE</Text>
        <Text style={styles.sectionSub}>Wealth Health Audit</Text>
      </View>

      <View style={styles.frameworkCard}>
        {/* Needs (Target 50%) */}
        <View style={styles.ruleItem}>
          <View style={styles.ruleItemTop}>
            <View style={styles.ruleLabelCol}>
              <Text style={styles.ruleTitle}>Needs & Fixed Living</Text>
              <Text style={styles.ruleTargetText}>Target: 50% max</Text>
            </View>
            <View style={styles.ruleValueCol}>
              <Text style={styles.ruleValueText}>{formatINR(data.needs)}</Text>
              <Text style={styles.rulePctWarning}>
                {Math.round((data.needs / data.totalSpend) * 100)}% of total
              </Text>
            </View>
          </View>
          <View style={styles.ruleTrack}>
            <View
              style={[
                styles.ruleFillBlue,
                { width: `${Math.min(100, (data.needs / data.totalSpend) * 100)}%` },
              ]}
            />
          </View>
        </View>

        {/* Wants (Target 30%) */}
        <View style={styles.ruleItem}>
          <View style={styles.ruleItemTop}>
            <View style={styles.ruleLabelCol}>
              <Text style={styles.ruleTitle}>Wants & Lifestyle</Text>
              <Text style={styles.ruleTargetText}>Target: 30% max</Text>
            </View>
            <View style={styles.ruleValueCol}>
              <Text style={styles.ruleValueText}>{formatINR(data.wants)}</Text>
              <Text style={styles.rulePctSuccess}>
                {Math.round((data.wants / data.totalSpend) * 100)}% (Under target)
              </Text>
            </View>
          </View>
          <View style={styles.ruleTrack}>
            <View
              style={[
                styles.ruleFillPink,
                { width: `${Math.min(100, (data.wants / data.totalSpend) * 100)}%` },
              ]}
            />
          </View>
        </View>

        {/* Investments (Target 20%) */}
        <View style={styles.ruleItem}>
          <View style={styles.ruleItemTop}>
            <View style={styles.ruleLabelCol}>
              <Text style={styles.ruleTitle}>Investments & Long-Term SIPs</Text>
              <Text style={styles.ruleTargetText}>Target: 20% min</Text>
            </View>
            <View style={styles.ruleValueCol}>
              <Text style={styles.ruleValueText}>{formatINR(data.investments)}</Text>
              <Text style={styles.rulePctSuccess}>
                {Math.round((data.investments / data.totalSpend) * 100)}% (Surplus)
              </Text>
            </View>
          </View>
          <View style={styles.ruleTrack}>
            <View
              style={[
                styles.ruleFillGreen,
                { width: `${Math.min(100, (data.investments / data.totalSpend) * 100)}%` },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Category Spend Distribution */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>SPENDING BY CATEGORY</Text>
        <Text style={styles.sectionSub}>Sorted by volume</Text>
      </View>

      <View style={styles.categoryCard}>
        {CATEGORIES.map((cat, i) => (
          <View key={cat.name} style={[styles.catRow, i > 0 && styles.catRowBorder]}>
            <View style={styles.catLeft}>
              <View style={[styles.catColorDot, { backgroundColor: cat.color }]} />
              <View>
                <Text style={styles.catName}>{cat.name}</Text>
                <Text style={styles.catPct}>{cat.pct}% of total</Text>
              </View>
            </View>
            <Text style={styles.catAmount}>{formatINR(cat.amount)}</Text>
          </View>
        ))}
      </View>

      {/* Top Recurring Fixed Outflows */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>RECURRING COMMITMENTS & SUBSCRIPTIONS</Text>
        <Text style={styles.sectionSub}>{RECURRING_ITEMS.length} Auto-debits</Text>
      </View>

      <View style={styles.recurringCard}>
        {RECURRING_ITEMS.map((item, i) => (
          <View key={item.name} style={[styles.recRow, i > 0 && styles.recRowBorder]}>
            <View style={styles.recIconBox}>
              <Text style={styles.recIcon}>🔄</Text>
            </View>
            <View style={styles.recContentCol}>
              <View style={styles.recTitleRow}>
                <Text style={styles.recName}>{item.name}</Text>
                <Text style={styles.recAmount}>{formatINR(item.amount)}</Text>
              </View>
              <View style={styles.recSubRow}>
                <Text style={styles.recCadence}>{item.cadence} recurring</Text>
                <Text style={styles.recDate}>{item.date}</Text>
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
  cadencePillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  cadencePill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cadencePillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  cadencePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  cadencePillTextActive: {
    color: theme.colors.textWhite,
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    letterSpacing: 0.8,
  },
  heroAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  diffBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  diffBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  ceilingContainer: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  ceilingLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ceilingLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  ceilingValues: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  ceilingTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.borderLight,
    overflow: 'hidden',
    marginBottom: 6,
  },
  ceilingFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  ceilingRemaining: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.primaryDark,
  },
  burnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  burnCol: {
    flex: 1,
    alignItems: 'center',
  },
  burnDivider: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.borderLight,
  },
  burnLabel: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    fontWeight: '500',
    marginBottom: 2,
  },
  burnValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  burnValueGreen: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  burnValueBlue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
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
  sectionSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  frameworkCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
    gap: 14,
  },
  ruleItem: {
    gap: 6,
  },
  ruleItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ruleLabelCol: {
    gap: 2,
  },
  ruleTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  ruleTargetText: {
    fontSize: 10,
    color: theme.colors.textTertiary,
  },
  ruleValueCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  ruleValueText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  rulePctWarning: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
  },
  rulePctSuccess: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  ruleTrack: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.surfaceElevated,
    overflow: 'hidden',
  },
  ruleFillBlue: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2.5,
  },
  ruleFillPink: {
    height: '100%',
    backgroundColor: '#EC4899',
    borderRadius: 2.5,
  },
  ruleFillGreen: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2.5,
  },
  categoryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  catRowBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  catPct: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  catAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  recurringCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  recRowBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  recIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recIcon: {
    fontSize: 16,
  },
  recContentCol: {
    flex: 1,
  },
  recTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recName: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  recAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.danger,
  },
  recSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  recCadence: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  recDate: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});

