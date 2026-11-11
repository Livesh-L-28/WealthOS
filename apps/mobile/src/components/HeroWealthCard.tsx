import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../theme';
import { formatINR } from '../formatters';

interface HeroWealthCardProps {
  netWorth: number;
  monthlyInflows: number;
  monthlyOutflows: number;
  userName?: string;
  isPrivacyMode?: boolean;
  onTogglePrivacy?: () => void;
  onAddRecord: () => void;
  onTransfer?: () => void;
  onInvest?: () => void;
  onCopilot?: () => void;
  onOpenNetWorth?: () => void;
}

export const HeroWealthCard: React.FC<HeroWealthCardProps> = ({
  netWorth,
  monthlyInflows,
  monthlyOutflows,
  userName = 'Livesh',
  isPrivacyMode = false,
  onTogglePrivacy,
  onAddRecord,
  onTransfer,
  onInvest,
  onCopilot,
  onOpenNetWorth,
}) => {
  const { theme, isDark } = useTheme();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const timeEmoji = hour < 17 ? '☀️' : '🌙';

  const netSavings = monthlyInflows - monthlyOutflows;
  const isPositiveSavings = netSavings >= 0;

  return (
    <View
      style={[
        styles.heroContainer,
        {
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          borderColor: isDark ? '#1F2937' : '#E2E8F0',
        },
      ]}
    >
      {/* Top Greeting & Balance Header */}
      <View style={styles.topRow}>
        <View style={styles.greetingGroup}>
          <Text style={[styles.greetingText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            {timeEmoji} {greeting}, {userName}
          </Text>
          <Text style={[styles.balanceLabel, { color: isDark ? '#CBD5E1' : '#475569' }]}>
            Total Net Worth
          </Text>
        </View>

        {onTogglePrivacy && (
          <TouchableOpacity
            style={[
              styles.privacyButton,
              {
                backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                borderColor: isDark ? '#334155' : '#E2E8F0',
              },
            ]}
            onPress={onTogglePrivacy}
            activeOpacity={0.7}
            accessibilityLabel={isPrivacyMode ? 'Reveal Balances' : 'Hide Balances'}
          >
            <Text style={styles.privacyIcon}>{isPrivacyMode ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Net Worth Amount Display */}
      <TouchableOpacity
        style={styles.amountTouchable}
        onPress={onOpenNetWorth}
        activeOpacity={onOpenNetWorth ? 0.8 : 1}
        disabled={!onOpenNetWorth}
      >
        <Text
          style={[
            styles.amountText,
            { color: isDark ? '#F8FAFC' : '#0F172A' },
            isPrivacyMode && styles.amountHidden,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {isPrivacyMode ? '••••••••' : formatINR(netWorth)}
        </Text>
      </TouchableOpacity>

      {/* Trajectory / Health Status Pill */}
      <View style={styles.metricsRow}>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
              borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
            },
          ]}
        >
          <View style={styles.pulseDot} />
          <Text style={[styles.statusPillText, { color: '#059669' }]}>
            {netWorth > 0 ? '+12.4% this year' : 'Ledger In Sync'}
          </Text>
        </View>

        <View style={styles.cashFlowPills}>
          <Text style={[styles.miniFlowText, { color: '#059669' }]}>
            ↓ {formatINR(monthlyInflows)}
          </Text>
          <Text style={[styles.dividerDot, { color: isDark ? '#475569' : '#CBD5E1' }]}>•</Text>
          <Text style={[styles.miniFlowText, { color: '#DC2626' }]}>
            ↑ {formatINR(monthlyOutflows)}
          </Text>
        </View>
      </View>

      {/* 4 Primary 1-Tap Quick Action Buttons */}
      <View
        style={[
          styles.actionsContainer,
          {
            borderTopColor: isDark ? '#1F2937' : '#F1F5F9',
          },
        ]}
      >
        {/* 1. Add / Record */}
        <TouchableOpacity
          style={styles.actionItem}
          onPress={onAddRecord}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Record Transaction"
        >
          <View
            style={[
              styles.actionIconCircle,
              { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF' },
            ]}
          >
            <Text style={styles.actionEmoji}>➕</Text>
          </View>
          <Text style={[styles.actionLabel, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
            Record
          </Text>
        </TouchableOpacity>

        {/* 2. Transfer */}
        {onTransfer && (
          <TouchableOpacity
            style={styles.actionItem}
            onPress={onTransfer}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Transfer Money"
          >
            <View
              style={[
                styles.actionIconCircle,
                { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5' },
              ]}
            >
              <Text style={styles.actionEmoji}>⇄</Text>
            </View>
            <Text style={[styles.actionLabel, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              Transfer
            </Text>
          </TouchableOpacity>
        )}

        {/* 3. Invest */}
        {onInvest && (
          <TouchableOpacity
            style={styles.actionItem}
            onPress={onInvest}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Investments"
          >
            <View
              style={[
                styles.actionIconCircle,
                { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FFFBEB' },
              ]}
            >
              <Text style={styles.actionEmoji}>📈</Text>
            </View>
            <Text style={[styles.actionLabel, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              Invest
            </Text>
          </TouchableOpacity>
        )}

        {/* 4. Copilot AI */}
        {onCopilot && (
          <TouchableOpacity
            style={styles.actionItem}
            onPress={onCopilot}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Ask Copilot AI"
          >
            <View
              style={[
                styles.actionIconCircle,
                { backgroundColor: isDark ? 'rgba(129, 140, 248, 0.2)' : '#EEF2FF' },
              ]}
            >
              <Text style={styles.actionEmoji}>🤖</Text>
            </View>
            <Text style={[styles.actionLabel, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              Copilot
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  heroContainer: {
    borderRadius: 22,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 12,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
      },
    }),
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  greetingGroup: {
    gap: 2,
  },
  greetingText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  privacyButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  privacyIcon: {
    fontSize: 14,
  },
  amountTouchable: {
    marginVertical: 4,
  },
  amountText: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  amountHidden: {
    fontSize: 26,
    letterSpacing: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 14,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cashFlowPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniFlowText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dividerDot: {
    fontSize: 10,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionItem: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionEmoji: {
    fontSize: 18,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});

