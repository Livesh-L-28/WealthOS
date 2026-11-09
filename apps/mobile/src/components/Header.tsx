import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../theme';

interface HeaderProps {
  onAddTransaction?: () => void;
  onAddIncome?: () => void;
  onAddExpense?: () => void;
  onOpenReconciliation: () => void;
  onOpenHub: () => void;
  onOpenCopilot?: () => void;
  onOpenSearch?: () => void;
  activeWorkspace?: string;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenReconciliation,
  onOpenHub,
  onOpenCopilot,
  onOpenSearch,
  activeWorkspace = 'Family Office',
  isSyncing = false,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      {/* Left: Brand Identity & Enterprise Workspace Dropdown Trigger */}
      <TouchableOpacity
        style={styles.brandRow}
        onPress={onOpenHub}
        activeOpacity={0.75}
        accessibilityLabel="Open Workspace and Enterprise Menu"
      >
        <View style={[styles.logoBadge, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.logoText}>W</Text>
        </View>
        <View style={styles.brandTextCol}>
          <View style={styles.titleWithPill}>
            <Text style={[styles.brandTitle, { color: theme.colors.textPrimary }]}>
              Wealth<Text style={[styles.brandAccent, { color: theme.colors.primary }]}>OS</Text>
            </Text>
            <View
              style={[
                styles.workspacePill,
                {
                  backgroundColor: theme.colors.primaryLightSolid,
                  borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(37, 99, 235, 0.2)',
                },
              ]}
            >
              <Text style={[styles.workspacePillText, { color: theme.colors.primary }]}>
                {activeWorkspace.toUpperCase()}
              </Text>
              <Text style={[styles.workspacePillArrow, { color: theme.colors.primary }]}>▾</Text>
            </View>
          </View>
          <View style={styles.syncRow}>
            <View
              style={[
                styles.syncDot,
                { backgroundColor: theme.colors.positive },
                isSyncing && styles.syncDotPulse,
              ]}
            />
            <Text style={[styles.syncText, { color: theme.colors.textSecondary }]}>
              {isSyncing ? 'Synchronizing...' : 'Ledger In Balance'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Right: Sleek Action Dock: Search, Theme Toggle, Copilot, Reconciliation Shield & Enterprise Menu */}
      <View style={styles.actionsRow}>
        {onOpenSearch && (
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.colors.cardSubtle, borderColor: theme.colors.border }]}
            onPress={onOpenSearch}
            activeOpacity={0.75}
            accessibilityLabel="Open Global Search"
          >
            <Text style={styles.actionIconSmall}>🔍</Text>
          </TouchableOpacity>
        )}

        {/* 1-Tap Dark Mode Toggle */}
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: theme.colors.cardSubtle, borderColor: theme.colors.border }]}
          onPress={toggleTheme}
          activeOpacity={0.75}
          accessibilityLabel="Toggle Dark Mode"
        >
          <Text style={styles.actionIconSmall}>{isDark ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>

        {onOpenCopilot && (
          <TouchableOpacity
            style={[
              styles.copilotHeaderBtn,
              {
                backgroundColor: theme.colors.primaryLightSolid,
                borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(37, 99, 235, 0.25)',
              },
            ]}
            onPress={onOpenCopilot}
            activeOpacity={0.8}
            accessibilityLabel="Open AI Copilot"
          >
            <Text style={styles.copilotHeaderIcon}>✨</Text>
            <Text style={[styles.copilotHeaderText, { color: theme.colors.primary }]}>Copilot</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: theme.colors.cardSubtle, borderColor: theme.colors.border }]}
          onPress={onOpenReconciliation}
          activeOpacity={0.7}
          accessibilityLabel="Open Ledger Control Centre"
        >
          <Text style={styles.iconButtonText}>🛡️</Text>
          <View style={[styles.shieldActiveDot, { backgroundColor: theme.colors.positive }]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuButton, { backgroundColor: theme.colors.cardSubtle, borderColor: theme.colors.border }]}
          onPress={onOpenHub}
          activeOpacity={0.7}
          accessibilityLabel="Open Full Menu"
        >
          <Text style={[styles.menuButtonText, { color: theme.colors.textPrimary }]}>☰</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  logoText: {
    color: '#FFFFFF',
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
    letterSpacing: -0.4,
  },
  brandAccent: {
    fontWeight: '800',
  },
  workspacePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  workspacePillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  workspacePillArrow: {
    fontSize: 8,
    fontWeight: '800',
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
  },
  syncDotPulse: {
    opacity: 0.4,
  },
  syncText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  copilotHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  copilotHeaderIcon: {
    fontSize: 12,
  },
  copilotHeaderText: {
    fontSize: 11,
    fontWeight: '700',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  iconButtonText: {
    fontSize: 14,
  },
  actionIconSmall: {
    fontSize: 13,
  },
  shieldActiveDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  menuButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  menuButtonText: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
});
