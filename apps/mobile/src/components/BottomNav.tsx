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
    <View style={styles.navBar}>
      <View style={styles.navInner}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={styles.navItem}
              onPress={() => onTabChange(item.key)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                <Text style={styles.navIcon}>{item.icon}</Text>
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
  navBar: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 8,
  },
  navInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    minHeight: 48,
  },
  iconWrap: {
    width: 44,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 2,
  },
  iconWrapActive: {
    backgroundColor: theme.colors.primaryLightSolid,
  },
  navIcon: {
    fontSize: 17,
  },
  badgePill: {
    position: 'absolute',
    top: -3,
    right: 2,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  badgeText: {
    color: theme.colors.textWhite,
    fontSize: 7.5,
    fontWeight: '800',
  },
  navLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    letterSpacing: -0.2,
  },
  navLabelActive: {
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
});
