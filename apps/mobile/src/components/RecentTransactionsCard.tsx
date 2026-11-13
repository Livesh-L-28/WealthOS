import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { theme, useTheme } from '../theme';
import { Transaction } from '../types';
import { formatINR } from '../formatters';
import { getCategoryVisualMeta } from '../utils/categoryMeta';

interface RecentTransactionsCardProps {
  transactions: Transaction[];
  onViewAll: () => void;
}

const FILTER_CHIPS = [
  { id: 'ALL', label: 'All' },
  { id: 'DEBIT', label: 'Expenses' },
  { id: 'CREDIT', label: 'Incomes' },
  { id: 'FOOD', label: 'Food & Dining' },
  { id: 'SHOPPING', label: 'Shopping' },
  { id: 'BILLS', label: 'Bills' },
  { id: 'FUEL', label: 'Fuel / Travel' },
] as const;

export const RecentTransactionsCard: React.FC<RecentTransactionsCardProps> = ({
  transactions,
  onViewAll,
}) => {
  const { isDark } = useTheme();
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  const cardBg = isDark ? '#111827' : '#FFFFFF';
  const borderColor = isDark ? '#1E293B' : '#E2E8F0';
  const titleColor = isDark ? '#94A3B8' : '#64748B';
  const subColor = isDark ? '#64748B' : '#94A3B8';
  const primaryText = isDark ? '#F8FAFC' : '#0F172A';
  const modalBoxBg = isDark ? '#1E293B' : '#F8FAFC';
  const dividerColor = isDark ? '#1E293B' : '#F1F5F9';

  // Filter transactions based on selected chip
  const filtered = transactions.filter((tx) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'DEBIT') return tx.type === 'DEBIT';
    if (activeFilter === 'CREDIT') return tx.type === 'CREDIT';
    const cat = (tx.category || '').toLowerCase();
    if (activeFilter === 'FOOD') return cat.includes('food') || cat.includes('dining') || cat.includes('restaurant') || cat.includes('grocer');
    if (activeFilter === 'SHOPPING') return cat.includes('shop') || cat.includes('retail') || cat.includes('amazon');
    if (activeFilter === 'BILLS') return cat.includes('bill') || cat.includes('utilit') || cat.includes('electric') || cat.includes('tech');
    if (activeFilter === 'FUEL') return cat.includes('fuel') || cat.includes('transport') || cat.includes('travel') || cat.includes('cab');
    return true;
  });

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: titleColor }]}>RECENT ACTIVITY</Text>
            <Text style={[styles.subtitle, { color: subColor }]}>Double-Entry General Journal</Text>
          </View>
          <TouchableOpacity onPress={onViewAll} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="View all transactions">
            <Text style={[styles.viewAllText, { color: isDark ? '#60A5FA' : '#2563EB' }]}>
              View All ›
            </Text>
          </TouchableOpacity>
        </View>

        {/* 1-Tap Horizontal Quick Filter Chips */}
        {transactions.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContainer}
          >
            {FILTER_CHIPS.map((chip) => {
              const isActive = activeFilter === chip.id;
              return (
                <TouchableOpacity
                  key={chip.id}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isActive
                        ? isDark
                          ? '#2563EB'
                          : '#2563EB'
                        : isDark
                        ? '#1E293B'
                        : '#F1F5F9',
                      borderColor: isActive
                        ? isDark
                          ? '#3B82F6'
                          : '#1D4ED8'
                        : isDark
                        ? '#334155'
                        : '#E2E8F0',
                    },
                  ]}
                  onPress={() => setActiveFilter(chip.id)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isActive
                          ? '#FFFFFF'
                          : isDark
                          ? '#CBD5E1'
                          : '#475569',
                        fontWeight: isActive ? '700' : '600',
                      },
                    ]}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={[styles.emptyTitle, { color: primaryText }]}>No Transactions Yet</Text>
            <Text style={[styles.emptySubtitle, { color: titleColor }]}>
              Tap '+ Record' on the top card to log your first income or expense.
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyFilteredContainer}>
            <Text style={[styles.emptyFilteredText, { color: subColor }]}>
              No {FILTER_CHIPS.find((c) => c.id === activeFilter)?.label.toLowerCase()} entries found.
            </Text>
            <TouchableOpacity onPress={() => setActiveFilter('ALL')} activeOpacity={0.7}>
              <Text style={[styles.resetFilterText, { color: isDark ? '#60A5FA' : '#2563EB' }]}>
                Show All
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.txList}>
            {filtered.slice(0, 5).map((tx, idx) => {
              const isCredit = tx.type === 'CREDIT';
              const isLast = idx === Math.min(4, filtered.length - 1);
              const meta = getCategoryVisualMeta(tx.category, tx.type, isDark);

              return (
                <TouchableOpacity
                  key={tx.id}
                  style={[
                    styles.txRow,
                    !isLast && [styles.txRowBorder, { borderBottomColor: dividerColor }],
                  ]}
                  onPress={() => setSelectedTx(tx)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${tx.title}, ${formatINR(tx.amount)}`}
                >
                  <View style={styles.txLeft}>
                    <View
                      style={[
                        styles.txIconBadge,
                        {
                          backgroundColor: meta.bgColor,
                          borderColor: meta.borderColor,
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <Text style={styles.txIconEmoji}>{meta.icon}</Text>
                    </View>
                    <View style={styles.txMeta}>
                      <Text
                        style={[styles.txTitle, { color: primaryText }]}
                        numberOfLines={1}
                      >
                        {tx.title}
                      </Text>
                      <Text style={[styles.txSubtitle, { color: subColor }]}>
                        {tx.category} · {tx.date}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.txRight}>
                    <Text
                      style={[
                        styles.txAmount,
                        {
                          color: isCredit
                            ? isDark
                              ? '#34D399'
                              : '#059669'
                            : primaryText,
                        },
                      ]}
                    >
                      {isCredit ? '+' : '-'}
                      {formatINR(tx.amount)}
                    </Text>
                    <View
                      style={[
                        styles.reconciledPill,
                        { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
                      ]}
                    >
                      <Text style={[styles.reconciledText, { color: subColor }]}>
                        {tx.status === 'RECONCILED' ? '✓ RECON' : 'SETTLED'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <Modal
          visible={!!selectedTx}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedTx(null)}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.detailBox,
                {
                  backgroundColor: cardBg,
                  borderColor,
                  borderWidth: 1,
                },
              ]}
            >
              <View style={[styles.modalBar, { backgroundColor: borderColor }]} />
              
              {/* Header with Category Icon */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  {(() => {
                    const modalMeta = getCategoryVisualMeta(selectedTx.category, selectedTx.type, isDark);
                    return (
                      <View
                        style={[
                          styles.modalCategoryIconCircle,
                          {
                            backgroundColor: modalMeta.bgColor,
                            borderColor: modalMeta.borderColor,
                            borderWidth: 1,
                          },
                        ]}
                      >
                        <Text style={styles.modalCategoryIcon}>{modalMeta.icon}</Text>
                      </View>
                    );
                  })()}
                  <View style={styles.modalTitleCol}>
                    <Text style={[styles.modalTitle, { color: primaryText }]} numberOfLines={1}>
                      {selectedTx.title}
                    </Text>
                    <Text style={[styles.modalSub, { color: subColor }]}>
                      {selectedTx.category} • {selectedTx.date}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.modalBadge,
                    {
                      backgroundColor:
                        selectedTx.type === 'CREDIT'
                          ? isDark
                            ? 'rgba(16, 185, 129, 0.2)'
                            : '#ECFDF5'
                          : isDark
                          ? 'rgba(239, 68, 68, 0.2)'
                          : '#FEF2F2',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalBadgeText,
                      {
                        color:
                          selectedTx.type === 'CREDIT'
                            ? isDark
                              ? '#34D399'
                              : '#059669'
                            : isDark
                            ? '#F87171'
                            : '#DC2626',
                      },
                    ]}
                  >
                    {selectedTx.type === 'CREDIT' ? 'INFLOW' : 'OUTFLOW'}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.modalAmountBox,
                  {
                    backgroundColor: modalBoxBg,
                    borderColor,
                  },
                ]}
              >
                <Text style={[styles.modalAmountLabel, { color: subColor }]}>
                  POSTED LEDGER AMOUNT
                </Text>
                <Text
                  style={[
                    styles.modalAmountVal,
                    {
                      color:
                        selectedTx.type === 'CREDIT'
                          ? isDark
                            ? '#34D399'
                            : '#059669'
                          : isDark
                          ? '#F87171'
                          : '#DC2626',
                    },
                  ]}
                >
                  {selectedTx.type === 'CREDIT' ? '+' : '-'}
                  {formatINR(selectedTx.amount)}
                </Text>
              </View>

              <View style={[styles.detailRow, { borderBottomColor: dividerColor }]}>
                <Text style={[styles.detailLabel, { color: subColor }]}>Settlement Account</Text>
                <Text style={[styles.detailValue, { color: primaryText }]}>
                  {selectedTx.accountName}
                </Text>
              </View>

              <View style={[styles.detailRow, { borderBottomColor: dividerColor }]}>
                <Text style={[styles.detailLabel, { color: subColor }]}>Reconciliation Status</Text>
                <Text
                  style={[
                    styles.detailValueGreen,
                    { color: isDark ? '#34D399' : '#059669' },
                  ]}
                >
                  ● {selectedTx.status}
                </Text>
              </View>

              <View style={[styles.detailRow, { borderBottomColor: dividerColor }]}>
                <Text style={[styles.detailLabel, { color: subColor }]}>General Journal ID</Text>
                <Text style={[styles.detailValueMono, { color: subColor }]}>
                  {selectedTx.id}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.closeBtn,
                  { backgroundColor: isDark ? '#2563EB' : '#1D4ED8' },
                ]}
                onPress={() => setSelectedTx(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.closeBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 24,
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
    marginBottom: 8,
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
  viewAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  filterScroll: {
    marginVertical: 8,
    marginHorizontal: -4,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
  },
  txList: {
    marginTop: 4,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  txRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  txIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconEmoji: {
    fontSize: 16,
  },
  txMeta: {
    flex: 1,
  },
  txTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  txSubtitle: {
    fontSize: 10.5,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  reconciledPill: {
    backgroundColor: '#F0F4F1',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  reconciledText: {
    fontSize: 7.5,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    letterSpacing: 0.3,
  },
  emptyFilteredContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 6,
  },
  emptyFilteredText: {
    fontSize: 12,
  },
  resetFilterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 20, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E7ECE8',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  modalCategoryIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCategoryIcon: {
    fontSize: 18,
  },
  modalTitleCol: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#17231D',
  },
  modalSub: {
    fontSize: 11,
    color: '#758078',
    marginTop: 2,
  },
  modalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modalBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  modalAmountBox: {
    backgroundColor: '#F7F9F7',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E7ECE8',
  },
  modalAmountLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#758078',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modalAmountVal: {
    fontSize: 22,
    fontWeight: '900',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F1',
  },
  detailLabel: {
    fontSize: 11,
    color: '#758078',
  },
  detailValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#17231D',
  },
  detailValueGreen: {
    fontSize: 11,
    fontWeight: '800',
    color: '#087A50',
  },
  detailValueMono: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#758078',
  },
  closeBtn: {
    backgroundColor: '#16A36A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: {
    fontSize: 26,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 260,
  },
});
