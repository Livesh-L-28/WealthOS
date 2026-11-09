import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal } from 'react-native';
import { theme } from '../theme';
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
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>RECENT JOURNAL ENTRIES</Text>
            <Text style={styles.subtitle}>Double-Entry Verified Postings</Text>
          </View>
          <TouchableOpacity onPress={onViewAll} activeOpacity={0.7}>
            <Text style={styles.viewAllText}>View All →</Text>
          </TouchableOpacity>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={styles.emptyTitle}>No Transactions Recorded</Text>
            <Text style={styles.emptySubtitle}>
              Tap + below to record an income or expense to begin building your general journal.
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
                  style={[styles.txRow, !isLast && styles.txRowBorder]}
                  onPress={() => setSelectedTx(tx)}
                  activeOpacity={0.7}
                >
                  <View style={styles.txLeft}>
                    <View
                      style={[
                        styles.txIconBadge,
                        isCredit ? styles.iconBadgeCredit : styles.iconBadgeDebit,
                      ]}
                    >
                      <Text
                        style={[
                          styles.txIconText,
                          isCredit ? styles.iconTextCredit : styles.iconTextDebit,
                        ]}
                      >
                        {isCredit ? '↓' : '↑'}
                      </Text>
                    </View>
                    <View style={styles.txMeta}>
                      <Text style={styles.txTitle} numberOfLines={1}>
                        {tx.title}
                      </Text>
                      <Text style={styles.txSubtitle}>
                        {tx.category} · {tx.date}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.txRight}>
                    <Text
                      style={[
                        styles.txAmount,
                        isCredit ? styles.amountCredit : styles.amountDebit,
                      ]}
                    >
                      {isCredit ? '+' : '-'}
                      {formatINR(tx.amount)}
                    </Text>
                    <View style={styles.reconciledPill}>
                      <Text style={styles.reconciledText}>
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
            <View style={styles.detailBox}>
              <View style={styles.modalBar} />
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{selectedTx.title}</Text>
                  <Text style={styles.modalSub}>{selectedTx.category} • {selectedTx.date}</Text>
                </View>
                <View
                  style={[
                    styles.modalBadge,
                    selectedTx.type === 'CREDIT' ? styles.badgeCredit : styles.badgeDebit,
                  ]}
                >
                  <Text
                    style={[
                      styles.modalBadgeText,
                      selectedTx.type === 'CREDIT' ? styles.badgeTextCredit : styles.badgeTextDebit,
                    ]}
                  >
                    {selectedTx.type === 'CREDIT' ? 'INFLOW' : 'OUTFLOW'}
                  </Text>
                </View>
              </View>

              <View style={styles.modalAmountBox}>
                <Text style={styles.modalAmountLabel}>POSTED LEDGER AMOUNT</Text>
                <Text
                  style={[
                    styles.modalAmountVal,
                    { color: selectedTx.type === 'CREDIT' ? theme.colors.primary : '#DC2626' },
                  ]}
                >
                  {selectedTx.type === 'CREDIT' ? '+' : '-'}{formatINR(selectedTx.amount)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Settlement Account</Text>
                <Text style={styles.detailValue}>{selectedTx.accountName}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Reconciliation Status</Text>
                <Text style={styles.detailValueGreen}>● {selectedTx.status}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>General Journal ID</Text>
                <Text style={styles.detailValueMono}>{selectedTx.id}</Text>
              </View>

              <TouchableOpacity
                style={styles.closeBtn}
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
