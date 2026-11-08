import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { theme } from '../theme';
import { TabType } from '../types';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

interface NavItemConfig {
  key: TabType;
  label: string;
  icon: string;
  badge?: string;
}

const NAV_ITEMS: NavItemConfig[] = [
  { key: 'overview', label: 'Overview', icon: '📊' },
  { key: 'accounts', label: 'Accounts', icon: '🏦' },
  { key: 'investments', label: 'Portfolio', icon: '📈' },
  { key: 'budgets', label: 'Budgets', icon: '🎯' },
  { key: 'copilot', label: 'Copilot', icon: '✨', badge: 'AI' },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <View style={styles.navContainer}>
      <View style={styles.navRow}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => onTabChange(item.key)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <View style={styles.iconContainer}>
                <Text style={[styles.navIcon, isActive && styles.navIconActive]}>{item.icon}</Text>
                {item.badge && (
                  <View style={styles.badgePill}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navContainer: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 8,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 12,
    minHeight: 48,
  },
  navItemActive: {
    backgroundColor: theme.colors.primaryLightSolid,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    fontSize: 18,
    marginBottom: 2,
    opacity: 0.7,
  },
  navIconActive: {
    opacity: 1,
    transform: [{ scale: 1.08 }],
  },
  badgePill: {
    position: 'absolute',
    top: -4,
    right: -12,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  badgeText: {
    color: theme.colors.textWhite,
    fontSize: 8,
    fontWeight: '800',
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    letterSpacing: -0.2,
  },
  navLabelActive: {
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
});

