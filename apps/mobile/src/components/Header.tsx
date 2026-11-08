import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
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
    <View style={styles.header}>
      {/* Left: Brand Identity */}
      <View style={styles.brandRow}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>W</Text>
        </View>
        <View style={styles.brandTextCol}>
          <View style={styles.titleWithPill}>
            <Text style={styles.brandTitle}>
              Wealth<Text style={styles.brandAccent}>OS</Text>
            </Text>
            <View style={styles.workspacePill}>
              <Text style={styles.workspacePillText}>PERSONAL</Text>
            </View>
          </View>
          <View style={styles.syncRow}>
            <View style={[styles.syncDot, isSyncing && styles.syncDotPulse]} />
            <Text style={styles.syncText}>
              {isSyncing ? 'Synchronizing...' : 'Ledger Synced'}
            </Text>
          </View>
        </View>
      </View>

      {/* Right: Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onOpenReconciliation}
          activeOpacity={0.7}
          accessibilityLabel="Open Ledger Control Centre"
        >
          <Text style={styles.iconButtonText}>🛡️</Text>
          <View style={styles.shieldActiveDot} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryActionButton}
          onPress={onAddTransaction}
          activeOpacity={0.8}
          accessibilityLabel="Add New Transaction"
        >
          <Text style={styles.primaryActionPlus}>+</Text>
          <Text style={styles.primaryActionText}>Entry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 6 : 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  logoText: {
    color: theme.colors.textWhite,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandTextCol: {
    justifyContent: 'center',
  },
  titleWithPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.4,
  },
  brandAccent: {
    color: theme.colors.primary,
  },
  workspacePill: {
    backgroundColor: theme.colors.primaryLightSolid,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  workspacePillText: {
    color: theme.colors.primaryDark,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
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
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.cardSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconButtonText: {
    fontSize: 15,
  },
  shieldActiveDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.positive,
  },
  primaryActionButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  primaryActionPlus: {
    color: theme.colors.textWhite,
    fontSize: 14,
    fontWeight: '800',
    marginTop: -1,
  },
  primaryActionText: {
    color: theme.colors.textWhite,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
