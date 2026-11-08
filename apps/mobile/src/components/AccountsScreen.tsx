import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { theme } from '../theme';
import { BankAccount } from '../types';
import { formatINR } from '../formatters';

interface AccountsScreenProps {
  accounts: BankAccount[];
  onConnectAccount: () => void;
}

export const AccountsScreen: React.FC<AccountsScreenProps> = ({
  accounts,
  onConnectAccount,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'ASSET' | 'LIABILITY'>('ALL');

  const filteredAccounts = accounts.filter(
    (a) => filter === 'ALL' || a.category === filter
  );

  const totalAssets = accounts
    .filter((a) => a.category === 'ASSET')
    .reduce((sum, a) => sum + a.balance, 0);

  const totalLiabilities = accounts
    .filter((a) => a.category === 'LIABILITY')
    .reduce((sum, a) => sum + a.balance, 0);

  return (
    <View style={styles.container}>
      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <Text style={styles.summaryLabel}>CONNECTED INSTITUTION ACCOUNTS</Text>
          <View style={styles.syncBadge}>
            <Text style={styles.syncBadgeText}>● All 6 Synced</Text>
          </View>
        </View>

        <View style={styles.summaryNumbersRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryBoxLabel}>Asset Balances</Text>
            <Text style={styles.assetVal}>{formatINR(totalAssets)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryBox}>
            <Text style={styles.summaryBoxLabel}>Liability Debts</Text>
            <Text style={styles.liabilityVal}>{formatINR(totalLiabilities)}</Text>
          </View>
        </View>
      </View>

      {/* Segmented Filter Control */}
      <View style={styles.segmentedControl}>
        {(
          [
            { id: 'ALL', label: `All (${accounts.length})` },
            { id: 'ASSET', label: 'Assets' },
            { id: 'LIABILITY', label: 'Debts' },
          ] as const
        ).map((f) => {
          const isActive = filter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
              onPress={() => setFilter(f.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Accounts List */}
      <View style={styles.accountList}>
        {filteredAccounts.map((acc) => {
          const isAsset = acc.category === 'ASSET';
          return (
            <View key={acc.id} style={styles.accountCard}>
              <View style={styles.cardTopRow}>
                <View style={styles.bankAvatar}>
                  <Text style={styles.bankEmoji}>
                    {acc.type === 'CREDIT_CARD' ? '💳' : acc.type === 'DEMAT' ? '📈' : '🏛️'}
                  </Text>
                </View>

                <View style={styles.accountMeta}>
                  <Text style={styles.accountName}>{acc.name}</Text>
                  <Text style={styles.accountInstitution}>
                    {acc.institution} · {acc.accountNumberMask}
                  </Text>
                </View>

                <View
                  style={[
                    styles.typeBadge,
                    isAsset ? styles.typeBadgeAsset : styles.typeBadgeLiability,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeBadgeText,
                      isAsset ? styles.typeTextAsset : styles.typeTextLiability,
                    ]}
                  >
                    {acc.type}
                  </Text>
                </View>
              </View>

              <View style={styles.cardMidRow}>
                <View>
                  <Text style={styles.balanceLabel}>LEDGER BALANCE</Text>
                  <Text
                    style={[
                      styles.accountBalance,
                      isAsset ? styles.balanceAsset : styles.balanceLiability,
                    ]}
                  >
                    {formatINR(acc.balance)}
                  </Text>
                </View>
                {acc.interestRate && (
                  <View style={styles.rateBadge}>
                    <Text style={styles.rateText}>{acc.interestRate}% p.a.</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.syncStatusText}>Synced: {acc.lastSynced}</Text>
                <View style={styles.verifiedRow}>
                  <Text style={styles.verifiedDot}>●</Text>
                  <Text style={styles.verifiedText}>Double-Entry Verified</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* Add Account Button */}
      <TouchableOpacity
        style={styles.connectBtn}
        onPress={onConnectAccount}
        activeOpacity={0.8}
      >
        <Text style={styles.connectBtnText}>+ Connect Another Bank or Demat</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
  },
  summaryCard: {
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
    marginBottom: 14,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  syncBadge: {
    backgroundColor: theme.colors.primaryLightSolid,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  syncBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  summaryNumbersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
  },
  summaryBox: {
    flex: 1,
  },
  summaryBoxLabel: {
    fontSize: 9.5,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  assetVal: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.positive,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  liabilityVal: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.negative,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#EEF2EF',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 14,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  segmentTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  accountList: {
    gap: 12,
  },
  accountCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bankAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F0F4F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bankEmoji: {
    fontSize: 17,
  },
  accountMeta: {
    flex: 1,
  },
  accountName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  accountInstitution: {
    fontSize: 10.5,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  typeBadgeAsset: {
    backgroundColor: theme.colors.primaryLightSolid,
  },
  typeBadgeLiability: {
    backgroundColor: theme.colors.negativeBgSolid,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  typeTextAsset: {
    color: theme.colors.primaryDark,
  },
  typeTextLiability: {
    color: theme.colors.negativeDark,
  },
  cardMidRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  balanceLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.4,
  },
  accountBalance: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
    marginTop: 2,
  },
  balanceAsset: {
    color: theme.colors.textPrimary,
  },
  balanceLiability: {
    color: theme.colors.negative,
  },
  rateBadge: {
    backgroundColor: '#F0F4F1',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rateText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    marginTop: 8,
  },
  syncStatusText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedDot: {
    color: theme.colors.positive,
    fontSize: 8,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.primaryDark,
  },
  connectBtn: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  connectBtnText: {
    color: theme.colors.primaryDark,
    fontSize: 12.5,
    fontWeight: '700',
  },
});
