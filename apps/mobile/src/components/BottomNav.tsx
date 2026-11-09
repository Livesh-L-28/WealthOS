import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { PillarType, ActiveScreen } from '../types';

interface BottomNavProps {
  activeScreen: ActiveScreen;
  onSelectPillar: (pillar: PillarType) => void;
  onOpenQuickAction: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeScreen,
  onSelectPillar,
  onOpenQuickAction,
}) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 12);

  // Map any active screen to one of the 5 primary fintech pillars
  const getActivePillar = (): PillarType => {
    if (activeScreen === 'home' || activeScreen === 'overview' || activeScreen === 'net-worth') {
      return 'home';
    }
    if (
      activeScreen === 'money' ||
      activeScreen === 'accounts' ||
      activeScreen === 'transactions' ||
      activeScreen === 'transfers' ||
      activeScreen === 'analytics'
    ) {
      return 'money';
    }
    if (
      activeScreen === 'invest' ||
      activeScreen === 'investments' ||
      activeScreen === 'reports' ||
      activeScreen === 'dividends'
    ) {
      return 'invest';
    }
    if (
      activeScreen === 'plan' ||
      activeScreen === 'budgets' ||
      activeScreen === 'goals' ||
      activeScreen === 'calendar' ||
      activeScreen === 'liabilities'
    ) {
      return 'plan';
    }
    return 'more';
  };

  const activePillar = getActivePillar();

  const PILLARS: { id: PillarType; label: string; icon: string }[] = [
    { id: 'home', label: 'Home', icon: '🏛️' },
    { id: 'money', label: 'Money', icon: '💳' },
    { id: 'invest', label: 'Invest', icon: '📈' },
    { id: 'plan', label: 'Plan', icon: '🎯' },
    { id: 'more', label: 'More', icon: '☰' },
  ];

  return (
    <View
      style={[
        styles.navContainer,
        {
          paddingBottom: bottomInset,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.dockRow}>
        {/* 1. Home */}
        <TouchableOpacity
          style={styles.navSlot}
          onPress={() => onSelectPillar('home')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: activePillar === 'home' }}
          accessibilityLabel="Home Pillar"
        >
          <View
            style={[
              styles.iconPill,
              activePillar === 'home' && { backgroundColor: theme.colors.primaryLightSolid },
            ]}
          >
            <Text style={styles.iconEmoji}>🏛️</Text>
          </View>
          <Text
            style={[
              styles.navLabel,
              { color: theme.colors.textSecondary },
              activePillar === 'home' && { color: theme.colors.primary, fontWeight: '800' },
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        {/* 2. Money */}
        <TouchableOpacity
          style={styles.navSlot}
          onPress={() => onSelectPillar('money')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: activePillar === 'money' }}
          accessibilityLabel="Money Pillar"
        >
          <View
            style={[
              styles.iconPill,
              activePillar === 'money' && { backgroundColor: theme.colors.primaryLightSolid },
            ]}
          >
            <Text style={styles.iconEmoji}>💳</Text>
          </View>
          <Text
            style={[
              styles.navLabel,
              { color: theme.colors.textSecondary },
              activePillar === 'money' && { color: theme.colors.primary, fontWeight: '800' },
            ]}
          >
            Money
          </Text>
        </TouchableOpacity>

        {/* Center: Contextual Quick-Action Centre FAB */}
        <TouchableOpacity
          style={styles.centerFabSlot}
          onPress={onOpenQuickAction}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Quick Financial Actions"
        >
          <View style={[styles.centerFabCircle, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.centerFabPlus}>+</Text>
          </View>
          <Text style={[styles.centerFabLabel, { color: theme.colors.primary }]}>Action</Text>
        </TouchableOpacity>

        {/* 3. Invest */}
        <TouchableOpacity
          style={styles.navSlot}
          onPress={() => onSelectPillar('invest')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: activePillar === 'invest' }}
          accessibilityLabel="Invest Pillar"
        >
          <View
            style={[
              styles.iconPill,
              activePillar === 'invest' && { backgroundColor: theme.colors.primaryLightSolid },
            ]}
          >
            <Text style={styles.iconEmoji}>📈</Text>
          </View>
          <Text
            style={[
              styles.navLabel,
              { color: theme.colors.textSecondary },
              activePillar === 'invest' && { color: theme.colors.primary, fontWeight: '800' },
            ]}
          >
            Invest
          </Text>
        </TouchableOpacity>

        {/* 4. Plan */}
        <TouchableOpacity
          style={styles.navSlot}
          onPress={() => onSelectPillar('plan')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: activePillar === 'plan' }}
          accessibilityLabel="Plan Pillar"
        >
          <View
            style={[
              styles.iconPill,
              activePillar === 'plan' && { backgroundColor: theme.colors.primaryLightSolid },
            ]}
          >
            <Text style={styles.iconEmoji}>🎯</Text>
          </View>
          <Text
            style={[
              styles.navLabel,
              { color: theme.colors.textSecondary },
              activePillar === 'plan' && { color: theme.colors.primary, fontWeight: '800' },
            ]}
          >
            Plan
          </Text>
        </TouchableOpacity>

        {/* 5. More */}
        <TouchableOpacity
          style={styles.navSlot}
          onPress={() => onSelectPillar('more')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: activePillar === 'more' }}
          accessibilityLabel="More Pillar"
        >
          <View
            style={[
              styles.iconPill,
              activePillar === 'more' && { backgroundColor: theme.colors.primaryLightSolid },
            ]}
          >
            <Text style={styles.iconEmoji}>☰</Text>
          </View>
          <Text
            style={[
              styles.navLabel,
              { color: theme.colors.textSecondary },
              activePillar === 'more' && { color: theme.colors.primary, fontWeight: '800' },
            ]}
          >
            More
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navContainer: {
    borderTopWidth: 1,
    paddingTop: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 12,
  },
  dockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  navSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconPill: {
    width: 38,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconEmoji: {
    fontSize: 16,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  centerFabSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginTop: -14,
  },
  centerFabCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 2,
  },
  centerFabPlus: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 26,
    marginTop: -2,
  },
  centerFabLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
