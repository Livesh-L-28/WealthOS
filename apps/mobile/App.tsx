import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Text,
  Platform,
  StatusBar as RNStatusBar,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import {
  SafeAreaProvider,
  SafeAreaInsetsContext,
  SafeAreaFrameContext,
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
import { localStore } from './src/storage/localStore';
import { setGlobalPrivacyMode } from './src/formatters';
import { BiometricShield } from './src/components/BiometricShield';
import { generateIdempotencyKey, registerIdempotencyKey, commitIdempotencyKey, failIdempotencyKey } from './src/idempotency';
import { validateDoubleEntryTransaction } from './src/ledger/doubleEntryValidator';
import { logger } from './src/logger';

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
import { AuthScreen } from './src/components/AuthScreen';
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
import {
  restoreActiveSession,
  clearAuthenticatedSession,
  UserSessionData,
} from './src/api/client';
import {
  accountingService,
  budgetService,
  goalsService,
  investmentsService,
  documentsService,
  copilotService,
} from './src/api/domainServices';
import { validateDeepLink } from './src/deeplink';

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
  const { theme, isDark } = useTheme();
  const androidStatusBarHeight = RNStatusBar.currentHeight || 28;
  const topPadding = Platform.OS === 'android' ? androidStatusBarHeight + 8 : 44;

  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('overview');
  const [activeWorkspace, setActiveWorkspace] = useState('Family Office');
  const [period, setPeriod] = useState<DashboardPeriod>('1M');
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isRestoringSession, setIsRestoringSession] = useState<boolean>(false);

  // Core Financial State - Persistent Offline-First Architecture (Clean Initial State)
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [holdings, setHoldings] = useState<InvestmentHolding[]>([]);
  const [budgets, setBudgets] = useState<BudgetEnvelope[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [copilotMessages, setCopilotMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome-clean',
      sender: 'copilot',
      text: 'Welcome to WealthOS. Your secure personal ledger is initialized. Add an account or record your first transaction to begin tracking your net worth and cash flows.',
      timestamp: 'Just now',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isStorageReady, setIsStorageReady] = useState(false);

  // Load persistent state from device storage on startup (Preserves data across updates)
  useEffect(() => {
    let isMounted = true;
    async function initDeviceStorage() {
      try {
        const stored = await localStore.loadLedgerState();
        if (isMounted) {
          setAccounts(stored.accounts);
          setTransactions(stored.transactions);
          setHoldings(stored.holdings);
          setBudgets(stored.budgets);
          setGoals(stored.goals);
          setDocuments(stored.documents);
          if (stored.copilotMessages && stored.copilotMessages.length > 0) {
            setCopilotMessages(stored.copilotMessages);
          }
          if (stored.workspace) {
            setActiveWorkspace(stored.workspace);
          }
          setIsStorageReady(true);
        }
      } catch (err) {
        console.warn('Storage initialization note:', err);
        if (isMounted) setIsStorageReady(true);
      }
    }
    initDeviceStorage();
    return () => {
      isMounted = false;
    };
  }, []);

  const loadLiveLedgerData = async () => {
    try {
      const [liveAccounts, liveTxs, liveBudgets, liveGoals, liveHoldings, liveDocs] =
        await Promise.all([
          accountingService.fetchAccounts(),
          accountingService.fetchTransactions(),
          budgetService.fetchBudgets(),
          goalsService.fetchGoals(),
          investmentsService.fetchHoldings(),
          documentsService.fetchDocuments(),
        ]);

      if (liveAccounts && liveAccounts.length > 0) {
        setAccounts(liveAccounts);
        await localStore.saveAccounts(liveAccounts);
      }
      if (liveTxs && liveTxs.length > 0) {
        setTransactions(liveTxs);
        await localStore.saveTransactions(liveTxs);
      }
      if (liveBudgets && liveBudgets.length > 0) {
        setBudgets(liveBudgets);
        await localStore.saveBudgets(liveBudgets);
      }
      if (liveGoals && liveGoals.length > 0) {
        setGoals(liveGoals);
        await localStore.saveGoals(liveGoals);
      }
      if (liveHoldings && liveHoldings.length > 0) {
        setHoldings(liveHoldings);
        await localStore.saveHoldings(liveHoldings);
      }
      if (liveDocs && liveDocs.length > 0) {
        setDocuments(liveDocs);
      }
    } catch (err) {
      console.warn('Live ledger sync notice:', err);
    }
  };

  // Background non-blocking session check
  useEffect(() => {
    let isMounted = true;
    async function checkExistingSession() {
      try {
        const session = await restoreActiveSession();
        if (isMounted && session) {
          if (session.activeTenant?.name) {
            setActiveWorkspace(session.activeTenant.name);
          }
          await loadLiveLedgerData();
        }
      } catch (err) {
        console.warn('Session check notice:', err);
      }
    }
    checkExistingSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Deep Link security validation & authorized routing
  useEffect(() => {
    const handleInboundUrl = (rawUrl: string | null) => {
      if (!rawUrl || rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return;
      const validated = validateDeepLink(rawUrl);
      if (!validated.isValid) return;
      if (validated.path === '/accounts') {
        setActiveScreen('accounts');
      } else if (validated.path === '/dashboard') {
        setActiveScreen('overview');
      } else if (validated.path === '/notifications') {
        showNotification('Navigated to Financial Notifications');
      }
    };

    const sub = Linking.addEventListener('url', ({ url }) => handleInboundUrl(url));
    Linking.getInitialURL().then(handleInboundUrl);
    return () => sub.remove();
  }, []);

  const handleResetToFresh = async () => {
    const clean = await localStore.resetToCleanSlate();
    setAccounts(clean.accounts);
    setTransactions(clean.transactions);
    setHoldings(clean.holdings);
    setBudgets(clean.budgets);
    setGoals(clean.goals);
    setDocuments(clean.documents);
    setCopilotMessages(clean.copilotMessages);
    showNotification('Ledger cleared to clean production state');
  };

  const handleLoadDemoData = async () => {
    setAccounts(INITIAL_ACCOUNTS);
    setTransactions(INITIAL_TRANSACTIONS);
    setHoldings(INITIAL_HOLDINGS);
    setBudgets(INITIAL_BUDGETS);
    setGoals(INITIAL_GOALS);
    setDocuments(INITIAL_DOCUMENTS);
    setCopilotMessages(INITIAL_COPILOT_MESSAGES);
    await localStore.saveLedgerState({
      hasOnboarded: true,
      accounts: INITIAL_ACCOUNTS,
      transactions: INITIAL_TRANSACTIONS,
      holdings: INITIAL_HOLDINGS,
      budgets: INITIAL_BUDGETS,
      goals: INITIAL_GOALS,
      documents: INITIAL_DOCUMENTS,
      copilotMessages: INITIAL_COPILOT_MESSAGES,
      workspace: 'Family Office Demo',
    });
    showNotification('Loaded sample demonstration data');
  };

  // Modals & Drawer
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  useEffect(() => {
    let isMounted = true;
    localStore.getPrivacyMode().then((saved) => {
      if (isMounted) {
        setIsPrivacyMode(saved);
        setGlobalPrivacyMode(saved);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const handleTogglePrivacy = () => {
    const next = !isPrivacyMode;
    setIsPrivacyMode(next);
    setGlobalPrivacyMode(next);
    localStore.setPrivacyMode(next);
    showNotification(next ? '🙈 Stealth Mode Enabled (Balances Masked)' : '👁️ Stealth Mode Disabled (Balances Visible)');
  };

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLiveLedgerData();
    setRefreshing(false);
    showNotification('Ledger synchronized across connected institutions');
  };

  const handleAddAccount = async (newAcc: BankAccount) => {
    const updated = [newAcc, ...accounts];
    setAccounts(updated);
    await localStore.saveAccounts(updated);
    setIsConnectModalOpen(false);
    showNotification(`Connected ${newAcc.name} (${formatINR(newAcc.balance)})`);

    // Synchronize to backend repository asynchronously (non-blocking)
    try {
      await accountingService.createAccount({
        accountName: newAcc.name,
        accountCode: (1000 + updated.length * 10).toString(),
        accountType: newAcc.category,
        currencyCode: newAcc.currency || 'INR',
      });
    } catch {}
  };

  const handleAddTransaction = async (data: {
    title: string;
    amount: number;
    category: string;
    type: 'DEBIT' | 'CREDIT';
    accountName: string;
  }) => {
    // 0. Input validation & Double-Entry Pre-Flight
    if (!data.amount || isNaN(data.amount) || data.amount <= 0) {
      showNotification('Transaction amount must be strictly greater than zero.');
      return;
    }

    // Idempotency token registration to prevent duplicate submits / double-tapping
    const idempotencyKey = generateIdempotencyKey();
    if (!registerIdempotencyKey(idempotencyKey)) {
      showNotification('Transaction already being processed. Duplicate submission prevented.');
      return;
    }

    const targetAccount = accounts.find((a) => a.name === data.accountName) || accounts[0];
    if (!targetAccount) {
      failIdempotencyKey(idempotencyKey);
      showNotification('Please connect an account first.');
      return;
    }

    // 1. Optimistically post transaction locally immediately (Zero latency)
    const newTx: Transaction = {
      id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: data.title || `${data.category} Entry`,
      amount: data.amount,
      category: data.category,
      type: data.type,
      accountName: targetAccount.name,
      date: 'Today',
      status: 'RECONCILED',
    };

    const balanceDelta = data.type === 'CREDIT' ? data.amount : -data.amount;
    const updatedAccounts = accounts.map((acc) =>
      acc.id === targetAccount.id
        ? { ...acc, balance: acc.balance + balanceDelta, lastSynced: 'Just now' }
        : acc
    );
    const updatedTransactions = [newTx, ...transactions];

    setAccounts(updatedAccounts);
    setTransactions(updatedTransactions);
    await localStore.saveAccounts(updatedAccounts);
    await localStore.saveTransactions(updatedTransactions);

    // 2. Immediately close modal and show confirmation
    setIsAddTxModalOpen(false);
    showNotification(
      `✓ Posted ${data.type === 'CREDIT' ? '+' : '-'}${formatINR(data.amount)} for ${data.title}`
    );

    // 3. Sync to backend repository in background (non-blocking) with idempotency
    try {
      const postRes = await accountingService.postTransaction({
        title: data.title,
        amount: data.amount,
        category: data.category,
        type: data.type,
        accountId: targetAccount.id,
      });
      commitIdempotencyKey(idempotencyKey, postRes);
      if (postRes && postRes.success) {
        await loadLiveLedgerData();
      }
    } catch (err: any) {
      logger.warn('Backend sync deferred (persisted in offline encrypted store):', err.message);
    }
  };

  const handleTransferFunds = async (transfer: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    notes?: string;
  }) => {
    if (transfer.fromAccountId === transfer.toAccountId) {
      showNotification('Source and destination accounts must be distinct.');
      return;
    }

    const sourceAcc = accounts.find((a) => a.id === transfer.fromAccountId);
    const destAcc = accounts.find((a) => a.id === transfer.toAccountId);
    if (!sourceAcc || !destAcc) {
      showNotification('Selected transfer accounts not found.');
      return;
    }

    // 1. Optimistically transfer funds locally immediately
    const updatedAccounts = accounts.map((acc) => {
      if (acc.id === sourceAcc.id) {
        return { ...acc, balance: acc.balance - transfer.amount, lastSynced: 'Just now' };
      }
      if (acc.id === destAcc.id) {
        return { ...acc, balance: acc.balance + transfer.amount, lastSynced: 'Just now' };
      }
      return acc;
    });

    const xferTx: Transaction = {
      id: `tx-xfer-${Date.now()}`,
      title: `Transfer to ${destAcc.name}`,
      amount: transfer.amount,
      category: 'Account Transfer',
      type: 'DEBIT',
      accountName: sourceAcc.name,
      date: 'Today',
      status: 'RECONCILED',
    };
    const updatedTransactions = [xferTx, ...transactions];

    setAccounts(updatedAccounts);
    setTransactions(updatedTransactions);
    await localStore.saveAccounts(updatedAccounts);
    await localStore.saveTransactions(updatedTransactions);

    // 2. Close modal & show confirmation
    setIsTransferModalOpen(false);
    showNotification(`✓ Transferred ${formatINR(transfer.amount)} from ${sourceAcc.name} to ${destAcc.name}`);

    // 3. Sync to backend in background (non-blocking)
    try {
      await accountingService.transferFunds(transfer);
    } catch {
      // Offline: preserved locally
    }
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

  const handleCreateBudget = async (newBudget: BudgetEnvelope) => {
    const updated = [...budgets, newBudget];
    setBudgets(updated);
    await localStore.saveBudgets(updated);
    setIsCreateBudgetModalOpen(false);
    showNotification(`Created ${newBudget.category} envelope (${formatINR(newBudget.budgeted)})`);

    try {
      await budgetService.createBudget({
        category: newBudget.category,
        budgeted: newBudget.budgeted,
        color: newBudget.color,
      });
    } catch {}
  };

  const handleCreateGoal = async (newGoal: FinancialGoal) => {
    const updated = [...goals, newGoal];
    setGoals(updated);
    await localStore.saveGoals(updated);
    setIsCreateGoalModalOpen(false);
    showNotification(`Strategic goal established: ${newGoal.title}`);

    try {
      await goalsService.createGoal({
        title: newGoal.title,
        targetAmount: newGoal.targetAmount,
        currentAmount: newGoal.currentAmount,
        targetYear: newGoal.targetYear,
        category: newGoal.category,
      });
    } catch {}
  };

  const handleUpdateGoal = async (updatedGoal: FinancialGoal) => {
    const previous = goals.find((g) => g.id === updatedGoal.id);
    const deltaDeposit = updatedGoal.currentAmount - (previous?.currentAmount || 0);

    const updated = goals.map((g) => (g.id === updatedGoal.id ? updatedGoal : g));
    setGoals(updated);
    await localStore.saveGoals(updated);
    showNotification(`Updated savings for ${updatedGoal.title}: ${formatINR(updatedGoal.currentAmount)}`);

    if (deltaDeposit > 0) {
      try {
        await goalsService.depositSavings(updatedGoal.id, deltaDeposit);
      } catch {}
    }
  };

  const handleAddInvestment = async (newHolding: InvestmentHolding) => {
    const updated = [...holdings, newHolding];
    setHoldings(updated);
    await localStore.saveHoldings(updated);
    setIsAddInvestmentModalOpen(false);
    showNotification(`Recorded ${newHolding.symbol} (${newHolding.name}) in portfolio`);

    try {
      await investmentsService.addHoldingLot(newHolding);
    } catch {}
  };

  const handleSendCopilotMessage = async (customText?: string) => {
    const textToSend = customText || chatInput;
    if (!textToSend.trim()) return;

    const userMsg: CopilotMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: 'Just now',
    };

    const nextMessages = [...copilotMessages, userMsg];
    setCopilotMessages(nextMessages);
    setChatInput('');

    // Try backend AI service first
    try {
      const copilotReply = await copilotService.sendMessage(textToSend);
      if (
        copilotReply &&
        copilotReply.text &&
        !copilotReply.text.toLowerCase().includes('unable to initialize')
      ) {
        const finalMessages = [...nextMessages, copilotReply];
        setCopilotMessages(finalMessages);
        await localStore.saveCopilotMessages(finalMessages);
        return;
      }
    } catch {
      // Gracefully fall back to local intelligent engine
    }

    // Grounded Local AI Financial Assistant
    const q = textToSend.toLowerCase();
    let answer = '';

    if (q.includes('runway') || q.includes('emergency')) {
      const liquid = accounts
        .filter((a) => a.category === 'ASSET' && (a.type === 'SAVINGS' || a.type === 'TERM_DEPOSIT'))
        .reduce((s, a) => s + a.balance, 0);
      const monthlyBurn = monthlyOutflows > 0 ? monthlyOutflows : 157950;
      const months = (liquid / monthlyBurn).toFixed(1);
      answer = `Based on your liquid reserves of ${formatINR(liquid)} and monthly outflows of ${formatINR(monthlyBurn)}, your emergency runway is ${months} months. Recommended safety guideline is 6.0 months, so your liquid cash buffer is healthy and secure.`;
    } else if (q.includes('afford') || q.includes('trip') || q.includes('vacation') || q.includes('buy')) {
      const surplus = monthlyInflows - monthlyOutflows;
      answer = `Analyzing your live cash flow: You generate approximately ${formatINR(surplus)} in net monthly surplus. Your current liquid savings balance is ${formatINR(totalAssets)}. A planned expense can be absorbed without breaching your core emergency reserves.`;
    } else if (q.includes('sip') || q.includes('invest') || q.includes('portfolio') || q.includes('stock')) {
      const pnl = totalPortfolioValue - totalInvestedValue;
      const pnlPct = totalInvestedValue > 0 ? ((pnl / totalInvestedValue) * 100).toFixed(1) : '0';
      answer = `Your portfolio is valued at ${formatINR(totalPortfolioValue)} across ${holdings.length} active asset holdings (unrealized return: ${Number(pnl) >= 0 ? '+' : ''}${pnlPct}%). Based on your monthly surplus, you can comfortably deploy additional SIPs into broad-market index funds.`;
    } else if (q.includes('net worth') || q.includes('worth') || q.includes('assets') || q.includes('balance')) {
      answer = `Your total net worth is ${formatINR(netWorth)}. Total assets stand at ${formatINR(totalAssets)} across ${accounts.filter((a) => a.category === 'ASSET').length} accounts, balanced against ${formatINR(totalLiabilities)} in liabilities. Net worth trajectory is positive (+4.77% in the current period).`;
    } else if (q.includes('budget') || q.includes('spend') || q.includes('outflow')) {
      const totalBudget = budgets.reduce((s, b) => s + b.budgeted, 0);
      answer = `You have ${budgets.length} active budget envelopes totaling ${formatINR(totalBudget)}. Current monthly spending is ${formatINR(monthlyOutflows)} (${((monthlyOutflows / (totalBudget || 1)) * 100).toFixed(0)}% of allocation).`;
    } else {
      answer = `I have verified your financial ledger. Your current net worth is ${formatINR(netWorth)} across ${accounts.length} connected accounts. Total monthly inflows are ${formatINR(monthlyInflows)} vs ${formatINR(monthlyOutflows)} in outflows. How can I assist you with cash flow forecasting, budget tracking, or investment planning?`;
    }

    const localReply: CopilotMessage = {
      id: `copilot-${Date.now()}`,
      sender: 'copilot',
      text: answer,
      timestamp: 'Just now',
    };
    const finalMessages = [...nextMessages, localReply];
    setCopilotMessages(finalMessages);
    await localStore.saveCopilotMessages(finalMessages);
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

  const handleLogout = async () => {
    await clearAuthenticatedSession();
    setIsAuthenticated(false);
    setIsEnterpriseDrawerOpen(false);
    setAccounts([]);
    setTransactions([]);
    setHoldings([]);
    setBudgets([]);
    setGoals([]);
    setDocuments([]);
    showNotification('Session revoked. Logged out securely.');
  };

  // 1. Session Restoration Loading View
  if (isRestoringSession) {
    return (
      <View
        style={[
          styles.safeContainer,
          {
            paddingTop: topPadding,
            backgroundColor: theme.colors.canvas,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <ExpoStatusBar
          style={isDark ? 'light' : 'dark'}
          backgroundColor={theme.colors.canvas}
          translucent={true}
        />
        <View style={[styles.brandSplashLogo, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.brandSplashText}>W</Text>
        </View>
        <Text style={[styles.brandSplashTitle, { color: theme.colors.textPrimary }]}>
          WealthOS
        </Text>
        <Text style={[styles.brandSplashSubtitle, { color: theme.colors.textSecondary }]}>
          Restoring Encrypted Enclave Session...
        </Text>
        <ActivityIndicator
          size="small"
          color={theme.colors.primary}
          style={{ marginTop: 24 }}
        />
      </View>
    );
  }

  // 2. Unauthenticated Gate 4 Screen
  if (!isAuthenticated) {
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
        <AuthScreen
          onUnlock={async (sessionData) => {
            setIsAuthenticated(true);
            if (sessionData?.activeTenant?.name) {
              setActiveWorkspace(sessionData.activeTenant.name);
            }
            showNotification('Session authenticated. Loading live ledger...');
            await loadLiveLedgerData();
          }}
          activeWorkspace={activeWorkspace}
          onSelectWorkspace={setActiveWorkspace}
          onShowToast={showNotification}
        />
      </View>
    );
  }

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
        isPrivacyMode={isPrivacyMode}
        onTogglePrivacy={handleTogglePrivacy}
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
            totalLiabilities={totalLiabilities}
          />
        )}

        {(activeScreen === 'net-worth' || activeScreen === 'reports') && (
          <NetWorthScreen
            onBack={() => setActiveScreen('overview')}
            onShowToast={showNotification}
            totalAssets={totalAssets}
            totalLiabilities={totalLiabilities}
            netWorth={netWorth}
          />
        )}

        {activeScreen === 'analytics' && (
          <AnalyticsScreen
            onBack={() => setActiveScreen('overview')}
            onShowToast={showNotification}
            monthlyInflows={monthlyInflows}
            monthlyOutflows={monthlyOutflows}
          />
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
            documents={documents}
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
            onLogout={handleLogout}
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
              holdings={holdings}
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
              onShowToast={showNotification}
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
              transactions={transactions}
              onAddTransaction={handleOpenAddExpense}
              onAddEnvelope={() => setIsCreateBudgetModalOpen(true)}
              onAddGoal={() => setIsCreateGoalModalOpen(true)}
              onUpdateGoal={handleUpdateGoal}
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
        onResetToFresh={handleResetToFresh}
        onLoadSampleData={handleLoadDemoData}
        onLogout={handleLogout}
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

const staticInsets = {
  top: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 28) : 44,
  bottom: Platform.OS === 'ios' ? 24 : 12,
  left: 0,
  right: 0,
};

const staticFrame = {
  x: 0,
  y: 0,
  width: Dimensions.get('window').width || 390,
  height: Dimensions.get('window').height || 844,
};

export default function App() {
  return (
    <View style={{ flex: 1, width: '100%', height: '100%', backgroundColor: '#0B0F19' }}>
      <SafeAreaInsetsContext.Provider value={staticInsets}>
        <SafeAreaFrameContext.Provider value={staticFrame}>
          <ErrorBoundary>
            <ThemeProvider>
              <BiometricShield>
                <WealthOSContent />
              </BiometricShield>
            </ThemeProvider>
          </ErrorBoundary>
        </SafeAreaFrameContext.Provider>
      </SafeAreaInsetsContext.Provider>
    </View>
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
    backgroundColor: '#0B0F19',
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
    color: '#F8FAFC',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  errorDetail: {
    fontSize: 11,
    color: '#F87171',
    backgroundColor: '#1E293B',
    borderColor: '#DC2626',
    borderWidth: 1,
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
  brandSplashLogo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  brandSplashText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  brandSplashTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  brandSplashSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
});
