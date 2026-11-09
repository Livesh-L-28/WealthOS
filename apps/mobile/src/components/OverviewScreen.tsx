import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DashboardPeriod, Transaction, BudgetEnvelope, FinancialGoal } from '../types';
import { ExecutiveClarityBar } from './ExecutiveClarityBar';
import { IncomeExpenseActionBar } from './IncomeExpenseActionBar';
import { FinancialSummaryCards } from './FinancialSummaryCards';
import { QuickActionsSection } from './QuickActionsSection';
import { CashFlowCard } from './CashFlowCard';
import { PortfolioAllocationCard } from './PortfolioAllocationCard';
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
  onAskCopilot: () => void;
  onViewAllTransactions: () => void;
  onOpenNetWorth?: () => void;
  onOpenAnalytics?: () => void;
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
  onAskCopilot,
  onViewAllTransactions,
  onOpenNetWorth,
  onOpenAnalytics,
}) => {
  const totalBudgeted = budgets.reduce((s, b) => s + b.budgeted, 0);
  const totalTargetGoals = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalCurrentGoals = goals.reduce((s, g) => s + g.currentAmount, 0);
  const goalsFundedPct = totalTargetGoals > 0 ? (totalCurrentGoals / totalTargetGoals) * 100 : 42.6;

  return (
    <View style={styles.container}>
      {/* 1. Hero Net Worth & Accounting Clarity */}
      <ExecutiveClarityBar
        period={period}
        onPeriodChange={onPeriodChange}
        netWorth={netWorth}
        totalAssets={totalAssets}
        totalLiabilities={totalLiabilities}
        monthlyInflows={monthlyInflows}
        monthlyOutflows={monthlyOutflows}
        goalsFundedPct={goalsFundedPct}
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

      {/* 4. Inflow vs Outflow KPI Cards */}
      <FinancialSummaryCards
        totalAssets={totalAssets}
        totalLiabilities={totalLiabilities}
        monthlyInflows={monthlyInflows}
        monthlyOutflows={monthlyOutflows}
        budgetAllocated={totalBudgeted}
      />

      {/* 5. Cash Flow & Surplus Pulse */}
      <CashFlowCard
        monthlyInflows={monthlyInflows}
        monthlyOutflows={monthlyOutflows}
        onOpenAnalytics={onOpenAnalytics}
      />

      {/* 6. Multi-Asset Portfolio Distribution */}
      <PortfolioAllocationCard
        totalValue={totalPortfolioValue}
        totalInvested={totalInvestedValue}
      />

      {/* 7. Solvency & Financial Health */}
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
    paddingBottom: 20,
  },
});
