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

  // Map any active screen to one of the primary fintech pillars
  const getActivePillar = (): PillarType => {
    if (
      activeScreen === 'home' ||
      activeScreen === 'overview' ||
      activeScreen === 'net-worth' ||
      activeScreen === 'money' ||
      activeScreen === 'accounts' ||
      activeScreen === 'transactions' ||
      activeScreen === 'transfers' ||
      activeScreen === 'analytics'
    ) {
      return 'home';
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

        {/* 2. Invest */}
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

        {/* 3. Plan */}
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

        {/* 4. More */}
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
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  navSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconPill: {
    width: 42,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconEmoji: {
    fontSize: 17,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  centerFabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
  },
  centerFabCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 28,
    marginTop: -2,
  },
  centerFabLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
