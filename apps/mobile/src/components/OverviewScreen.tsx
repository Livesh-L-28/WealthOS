import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { DashboardPeriod, Transaction, BudgetEnvelope, FinancialGoal, InvestmentHolding, BankAccount } from '../types';
import { useTheme } from '../theme';
import { HeroWealthCard } from './HeroWealthCard';
import { MorningBriefCard } from './MorningBriefCard';
import { FinancialSummaryCards } from './FinancialSummaryCards';
import { RecentTransactionsCard } from './RecentTransactionsCard';
import { FinancialHealthCard } from './FinancialHealthCard';
import { MobileAreaChart } from './charts/MobileAreaChart';
import { MobileCashFlowBarChart } from './charts/MobileCashFlowBarChart';
import { MobileDonutAllocationChart } from './charts/MobileDonutAllocationChart';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';

interface OverviewScreenProps {
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  monthlyInflows: number;
  monthlyOutflows: number;
  totalPortfolioValue: number;
  totalInvestedValue: number;
  budgets: BudgetEnvelope[];
  goals: FinancialGoal[];
  transactions: Transaction[];
  accounts?: BankAccount[];
  holdings?: InvestmentHolding[];
  userName?: string;
  isPrivacyMode?: boolean;
  onTogglePrivacy?: () => void;
  onConnectBank: () => void;
  onImportStatement: () => void;
  onAddTransaction: () => void;
  onAddExpense?: () => void;
  onAddIncome?: () => void;
  onAddBudget?: () => void;
  onAddGoal?: () => void;
  onAddInvestment?: () => void;
  onTransferFunds?: () => void;
  onAskCopilot: () => void;
  onViewAllTransactions: () => void;
  onOpenNetWorth?: () => void;
  onOpenAnalytics?: () => void;
  onOpenPortfolio?: () => void;
  onResetToFresh?: () => void;
}

