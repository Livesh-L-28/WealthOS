import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { DashboardPeriod, Transaction, BudgetEnvelope, FinancialGoal } from '../types';
import { MobileAreaChart } from './charts/MobileAreaChart';
import { IncomeExpenseActionBar } from './IncomeExpenseActionBar';
import { FinancialSummaryCards } from './FinancialSummaryCards';
import { MobileCashFlowBarChart } from './charts/MobileCashFlowBarChart';
import { MobileDonutAllocationChart } from './charts/MobileDonutAllocationChart';
import { FinancialHealthCard } from './FinancialHealthCard';
import { RecentTransactionsCard } from './RecentTransactionsCard';

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
  onConnectBank: () => void;
  onImportStatement: () => void;
  onAddTransaction: () => void;
  onAddExpense?: () => void;
  onAddIncome?: () => void;
  onAddBudget?: () => void;
  onAddGoal?: () => void;
  onAddInvestment?: () => void;
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
  onConnectBank,
  onImportStatement,
  onAddTransaction,
  onAddExpense,
  onAddIncome,
  onAddBudget,
  onAddGoal,
  onAddInvestment,
  onAskCopilot,
  onViewAllTransactions,
  onOpenNetWorth,
  onOpenAnalytics,
  onOpenPortfolio,
}) => {
  const totalBudgeted = budgets.reduce((s, b) => s + b.budgeted, 0);

  return (
    <View style={styles.container}>
      {/* 0. Top Period Switcher */}
      <View style={styles.periodRow}>
        {(['1M', '3M', 'YTD', 'ALL'] as DashboardPeriod[]).map((p) => {
          const isActive = period === p;
          const label = p === '1M' ? '1M (Nov)' : p;
          return (
            <TouchableOpacity
              key={p}
              style={[styles.periodTab, isActive && styles.periodTabActive]}
              onPress={() => onPeriodChange(p)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Select period ${label}`}
            >
              <Text style={[styles.periodTabText, isActive && styles.periodTabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 1. Hero Net Worth Interactive Bezier Area Chart with Trajectory & Attribution */}
      <MobileAreaChart
        currentNetWorth={netWorth}
        onOpenNetWorth={onOpenNetWorth}
      />

      {/* 2. Primary Add Expense & Add Income Action Bar */}
      {onAddExpense && onAddIncome && (
        <IncomeExpenseActionBar
          onAddExpense={onAddExpense}
          onAddIncome={onAddIncome}
        />
      )}

      {/* 3. Inflow vs Outflow KPI Summary Cards */}
      <FinancialSummaryCards
        totalAssets={totalAssets}
        totalLiabilities={totalLiabilities}
        monthlyInflows={monthlyInflows}
        monthlyOutflows={monthlyOutflows}
        budgetAllocated={totalBudgeted}
        onPressInflows={onAddIncome}
        onPressOutflows={onAddExpense}
      />

      {/* 4. Multi-Asset Portfolio Asset Allocation Donut Ring Chart */}
      <MobileDonutAllocationChart
        totalValue={totalPortfolioValue}
        totalInvested={totalInvestedValue}
        onOpenPortfolio={onOpenPortfolio}
      />

      {/* 5. Solvency & Financial Health Rating */}
      <FinancialHealthCard onPress={onOpenAnalytics} />

      {/* 6. Recent Transactions General Journal */}
      <RecentTransactionsCard
        transactions={transactions}
        onViewAll={onViewAllTransactions}
      />

      {/* 7. Comprehensive Cash Flow Inflow vs Outflow & Trajectory Graph (In the Last) */}
      <MobileCashFlowBarChart onOpenAnalytics={onOpenAnalytics} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  periodRow: {
    flexDirection: 'row',
    backgroundColor: '#EEF2EF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7ECE8',
    padding: 3,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#758078',
  },
  periodTabTextActive: {
    fontWeight: '700',
    color: '#17231D',
  },
});
