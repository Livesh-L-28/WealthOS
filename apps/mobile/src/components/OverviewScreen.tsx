import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DashboardPeriod, Transaction, BudgetEnvelope, FinancialGoal } from '../types';
import { MobileAreaChart } from './charts/MobileAreaChart';
import { IncomeExpenseActionBar } from './IncomeExpenseActionBar';
import { QuickActionsSection } from './QuickActionsSection';
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

      {/* 3. Quick Actions Dock */}
      <QuickActionsSection
        onConnectBank={onConnectBank}
        onImportStatement={onImportStatement}
        onAddTransaction={onAddTransaction}
        onAddExpense={onAddExpense}
        onAddIncome={onAddIncome}
        onAskCopilot={onAskCopilot}
      />

      {/* 4. Inflow vs Outflow KPI Summary Cards */}
      <FinancialSummaryCards
        totalAssets={totalAssets}
        totalLiabilities={totalLiabilities}
        monthlyInflows={monthlyInflows}
        monthlyOutflows={monthlyOutflows}
        budgetAllocated={totalBudgeted}
      />

      {/* 5. Professional 4-Month Inflow vs Outflow Dual-Bar Chart */}
      <MobileCashFlowBarChart onOpenAnalytics={onOpenAnalytics} />

      {/* 6. Multi-Asset Portfolio Asset Allocation Donut Ring Chart */}
      <MobileDonutAllocationChart
        totalValue={totalPortfolioValue}
        totalInvested={totalInvestedValue}
        onOpenPortfolio={onOpenPortfolio}
      />

      {/* 7. Solvency & Financial Health Rating */}
      <FinancialHealthCard />

      {/* 8. Recent Transactions General Journal */}
      <RecentTransactionsCard
        transactions={transactions}
        onViewAll={onViewAllTransactions}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
});
