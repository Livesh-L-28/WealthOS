import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { theme } from '../theme';

interface HeaderProps {
  onAddTransaction?: () => void;
  onAddIncome?: () => void;
  onAddExpense?: () => void;
  onOpenReconciliation: () => void;
  onOpenHub: () => void;
  onOpenCopilot?: () => void;
  activeWorkspace?: string;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onAddTransaction,
  onAddIncome,
  onAddExpense,
  onOpenReconciliation,
  onOpenHub,
  onOpenCopilot,
  activeWorkspace = 'Family Office',
  isSyncing = false,
}) => {
  return (
    <View style={styles.header}>
      {/* Left: Brand Identity & Enterprise Workspace Dropdown Trigger */}
      <TouchableOpacity
        style={styles.brandRow}
        onPress={onOpenHub}
        activeOpacity={0.75}
        accessibilityLabel="Open Workspace and Enterprise Menu"
      >
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>W</Text>
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
              {isSyncing ? 'Synchronizing...' : 'Ledger In Balance'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Right: Sleek Action Dock: Copilot, Reconciliation Shield & Enterprise Menu */}
      <View style={styles.actionsRow}>
        {onOpenCopilot && (
          <TouchableOpacity
            style={styles.copilotHeaderBtn}
            onPress={onOpenCopilot}
            activeOpacity={0.8}
            accessibilityLabel="Open AI Copilot"
          >
            <Text style={styles.copilotHeaderIcon}>✨</Text>
            <Text style={styles.copilotHeaderText}>Copilot</Text>
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

        <TouchableOpacity
          style={styles.menuButton}
          onPress={onOpenHub}
          activeOpacity={0.7}
          accessibilityLabel="Open Full Menu"
        >
          <Text style={styles.menuButtonText}>☰</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
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
    fontSize: 16,
    fontWeight: '900',
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
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.4,
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
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
  },
  workspacePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    letterSpacing: 0.3,
  },
  workspacePillArrow: {
    fontSize: 8,
    color: theme.colors.textTertiary,
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
    backgroundColor: theme.colors.primary,
  },
  syncDotPulse: {
    backgroundColor: '#F59E0B',
  },
  syncText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  copilotHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 106, 0.4)',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  copilotHeaderIcon: {
    fontSize: 12,
  },
  copilotHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.primaryDark,
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
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.surface,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
});
