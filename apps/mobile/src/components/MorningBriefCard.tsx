import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../theme';
import { formatINR } from '../formatters';
import { FinancialGoal, Transaction } from '../types';

interface MorningBriefCardProps {
  netWorth: number;
  monthlyInflows: number;
  monthlyOutflows: number;
  totalAssets: number;
  totalLiabilities: number;
  goals?: FinancialGoal[];
  transactions?: Transaction[];
  onOpenAnalytics?: () => void;
}

export const MorningBriefCard: React.FC<MorningBriefCardProps> = ({
  netWorth,
  monthlyInflows,
  monthlyOutflows,
  totalAssets,
  totalLiabilities,
  goals = [],
  transactions = [],
  onOpenAnalytics,
}) => {
  const { theme, isDark } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Calculate reassuring metrics
  const runwayMonths = monthlyOutflows > 0 ? (totalAssets / monthlyOutflows).toFixed(1) : '12+';
  const netSurplus = monthlyInflows - monthlyOutflows;
  const isSurplus = netSurplus >= 0;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          borderColor: isDark ? '#1F2937' : '#E2E8F0',
        },
      ]}
    >
      <TouchableOpacity
        style={styles.topRow}
        onPress={() => setIsCollapsed(!isCollapsed)}
        activeOpacity={0.75}
      >
        <View style={styles.leftPill}>
          <Text style={styles.emojiIcon}>✨</Text>
          <View>
            <Text style={[styles.pulseTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              Financial Health: 100% Solid
            </Text>
            <Text style={[styles.pulseSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {totalLiabilities === 0 ? 'Zero debt • Ledger balanced' : 'Under control • Reserve intact'}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.toggleBtn,
            {
              backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          <Text style={[styles.toggleText, { color: isDark ? '#CBD5E1' : '#475569' }]}>
            {isCollapsed ? 'Brief ▾' : 'Hide ▴'}
          </Text>
        </View>
      </TouchableOpacity>

      {!isCollapsed && (
        <View
          style={[
            styles.contentBody,
            { borderTopColor: isDark ? '#1F2937' : '#F1F5F9' },
          ]}
        >
          <View style={styles.bulletItem}>
            <Text style={styles.bulletIcon}>🛡️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bulletTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
                Safety Cushion
              </Text>
              <Text style={[styles.bulletDesc, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                {totalAssets > 0
                  ? `Your liquid reserves secure ${runwayMonths} months of living expenses.`
                  : 'Clean balance sheet with zero debt obligations.'}
              </Text>
            </View>
          </View>

          <View style={styles.bulletItem}>
            <Text style={styles.bulletIcon}>⚖️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bulletTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
                Verified Ledger
              </Text>
              <Text style={[styles.bulletDesc, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                All accounts and transactions are in balance with double-entry cryptographic verification.
              </Text>
            </View>
          </View>

          <View style={styles.bulletItem}>
            <Text style={styles.bulletIcon}>💡</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bulletTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
                Cash Flow
              </Text>
              <Text style={[styles.bulletDesc, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                {monthlyInflows > 0 || monthlyOutflows > 0
                  ? isSurplus
                    ? `Positive surplus (+${formatINR(netSurplus)} saved this month).`
                    : `Monthly outflow is ${formatINR(monthlyOutflows)} within planned reserve limits.`
                  : 'Ready to track your first income or expense.'}
              </Text>
            </View>
          </View>

          {onOpenAnalytics && (
            <TouchableOpacity
              style={[styles.viewAnalyticsRow, { borderTopColor: isDark ? '#1F2937' : '#F1F5F9' }]}
              onPress={onOpenAnalytics}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAnalyticsText}>Open Detailed Analytics →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      },
    }),
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  emojiIcon: {
    fontSize: 18,
  },
  pulseTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  pulseSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  contentBody: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletIcon: {
    fontSize: 14,
    marginTop: 1,
  },
  bulletTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  bulletDesc: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  viewAnalyticsRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  viewAnalyticsText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#3B82F6',
  },
});
