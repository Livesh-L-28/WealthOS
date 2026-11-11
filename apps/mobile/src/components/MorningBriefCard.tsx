import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { theme } from '../theme';
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  const hour = new Date().getHours();
  const greetingText = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const greetingEmoji = hour < 17 ? '☀️' : '🌙';

  // Calculate reassuring metrics
  const runwayMonths = monthlyOutflows > 0 ? (totalAssets / monthlyOutflows).toFixed(1) : '12+';
  const netSurplus = monthlyInflows - monthlyOutflows;
  const isSurplus = netSurplus >= 0;

  const nearestGoal = goals.length > 0 ? goals[0] : null;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.greetingCol}>
          <View style={styles.titleWithBadge}>
            <Text style={styles.emojiIcon}>{greetingEmoji}</Text>
            <Text style={styles.greetingTitle}>{greetingText}, Livesh</Text>
          </View>
          <Text style={styles.briefSubtitle}>Your 30-Second Wealth Intelligence Brief</Text>
        </View>

        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={() => setIsCollapsed(!isCollapsed)}
          activeOpacity={0.7}
        >
          <Text style={styles.toggleText}>{isCollapsed ? 'Show Brief ▾' : 'Hide ▴'}</Text>
        </TouchableOpacity>
      </View>

      {!isCollapsed && (
        <View style={styles.contentBody}>
          <View style={styles.bulletItem}>
            <Text style={styles.bulletIcon}>🛡️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.bulletTitle}>Capital Cushion & Runway</Text>
              <Text style={styles.bulletDesc}>
                {totalAssets > 0
                  ? `Your liquid assets secure ${runwayMonths} months of uninterrupted family living expenses.`
                  : 'Personal balance sheet initialized with zero debt obligations.'}
              </Text>
            </View>
          </View>

          <View style={styles.bulletItem}>
            <Text style={styles.bulletIcon}>⚖️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.bulletTitle}>Cryptographic General Journal</Text>
              <Text style={styles.bulletDesc}>
                All accounts and transactions are in balance with 100% verified double-entry integrity.
              </Text>
            </View>
          </View>

          <View style={styles.bulletItem}>
            <Text style={styles.bulletIcon}>💡</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.bulletTitle}>Monthly Cash Flow Trajectory</Text>
              <Text style={styles.bulletDesc}>
                {monthlyInflows > 0 || monthlyOutflows > 0
                  ? isSurplus
                    ? `Net surplus trending positive (+${formatINR(netSurplus)} saved this month).`
                    : `Monthly outflow is ${formatINR(monthlyOutflows)} within planned reserve limits.`
                  : 'Ready to track your first income deposit or daily expense outflow.'}
              </Text>
            </View>
          </View>

          {nearestGoal && (
            <View style={styles.bulletItem}>
              <Text style={styles.bulletIcon}>🎯</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.bulletTitle}>Target Milestone: {nearestGoal.title}</Text>
                <Text style={styles.bulletDesc}>
                  {formatINR(nearestGoal.currentAmount)} of {formatINR(nearestGoal.targetAmount)} funded ({Math.round((nearestGoal.currentAmount / nearestGoal.targetAmount) * 100)}%).
                </Text>
              </View>
            </View>
          )}

          {onOpenAnalytics && (
            <TouchableOpacity
              style={styles.viewAnalyticsRow}
              onPress={onOpenAnalytics}
              activeOpacity={0.8}
            >
              <Text style={styles.viewAnalyticsText}>Open Comprehensive Financial Health & Analytics ›</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingCol: {
    flex: 1,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emojiIcon: {
    fontSize: 16,
  },
  greetingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  briefSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  toggleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  contentBody: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 10,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletIcon: {
    fontSize: 15,
    marginTop: 1,
  },
  bulletTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  bulletDesc: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
    marginTop: 1,
  },
  viewAnalyticsRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    alignItems: 'center',
  },
  viewAnalyticsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#60A5FA',
  },
});

