import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { TabType } from '../types';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onAddEntry: () => void;
}

interface NavTabItem {
  key: TabType;
  label: string;
  icon: string;
  badge?: string;
}

const LEFT_TABS: NavTabItem[] = [
  { key: 'overview', label: 'Overview', icon: '📊' },
  { key: 'accounts', label: 'Accounts', icon: '🏦' },
];

const RIGHT_TABS: NavTabItem[] = [
  { key: 'budgets', label: 'Budgets', icon: '🎯' },
  { key: 'copilot', label: 'Copilot', icon: '✨', badge: 'AI' },
];

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onAddEntry,
}) => {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 10);

  return (
    <View style={[styles.navBar, { paddingBottom: bottomInset }]}>
      <View style={styles.navInner}>
        {/* Left Tabs: Overview & Accounts */}
        {LEFT_TABS.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={styles.navItem}
              onPress={() => onTabChange(item.key)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${item.label} Tab`}
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

        {/* Center Prominent Add Entry Action Button */}
        <TouchableOpacity
          style={styles.centerAddWrap}
          onPress={onAddEntry}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Add Entry"
        >
          <View style={styles.centerAddButton}>
            <Text style={styles.centerAddPlus}>+</Text>
          </View>
          <Text style={styles.centerAddLabel}>Add Entry</Text>
        </TouchableOpacity>

        {/* Right Tabs: Budgets & Copilot */}
        {RIGHT_TABS.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={styles.navItem}
              onPress={() => onTabChange(item.key)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${item.label} Tab`}
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
  centerAddWrap: {
    flex: 1.1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -14,
    paddingVertical: 0,
  },
  centerAddButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 3,
    borderColor: theme.colors.surface,
  },
  centerAddPlus: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.textWhite,
    lineHeight: 28,
    marginTop: -2,
  },
  centerAddLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    marginTop: 2,
    letterSpacing: -0.2,
  },
});
