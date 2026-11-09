import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { theme } from '../theme';

interface HeaderProps {
  onAddTransaction: () => void;
  onAddIncome?: () => void;
  onAddExpense?: () => void;
  onOpenReconciliation: () => void;
  onOpenHub: () => void;
  activeWorkspace?: string;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onAddTransaction,
  onAddIncome,
  onAddExpense,
  onOpenReconciliation,
  onOpenHub,
  activeWorkspace = 'Family Office',
  isSyncing = false,
}) => {
  return (
    <View style={styles.header}>
      {/* Left: Brand Identity & Enterprise Hub Trigger */}
      <TouchableOpacity
        style={styles.brandRow}
        onPress={onOpenHub}
        activeOpacity={0.7}
        accessibilityLabel="Open Enterprise Hub Menu"
      >
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>LJ</Text>
        </View>
        <View style={styles.brandTextCol}>
          <View style={styles.titleWithPill}>
            <Text style={styles.brandTitle}>
              Wealth<Text style={styles.brandAccent}>OS</Text>
            </Text>
            <View style={styles.workspacePill}>
              <Text style={styles.workspacePillText}>
                {activeWorkspace.toUpperCase()}
              </Text>
              <Text style={styles.workspacePillArrow}>▾</Text>
            </View>
          </View>
          <View style={styles.syncRow}>
            <View style={[styles.syncDot, isSyncing && styles.syncDotPulse]} />
            <Text style={styles.syncText}>
              {isSyncing ? 'Synchronizing...' : 'Double-Entry In Balance'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Right: Quick Inflow / Outflow Actions Dock */}
      <View style={styles.actionsRow}>
        {onAddExpense && onAddIncome ? (
          <>
            <TouchableOpacity
              style={styles.expenseQuickBtn}
              onPress={onAddExpense}
              activeOpacity={0.8}
              accessibilityLabel="Quick Add Expense"
            >
              <Text style={styles.expenseQuickMinus}>−</Text>
              <Text style={styles.expenseQuickText}>Exp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.incomeQuickBtn}
              onPress={onAddIncome}
              activeOpacity={0.8}
              accessibilityLabel="Quick Add Income"
            >
              <Text style={styles.incomeQuickPlus}>+</Text>
              <Text style={styles.incomeQuickText}>Inc</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={onAddTransaction}
            activeOpacity={0.8}
            accessibilityLabel="Add New Transaction"
          >
            <Text style={styles.primaryActionPlus}>+</Text>
            <Text style={styles.primaryActionText}>Entry</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.iconButton}
          onPress={onOpenReconciliation}
          activeOpacity={0.7}
          accessibilityLabel="Open Ledger Control Centre"
        >
          <Text style={styles.iconButtonText}>🛡️</Text>
          <View style={styles.shieldActiveDot} />
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
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  logoText: {
    color: theme.colors.textWhite,
    fontSize: 14,
    fontWeight: '800',
  },
  brandTextCol: {
    justifyContent: 'center',
  },
  titleWithPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: theme.colors.primary,
  },
  workspacePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  workspacePillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.4,
  },
  workspacePillArrow: {
    fontSize: 8,
    color: theme.colors.textTertiary,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  syncDotPulse: {
    backgroundColor: '#F59E0B',
  },
  syncText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expenseQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 3,
  },
  expenseQuickMinus: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '900',
    marginTop: -2,
  },
  expenseQuickText: {
    color: '#991B1B',
    fontSize: 11,
    fontWeight: '800',
  },
  incomeQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 3,
  },
  incomeQuickPlus: {
    color: '#15803D',
    fontSize: 14,
    fontWeight: '900',
    marginTop: -1,
  },
  incomeQuickText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '800',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceElevated,
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
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.danger,
    borderWidth: 1,
    borderColor: theme.colors.surface,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
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
    fontSize: 15,
    fontWeight: '800',
    marginTop: -1,
  },
  primaryActionText: {
    color: theme.colors.textWhite,
    fontSize: 12.5,
    fontWeight: '700',
  },
});
