import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Text,
  Platform,
  StatusBar as RNStatusBar,
  TouchableOpacity,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
  initialWindowMetrics,
} from 'react-native-safe-area-context';

import { theme, ThemeProvider, useTheme } from './src/theme';
import {
  ActiveScreen,
  PillarType,
  DashboardPeriod,
  BankAccount,
  Transaction,
  InvestmentHolding,
  BudgetEnvelope,
  FinancialGoal,
  CopilotMessage,
  DocumentItem,
} from './src/types';
import {
  INITIAL_ACCOUNTS,
  INITIAL_TRANSACTIONS,
  INITIAL_HOLDINGS,
  INITIAL_BUDGETS,
  INITIAL_GOALS,
  INITIAL_COPILOT_MESSAGES,
  INITIAL_DOCUMENTS,
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
import { FinancialCalendarScreen } from './src/components/FinancialCalendarScreen';
import { DividendsScreen } from './src/components/DividendsScreen';
import { LiabilitiesScreen } from './src/components/LiabilitiesScreen';
import { ReconciliationModal } from './src/components/ReconciliationModal';
import { AddTransactionModal } from './src/components/AddTransactionModal';
import { ConnectAccountModal } from './src/components/ConnectAccountModal';
import { ImportStatementModal } from './src/components/ImportStatementModal';
import { CreateBudgetModal } from './src/components/CreateBudgetModal';
import { CreateGoalModal } from './src/components/CreateGoalModal';
import { AddInvestmentModal } from './src/components/AddInvestmentModal';
import { QuickAddModal } from './src/components/QuickAddModal';
import { TransferFundsModal } from './src/components/TransferFundsModal';
import { GlobalSearchModal } from './src/components/GlobalSearchModal';
import { formatINR } from './src/formatters';

export { formatINR };

// Class ErrorBoundary for resilient native error trapping
interface ErrorBoundaryState {
  hasError: boolean;
  errorText: string;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorText: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorText: error?.message || 'Unknown runtime render error' };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('WealthOS Native Exception Caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorText: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>WealthOS Runtime Recovery</Text>
          <Text style={styles.errorSubtitle}>
            An unexpected render issue was safely caught. Your local financial ledger remains intact.
          </Text>
          <Text style={styles.errorDetail}>{this.state.errorText}</Text>
          <TouchableOpacity style={styles.resetButton} onPress={this.handleReset} activeOpacity={0.8}>
            <Text style={styles.resetButtonText}>Reload Application</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function WealthOSContent() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const androidStatusBarHeight = RNStatusBar.currentHeight || 28;
  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? androidStatusBarHeight + 14 : 48,
    52
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
  const [documents] = useState<DocumentItem[]>(INITIAL_DOCUMENTS);
  const [copilotMessages, setCopilotMessages] = useState<CopilotMessage[]>(INITIAL_COPILOT_MESSAGES);
  const [chatInput, setChatInput] = useState('');

  // Modals & Drawer
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isEnterpriseDrawerOpen, setIsEnterpriseDrawerOpen] = useState(false);
  const [isReconModalOpen, setIsReconModalOpen] = useState(false);
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [txModalType, setTxModalType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateBudgetModalOpen, setIsCreateBudgetModalOpen] = useState(false);
  const [isCreateGoalModalOpen, setIsCreateGoalModalOpen] = useState(false);
  const [isAddInvestmentModalOpen, setIsAddInvestmentModalOpen] = useState(false);

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

    // If expense, advance matching budget envelope in real-time
    if (data.type === 'DEBIT') {
      setBudgets((prevBudgets) =>
        prevBudgets.map((env) => {
          if (
            env.category.toLowerCase().includes(data.category.toLowerCase()) ||
            data.category.toLowerCase().includes(env.category.toLowerCase())
          ) {
            return { ...env, spent: env.spent + data.amount };
          }
          return env;
        })
      );
    }

    setTransactions([newTx, ...transactions]);
    setIsAddTxModalOpen(false);
    showNotification(
      `Recorded ${data.type === 'CREDIT' ? '+' : '-'}${formatINR(data.amount)} for ${data.title}`
    );
  };

  const handleTransferFunds = (transfer: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    notes?: string;
  }) => {
    const fromAcc = accounts.find((a) => a.id === transfer.fromAccountId);
    const toAcc = accounts.find((a) => a.id === transfer.toAccountId);
    if (!fromAcc || !toAcc) return;

    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === transfer.fromAccountId) {
          return { ...acc, balance: acc.balance - transfer.amount };
        }
        if (acc.id === transfer.toAccountId) {
          return { ...acc, balance: acc.balance + transfer.amount };
        }
        return acc;
      })
    );

    const newTx: Transaction = {
      id: `tx-xfer-${Date.now()}`,
      title: `Transfer: ${fromAcc.name} → ${toAcc.name}`,
      category: 'Internal Transfer',
      amount: transfer.amount,
      type: 'DEBIT',
      accountName: fromAcc.name,
      date: 'Today',
      status: 'RECONCILED',
      notes: transfer.notes,
    };

    setTransactions([newTx, ...transactions]);
    showNotification(
      `Transferred ${formatINR(transfer.amount)} from ${fromAcc.name} to ${toAcc.name}`
    );
  };

  const handleSimulateImport = () => {
    setIsImportModalOpen(false);
    const parsedTx1: Transaction = {
      id: `tx-imp-${Date.now()}-1`,
      title: 'HDFC Interest Credit Q2',
      category: 'Interest Income',
      amount: 4210.0,
      type: 'CREDIT',
      accountName: 'HDFC Corporate Salary',
      date: 'Today',
      status: 'RECONCILED',
    };
    const parsedTx2: Transaction = {
      id: `tx-imp-${Date.now()}-2`,
      title: 'Swiggy Gourmet Dining',
      category: 'Food & Dining',
      amount: 1450.0,
      type: 'DEBIT',
      accountName: 'HDFC Corporate Salary',
      date: 'Today',
      status: 'RECONCILED',
    };

    setTransactions([parsedTx1, parsedTx2, ...transactions]);
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === 'acc-hdfc-sal'
          ? { ...acc, balance: acc.balance + (4210.0 - 1450.0) }
          : acc
      )
    );
    showNotification('Statement parsed: 2 journal entries reconciled into general ledger');
  };

  const handleCreateBudget = (newBudget: BudgetEnvelope) => {
    setBudgets([...budgets, newBudget]);
    setIsCreateBudgetModalOpen(false);
    showNotification(`Created ${newBudget.category} envelope (${formatINR(newBudget.budgeted)})`);
  };

  const handleCreateGoal = (newGoal: FinancialGoal) => {
    setGoals([...goals, newGoal]);
    setIsCreateGoalModalOpen(false);
    showNotification(`Strategic goal established: ${newGoal.title}`);
  };

  const handleAddInvestment = (newHolding: InvestmentHolding) => {
    setHoldings([...holdings, newHolding]);
    setIsAddInvestmentModalOpen(false);
    showNotification(`Recorded ${newHolding.symbol} (${newHolding.name}) in portfolio lots`);
  };

  const handleSendCopilotMessage = (customText?: string) => {
    const textToSend = customText || chatInput;
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
      let replyText =
        'I reviewed your double-entry trial balance. All journal entries and institution cash balances are strictly in sync with zero unreconciled float.';
      const replyMetrics = [
        { label: 'Net Worth', value: formatINR(netWorth) },
        { label: 'Liquid Runway', value: '6.2 Months' },
        { label: 'Double-Entry Variance', value: '₹0.00' },
      ];

      const lower = textToSend.toLowerCase();
      if (lower.includes('runway') || lower.includes('emergency')) {
        const liquid = totalAssets - 4522551.25;
        const burn = monthlyOutflows > 0 ? monthlyOutflows : 148250;
        const months = (liquid / burn).toFixed(1);
        replyText = `Based on ₹${formatINR(liquid)} liquid cash across 3 depository accounts and an average burn of ₹${formatINR(burn)}/mo, your emergency runway is ${months} months.`;
      } else if (lower.includes('afford') || lower.includes('vacation') || lower.includes('trip')) {
        replyText =
          'Yes, you can comfortably afford this trip. Deploying ₹1,50,000 will leave ₹26.78 Lakhs in liquid cash and preserve 5.8 months of emergency runway.';
      } else if (lower.includes('sip') || lower.includes('invest') || lower.includes('portfolio')) {
        replyText = `Your investment portfolio sits at ${formatINR(totalPortfolioValue)} (+${(
          ((totalPortfolioValue - totalInvestedValue) / totalInvestedValue) *
          100
        ).toFixed(1)}% unrealized gain). You currently deploy ₹50,000/mo into SIPs with ₹35,000 monthly surplus buffer remaining.`;
      } else if (lower.includes('balance') || lower.includes('sigma') || lower.includes('verify')) {
        replyText = `WealthOS verified your double-entry ledger balance. Net worth is ${formatINR(netWorth)} across 6 connected institutions with zero unreconciled discrepancies.`;
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

  const handleSelectPillar = (pillar: PillarType) => {
    switch (pillar) {
      case 'home':
        setActiveScreen('overview');
        break;
      case 'money':
        setActiveScreen('accounts');
        break;
      case 'invest':
        setActiveScreen('investments');
        break;
      case 'plan':
        setActiveScreen('budgets');
        break;
      case 'more':
        setIsEnterpriseDrawerOpen(true);
        break;
    }
  };

  return (
    <View
      style={[
        styles.safeContainer,
        {
          paddingTop: topPadding,
          backgroundColor: theme.colors.surface,
        },
      ]}
    >
      <ExpoStatusBar
        style={isDark ? 'light' : 'dark'}
        backgroundColor={theme.colors.surface}
        translucent={true}
      />

      {/* Top Header */}
      <Header
        onOpenCopilot={() => setActiveScreen('copilot')}
        onOpenReconciliation={() => setActiveScreen('reconciliation')}
        onOpenHub={() => setIsEnterpriseDrawerOpen(true)}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        activeWorkspace={activeWorkspace}
        isSyncing={refreshing}
      />

      {/* Floating Notification Toast */}
      {notification && (
        <View
          style={[
            styles.notificationToast,
            {
              backgroundColor: theme.colors.surface,
              borderColor: isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(37, 99, 235, 0.4)',
            },
          ]}
        >
          <View
            style={[
              styles.notifIconCircle,
              { backgroundColor: theme.colors.primaryLightSolid },
            ]}
          >
            <Text style={[styles.notifIconText, { color: theme.colors.primary }]}>✓</Text>
          </View>
          <Text
            style={[styles.notificationText, { color: theme.colors.textPrimary }]}
            numberOfLines={2}
          >
            {notification}
          </Text>
        </View>
      )}

      {/* Main Content Router */}
      <View style={[styles.mainContent, { backgroundColor: theme.colors.canvas }]}>
        {/* Dedicated Modern Fintech Screens */}
        {activeScreen === 'calendar' && (
          <FinancialCalendarScreen
            onBack={() => setActiveScreen('overview')}
            onShowToast={showNotification}
          />
        )}

        {activeScreen === 'dividends' && (
          <DividendsScreen
            onBack={() => setActiveScreen('investments')}
            onShowToast={showNotification}
          />
        )}

        {activeScreen === 'liabilities' && (
          <LiabilitiesScreen
            onBack={() => setActiveScreen('budgets')}
            onShowToast={showNotification}
          />
        )}

        {(activeScreen === 'net-worth' || activeScreen === 'reports') && (
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

        {(activeScreen === 'settings' || activeScreen === 'security') && (
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

        {/* 1. Home Pillar */}
        {(activeScreen === 'overview' || activeScreen === 'home') && (
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
              onOpenPortfolio={() => setActiveScreen('investments')}
              onAddBudget={() => setIsCreateBudgetModalOpen(true)}
              onAddGoal={() => setIsCreateGoalModalOpen(true)}
              onAddInvestment={() => setIsAddInvestmentModalOpen(true)}
            />
          </ScrollView>
        )}

        {/* 2. Money Pillar */}
        {(activeScreen === 'accounts' ||
          activeScreen === 'transactions' ||
          activeScreen === 'money') && (
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
              initialSubTab={activeScreen === 'transactions' ? 'TRANSACTIONS' : 'ACCOUNTS'}
            />
          </ScrollView>
        )}

        {/* 3. Invest Pillar */}
        {(activeScreen === 'investments' || activeScreen === 'invest') && (
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
            <PortfolioScreen
              holdings={holdings}
              onAddInvestment={() => setIsAddInvestmentModalOpen(true)}
            />
          </ScrollView>
        )}

        {/* 4. Plan Pillar */}
        {(activeScreen === 'budgets' || activeScreen === 'goals' || activeScreen === 'plan') && (
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
              onAddEnvelope={() => setIsCreateBudgetModalOpen(true)}
              onAddGoal={() => setIsCreateGoalModalOpen(true)}
              initialSubTab={activeScreen === 'goals' ? 'GOALS' : 'ALL'}
            />
          </ScrollView>
        )}

        {/* 5. Copilot AI Screen */}
        {activeScreen === 'copilot' && (
          <CopilotScreen
            messages={copilotMessages}
            chatInput={chatInput}
            onChatInputChange={setChatInput}
            onSendMessage={handleSendCopilotMessage}
          />
        )}
      </View>

      {/* Modern Fintech 5-Pillar Navigation Dock with Elevated Quick Action Center */}
      <BottomNav
        activeScreen={activeScreen}
        onSelectPillar={handleSelectPillar}
        onOpenQuickAction={() => setIsQuickAddOpen(true)}
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

      {/* Contextual Quick Financial Action Modal Sheet */}
      <QuickAddModal
        visible={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSelectExpense={handleOpenAddExpense}
        onSelectIncome={handleOpenAddIncome}
        onSelectTransfer={() => setIsTransferModalOpen(true)}
        onSelectConnectBank={() => setIsConnectModalOpen(true)}
        onSelectImportStatement={() => setIsImportModalOpen(true)}
        onSelectAddInvestment={() => setIsAddInvestmentModalOpen(true)}
        onSelectCreateBudget={() => setIsCreateBudgetModalOpen(true)}
        onSelectCopilot={() => setActiveScreen('copilot')}
      />

      {/* Account-to-Account Treasury Transfer Modal */}
      <TransferFundsModal
        visible={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        accounts={accounts}
        onSubmit={handleTransferFunds}
      />

      {/* Global Financial Search Modal */}
      <GlobalSearchModal
        visible={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        accounts={accounts}
        transactions={transactions}
        holdings={holdings}
        goals={goals}
        documents={documents}
        onNavigate={(screen) => setActiveScreen(screen)}
      />

      {/* Financial Operations Modals */}
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

      <CreateBudgetModal
        visible={isCreateBudgetModalOpen}
        onClose={() => setIsCreateBudgetModalOpen(false)}
        onSubmit={handleCreateBudget}
      />

      <CreateGoalModal
        visible={isCreateGoalModalOpen}
        onClose={() => setIsCreateGoalModalOpen(false)}
        onSubmit={handleCreateGoal}
      />

      <AddInvestmentModal
        visible={isAddInvestmentModalOpen}
        onClose={() => setIsAddInvestmentModalOpen(false)}
        onSubmit={handleAddInvestment}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider>
        <ErrorBoundary>
          <WealthOSContent />
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  notificationToast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 70 : 60,
    left: 16,
    right: 16,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    shadowColor: '#0F172A',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifIconText: {
    fontSize: 12,
    fontWeight: '800',
  },
  notificationText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  errorDetail: {
    fontSize: 11,
    color: '#DC2626',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 20,
    maxWidth: '90%',
  },
  resetButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
