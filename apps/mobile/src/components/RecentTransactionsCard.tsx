import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
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
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>RECENT GENERAL JOURNAL ENTRIES</Text>
          <Text style={styles.subtitle}>Verified Double-Entry Ledger Postings</Text>
        </View>
        <TouchableOpacity onPress={onViewAll} activeOpacity={0.7}>
          <Text style={styles.viewAllText}>View All ({transactions.length}) →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.txList}>
        {transactions.slice(0, 4).map((tx, idx) => {
          const isCredit = tx.type === 'CREDIT';
          return (
            <View
              key={tx.id}
              style={[
                styles.txRow,
                idx !== Math.min(3, transactions.length - 1) && styles.txRowBorder,
              ]}
            >
              <View style={styles.txLeft}>
                <View
                  style={[
                    styles.txIconBadge,
                    isCredit ? styles.iconBadgeCredit : styles.iconBadgeDebit,
                  ]}
                >
                  <Text style={[styles.txIconText, isCredit ? styles.iconTextCredit : styles.iconTextDebit]}>
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
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
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
    marginBottom: 12,
  },
  title: {
    fontSize: 11,
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
    marginTop: 2,
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
  },
  txIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
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
    fontSize: 14,
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
  },
  amountCredit: {
    color: theme.colors.positive,
  },
  amountDebit: {
    color: theme.colors.negative,
  },
  reconciledPill: {
    backgroundColor: theme.colors.cardSubtle,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  reconciledText: {
    fontSize: 8,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.3,
  },
});
