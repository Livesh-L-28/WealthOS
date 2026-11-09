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

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onAddEntry,
}) => {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 22 : 12);

  return (
    <View style={[styles.navContainer, { paddingBottom: bottomInset }]}>
      <View style={styles.dockRow}>
        {/* Slot 1: Overview */}
        <TouchableOpacity
          style={styles.navSlot}
          onPress={() => onTabChange('overview')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'overview' }}
          accessibilityLabel="Overview Tab"
        >
          <View style={[styles.iconPill, activeTab === 'overview' && styles.iconPillActive]}>
            <Text style={styles.iconEmoji}>📊</Text>
          </View>
          <Text style={[styles.navLabel, activeTab === 'overview' && styles.navLabelActive]}>
            Overview
          </Text>
        </TouchableOpacity>

        {/* Slot 2: Accounts & Ledger */}
        <TouchableOpacity
          style={styles.navSlot}
          onPress={() => onTabChange('accounts')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'accounts' }}
          accessibilityLabel="Accounts Tab"
        >
          <View style={[styles.iconPill, activeTab === 'accounts' && styles.iconPillActive]}>
            <Text style={styles.iconEmoji}>🏦</Text>
          </View>
          <Text style={[styles.navLabel, activeTab === 'accounts' && styles.navLabelActive]}>
            Accounts
          </Text>
        </TouchableOpacity>

        {/* Slot 3: Center Elevated Add Entry FAB */}
        <TouchableOpacity
          style={styles.centerFabSlot}
          onPress={onAddEntry}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Add New Entry or Transaction"
        >
          <View style={styles.centerFabCircle}>
            <Text style={styles.centerFabPlus}>+</Text>
          </View>
          <Text style={styles.centerFabLabel}>Add Entry</Text>
        </TouchableOpacity>

        {/* Slot 4: Portfolio */}
        <TouchableOpacity
          style={styles.navSlot}
          onPress={() => onTabChange('investments')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'investments' }}
          accessibilityLabel="Portfolio Tab"
        >
          <View style={[styles.iconPill, activeTab === 'investments' && styles.iconPillActive]}>
            <Text style={styles.iconEmoji}>📈</Text>
          </View>
          <Text style={[styles.navLabel, activeTab === 'investments' && styles.navLabelActive]}>
            Portfolio
          </Text>
        </TouchableOpacity>

        {/* Slot 5: Budgets & Goals */}
        <TouchableOpacity
          style={styles.navSlot}
          onPress={() => onTabChange('budgets')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'budgets' }}
          accessibilityLabel="Budgets Tab"
        >
          <View style={[styles.iconPill, activeTab === 'budgets' && styles.iconPillActive]}>
            <Text style={styles.iconEmoji}>🎯</Text>
          </View>
          <Text style={[styles.navLabel, activeTab === 'budgets' && styles.navLabelActive]}>
            Budgets
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navContainer: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 6,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 10,
  },
  dockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  navSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    minHeight: 46,
  },
  iconPill: {
    width: 40,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconPillActive: {
    backgroundColor: theme.colors.primaryLightSolid,
  },
  iconEmoji: {
    fontSize: 16,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    letterSpacing: -0.2,
  },
  navLabelActive: {
    color: theme.colors.primaryDark,
    fontWeight: '800',
  },
  centerFabSlot: {
    flex: 1.1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
    paddingVertical: 0,
  },
  centerFabCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 3,
    borderColor: theme.colors.surface,
  },
  centerFabPlus: {
    fontSize: 26,
    fontWeight: '900',
    color: theme.colors.textWhite,
    lineHeight: 28,
    marginTop: -2,
  },
  centerFabLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    marginTop: 2,
    letterSpacing: -0.2,
  },
});
