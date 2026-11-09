import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Text,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from './src/theme';
import {
  TabType,
  ActiveScreen,
  DashboardPeriod,
  BankAccount,
  Transaction,
  InvestmentHolding,
  BudgetEnvelope,
  FinancialGoal,
  CopilotMessage,
} from './src/types';
import {
  INITIAL_ACCOUNTS,
  INITIAL_TRANSACTIONS,
  INITIAL_HOLDINGS,
  INITIAL_BUDGETS,
  INITIAL_GOALS,
  INITIAL_COPILOT_MESSAGES,
} from './src/data';

import { Header } from './src/components/Header';
import { BottomNav } from './src/components/BottomNav';
import { OverviewScreen } from './src/components/OverviewScreen';
import { AccountsScreen } from './src/components/AccountsScreen';
import { PortfolioScreen } from './src/components/PortfolioScreen';
import { BudgetsScreen } from './src/components/BudgetsScreen';
import { CopilotScreen } from './src/components/CopilotScreen';
import { EnterpriseDrawer } from './src/components/EnterpriseDrawer';
import { NetWorthScreen } from './src/components/NetWorthScreen';
import { AnalyticsScreen } from './src/components/AnalyticsScreen';
import { ReconciliationScreen } from './src/components/ReconciliationScreen';
import { DocumentsScreen } from './src/components/DocumentsScreen';
import { HouseholdScreen } from './src/components/HouseholdScreen';
import { SettingsScreen } from './src/components/SettingsScreen';
import { ReconciliationModal } from './src/components/ReconciliationModal';
import { AddTransactionModal } from './src/components/AddTransactionModal';
import { ConnectAccountModal } from './src/components/ConnectAccountModal';
import { ImportStatementModal } from './src/components/ImportStatementModal';
import { formatINR } from './src/formatters';

export { formatINR };

