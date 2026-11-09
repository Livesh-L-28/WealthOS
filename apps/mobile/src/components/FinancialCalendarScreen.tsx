import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../theme';
import { UpcomingObligation } from '../types';
import { INITIAL_OBLIGATIONS } from '../data';
import { formatINR } from '../formatters';

interface FinancialCalendarScreenProps {
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

export const FinancialCalendarScreen: React.FC<FinancialCalendarScreenProps> = ({
  onBack,
  onShowToast,
}) => {
  const { theme } = useTheme();
  const [obligations, setObligations] = useState<UpcomingObligation[]>(INITIAL_OBLIGATIONS);
  const [filter, setFilter] = useState<'ALL' | 'DUE' | 'PAID'>('ALL');

  const filtered = obligations.filter((o) => {
    if (filter === 'DUE') return !o.isPaid;
    if (filter === 'PAID') return o.isPaid;
    return true;
  });

  const totalUpcomingOutflow = obligations
    .filter((o) => !o.isPaid && o.type !== 'SALARY')
    .reduce((s, o) => s + o.amount, 0);

  const totalUpcomingInflow = obligations
    .filter((o) => !o.isPaid && o.type === 'SALARY')
    .reduce((s, o) => s + o.amount, 0);

  const handleTogglePaid = (id: string, title: string, isPaid: boolean) => {
    setObligations((prev) =>
      prev.map((o) => (o.id === id ? { ...o, isPaid: !isPaid } : o))
    );
    onShowToast(
      !isPaid
        ? `Marked ${title} as settled & reconciled in ledger`
        : `Reverted ${title} to pending obligation`
    );
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'EMI':
        return '#EF4444';
      case 'SIP':
        return theme.colors.primary;
      case 'BILL':
        return '#F59E0B';
      case 'SALARY':
        return '#10B981';
      default:
        return theme.colors.textSecondary;
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.canvas }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header Bar */}
      <View style={[styles.topBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={[styles.backArrow, { color: theme.colors.primary }]}>‹</Text>
          <Text style={[styles.backText, { color: theme.colors.primary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: theme.colors.textPrimary }]}>
          Financial Obligations Calendar
        </Text>
        <View style={[styles.headerBadge, { backgroundColor: theme.colors.primaryLightSolid }]}>
          <Text style={[styles.headerBadgeText, { color: theme.colors.primary }]}>DEC 2026</Text>
        </View>
      </View>

      {/* Liquidity Net Runway Card */}
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
          DECEMBER NET CASH FLOW PROJECTION
        </Text>
        <View style={styles.heroAmountRow}>
          <Text style={[styles.heroAmount, { color: theme.colors.textPrimary }]}>
            +{formatINR(totalUpcomingInflow - totalUpcomingOutflow)}
          </Text>
          <View style={[styles.surplusBadge, { backgroundColor: theme.colors.positiveBgSolid }]}>
            <Text style={[styles.surplusText, { color: theme.colors.positiveDark }]}>
              NET SURPLUS
            </Text>
          </View>
        </View>

        <View style={[styles.stripRow, { borderColor: theme.colors.border }]}>
          <View style={styles.stripCol}>
            <Text style={[styles.stripLabel, { color: theme.colors.textSecondary }]}>
              Committed Outflows
            </Text>
            <Text style={[styles.stripOutflow, { color: theme.colors.negativeDark }]}>
              −{formatINR(totalUpcomingOutflow)}
            </Text>
          </View>
          <View style={[styles.stripDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.stripCol}>
            <Text style={[styles.stripLabel, { color: theme.colors.textSecondary }]}>
              Expected Retainer/Salary
            </Text>
            <Text style={[styles.stripInflow, { color: theme.colors.positiveDark }]}>
              +{formatINR(totalUpcomingInflow)}
            </Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['ALL', 'DUE', 'PAID'] as const).map((f) => {
          const isSelected = filter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterTab,
                {
                  backgroundColor: isSelected
                    ? theme.colors.primary
                    : theme.colors.card,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setFilter(f)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary },
                ]}
              >
                {f === 'ALL'
                  ? `All (${obligations.length})`
                  : f === 'DUE'
                  ? `Pending (${obligations.filter((o) => !o.isPaid).length})`
                  : `Settled (${obligations.filter((o) => o.isPaid).length})`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Timeline List */}
      <View style={styles.listContainer}>
        {filtered.map((item) => {
          const badgeCol = getBadgeColor(item.type);
          return (
            <View
              key={item.id}
              style={[
                styles.itemCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
                item.isPaid && { opacity: 0.65 },
              ]}
            >
              <View style={styles.itemTopRow}>
                <View style={styles.itemTitleCol}>
                  <View style={styles.badgeRow}>
                    <View style={[styles.typePill, { backgroundColor: `${badgeCol}18` }]}>
                      <Text style={[styles.typePillText, { color: badgeCol }]}>
                        {item.type}
                      </Text>
                    </View>
                    <Text style={[styles.dueDateText, { color: theme.colors.textSecondary }]}>
                      Due {item.dueDate}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.itemTitle,
                      { color: theme.colors.textPrimary },
                      item.isPaid && styles.titleStrikethrough,
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text style={[styles.itemSub, { color: theme.colors.textSecondary }]}>
                    {item.accountName} • {item.category}
                  </Text>
                </View>

                <View style={styles.itemAmountCol}>
                  <Text
                    style={[
                      styles.itemAmount,
                      {
                        color:
                          item.type === 'SALARY'
                            ? theme.colors.positiveDark
                            : theme.colors.textPrimary,
                      },
                    ]}
                  >
                    {item.type === 'SALARY' ? '+' : '−'}
                    {formatINR(item.amount)}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.settleBtn,
                      {
                        backgroundColor: item.isPaid
                          ? theme.colors.positiveBgSolid
                          : theme.colors.cardSubtle,
                        borderColor: item.isPaid
                          ? theme.colors.positive
                          : theme.colors.border,
                      },
                    ]}
                    onPress={() => handleTogglePaid(item.id, item.title, item.isPaid)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.settleBtnText,
                        {
                          color: item.isPaid
                            ? theme.colors.positiveDark
                            : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {item.isPaid ? '✓ Reconciled' : 'Mark Paid'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
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
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  heroAmount: {
    fontSize: 24,
    fontWeight: '800',
  },
  surplusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  surplusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  stripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  stripCol: {
    flex: 1,
  },
  stripDivider: {
    width: 1,
    height: 30,
    marginHorizontal: 12,
  },
  stripLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  stripOutflow: {
    fontSize: 14,
    fontWeight: '800',
  },
  stripInflow: {
    fontSize: 14,
    fontWeight: '800',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  itemCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitleCol: {
    flex: 1,
    marginRight: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  typePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typePillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  dueDateText: {
    fontSize: 10,
    fontWeight: '600',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  titleStrikethrough: {
    textDecorationLine: 'line-through',
  },
  itemSub: {
    fontSize: 11,
  },
  itemAmountCol: {
    alignItems: 'flex-end',
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  settleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  settleBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

