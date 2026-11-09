import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../theme';
import {
  BALANCE_SHEET_LIABILITIES,
  SAMPLE_AMORTIZATION_SCHEDULE,
} from '../data';
import { formatINR } from '../formatters';

interface LiabilitiesScreenProps {
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

export const LiabilitiesScreen: React.FC<LiabilitiesScreenProps> = ({
  onBack,
  onShowToast,
}) => {
  const { theme } = useTheme();
  const [strategy, setStrategy] = useState<'AVALANCHE' | 'SNOWBALL'>('AVALANCHE');
  const [extraPayment, setExtraPayment] = useState<number>(10000);

  const totalLiabilities = BALANCE_SHEET_LIABILITIES.reduce((s, l) => s + l.amount, 0);
  const totalMonthlyEMI = BALANCE_SHEET_LIABILITIES.reduce((s, l) => s + l.emi, 0);

  const interestSaved =
    strategy === 'AVALANCHE' ? 256500 + extraPayment * 4.2 : 218000 + extraPayment * 3.8;
  const monthsReduced = Math.min(48, Math.round(18 + extraPayment / 750));

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.canvas }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Bar */}
      <View style={[styles.topBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={[styles.backArrow, { color: theme.colors.primary }]}>‹</Text>
          <Text style={[styles.backText, { color: theme.colors.primary }]}>Plan</Text>
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: theme.colors.textPrimary }]}>
          Liabilities & EMI Payoff
        </Text>
        <View style={[styles.headerBadge, { backgroundColor: theme.colors.negativeBgSolid }]}>
          <Text style={[styles.headerBadgeText, { color: theme.colors.negativeDark }]}>DEBT AUDIT</Text>
        </View>
      </View>

      {/* Liabilities Hero Summary Card */}
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[styles.heroLabel, { color: theme.colors.textSecondary }]}>
          OUTSTANDING PRINCIPAL DEBT
        </Text>
        <Text style={[styles.heroAmount, { color: theme.colors.textPrimary }]}>
          {formatINR(totalLiabilities)}
        </Text>

        <View style={[styles.statsRow, { borderColor: theme.colors.border }]}>
          <View style={styles.statCol}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Total Monthly EMI
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.negativeDark }]}>
              {formatINR(totalMonthlyEMI)} / mo
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.statCol}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Active Credit Accounts
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
              {BALANCE_SHEET_LIABILITIES.length} Facilities
            </Text>
          </View>
        </View>
      </View>

      {/* Interactive Accelerated Payoff Simulator */}
      <View
        style={[
          styles.simCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.simHeader}>
          <View>
            <Text style={[styles.simTitle, { color: theme.colors.textPrimary }]}>
              Accelerated Debt Elimination Simulator
            </Text>
            <Text style={[styles.simSub, { color: theme.colors.textSecondary }]}>
              Simulate prepayments to cut interest burn and debt freedom date
            </Text>
          </View>
        </View>

        {/* Strategy Switcher */}
        <View style={styles.strategyRow}>
          <TouchableOpacity
            style={[
              styles.stratBtn,
              {
                backgroundColor:
                  strategy === 'AVALANCHE' ? theme.colors.primary : theme.colors.cardSubtle,
                borderColor: strategy === 'AVALANCHE' ? theme.colors.primary : theme.colors.border,
              },
            ]}
            onPress={() => setStrategy('AVALANCHE')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.stratBtnTitle,
                { color: strategy === 'AVALANCHE' ? '#FFFFFF' : theme.colors.textPrimary },
              ]}
            >
              Debt Avalanche
            </Text>
            <Text
              style={[
                styles.stratBtnSub,
                { color: strategy === 'AVALANCHE' ? '#E0E7FF' : theme.colors.textSecondary },
              ]}
            >
              Highest APR first (24% Card)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.stratBtn,
              {
                backgroundColor:
                  strategy === 'SNOWBALL' ? theme.colors.primary : theme.colors.cardSubtle,
                borderColor: strategy === 'SNOWBALL' ? theme.colors.primary : theme.colors.border,
              },
            ]}
            onPress={() => setStrategy('SNOWBALL')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.stratBtnTitle,
                { color: strategy === 'SNOWBALL' ? '#FFFFFF' : theme.colors.textPrimary },
              ]}
            >
              Debt Snowball
            </Text>
            <Text
              style={[
                styles.stratBtnSub,
                { color: strategy === 'SNOWBALL' ? '#E0E7FF' : theme.colors.textSecondary },
              ]}
            >
              Lowest balance first
            </Text>
          </TouchableOpacity>
        </View>

        {/* Extra Prepayment Selectors */}
        <Text style={[styles.extraLabel, { color: theme.colors.textSecondary }]}>
          EXTRA MONTHLY PREPAYMENT
        </Text>
        <View style={styles.extraPillsRow}>
          {[5000, 10000, 20000, 35000].map((val) => {
            const isSelected = extraPayment === val;
            return (
              <TouchableOpacity
                key={val}
                style={[
                  styles.extraPill,
                  {
                    backgroundColor: isSelected
                      ? theme.colors.primaryLightSolid
                      : theme.colors.cardSubtle,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => {
                  setExtraPayment(val);
                  onShowToast(`Simulating ${formatINR(val)} extra monthly principal prepayment`);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.extraPillText,
                    { color: isSelected ? theme.colors.primary : theme.colors.textPrimary },
                  ]}
                >
                  +{formatINR(val)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Savings Projected Box */}
        <View
          style={[
            styles.savingsBox,
            {
              backgroundColor: theme.colors.positiveBgSolid,
              borderColor: 'rgba(5, 150, 105, 0.2)',
            },
          ]}
        >
          <View style={styles.savingsCol}>
            <Text style={[styles.savingsLabel, { color: theme.colors.positiveDark }]}>
              ESTIMATED INTEREST SAVED
            </Text>
            <Text style={[styles.savingsVal, { color: theme.colors.positiveDark }]}>
              {formatINR(interestSaved)}
            </Text>
          </View>
          <View style={styles.savingsCol}>
            <Text style={[styles.savingsLabel, { color: theme.colors.positiveDark }]}>
              DEBT FREEDOM ACCELERATION
            </Text>
            <Text style={[styles.savingsVal, { color: theme.colors.positiveDark }]}>
              {monthsReduced} Months Sooner
            </Text>
          </View>
        </View>
      </View>

      {/* Credit Facilities Breakdown */}
      <View style={styles.sectionWrap}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
          ACTIVE LIABILITIES BREAKDOWN
        </Text>
        {BALANCE_SHEET_LIABILITIES.map((l) => (
          <View
            key={l.id}
            style={[
              styles.facilityCard,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.facTop}>
              <View>
                <Text style={[styles.facName, { color: theme.colors.textPrimary }]}>{l.name}</Text>
                <Text style={[styles.facRate, { color: theme.colors.textSecondary }]}>
                  Interest: {l.rate}% APR • EMI: {formatINR(l.emi)}/mo
                </Text>
              </View>
              <Text style={[styles.facAmount, { color: theme.colors.negativeDark }]}>
                {formatINR(l.amount)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Amortization Schedule Table */}
      <View style={styles.sectionWrap}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
          UPCOMING AMORTIZATION SCHEDULE
        </Text>
        {SAMPLE_AMORTIZATION_SCHEDULE.map((item) => (
          <View
            key={item.installment}
            style={[
              styles.amortRow,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.amortCol}>
              <Text style={[styles.amortInst, { color: theme.colors.textPrimary }]}>
                Installment #{item.installment}
              </Text>
              <Text style={[styles.amortDate, { color: theme.colors.textSecondary }]}>
                {item.dueDate}
              </Text>
            </View>
            <View style={styles.amortColMid}>
              <Text style={[styles.amortSplit, { color: theme.colors.textSecondary }]}>
                Principal: {formatINR(item.principal)}
              </Text>
              <Text style={[styles.amortSplit, { color: theme.colors.textSecondary }]}>
                Interest: {formatINR(item.interest)}
              </Text>
            </View>
            <View style={styles.amortColRight}>
              <Text style={[styles.amortEmi, { color: theme.colors.textPrimary }]}>
                {formatINR(item.emi)}
              </Text>
              <Text
                style={[
                  styles.amortStatus,
                  {
                    color:
                      item.status === 'PAID'
                        ? theme.colors.positiveDark
                        : item.status === 'DUE'
                        ? theme.colors.negativeDark
                        : theme.colors.textSecondary,
                  },
                ]}
              >
                {item.status}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backArrow: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
  },
  screenTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  headerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  heroCard: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  heroAmount: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  statCol: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 30,
    marginHorizontal: 12,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  simCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  simHeader: {
    marginBottom: 12,
  },
  simTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  simSub: {
    fontSize: 11,
  },
  strategyRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  stratBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  stratBtnTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  stratBtnSub: {
    fontSize: 10,
  },
  extraLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  extraPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  extraPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  extraPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  savingsBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  savingsCol: {
    flex: 1,
  },
  savingsLabel: {
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 2,
  },
  savingsVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  sectionWrap: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  facilityCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  facTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  facName: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  facRate: {
    fontSize: 11,
  },
  facAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  amortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  amortCol: {
    flex: 1,
  },
  amortInst: {
    fontSize: 12,
    fontWeight: '700',
  },
  amortDate: {
    fontSize: 10,
  },
  amortColMid: {
    flex: 1.2,
  },
  amortSplit: {
    fontSize: 10,
  },
  amortColRight: {
    alignItems: 'flex-end',
  },
  amortEmi: {
    fontSize: 13,
    fontWeight: '800',
  },
  amortStatus: {
    fontSize: 9,
    fontWeight: '800',
  },
});

