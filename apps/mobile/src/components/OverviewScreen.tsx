import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { DashboardPeriod, Transaction, BudgetEnvelope, FinancialGoal, InvestmentHolding } from '../types';
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
}) => {
  const { theme, isDark } = useTheme();
  const [tab, setTab] = useState<'activity' | 'insights'>('activity');
  const totalBudgeted = budgets.reduce((s, b) => s + b.budgeted, 0);

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

          {/* 1. Hero Net Worth Bezier Trajectory Area Chart */}
          <WidgetErrorBoundary name="Hero Net Worth Chart">
            <MobileAreaChart
              currentNetWorth={netWorth}
              monthlyInflows={monthlyInflows}
              monthlyOutflows={monthlyOutflows}
              transactions={transactions}
              onOpenNetWorth={onOpenNetWorth}
            />
          </WidgetErrorBoundary>

          {/* 2. Asset Allocation Donut Ring Chart */}
          <WidgetErrorBoundary name="Asset Allocation Chart">
            <MobileDonutAllocationChart
              totalValue={totalPortfolioValue}
              totalInvested={totalInvestedValue}
              holdings={holdings}
              onOpenPortfolio={onOpenPortfolio}
              onAddInvestment={onAddInvestment}
            />
          </WidgetErrorBoundary>

          {/* 3. Monthly Cash Flow Grouped Bar Chart */}
          <WidgetErrorBoundary name="Cash Flow Bar Chart">
            <MobileCashFlowBarChart
              monthlyInflows={monthlyInflows}
              monthlyOutflows={monthlyOutflows}
              transactions={transactions}
              onOpenAnalytics={onOpenAnalytics}
            />
          </WidgetErrorBoundary>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 28,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 3,
    borderWidth: 1,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
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
