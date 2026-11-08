import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { theme } from '../theme';

interface HeaderProps {
  onAddTransaction: () => void;
  onOpenReconciliation: () => void;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onAddTransaction,
  onOpenReconciliation,
  isSyncing = false,
}) => {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.leftSection}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>W</Text>
        </View>

        <View style={styles.brandInfo}>
          <View style={styles.brandTitleRow}>
            <Text style={styles.brandTitle}>
              Wealth<Text style={styles.brandAccent}>OS</Text>
            </Text>
            <View style={styles.workspacePill}>
              <Text style={styles.workspacePillText}>PERSONAL · INR</Text>
            </View>
          </View>
          <View style={styles.subtitleRow}>
            <Text style={styles.brandSubtitle}>DOUBLE-ENTRY LEDGER</Text>
            <View style={styles.dotSeparator} />
            <View style={styles.syncIndicator}>
              <View style={[styles.syncDot, isSyncing && styles.syncDotPulse]} />
              <Text style={styles.syncText}>{isSyncing ? 'SYNCING...' : 'SYNCED'}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.rightSection}>
        <TouchableOpacity
          style={styles.reconButton}
          onPress={onOpenReconciliation}
          activeOpacity={0.7}
          accessibilityLabel="Open Ledger Reconciliation and Control Centre"
        >
          <Text style={styles.reconButtonIcon}>🛡️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addButton}
          onPress={onAddTransaction}
          activeOpacity={0.8}
          accessibilityLabel="Add New Transaction"
        >
          <Text style={styles.addButtonText}>+ Entry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  logoText: {
    color: theme.colors.textWhite,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandInfo: {
    flexDirection: 'column',
    gap: 2,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: theme.colors.primary,
  },
  workspacePill: {
    backgroundColor: theme.colors.primaryLightSolid,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(22, 163, 106, 0.2)',
  },
  workspacePillText: {
    color: theme.colors.primaryDark,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.borderStrong,
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.positive,
  },
  syncDotPulse: {
    opacity: 0.4,
  },
  syncText: {
    color: theme.colors.positiveDark,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.cardSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reconButtonIcon: {
    fontSize: 15,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonText: {
    color: theme.colors.textWhite,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});

