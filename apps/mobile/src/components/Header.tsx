import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../theme';

interface HeaderProps {
  onAddTransaction?: () => void;
  onAddIncome?: () => void;
  onAddExpense?: () => void;
  onOpenReconciliation: () => void;
  onOpenHub?: () => void;
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
      {/* Left: Clean Brand Identity & Trust Indicator */}
      <TouchableOpacity
        style={styles.brandRow}
        onPress={onOpenHub}
        activeOpacity={0.75}
        accessibilityLabel="Open Enterprise Menu"
      >
        <View style={[styles.logoBadge, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.logoText}>W</Text>
        </View>
        <View style={styles.brandTextCol}>
          <Text style={[styles.brandTitle, { color: theme.colors.textPrimary }]}>
            Wealth<Text style={[styles.brandAccent, { color: theme.colors.primary }]}>OS</Text>
          </Text>
          <TouchableOpacity
            style={styles.syncRow}
            onPress={onOpenReconciliation}
            activeOpacity={0.7}
            accessibilityLabel="Ledger Status - Tap to Open Control Centre"
          >
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
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Right: Clean Header Actions */}
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
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionIconSmall: {
    fontSize: 13,
  },
});
