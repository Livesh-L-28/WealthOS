import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DashboardPeriod, BankAccount, Transaction, InvestmentHolding, BudgetEnvelope, FinancialGoal } from '../types';
import { ExecutiveClarityBar } from './ExecutiveClarityBar';
import { FinancialSummaryCards } from './FinancialSummaryCards';
import { QuickActionsSection } from './QuickActionsSection';
import { CashFlowCard } from './CashFlowCard';
import { PortfolioAllocationCard } from './PortfolioAllocationCard';
import { FinancialHealthCard } from './FinancialHealthCard';
import { RecentTransactionsCard } from './RecentTransactionsCard';
import { OnboardingChecklistCard } from './OnboardingChecklistCard';

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
  onAskCopilot: () => void;
  onViewAllTransactions: () => void;
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
  onAskCopilot,
  onViewAllTransactions,
}) => {
  const totalBudgeted = budgets.reduce((s, b) => s + b.budgeted, 0);
  const totalTargetGoals = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalCurrentGoals = goals.reduce((s, g) => s + g.currentAmount, 0);
  const goalsFundedPct = totalTargetGoals > 0 ? (totalCurrentGoals / totalTargetGoals) * 100 : 42.6;

  return (
    <View style={styles.container}>
      {/* 5-Question Executive Clarity Bar */}
      <ExecutiveClarityBar
        period={period}
        onPeriodChange={onPeriodChange}
        netWorth={netWorth}
        totalAssets={totalAssets}
        totalLiabilities={totalLiabilities}
        monthlyInflows={monthlyInflows}
        monthlyOutflows={monthlyOutflows}
        goalsFundedPct={goalsFundedPct}
      />

      {/* Financial Summary KPI Cards (Assets, Liabilities, Inflow, Outflow) */}
      <FinancialSummaryCards
        totalAssets={totalAssets}
        totalLiabilities={totalLiabilities}
        monthlyInflows={monthlyInflows}
        monthlyOutflows={monthlyOutflows}
        budgetAllocated={totalBudgeted}
      />

      {/* Quick Action Shortcuts */}
      <QuickActionsSection
        onConnectBank={onConnectBank}
        onImportStatement={onImportStatement}
        onAddTransaction={onAddTransaction}
        onAskCopilot={onAskCopilot}
      />

      {/* Monthly Cash Flow Inflow vs Outflow */}
      <CashFlowCard
        monthlyInflows={monthlyInflows}
        monthlyOutflows={monthlyOutflows}
      />

      {/* Multi-Asset Portfolio Allocation */}
      <PortfolioAllocationCard
        totalValue={totalPortfolioValue}
        totalInvested={totalInvestedValue}
      />

      {/* Solvency & Financial Health */}
      <FinancialHealthCard />

      {/* Ledger Setup Checklist */}
      <OnboardingChecklistCard />

      {/* Recent Transactions Journal */}
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

