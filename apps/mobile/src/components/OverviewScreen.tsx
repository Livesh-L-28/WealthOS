import React from 'react';
import { StyleSheet, View } from 'react-native';
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
});