function WealthOSContent() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (RNStatusBar.currentHeight || 28) : 0
  );

  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('overview');
  const [activeWorkspace, setActiveWorkspace] = useState('Family Office');
  const [period, setPeriod] = useState<DashboardPeriod>('1M');
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Core Financial State
  const [accounts, setAccounts] = useState<BankAccount[]>(INITIAL_ACCOUNTS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [holdings, setHoldings] = useState<InvestmentHolding[]>(INITIAL_HOLDINGS);
  const [budgets, setBudgets] = useState<BudgetEnvelope[]>(INITIAL_BUDGETS);
  const [goals, setGoals] = useState<FinancialGoal[]>(INITIAL_GOALS);
  const [copilotMessages, setCopilotMessages] = useState<CopilotMessage[]>(INITIAL_COPILOT_MESSAGES);
  const [chatInput, setChatInput] = useState('');

  // Modals & Drawer
  const [isEnterpriseDrawerOpen, setIsEnterpriseDrawerOpen] = useState(false);
  const [isReconModalOpen, setIsReconModalOpen] = useState(false);
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [txModalType, setTxModalType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const handleOpenAddExpense = () => {
    setTxModalType('DEBIT');
    setIsAddTxModalOpen(true);
  };

  const handleOpenAddIncome = () => {
    setTxModalType('CREDIT');
    setIsAddTxModalOpen(true);
  };

  // Computed Financial Totals
  const totalAssets = accounts
    .filter((a) => a.category === 'ASSET')
    .reduce((sum, a) => sum + a.balance, 0);

  const totalLiabilities = accounts
    .filter((a) => a.category === 'LIABILITY')
    .reduce((sum, a) => sum + a.balance, 0);

  const netWorth = totalAssets - totalLiabilities;

  const totalPortfolioValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalInvestedValue = holdings.reduce((sum, h) => sum + h.investedValue, 0);

  const monthlyInflows = transactions
    .filter((t) => t.type === 'CREDIT')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyOutflows = transactions
    .filter((t) => t.type === 'DEBIT')
    .reduce((sum, t) => sum + t.amount, 0);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3800);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      showNotification('Ledger synchronized across 6 connected institutions');
    }, 700);
  };

  const handleAddAccount = (newAcc: BankAccount) => {
    setAccounts([newAcc, ...accounts]);
    setIsConnectModalOpen(false);
    showNotification(`Connected ${newAcc.name} (${formatINR(newAcc.balance)})`);
  };

  const handleAddTransaction = (data: {
    title: string;
    amount: number;
    category: string;
    type: 'DEBIT' | 'CREDIT';
    accountName: string;
  }) => {
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      title: data.title,
      category: data.category,
      amount: data.amount,
      type: data.type,
      accountName: data.accountName,
      date: 'Today',
      status: 'RECONCILED',
    };

    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.name === data.accountName || acc.id === accounts[0]?.id) {
          const delta = data.type === 'CREDIT' ? data.amount : -data.amount;
          return { ...acc, balance: acc.balance + delta };
        }
        return acc;
      })
    );

    setTransactions([newTx, ...transactions]);
    setIsAddTxModalOpen(false);
    showNotification(
      `Recorded ${data.type === 'CREDIT' ? '+' : '-'}${formatINR(data.amount)} for ${data.title}`
    );
  };

  const handleSimulateImport = () => {
    setIsImportModalOpen(false);
    const parsedTx1: Transaction = {
      id: `tx-imp-${Date.now()}-1`,
      title: 'Zerodha Mutual Fund Dividend Yield',
      category: 'Investment Yield',
      amount: 8750,
      type: 'CREDIT',
      accountName: 'HDFC Corporate Salary',
      date: 'Today',
      status: 'RECONCILED',
    };
    const parsedTx2: Transaction = {
      id: `tx-imp-${Date.now()}-2`,
      title: 'Apollo Pharmacy Health & Care',
      category: 'Healthcare',
      amount: 2450,
      type: 'DEBIT',
      accountName: 'HDFC Corporate Salary',
      date: 'Today',
      status: 'RECONCILED',
    };

    setTransactions([parsedTx1, parsedTx2, ...transactions]);
    showNotification('Statement Parsed: 2 transactions reconciled into ledger (+₹8,750, -₹2,450)');
  };

  const handleSendCopilotMessage = (promptText?: string) => {
    const textToSend = promptText || chatInput;
    if (!textToSend.trim()) return;

    const userMsg: CopilotMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: 'Just now',
    };

    setCopilotMessages((prev) => [...prev, userMsg]);
    setChatInput('');

    setTimeout(() => {
      let replyText = 'I analyzed your active portfolio lots and monthly cash flow.';
      let replyMetrics: { label: string; value: string }[] | undefined = undefined;

      const lower = textToSend.toLowerCase();
      if (lower.includes('emergency') || lower.includes('runway')) {
        replyText = `Your liquid cash reserves total ${formatINR(1327650)}. At your current monthly outflow of ${formatINR(monthlyOutflows)}, your emergency runway is 6.2 months, which exceeds your 6.0-month target threshold.`;
        replyMetrics = [
          { label: 'Liquid Cash', value: '₹13.28 Lakhs' },
          { label: 'Monthly Burn', value: formatINR(monthlyOutflows) },
          { label: 'Runway', value: '6.2 Months' },
        ];
      } else if (lower.includes('vacation') || lower.includes('afford')) {
        replyText = `Yes, you can comfortably afford the ₹1,50,000 expenditure. Your monthly surplus is ${formatINR(monthlyInflows - monthlyOutflows)} and your discretionary budget has ${formatINR(6200)} unused. Withdrawing this will maintain 5.5 months of emergency runway.`;
        replyMetrics = [
          { label: 'Monthly Surplus', value: formatINR(monthlyInflows - monthlyOutflows) },
          { label: 'Post-Trip Runway', value: '5.5 Months' },
          { label: 'Recommendation', value: 'Feasible (Approved)' },
        ];
      } else if (lower.includes('invest') || lower.includes('sip')) {
        replyText = `Based on your debt-to-income ratio (18.2%) and remaining monthly surplus, you can safely deploy ₹35,000 into Nifty 50 Index funds or Flexi-cap equities without impairing your EMI obligations.`;
        replyMetrics = [
          { label: 'Deployable Surplus', value: '₹35,000' },
          { label: 'Tax Lot Age', value: 'LTCG (> 365d)' },
          { label: 'Suggested Allocation', value: '70% Equity / 30% Debt' },
        ];
      } else {
        replyText = `WealthOS verified your double-entry ledger balance. Net worth is ${formatINR(netWorth)} across 6 connected institutions with zero unreconciled discrepancies.`;
        replyMetrics = [
          { label: 'Consolidated Net Worth', value: formatINR(netWorth) },
          { label: 'Active Holdings', value: `${holdings.length} Assets` },
          { label: 'Ledger Variance', value: '₹0.00 (Balanced)' },
        ];
      }

      const copilotReply: CopilotMessage = {
        id: `reply-${Date.now()}`,
        sender: 'copilot',
        text: replyText,
        timestamp: 'Just now',
        metrics: replyMetrics,
      };

      setCopilotMessages((prev) => [...prev, copilotReply]);
    }, 550);
  };

  // Determine if active screen is a primary bottom tab
  const isPrimaryTab = ['overview', 'accounts', 'investments', 'budgets', 'copilot'].includes(
    activeScreen
  );
  const activeTab: TabType = isPrimaryTab ? (activeScreen as TabType) : 'overview';

  return (
    <View style={[styles.safeContainer, { paddingTop: topPadding }]}>
      <ExpoStatusBar style="dark" backgroundColor={theme.colors.surface} />

      {/* Top Header */}
      <Header
        onOpenCopilot={() => setActiveScreen('copilot')}
        onOpenReconciliation={() => setActiveScreen('reconciliation')}
        onOpenHub={() => setIsEnterpriseDrawerOpen(true)}
        activeWorkspace={activeWorkspace}
        isSyncing={refreshing}
      />

      {/* Floating Notification Toast */}
      {notification && (
        <View style={styles.notificationToast}>
          <View style={styles.notifIconCircle}>
            <Text style={styles.notifIconText}>✓</Text>
          </View>
          <Text style={styles.notificationText} numberOfLines={2}>
            {notification}
          </Text>
        </View>
      )}

      {/* Main Content Router */}
      <View style={styles.mainContent}>
        {/* Enterprise Dedicated Screens */}
        {activeScreen === 'net-worth' && (
          <NetWorthScreen onBack={() => setActiveScreen('overview')} />
        )}

        {activeScreen === 'analytics' && (
          <AnalyticsScreen onBack={() => setActiveScreen('overview')} />
        )}

        {activeScreen === 'reconciliation' && (
          <ReconciliationScreen
            onBack={() => setActiveScreen('overview')}
            onShowToast={showNotification}
          />
        )}

        {activeScreen === 'documents' && (
          <DocumentsScreen
            onBack={() => setActiveScreen('overview')}
            onUploadDocument={() => setIsImportModalOpen(true)}
            onShowToast={showNotification}
          />
        )}

        {activeScreen === 'household' && (
          <HouseholdScreen
            onBack={() => setActiveScreen('overview')}
            onShowToast={showNotification}
          />
        )}

        {activeScreen === 'settings' && (
          <SettingsScreen
            onBack={() => setActiveScreen('overview')}
            activeWorkspace={activeWorkspace}
            onSelectWorkspace={(ws) => {
              setActiveWorkspace(ws);
              showNotification(`Switched tenant workspace to ${ws}`);
            }}
            onShowToast={showNotification}
          />
        )}

        {/* Primary Bottom Tab Screens */}
        {activeScreen === 'overview' && (
          <ScrollView
            style={styles.scrollArea}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
          >
            <OverviewScreen
              period={period}
              onPeriodChange={setPeriod}
              netWorth={netWorth}
              totalAssets={totalAssets}
              totalLiabilities={totalLiabilities}
              monthlyInflows={monthlyInflows}
              monthlyOutflows={monthlyOutflows}
              totalPortfolioValue={totalPortfolioValue}
              totalInvestedValue={totalInvestedValue}
              budgets={budgets}
              goals={goals}
              transactions={transactions}
              onConnectBank={() => setIsConnectModalOpen(true)}
              onImportStatement={() => setIsImportModalOpen(true)}
              onAddTransaction={() => handleOpenAddExpense()}
              onAddExpense={handleOpenAddExpense}
              onAddIncome={handleOpenAddIncome}
              onAskCopilot={() => setActiveScreen('copilot')}
              onViewAllTransactions={() => setActiveScreen('accounts')}
              onOpenNetWorth={() => setActiveScreen('net-worth')}
              onOpenAnalytics={() => setActiveScreen('analytics')}
            />
          </ScrollView>
        )}

        {activeScreen === 'accounts' && (
          <ScrollView
            style={styles.scrollArea}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
          >
            <AccountsScreen
              accounts={accounts}
              transactions={transactions}
              onConnectAccount={() => setIsConnectModalOpen(true)}
              onAddTransaction={() => handleOpenAddExpense()}
              onAddExpense={handleOpenAddExpense}
              onAddIncome={handleOpenAddIncome}
            />
          </ScrollView>
        )}

        {activeScreen === 'investments' && (
          <ScrollView
            style={styles.scrollArea}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
          >
            <PortfolioScreen holdings={holdings} />
          </ScrollView>
        )}

        {activeScreen === 'budgets' && (
          <ScrollView
            style={styles.scrollArea}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
          >
            <BudgetsScreen
              budgets={budgets}
              goals={goals}
              onAddTransaction={handleOpenAddExpense}
            />
          </ScrollView>
        )}

        {activeScreen === 'copilot' && (
          <CopilotScreen
            messages={copilotMessages}
            chatInput={chatInput}
            onChatInputChange={setChatInput}
            onSendMessage={handleSendCopilotMessage}
          />
        )}
      </View>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveScreen(tab)}
        onAddEntry={handleOpenAddExpense}
      />

      {/* Enterprise Drawer Hub */}
      <EnterpriseDrawer
        isOpen={isEnterpriseDrawerOpen}
        onClose={() => setIsEnterpriseDrawerOpen(false)}
        activeScreen={activeScreen}
        onSelectScreen={(screen) => setActiveScreen(screen)}
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={(ws) => {
          setActiveWorkspace(ws);
          showNotification(`Active tenant switched to ${ws}`);
        }}
      />

      {/* Modals */}
      <ReconciliationModal
        visible={isReconModalOpen}
        onClose={() => setIsReconModalOpen(false)}
        netWorth={netWorth}
        totalAssets={totalAssets}
        totalLiabilities={totalLiabilities}
        institutionsCount={accounts.length}
      />

      <AddTransactionModal
        visible={isAddTxModalOpen}
        onClose={() => setIsAddTxModalOpen(false)}
        accounts={accounts}
        onSubmit={handleAddTransaction}
        initialType={txModalType}
      />

      <ConnectAccountModal
        visible={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onSubmit={handleAddAccount}
      />

      <ImportStatementModal
        visible={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleSimulateImport}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <WealthOSContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  mainContent: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  scrollArea: {
    flex: 1,
  },
  notificationToast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 70 : 60,
    left: 16,
    right: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 106, 0.4)',
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 999,
  },
  notifIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryLightSolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifIconText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  notificationText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    lineHeight: 16,
  },
});
