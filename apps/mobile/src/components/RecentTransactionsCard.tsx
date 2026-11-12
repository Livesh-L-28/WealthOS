import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal } from 'react-native';
import { theme, useTheme } from '../theme';
import { Transaction } from '../types';
import { formatINR } from '../formatters';

interface RecentTransactionsCardProps {
  transactions: Transaction[];
  onViewAll: () => void;
}

export const RecentTransactionsCard: React.FC<RecentTransactionsCardProps> = ({
  transactions,
  onViewAll,
}) => {
  const { isDark } = useTheme();
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const cardBg = isDark ? '#111827' : '#FFFFFF';
  const borderColor = isDark ? '#1E293B' : '#E2E8F0';
  const titleColor = isDark ? '#94A3B8' : '#64748B';
  const subColor = isDark ? '#64748B' : '#94A3B8';
  const primaryText = isDark ? '#F8FAFC' : '#0F172A';
  const modalBoxBg = isDark ? '#1E293B' : '#F8FAFC';
  const dividerColor = isDark ? '#1E293B' : '#F1F5F9';

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: titleColor }]}>RECENT ACTIVITY</Text>
            <Text style={[styles.subtitle, { color: subColor }]}>Double-Entry General Journal</Text>
          </View>
          <TouchableOpacity onPress={onViewAll} activeOpacity={0.7}>
            <Text style={[styles.viewAllText, { color: isDark ? '#60A5FA' : '#2563EB' }]}>
              View All ›
            </Text>
          </TouchableOpacity>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={[styles.emptyTitle, { color: primaryText }]}>No Transactions Yet</Text>
            <Text style={[styles.emptySubtitle, { color: titleColor }]}>
              Tap '+ Record' on the top card to log your first income or expense.
            </Text>
          </View>
        ) : (
          <View style={styles.txList}>
            {transactions.slice(0, 4).map((tx, idx) => {
              const isCredit = tx.type === 'CREDIT';
              const isLast = idx === Math.min(3, transactions.length - 1);
              return (
                <TouchableOpacity
                  key={tx.id}
                  style={[
                    styles.txRow,
                    !isLast && [styles.txRowBorder, { borderBottomColor: dividerColor }],
                  ]}
                  onPress={() => setSelectedTx(tx)}
                  activeOpacity={0.7}
                >
                  <View style={styles.txLeft}>
                    <View
                      style={[
                        styles.txIconBadge,
                        {
                          backgroundColor: isCredit
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
                          styles.txIconText,
                          {
                            color: isCredit
                              ? isDark
                                ? '#34D399'
                                : '#059669'
                              : isDark
                              ? '#F87171'
                              : '#DC2626',
                          },
                        ]}
                      >
                        {isCredit ? '↓' : '↑'}
                      </Text>
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
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: primaryText }]}>
                    {selectedTx.title}
                  </Text>
                  <Text style={[styles.modalSub, { color: subColor }]}>
                    {selectedTx.category} • {selectedTx.date}
                  </Text>
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
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeCredit: {
    backgroundColor: theme.colors.primaryLightSolid,
  },
  iconBadgeDebit: {
    backgroundColor: theme.colors.negativeBgSolid,
  },
  txIconText: {
    fontSize: 13,
    fontWeight: '800',
  },
  iconTextCredit: {
    color: theme.colors.positiveDark,
  },
  iconTextDebit: {
    color: theme.colors.negativeDark,
  },
  txMeta: {
    flex: 1,
  },
  txTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  txSubtitle: {
    fontSize: 10,
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
  amountCredit: {
    color: theme.colors.positive,
  },
  amountDebit: {
    color: theme.colors.textPrimary,
  },
  reconciledPill: {
    backgroundColor: '#F0F4F1',
    paddingHorizontal: 4.5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  reconciledText: {
    fontSize: 7.5,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    letterSpacing: 0.3,
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
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
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
  badgeCredit: {
    backgroundColor: '#DCFCE7',
  },
  badgeDebit: {
    backgroundColor: '#FEE2E2',
  },
  modalBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  badgeTextCredit: {
    color: '#087A50',
  },
  badgeTextDebit: {
    color: '#991B1B',
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
