import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import {
  INITIAL_ACCOUNTS,
  INITIAL_TRANSACTIONS,
  INITIAL_HOLDINGS,
  INITIAL_BUDGETS,
  INITIAL_GOALS,
  INITIAL_COPILOT_MESSAGES,
} from './src/data';
import {
  TabType,
  BankAccount,
  Transaction,
  InvestmentHolding,
  BudgetEnvelope,
  FinancialGoal,
  CopilotMessage,
} from './src/types';

export function formatINR(val: number): string {
  const isNegative = val < 0;
  const absVal = Math.abs(val);
  const parts = absVal.toFixed(2).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return `${isNegative ? '-' : ''}₹${formatted}.${decimalPart}`;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
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

  // Modals
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);

  // New Account Form State
  const [newAccBank, setNewAccBank] = useState('HDFC Bank');
  const [newAccType, setNewAccType] = useState<'SAVINGS' | 'TERM_DEPOSIT' | 'DEMAT' | 'LOAN' | 'CREDIT_CARD'>('SAVINGS');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccMask, setNewAccMask] = useState('•••• 6720');

  // New Transaction Form State
  const [newTxTitle, setNewTxTitle] = useState('');
  const [newTxAmount, setNewTxAmount] = useState('');
  const [newTxCategory, setNewTxCategory] = useState('Food & Dining');
  const [newTxType, setNewTxType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');

  // Selected Filter States
  const [accountFilter, setAccountFilter] = useState<'ALL' | 'ASSET' | 'LIABILITY'>('ALL');
  const [holdingFilter, setHoldingFilter] = useState<'ALL' | 'EQUITY' | 'MUTUAL_FUND' | 'GOLD'>('ALL');

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
  const totalPortfolioPnl = totalPortfolioValue - totalInvestedValue;
  const portfolioPnlPercentage = totalInvestedValue > 0 ? (totalPortfolioPnl / totalInvestedValue) * 100 : 0;

  const monthlyInflows = transactions
    .filter((t) => t.type === 'CREDIT')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyOutflows = transactions
    .filter((t) => t.type === 'DEBIT')
    .reduce((sum, t) => sum + t.amount, 0);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      showNotification('Ledger synchronized across 6 institutions');
    }, 800);
  };

  // Handlers
  const handleAddAccount = () => {
    const bal = parseFloat(newAccBalance) || 50000;
    const isLiability = newAccType === 'LOAN' || newAccType === 'CREDIT_CARD';
    const newAcc: BankAccount = {
      id: `acc-${Date.now()}`,
      name: `${newAccBank} ${newAccType === 'SAVINGS' ? 'Savings' : newAccType}`,
      institution: newAccBank,
      accountNumberMask: newAccMask || '•••• 0000',
      type: newAccType,
      category: isLiability ? 'LIABILITY' : 'ASSET',
      balance: bal,
      currency: 'INR',
      status: 'ACTIVE',
      lastSynced: 'Just now',
    };

    setAccounts([newAcc, ...accounts]);
    setIsConnectModalOpen(false);
    setNewAccBalance('');
    showNotification(`Connected ${newAcc.name} (${formatINR(bal)})`);
  };

  const handleAddTransaction = () => {
    const amt = parseFloat(newTxAmount);
    if (!amt || !newTxTitle) {
      alert('Please enter a description and amount');
      return;
    }

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      title: newTxTitle,
      category: newTxCategory,
      amount: amt,
      type: newTxType,
      accountName: accounts[0]?.name || 'Primary Account',
      date: 'Today',
      status: 'SETTLED',
    };

    // Update account balance
    setAccounts((prev) =>
      prev.map((acc, idx) => {
        if (idx === 0) {
          const delta = newTxType === 'CREDIT' ? amt : -amt;
          return { ...acc, balance: acc.balance + delta };
        }
        return acc;
      })
    );

    setTransactions([newTx, ...transactions]);
    setIsAddTxModalOpen(false);
    setNewTxTitle('');
    setNewTxAmount('');
    showNotification(`Recorded ${newTxType === 'CREDIT' ? '+' : '-'}${formatINR(amt)} for ${newTxTitle}`);
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
    }, 600);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="light" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>W</Text>
          </View>
          <View>
            <View style={styles.brandRow}>
              <Text style={styles.brandTitle}>
                WEALTH<Text style={styles.brandAccent}>OS</Text>
              </Text>
              <View style={styles.workspacePill}>
                <Text style={styles.workspacePillText}>PERSONAL · INR</Text>
              </View>
            </View>
            <Text style={styles.brandSubtitle}>ENTERPRISE FINANCIAL INTELLIGENCE</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.headerAddButton}
          onPress={() => setIsAddTxModalOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.headerAddButtonText}>+ Entry</Text>
        </TouchableOpacity>
      </View>

      {/* Instant Notification Banner */}
      {notification && (
        <View style={styles.notificationBanner}>
          <Text style={styles.notificationText}>✓ {notification}</Text>
        </View>
      )}

      {/* Main Screen Content */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#818CF8" />
        }
      >
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            {/* Total Net Worth Card */}
            <View style={styles.netWorthCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.netWorthLabel}>TOTAL NET WORTH</Text>
                <View style={styles.changeBadge}>
                  <Text style={styles.changeBadgeText}>+₹3,72,400 (+5.2%) MoM</Text>
                </View>
              </View>

              <Text style={styles.netWorthValue}>{formatINR(netWorth)}</Text>

              <View style={styles.assetLiabilityRow}>
                <View style={styles.subStatBox}>
                  <Text style={styles.subStatLabel}>TOTAL ASSETS</Text>
                  <Text style={styles.assetStatValue}>{formatINR(totalAssets)}</Text>
                  <Text style={styles.subStatHelp}>6 Accounts & Portfolios</Text>
                </View>

                <View style={styles.subStatDivider} />

                <View style={styles.subStatBox}>
                  <Text style={styles.subStatLabel}>LIABILITIES</Text>
                  <Text style={styles.liabilityStatValue}>{formatINR(totalLiabilities)}</Text>
                  <Text style={styles.subStatHelp}>Home Loan & Card</Text>
                </View>
              </View>
            </View>

            {/* Quick Action Buttons */}
            <View style={styles.quickActionGrid}>
              <TouchableOpacity
                style={styles.quickActionBtnPrimary}
                onPress={() => setIsConnectModalOpen(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.quickActionIcon}>🏦</Text>
                <Text style={styles.quickActionPrimaryText}>Connect Bank</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionBtnSecondary}
                onPress={() => setIsImportModalOpen(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.quickActionIcon}>📄</Text>
                <Text style={styles.quickActionSecondaryText}>Import CAS/PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionBtnSecondary}
                onPress={() => setIsAddTxModalOpen(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.quickActionIcon}>➕</Text>
                <Text style={styles.quickActionSecondaryText}>Add Entry</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionBtnSecondary}
                onPress={() => setActiveTab('copilot')}
                activeOpacity={0.8}
              >
                <Text style={styles.quickActionIcon}>🤖</Text>
                <Text style={styles.quickActionSecondaryText}>Ask Copilot</Text>
              </TouchableOpacity>
            </View>

            {/* Monthly Cash Flow Card */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardSectionTitle}>MONTHLY CASH FLOW (NOV 2026)</Text>
                <Text style={styles.cashflowSurplus}>
                  Surplus: +{formatINR(monthlyInflows - monthlyOutflows)}
                </Text>
              </View>

              <View style={styles.cashflowBarContainer}>
                <View style={styles.cashflowMetric}>
                  <Text style={styles.cashflowInflowLabel}>Inflows (+)</Text>
                  <Text style={styles.cashflowInflowValue}>{formatINR(monthlyInflows)}</Text>
                </View>
                <View style={styles.cashflowMetric}>
                  <Text style={styles.cashflowOutflowLabel}>Outflows (-)</Text>
                  <Text style={styles.cashflowOutflowValue}>{formatINR(monthlyOutflows)}</Text>
                </View>
              </View>

              {/* Visual Proportion Bar */}
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(
                        100,
                        monthlyInflows > 0 ? (monthlyOutflows / monthlyInflows) * 100 : 50
                      )}%`,
                      backgroundColor: '#EF4444',
                    },
                  ]}
                />
              </View>
              <Text style={styles.cashflowHelper}>
                Outflow is {((monthlyOutflows / (monthlyInflows || 1)) * 100).toFixed(1)}% of total monthly income.
              </Text>
            </View>

            {/* Financial Health & Solvency Card */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardSectionTitle}>FINANCIAL HEALTH SCORE</Text>
                <View style={styles.scorePill}>
                  <Text style={styles.scorePillText}>88 / 100 · EXCELLENT</Text>
                </View>
              </View>

              <View style={styles.healthMetricGrid}>
                <View style={styles.healthMetricBox}>
                  <Text style={styles.healthMetricVal}>6.2 Mos</Text>
                  <Text style={styles.healthMetricName}>Emergency Runway</Text>
                </View>
                <View style={styles.healthMetricBox}>
                  <Text style={styles.healthMetricVal}>18.2%</Text>
                  <Text style={styles.healthMetricName}>Debt-to-Income</Text>
                </View>
                <View style={styles.healthMetricBox}>
                  <Text style={styles.healthMetricVal}>79.9%</Text>
                  <Text style={styles.healthMetricName}>Solvency Ratio</Text>
                </View>
              </View>
            </View>

            {/* Recent Activity Ledger Preview */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardSectionTitle}>RECENT SETTLED TRANSACTIONS</Text>
                <TouchableOpacity onPress={() => setActiveTab('accounts')}>
                  <Text style={styles.cardActionLink}>View All ({transactions.length})</Text>
                </TouchableOpacity>
              </View>

              {transactions.slice(0, 4).map((tx) => (
                <View key={tx.id} style={styles.txRow}>
                  <View style={styles.txLeft}>
                    <View
                      style={[
                        styles.txIconBadge,
                        { backgroundColor: tx.type === 'CREDIT' ? '#064E3B' : '#7F1D1D' },
                      ]}
                    >
                      <Text style={styles.txIconText}>{tx.type === 'CREDIT' ? '↓' : '↑'}</Text>
                    </View>
                    <View>
                      <Text style={styles.txTitle}>{tx.title}</Text>
                      <Text style={styles.txSubtitle}>
                        {tx.category} · {tx.date}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: tx.type === 'CREDIT' ? '#34D399' : '#F87171' },
                    ]}
                  >
                    {tx.type === 'CREDIT' ? '+' : '-'}
                    {formatINR(tx.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* TAB 2: ACCOUNTS */}
        {activeTab === 'accounts' && (
          <View style={styles.tabContent}>
            {/* Filter Chips */}
            <View style={styles.filterChipRow}>
              {(['ALL', 'ASSET', 'LIABILITY'] as const).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterChip,
                    accountFilter === filter && styles.filterChipActive,
                  ]}
                  onPress={() => setAccountFilter(filter)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      accountFilter === filter && styles.filterChipTextActive,
                    ]}
                  >
                    {filter === 'ALL' ? 'All Accounts' : filter === 'ASSET' ? 'Assets & Banks' : 'Liabilities & Debt'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Accounts List */}
            {accounts
              .filter((a) => accountFilter === 'ALL' || a.category === accountFilter)
              .map((acc) => (
                <View key={acc.id} style={styles.accountCard}>
                  <View style={styles.accountHeader}>
                    <View style={styles.accountTitleRow}>
                      <Text style={styles.accountName}>{acc.name}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: acc.category === 'ASSET' ? '#064E3B' : '#7F1D1D' },
                        ]}
                      >
                        <Text style={styles.statusBadgeText}>
                          {acc.category === 'ASSET' ? 'ASSET' : 'LIABILITY'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.accountInstitution}>
                      {acc.institution} · {acc.accountNumberMask}
                    </Text>
                  </View>

                  <View style={styles.accountBody}>
                    <Text
                      style={[
                        styles.accountBalance,
                        { color: acc.category === 'ASSET' ? '#34D399' : '#F87171' },
                      ]}
                    >
                      {formatINR(acc.balance)}
                    </Text>
                    {acc.interestRate && (
                      <Text style={styles.accountRate}>Rate: {acc.interestRate}% p.a.</Text>
                    )}
                  </View>

                  <View style={styles.accountFooter}>
                    <Text style={styles.accountSync}>Synced: {acc.lastSynced}</Text>
                    <Text style={styles.accountStatus}>Verified Active</Text>
                  </View>
                </View>
              ))}

            <TouchableOpacity
              style={styles.fullWidthAddButton}
              onPress={() => setIsConnectModalOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.fullWidthAddButtonText}>+ Connect Another Bank or Demat</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TAB 3: INVESTMENTS / PORTFOLIO */}
        {activeTab === 'investments' && (
          <View style={styles.tabContent}>
            {/* Portfolio Summary Card */}
            <View style={styles.portfolioSummaryCard}>
              <Text style={styles.portfolioHeaderLabel}>INVESTMENT PORTFOLIO VALUE</Text>
              <Text style={styles.portfolioHeaderValue}>{formatINR(totalPortfolioValue)}</Text>

              <View style={styles.portfolioPnlRow}>
                <Text style={styles.portfolioPnlText}>
                  Total P&L: {totalPortfolioPnl >= 0 ? '+' : ''}
                  {formatINR(totalPortfolioPnl)} ({portfolioPnlPercentage.toFixed(2)}%)
                </Text>
              </View>

              <View style={styles.portfolioInvestedRow}>
                <Text style={styles.portfolioInvestedText}>
                  Invested Capital: {formatINR(totalInvestedValue)}
                </Text>
              </View>
            </View>

            {/* Filter Chips */}
            <View style={styles.filterChipRow}>
              {(['ALL', 'EQUITY', 'MUTUAL_FUND', 'GOLD'] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.filterChip,
                    holdingFilter === cat && styles.filterChipActive,
                  ]}
                  onPress={() => setHoldingFilter(cat)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      holdingFilter === cat && styles.filterChipTextActive,
                    ]}
                  >
                    {cat === 'ALL' ? 'All Holdings' : cat === 'MUTUAL_FUND' ? 'Mutual Funds' : cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Holdings List */}
            {holdings
              .filter((h) => holdingFilter === 'ALL' || h.type === holdingFilter)
              .map((holding) => (
                <View key={holding.id} style={styles.holdingCard}>
                  <View style={styles.holdingTopRow}>
                    <View style={styles.holdingTitleContainer}>
                      <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
                      <Text style={styles.holdingName}>{holding.name}</Text>
                    </View>
                    <View style={styles.holdingValueContainer}>
                      <Text style={styles.holdingCurrentValue}>{formatINR(holding.currentValue)}</Text>
                      <Text
                        style={[
                          styles.holdingPnl,
                          { color: holding.pnl >= 0 ? '#34D399' : '#F87171' },
                        ]}
                      >
                        {holding.pnl >= 0 ? '+' : ''}
                        {formatINR(holding.pnl)} ({holding.pnlPercentage.toFixed(1)}%)
                      </Text>
                    </View>
                  </View>

                  <View style={styles.holdingDetailRow}>
                    <Text style={styles.holdingDetailText}>
                      Qty: {holding.quantity} · Avg: ₹{holding.avgBuyPrice.toFixed(1)} · LTP: ₹{holding.currentPrice.toFixed(1)}
                    </Text>
                    <View style={styles.fifoLotPill}>
                      <Text style={styles.fifoLotPillText}>{holding.fifoLotAge}</Text>
                    </View>
                  </View>
                </View>
              ))}
          </View>
        )}

        {/* TAB 4: BUDGETS & GOALS */}
        {activeTab === 'budgets' && (
          <View style={styles.tabContent}>
            {/* Monthly Budget Summary */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardSectionTitle}>MONTHLY BUDGET UTILIZATION</Text>
                <Text style={styles.budgetPercent}>
                  {(
                    (budgets.reduce((s, b) => s + b.spent, 0) /
                      (budgets.reduce((s, b) => s + b.budgeted, 0) || 1)) *
                    100
                  ).toFixed(1)}
                  %
                </Text>
              </View>

              <Text style={styles.budgetBigValue}>
                {formatINR(budgets.reduce((s, b) => s + b.spent, 0))}
                <Text style={styles.budgetSubText}>
                  {' '}
                  / {formatINR(budgets.reduce((s, b) => s + b.budgeted, 0))}
                </Text>
              </Text>

              <Text style={styles.budgetHelp}>
                ₹{formatINR(budgets.reduce((s, b) => s + b.budgeted, 0) - budgets.reduce((s, b) => s + b.spent, 0)).replace('₹', '')} remaining safe to spend for the cycle.
              </Text>
            </View>

            {/* Envelopes */}
            <Text style={styles.sectionHeaderTitle}>Spending Envelopes</Text>
            {budgets.map((envelope) => {
              const pct = Math.min(100, (envelope.spent / envelope.budgeted) * 100);
              return (
                <View key={envelope.id} style={styles.envelopeCard}>
                  <View style={styles.envelopeHeader}>
                    <Text style={styles.envelopeCategory}>{envelope.category}</Text>
                    <Text style={styles.envelopeAmounts}>
                      {formatINR(envelope.spent)} / {formatINR(envelope.budgeted)}
                    </Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${pct}%`,
                          backgroundColor: pct > 95 ? '#EF4444' : pct > 80 ? '#F59E0B' : '#10B981',
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}

            {/* Financial Goals */}
            <Text style={styles.sectionHeaderTitle}>Strategic Financial Goals</Text>
            {goals.map((goal) => {
              const goalPct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
              return (
                <View key={goal.id} style={styles.goalCard}>
                  <View style={styles.goalHeader}>
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                    <Text style={styles.goalTargetYear}>Target: {goal.targetYear}</Text>
                  </View>
                  <Text style={styles.goalValues}>
                    {formatINR(goal.currentAmount)} of {formatINR(goal.targetAmount)} ({goalPct.toFixed(1)}%)
                  </Text>
                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: `${goalPct}%`, backgroundColor: '#4F46E5' }]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* TAB 5: FINANCIAL COPILOT */}
        {activeTab === 'copilot' && (
          <View style={styles.tabContent}>
            {/* Copilot Header Card */}
            <View style={styles.copilotHeaderCard}>
              <Text style={styles.copilotBadge}>AI FINANCIAL ADVISOR</Text>
              <Text style={styles.copilotTitle}>WealthOS Autonomous Intelligence</Text>
              <Text style={styles.copilotSubtitle}>
                Grounded in your active accounts, FIFO investment lots, and statutory tax rules.
              </Text>
            </View>

            {/* Quick Prompts */}
            <Text style={styles.quickPromptLabel}>Suggested Inquiries:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promptScroll}>
              <TouchableOpacity
                style={styles.promptChip}
                onPress={() => handleSendCopilotMessage('What is my current emergency fund runway?')}
              >
                <Text style={styles.promptChipText}>🛡️ Check Emergency Runway</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.promptChip}
                onPress={() => handleSendCopilotMessage('Can I afford a ₹1,50,000 vacation?')}
              >
                <Text style={styles.promptChipText}>✈️ Afford ₹1.5L Vacation?</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.promptChip}
                onPress={() => handleSendCopilotMessage('How much surplus can I deploy into SIPs?')}
              >
                <Text style={styles.promptChipText}>📈 Optimal Monthly SIP?</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.promptChip}
                onPress={() => handleSendCopilotMessage('Verify ledger reconciliation balance')}
              >
                <Text style={styles.promptChipText}>⚖️ Verify Ledger Sigma</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Chat Messages */}
            <View style={styles.chatContainer}>
              {copilotMessages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.chatBubble,
                    msg.sender === 'user' ? styles.userBubble : styles.copilotBubble,
                  ]}
                >
                  <Text style={styles.chatSender}>
                    {msg.sender === 'user' ? 'YOU' : 'WEALTHOS COPILOT'} · {msg.timestamp}
                  </Text>
                  <Text style={styles.chatText}>{msg.text}</Text>

                  {msg.metrics && (
                    <View style={styles.chatMetricsContainer}>
                      {msg.metrics.map((m, idx) => (
                        <View key={idx} style={styles.chatMetricPill}>
                          <Text style={styles.chatMetricLabel}>{m.label}</Text>
                          <Text style={styles.chatMetricValue}>{m.value}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Chat Input Bar */}
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatTextInput}
                placeholder="Ask about cashflow, taxes, or holdings..."
                placeholderTextColor="#64748B"
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={() => handleSendCopilotMessage()}
              />
              <TouchableOpacity
                style={styles.chatSendBtn}
                onPress={() => handleSendCopilotMessage()}
                activeOpacity={0.8}
              >
                <Text style={styles.chatSendBtnText}>Ask</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'overview' && styles.navItemActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={styles.navIcon}>📊</Text>
          <Text style={[styles.navLabel, activeTab === 'overview' && styles.navLabelActive]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'accounts' && styles.navItemActive]}
          onPress={() => setActiveTab('accounts')}
        >
          <Text style={styles.navIcon}>🏦</Text>
          <Text style={[styles.navLabel, activeTab === 'accounts' && styles.navLabelActive]}>
            Accounts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'investments' && styles.navItemActive]}
          onPress={() => setActiveTab('investments')}
        >
          <Text style={styles.navIcon}>📈</Text>
          <Text style={[styles.navLabel, activeTab === 'investments' && styles.navLabelActive]}>
            Portfolio
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'budgets' && styles.navItemActive]}
          onPress={() => setActiveTab('budgets')}
        >
          <Text style={styles.navIcon}>🎯</Text>
          <Text style={[styles.navLabel, activeTab === 'budgets' && styles.navLabelActive]}>
            Budgets
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'copilot' && styles.navItemActive]}
          onPress={() => setActiveTab('copilot')}
        >
          <Text style={styles.navIcon}>🤖</Text>
          <Text style={[styles.navLabel, activeTab === 'copilot' && styles.navLabelActive]}>
            Copilot
          </Text>
        </TouchableOpacity>
      </View>

      {/* MODAL 1: Connect Account */}
      <Modal visible={isConnectModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Connect Financial Institution</Text>
            <Text style={styles.modalSubtitle}>
              Link via Account Aggregator or direct API to track balances automatically.
            </Text>

            <Text style={styles.inputLabel}>Select Institution</Text>
            <View style={styles.bankPickerGrid}>
              {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra', 'Zerodha'].map(
                (bank) => (
                  <TouchableOpacity
                    key={bank}
                    style={[styles.bankChoice, newAccBank === bank && styles.bankChoiceActive]}
                    onPress={() => setNewAccBank(bank)}
                  >
                    <Text
                      style={[
                        styles.bankChoiceText,
                        newAccBank === bank && styles.bankChoiceTextActive,
                      ]}
                    >
                      {bank}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            <Text style={styles.inputLabel}>Account Category</Text>
            <View style={styles.typeChoiceRow}>
              {(['SAVINGS', 'TERM_DEPOSIT', 'DEMAT', 'CREDIT_CARD', 'LOAN'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChoicePill, newAccType === t && styles.typeChoicePillActive]}
                  onPress={() => setNewAccType(t)}
                >
                  <Text
                    style={[
                      styles.typeChoiceText,
                      newAccType === t && styles.typeChoiceTextActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Current Balance (INR)</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="e.g. 75000"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              value={newAccBalance}
              onChangeText={setNewAccBalance}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsConnectModalOpen(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleAddAccount}>
                <Text style={styles.modalSubmitBtnText}>Connect & Reconcile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Import Statement */}
      <Modal visible={isImportModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Import Financial Statement</Text>
            <Text style={styles.modalSubtitle}>
              Universal document engine with automated OCR line-item extraction.
            </Text>

            <View style={styles.uploadDropZone}>
              <Text style={styles.uploadDropZoneIcon}>📄</Text>
              <Text style={styles.uploadDropZoneTitle}>Select Statement (PDF / CAS / CSV)</Text>
              <Text style={styles.uploadDropZoneHelp}>
                Supported: Bank E-Statements, CAMS CAS, KFintech, Zerodha P&L
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsImportModalOpen(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSimulateImport}>
                <Text style={styles.modalSubmitBtnText}>Parse & Reconcile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Add Transaction */}
      <Modal visible={isAddTxModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Record Ledger Entry</Text>
            <Text style={styles.modalSubtitle}>
              Instantly record an expense or income with double-entry precision.
            </Text>

            <View style={styles.typeChoiceRow}>
              <TouchableOpacity
                style={[styles.typeChoicePill, newTxType === 'DEBIT' && styles.debitPillActive]}
                onPress={() => setNewTxType('DEBIT')}
              >
                <Text style={styles.typeChoiceText}>Expense (Debit -)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeChoicePill, newTxType === 'CREDIT' && styles.creditPillActive]}
                onPress={() => setNewTxType('CREDIT')}
              >
                <Text style={styles.typeChoiceText}>Income (Credit +)</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Description / Payee</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="e.g. Swiggy Dining / Salary"
              placeholderTextColor="#64748B"
              value={newTxTitle}
              onChangeText={setNewTxTitle}
            />

            <Text style={styles.inputLabel}>Amount (INR)</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="e.g. 1500"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              value={newTxAmount}
              onChangeText={setNewTxAmount}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsAddTxModalOpen(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleAddTransaction}>
                <Text style={styles.modalSubmitBtnText}>Post to Ledger</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A10',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#172033',
    backgroundColor: '#0B0F19',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  brandAccent: {
    color: '#818CF8',
  },
  workspacePill: {
    backgroundColor: '#1E1B4B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  workspacePillText: {
    color: '#A5B4FC',
    fontSize: 9,
    fontWeight: '700',
  },
  brandSubtitle: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  headerAddButton: {
    backgroundColor: '#312E81',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4338CA',
  },
  headerAddButtonText: {
    color: '#E0E7FF',
    fontSize: 12,
    fontWeight: '700',
  },
  notificationBanner: {
    backgroundColor: '#065F46',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#047857',
  },
  notificationText: {
    color: '#D1FAE5',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  tabContent: {
    gap: 16,
  },
  netWorthCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  netWorthLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  changeBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  changeBadgeText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '700',
  },
  netWorthValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginVertical: 4,
  },
  assetLiabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  subStatBox: {
    flex: 1,
  },
  subStatDivider: {
    width: 1,
    height: 34,
    backgroundColor: '#1E293B',
    marginHorizontal: 12,
  },
  subStatLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  assetStatValue: {
    color: '#34D399',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  liabilityStatValue: {
    color: '#F87171',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  subStatHelp: {
    color: '#475569',
    fontSize: 9,
    marginTop: 2,
  },
  quickActionGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionBtnPrimary: {
    flex: 1,
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionPrimaryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  quickActionBtnSecondary: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  quickActionSecondaryText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  quickActionIcon: {
    fontSize: 16,
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardSectionTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  cardActionLink: {
    color: '#818CF8',
    fontSize: 11,
    fontWeight: '600',
  },
  cashflowSurplus: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
  },
  cashflowBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  cashflowMetric: {
    gap: 2,
  },
  cashflowInflowLabel: {
    color: '#64748B',
    fontSize: 11,
  },
  cashflowInflowValue: {
    color: '#34D399',
    fontSize: 18,
    fontWeight: '700',
  },
  cashflowOutflowLabel: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'right',
  },
  cashflowOutflowValue: {
    color: '#F87171',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  cashflowHelper: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 8,
  },
  scorePill: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scorePillText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '700',
  },
  healthMetricGrid: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  healthMetricBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  healthMetricVal: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  healthMetricName: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  txIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  txTitle: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '600',
  },
  txSubtitle: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  filterChipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1E293B',
  },
  filterChipActive: {
    backgroundColor: '#4F46E5',
  },
  filterChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  accountCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 10,
  },
  accountHeader: {
    gap: 4,
  },
  accountTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  accountInstitution: {
    color: '#64748B',
    fontSize: 11,
  },
  accountBody: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  accountBalance: {
    fontSize: 22,
    fontWeight: '800',
  },
  accountRate: {
    color: '#A5B4FC',
    fontSize: 11,
    fontWeight: '600',
  },
  accountFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  accountSync: {
    color: '#475569',
    fontSize: 10,
  },
  accountStatus: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '600',
  },
  fullWidthAddButton: {
    backgroundColor: '#1E1B4B',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4338CA',
    marginTop: 8,
  },
  fullWidthAddButtonText: {
    color: '#C7D2FE',
    fontSize: 13,
    fontWeight: '700',
  },
  portfolioSummaryCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  portfolioHeaderLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  portfolioHeaderValue: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    marginVertical: 4,
  },
  portfolioPnlRow: {
    marginTop: 2,
  },
  portfolioInvestedRow: {
    marginTop: 4,
  },
  portfolioPnlText: {
    color: '#34D399',
    fontSize: 14,
    fontWeight: '700',
  },
  portfolioInvestedText: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
  },
  holdingCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 8,
  },
  holdingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  holdingTitleContainer: {
    flex: 1,
  },
  holdingSymbol: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  holdingName: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  holdingValueContainer: {
    alignItems: 'flex-end',
  },
  holdingCurrentValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  holdingPnl: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  holdingDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  holdingDetailText: {
    color: '#94A3B8',
    fontSize: 10,
  },
  fifoLotPill: {
    backgroundColor: '#1E1B4B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fifoLotPillText: {
    color: '#A5B4FC',
    fontSize: 9,
    fontWeight: '600',
  },
  budgetPercent: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '700',
  },
  budgetBigValue: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
  },
  budgetSubText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '500',
  },
  budgetHelp: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 6,
  },
  sectionHeaderTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  envelopeCard: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 8,
  },
  envelopeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  envelopeCategory: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  envelopeAmounts: {
    color: '#94A3B8',
    fontSize: 11,
  },
  goalCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 6,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  goalTargetYear: {
    color: '#818CF8',
    fontSize: 11,
    fontWeight: '600',
  },
  goalValues: {
    color: '#94A3B8',
    fontSize: 11,
    marginVertical: 2,
  },
  copilotHeaderCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3730A3',
  },
  copilotBadge: {
    color: '#A5B4FC',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  copilotTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  copilotSubtitle: {
    color: '#C7D2FE',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  quickPromptLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  promptScroll: {
    flexDirection: 'row',
  },
  promptChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  promptChipText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  chatContainer: {
    gap: 12,
    marginTop: 8,
  },
  chatBubble: {
    padding: 14,
    borderRadius: 12,
    gap: 6,
  },
  userBubble: {
    backgroundColor: '#312E81',
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  copilotBubble: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignSelf: 'flex-start',
    maxWidth: '95%',
  },
  chatSender: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  chatText: {
    color: '#F8FAFC',
    fontSize: 13,
    lineHeight: 18,
  },
  chatMetricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  chatMetricPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chatMetricLabel: {
    color: '#64748B',
    fontSize: 9,
  },
  chatMetricValue: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
  },
  chatInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1E293B',
    fontSize: 13,
  },
  chatSendBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 8,
  },
  chatSendBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#0B0F19',
    borderTopWidth: 1,
    borderTopColor: '#172033',
    paddingVertical: 8,
    paddingBottom: 16,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  navItemActive: {
    opacity: 1,
  },
  navIcon: {
    fontSize: 18,
  },
  navLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  navLabelActive: {
    color: '#818CF8',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0B0F19',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
  },
  inputLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  bankPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  bankChoice: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#1E293B',
  },
  bankChoiceActive: {
    backgroundColor: '#4F46E5',
  },
  bankChoiceText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  bankChoiceTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  typeChoiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeChoicePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#1E293B',
  },
  typeChoicePillActive: {
    backgroundColor: '#4F46E5',
  },
  debitPillActive: {
    backgroundColor: '#B91C1C',
  },
  creditPillActive: {
    backgroundColor: '#047857',
  },
  typeChoiceText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  typeChoiceTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalTextInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1E293B',
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 13,
  },
  modalSubmitBtn: {
    flex: 2,
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  uploadDropZone: {
    borderWidth: 2,
    borderColor: '#3730A3',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#0F172A',
    gap: 6,
  },
  uploadDropZoneIcon: {
    fontSize: 32,
  },
  uploadDropZoneTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  uploadDropZoneHelp: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
  },
});