export const OverviewScreen: React.FC<OverviewScreenProps> = ({
  period,
  onPeriodChange,
  netWorth,
  totalAssets,
  totalLiabilities,
  monthlyInflows,
  monthlyOutflows,
  totalPortfolioValue,
  totalInvestedValue,
  budgets,
  goals,
  transactions,
  accounts = [],
  holdings = [],
  userName = 'Livesh',
  isPrivacyMode = false,
  onTogglePrivacy,
  onConnectBank,
  onImportStatement,
  onAddTransaction,
  onAddExpense,
  onAddIncome,
  onAddBudget,
  onAddGoal,
  onAddInvestment,
  onTransferFunds,
  onAskCopilot,
  onViewAllTransactions,
  onOpenNetWorth,
  onOpenAnalytics,
  onOpenPortfolio,
  onResetToFresh,
}) => {
  const { theme, isDark } = useTheme();
  const [tab, setTab] = useState<'activity' | 'insights'>('activity');
  const totalBudgeted = budgets.reduce((s, b) => s + b.budgeted, 0);

  const isLedgerEmpty = transactions.length === 0 && accounts.length === 0;

  return (
    <View style={styles.container}>
      {/* 1. Hero Wealth Overview Card with 1-Tap Quick Actions */}
      <WidgetErrorBoundary name="Hero Wealth Card">
        <HeroWealthCard
          netWorth={netWorth}
          monthlyInflows={monthlyInflows}
          monthlyOutflows={monthlyOutflows}
          userName={userName}
          isPrivacyMode={isPrivacyMode}
          onTogglePrivacy={onTogglePrivacy}
          onAddRecord={onAddExpense || onAddTransaction}
          onTransfer={onTransferFunds}
          onInvest={onAddInvestment}
          onCopilot={onAskCopilot}
          onOpenNetWorth={onOpenNetWorth}
        />
      </WidgetErrorBoundary>

      {/* 1.5. Clean Slate Welcome & Quick Start Onboarding Card */}
      {isLedgerEmpty && (
        <View
          style={[
            styles.quickStartCard,
            {
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              borderColor: isDark ? '#1F2937' : '#E2E8F0',
            },
          ]}
        >
          <View style={styles.quickStartHeader}>
            <View style={styles.quickStartBadge}>
              <Text style={styles.quickStartBadgeText}>✨ CLEAN SLATE READY</Text>
            </View>
            <Text style={[styles.quickStartTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              Welcome to Your Fresh Ledger
            </Text>
            <Text style={[styles.quickStartSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Your secure double-entry personal ledger is initialized with zero clutter. Add your bank accounts or record your first transaction to begin tracking your net worth and cash flows.
            </Text>
          </View>

          <View style={styles.quickStartButtons}>
            <TouchableOpacity
              style={styles.demoLoadBtn}
              onPress={onConnectBank}
              activeOpacity={0.8}
            >
              <Text style={styles.demoLoadBtnText}>➕ Add Bank Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.addAccountBtn,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                  borderColor: isDark ? '#334155' : '#CBD5E1',
                },
              ]}
              onPress={onAddTransaction}
              activeOpacity={0.8}
            >
              <Text style={[styles.addAccountBtnText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                📝 Record Transaction
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.highlightsRow}>
            <Text style={[styles.highlightItem, { color: isDark ? '#CBD5E1' : '#475569' }]}>
              🛡️ Double-Entry Verified
            </Text>
            <Text style={[styles.highlightDot, { color: isDark ? '#475569' : '#CBD5E1' }]}>•</Text>
            <Text style={[styles.highlightItem, { color: isDark ? '#CBD5E1' : '#475569' }]}>
              📊 Interactive Net Worth
            </Text>
            <Text style={[styles.highlightDot, { color: isDark ? '#475569' : '#CBD5E1' }]}>•</Text>
            <Text style={[styles.highlightItem, { color: isDark ? '#CBD5E1' : '#475569' }]}>
              🤖 AI Copilot
            </Text>
          </View>
        </View>
      )}

      {/* Discrete Active Data Indicator with 1-Tap Reset */}
      {!isLedgerEmpty && onResetToFresh && (
        <View style={styles.statusPillRow}>
          <View
            style={[
              styles.statusPillBox,
              {
                backgroundColor: isDark ? '#111827' : '#FFFFFF',
                borderColor: isDark ? '#1F2937' : '#E2E8F0',
              },
            ]}
          >
            <View style={styles.statusDotActive} />
            <Text style={[styles.statusPillLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Active Ledger: {accounts.length} Accounts • {transactions.length} Transactions
            </Text>
            <TouchableOpacity
              onPress={onResetToFresh}
              activeOpacity={0.7}
              style={[styles.resetPillBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
            >
              <Text style={[styles.resetPillText, { color: isDark ? '#F87171' : '#DC2626' }]}>
                Clear
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 2. Compact Daily Pulse / Intelligence Brief */}
      <WidgetErrorBoundary name="Morning Intelligence Brief">
        <MorningBriefCard
          netWorth={netWorth}
          monthlyInflows={monthlyInflows}
          monthlyOutflows={monthlyOutflows}
          totalAssets={totalAssets}
          totalLiabilities={totalLiabilities}
          goals={goals}
          transactions={transactions}
          onOpenAnalytics={onOpenAnalytics}
        />
      </WidgetErrorBoundary>

      {/* 3. Smooth Segmented Switcher: Activity vs Insights */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: isDark ? '#111827' : '#EEF2F6',
            borderColor: isDark ? '#1F2937' : '#E2E8F0',
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tabItem,
            tab === 'activity' && [
              styles.tabItemActive,
              { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' },
            ],
          ]}
          onPress={() => setTab('activity')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabLabel,
              { color: isDark ? '#94A3B8' : '#64748B' },
              tab === 'activity' && [
                styles.tabLabelActive,
                { color: isDark ? '#F8FAFC' : '#0F172A' },
              ],
            ]}
          >
            📋 Activity & Cash Flow
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            tab === 'insights' && [
              styles.tabItemActive,
              { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' },
            ],
          ]}
          onPress={() => setTab('insights')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabLabel,
              { color: isDark ? '#94A3B8' : '#64748B' },
              tab === 'insights' && [
                styles.tabLabelActive,
                { color: isDark ? '#F8FAFC' : '#0F172A' },
              ],
            ]}
          >
            📊 Deep Insights & Charts
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab 1: Activity View (Light, Focused, Clean) */}
      {tab === 'activity' && (
        <View style={styles.tabContent}>
          {/* Monthly Inflows vs Outflows Summary */}
          <FinancialSummaryCards
            totalAssets={totalAssets}
            totalLiabilities={totalLiabilities}
            monthlyInflows={monthlyInflows}
            monthlyOutflows={monthlyOutflows}
            budgetAllocated={totalBudgeted}
            onPressInflows={onAddIncome}
            onPressOutflows={onAddExpense}
          />

          {/* Recent Activity / General Journal */}
          <WidgetErrorBoundary name="Recent Transactions Ledger">
            <RecentTransactionsCard
              transactions={transactions}
              onViewAll={onViewAllTransactions}
            />
          </WidgetErrorBoundary>

          {/* Solvency & Financial Health Rating */}
          <WidgetErrorBoundary name="Financial Health">
            <FinancialHealthCard
              totalAssets={totalAssets}
              totalLiabilities={totalLiabilities}
              monthlyInflows={monthlyInflows}
              monthlyOutflows={monthlyOutflows}
              onPress={onOpenAnalytics}
            />
          </WidgetErrorBoundary>
        </View>
      )}

      {/* Tab 2: Insights View (Comprehensive Visual Analytics) */}
      {tab === 'insights' && (
        <View style={styles.tabContent}>
          {/* Period Filter Switcher */}
          <View
            style={[
              styles.periodRow,
              {
                backgroundColor: isDark ? '#111827' : '#EEF2F6',
                borderColor: isDark ? '#1F2937' : '#E2E8F0',
              },
            ]}
          >
            {(['1M', '3M', 'YTD', 'ALL'] as DashboardPeriod[]).map((p) => {
              const isActive = period === p;
              const label = p === '1M' ? '1M (Nov)' : p;
              return (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.periodTab,
                    isActive && [
                      styles.periodTabActive,
                      { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' },
                    ],
                  ]}
                  onPress={() => onPeriodChange(p)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Select period ${label}`}
                >
                  <Text
                    style={[
                      styles.periodTabText,
                      { color: isDark ? '#94A3B8' : '#64748B' },
                      isActive && [
                        styles.periodTabTextActive,
                        { color: isDark ? '#F8FAFC' : '#0F172A' },
                      ],
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 1. Net Worth Trajectory Area Chart */}
          <WidgetErrorBoundary name="Net Worth Trajectory Chart">
            <MobileAreaChart
              currentNetWorth={netWorth}
              monthlyInflows={monthlyInflows}
              monthlyOutflows={monthlyOutflows}
              transactions={transactions}
              onOpenNetWorth={onOpenNetWorth}
            />
          </WidgetErrorBoundary>

          {/* 2. Monthly Cash Flow Grouped Bar Chart */}
          <WidgetErrorBoundary name="Cash Flow Bar Chart">
            <MobileCashFlowBarChart
              monthlyInflows={monthlyInflows}
              monthlyOutflows={monthlyOutflows}
              transactions={transactions}
              onOpenAnalytics={onOpenAnalytics}
            />
          </WidgetErrorBoundary>

          {/* 3. Multi-Asset Portfolio Allocation Donut Chart */}
          <WidgetErrorBoundary name="Portfolio Allocation Donut Chart">
            <MobileDonutAllocationChart
              totalValue={totalPortfolioValue}
              totalInvested={totalInvestedValue}
              holdings={holdings}
              onOpenPortfolio={onOpenPortfolio}
              onAddInvestment={onAddInvestment}
            />
          </WidgetErrorBoundary>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  quickStartCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  quickStartHeader: {
    marginBottom: 14,
  },
  quickStartBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  quickStartBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  quickStartTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  quickStartSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  quickStartButtons: {
    gap: 8,
    marginBottom: 12,
  },
  demoLoadBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  demoLoadBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  addAccountBtn: {
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  addAccountBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  highlightsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.15)',
  },
  highlightItem: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  highlightDot: {
    fontSize: 10,
  },
  statusPillRow: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  statusPillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDotActive: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusPillLabel: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  resetPillBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  resetPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabLabelActive: {
    fontWeight: '800',
  },
  tabContent: {
    gap: 4,
  },
  periodRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTabActive: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  periodTabText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  periodTabTextActive: {
    fontWeight: '800',
  },
});
