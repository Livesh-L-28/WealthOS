import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
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
      {/* Top Header Summary */}
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

      {/* Filter Segmented Pills */}
      <View style={styles.filterRow}>
        {(
          [
            { id: 'ALL', label: `All (${accounts.length})` },
            { id: 'ASSET', label: 'Assets & Banks' },
            { id: 'LIABILITY', label: 'Liabilities & Debt' },
          ] as const
        ).map((f) => {
          const isActive = filter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              onPress={() => setFilter(f.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Account Cards */}
      <View style={styles.accountList}>
        {filteredAccounts.map((acc) => {
          const isAsset = acc.category === 'ASSET';
          return (
            <View key={acc.id} style={styles.accountCard}>
              <View style={styles.accountHeader}>
                <View style={styles.accountHeaderLeft}>
                  <View style={styles.bankIconCircle}>
                    <Text style={styles.bankIcon}>
                      {acc.type === 'CREDIT_CARD' ? '💳' : acc.type === 'DEMAT' ? '📈' : '🏛️'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.accountName}>{acc.name}</Text>
                    <Text style={styles.accountInstitution}>
                      {acc.institution} · {acc.accountNumberMask}
                    </Text>
                  </View>
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

              <View style={styles.accountBody}>
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

              <View style={styles.accountFooter}>
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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
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
    borderRadius: 6,
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
    fontSize: 10,
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: theme.colors.cardSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterPillActive: {
    backgroundColor: theme.colors.primaryLightSolid,
    borderColor: theme.colors.primary,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterPillTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
  accountList: {
    gap: 10,
  },
  accountCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  accountHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  bankIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.colors.cardSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankIcon: {
    fontSize: 16,
  },
  accountName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  accountInstitution: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
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
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  typeTextAsset: {
    color: theme.colors.primaryDark,
  },
  typeTextLiability: {
    color: theme.colors.negativeDark,
  },
  accountBody: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  balanceLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.3,
  },
  accountBalance: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
    marginTop: 2,
  },
  balanceAsset: {
    color: theme.colors.textPrimary,
  },
  balanceLiability: {
    color: theme.colors.negative,
  },
  rateBadge: {
    backgroundColor: theme.colors.cardSubtle,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rateText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  accountFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    marginTop: 4,
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
    marginTop: 14,
  },
  connectBtnText: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
});
