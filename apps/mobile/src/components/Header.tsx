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
  syncStatus?: 'SYNCED' | 'SYNCING' | 'OFFLINE_PENDING' | 'ERROR';
  isPrivacyMode?: boolean;
  onTogglePrivacy?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenReconciliation,
  onOpenHub,
  onOpenCopilot,
  onOpenSearch,
  activeWorkspace = 'Family Office',
  isSyncing = false,
  syncStatus = 'SYNCED',
  isPrivacyMode = false,
  onTogglePrivacy,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: isDark ? '#090D16' : '#F8FAFC',
          borderBottomColor: isDark ? '#1F2937' : '#E2E8F0',
        },
      ]}
    >
      {/* Left: Clean Brand Identity & Trust Indicator */}
      <TouchableOpacity
        style={styles.brandRow}
        onPress={onOpenHub}
        activeOpacity={0.75}
        accessibilityLabel="Open Workspace Menu"
      >
        <View
          style={[
            styles.logoBadge,
            { backgroundColor: isDark ? '#3B82F6' : '#2563EB' },
          ]}
        >
          <Text style={styles.logoText}>W</Text>
        </View>
        <View style={styles.brandTextCol}>
          <Text style={[styles.brandTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
            Wealth<Text style={{ color: isDark ? '#3B82F6' : '#2563EB' }}>OS</Text>
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
                {
                  backgroundColor:
                    syncStatus === 'OFFLINE_PENDING'
                      ? '#F59E0B'
                      : syncStatus === 'SYNCING'
                      ? '#3B82F6'
                      : syncStatus === 'ERROR'
                      ? '#EF4444'
                      : '#10B981',
                },
                (isSyncing || syncStatus === 'SYNCING') && styles.syncDotPulse,
              ]}
            />
            <Text style={[styles.syncText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {syncStatus === 'SYNCING'
                ? 'Syncing Cloud...'
                : syncStatus === 'OFFLINE_PENDING'
                ? 'Offline (Saved Locally)'
                : syncStatus === 'ERROR'
                ? 'Sync Attention Needed'
                : 'Ledger In Sync'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Right: Clean, Airy Header Actions */}
      <View style={styles.actionsRow}>
        {/* 1. Global Search */}
        {onOpenSearch && (
          <TouchableOpacity
            style={[
              styles.iconButton,
              {
                backgroundColor: isDark ? '#111827' : '#FFFFFF',
                borderColor: isDark ? '#1F2937' : '#E2E8F0',
              },
            ]}
            onPress={onOpenSearch}
            activeOpacity={0.75}
            accessibilityLabel="Open Global Search"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.actionIconSmall}>🔍</Text>
          </TouchableOpacity>
        )}

        {/* 2. Stealth / Privacy Mode Toggle */}
        {onTogglePrivacy && (
          <TouchableOpacity
            style={[
              styles.iconButton,
              {
                backgroundColor: isDark ? '#111827' : '#FFFFFF',
                borderColor: isDark ? '#1F2937' : '#E2E8F0',
              },
            ]}
            onPress={onTogglePrivacy}
            activeOpacity={0.75}
            accessibilityLabel="Toggle Privacy Stealth Mode"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.actionIconSmall}>{isPrivacyMode ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        )}

        {/* 3. Quick Theme Mode Toggle */}
        <TouchableOpacity
          style={[
            styles.iconButton,
            {
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              borderColor: isDark ? '#1F2937' : '#E2E8F0',
            },
          ]}
          onPress={toggleTheme}
          activeOpacity={0.75}
          accessibilityLabel="Toggle Dark/Light Mode"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.actionIconSmall}>{isDark ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>

        {/* 4. Workspace / Enterprise Drawer Menu (Three Dots) */}
        {onOpenHub && (
          <TouchableOpacity
            style={[
              styles.iconButton,
              {
                backgroundColor: isDark ? '#111827' : '#FFFFFF',
                borderColor: isDark ? '#1F2937' : '#E2E8F0',
              },
            ]}
            onPress={onOpenHub}
            activeOpacity={0.75}
            accessibilityLabel="Open Navigation Menu"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.actionIconSmall, { fontSize: 20, fontWeight: '800', lineHeight: 22 }]}>⋮</Text>
          </TouchableOpacity>
        )}
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
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  brandTextCol: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  syncDotPulse: {
    opacity: 0.6,
  },
  syncText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionIconSmall: {
    fontSize: 14,
  },
});
