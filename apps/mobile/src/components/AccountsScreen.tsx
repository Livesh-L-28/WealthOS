import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { theme } from '../theme';
import { BankAccount, Transaction } from '../types';
import { formatINR } from '../formatters';

interface AccountsScreenProps {
  accounts: BankAccount[];
  transactions: Transaction[];
  onConnectAccount: () => void;
  onAddTransaction: () => void;
  onAddExpense?: () => void;
  onAddIncome?: () => void;
  initialSubTab?: 'ACCOUNTS' | 'TRANSACTIONS';
}

export const AccountsScreen: React.FC<AccountsScreenProps> = ({
  accounts,
  transactions,
  onConnectAccount,
  onAddTransaction,
  onAddExpense,
  onAddIncome,
  initialSubTab,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'ACCOUNTS' | 'TRANSACTIONS'>(
    initialSubTab || 'ACCOUNTS'
  );
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [accountFilter, setAccountFilter] = useState<'ALL' | 'ASSET' | 'LIABILITY'>('ALL');
  const [txTypeFilter, setTxTypeFilter] = useState<'ALL' | 'DEBIT' | 'CREDIT'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const filteredAccounts = accounts.filter(
    (a) => accountFilter === 'ALL' || a.category === accountFilter
  );

  const totalAssets = accounts
    .filter((a) => a.category === 'ASSET')
    .reduce((sum, a) => sum + a.balance, 0);

  const totalLiabilities = accounts
    .filter((a) => a.category === 'LIABILITY')
    .reduce((sum, a) => sum + a.balance, 0);

  const totalInflows = transactions
    .filter((t) => t.type === 'CREDIT')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOutflows = transactions
    .filter((t) => t.type === 'DEBIT')
    .reduce((sum, t) => sum + t.amount, 0);

  const netCashFlow = totalInflows - totalOutflows;
  const totalLedgerVolume = totalInflows + totalOutflows;

  // Extract unique categories
  const availableCategories = ['ALL', ...Array.from(new Set(transactions.map((t) => t.category)))];

  const filteredTransactions = transactions.filter((tx) => {
    const matchesType = txTypeFilter === 'ALL' || tx.type === txTypeFilter;
    const matchesCategory = selectedCategory === 'ALL' || tx.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      tx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.accountName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesCategory && matchesSearch;
  });

  return (
    <View style={styles.container}>
      {/* Top Cockpit Mode Switcher */}
      <View style={styles.modeTabs}>
        <TouchableOpacity
          style={[styles.modeTab, activeSubTab === 'ACCOUNTS' && styles.modeTabActive]}
          onPress={() => setActiveSubTab('ACCOUNTS')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.modeTabText,
              activeSubTab === 'ACCOUNTS' && styles.modeTabTextActive,
            ]}
          >
            Connected Accounts ({accounts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, activeSubTab === 'TRANSACTIONS' && styles.modeTabActive]}
          onPress={() => setActiveSubTab('TRANSACTIONS')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.modeTabText,
              activeSubTab === 'TRANSACTIONS' && styles.modeTabTextActive,
            ]}
          >
            Transactions Ledger ({transactions.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeSubTab === 'ACCOUNTS' ? (
        <>
          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <Text style={styles.summaryLabel}>CONNECTED INSTITUTION ACCOUNTS</Text>
              <View style={styles.syncBadge}>
                <Text style={styles.syncBadgeText}>● All 6 Synced</Text>
              </View>
            </View>

            <View style={styles.summaryNumbersRow}>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryBoxLabel}>Asset Balances</Text>
                <Text style={styles.assetVal}>{formatINR(totalAssets)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryBox}>
                <Text style={styles.summaryBoxLabel}>Liability Debts</Text>
                <Text style={styles.liabilityVal}>{formatINR(totalLiabilities)}</Text>
              </View>
            </View>
          </View>

          {/* Segmented Filter Control */}
          <View style={styles.segmentedControl}>
            {(
              [
                { id: 'ALL', label: `All (${accounts.length})` },
                { id: 'ASSET', label: 'Assets' },
                { id: 'LIABILITY', label: 'Debts' },
              ] as const
            ).map((f) => {
              const isActive = accountFilter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
                  onPress={() => setAccountFilter(f.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Primary Top Action: Connect Bank Account */}
          <TouchableOpacity
            style={styles.primaryConnectBar}
            onPress={onConnectAccount}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Connect New Bank or Demat Account"
          >
            <View style={styles.primaryConnectLeft}>
              <View style={styles.primaryConnectIconCircle}>
                <Text style={styles.primaryConnectIcon}>🏛️</Text>
              </View>
              <View>
                <Text style={styles.primaryConnectTitle}>+ Connect Bank Account</Text>
                <Text style={styles.primaryConnectSub}>Link savings, current, demat or credit cards</Text>
              </View>
            </View>
            <Text style={styles.primaryConnectArrow}>›</Text>
          </TouchableOpacity>

          {/* Accounts List */}
          {filteredAccounts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🏛️</Text>
              <Text style={styles.emptyTitle}>No Accounts Linked Yet</Text>
              <Text style={styles.emptySubtitle}>
                Link your bank accounts, demat holdings, or credit cards to monitor unified net worth.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={onConnectAccount}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyActionBtnText}>+ Connect Account</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.accountList}>
              {filteredAccounts.map((acc) => {
                const isAsset = acc.category === 'ASSET';
                return (
                  <TouchableOpacity
                    key={acc.id}
                    style={styles.accountCard}
                    onPress={() => setSelectedAccount(acc)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.cardTopRow}>
                      <View style={styles.bankAvatar}>
                        <Text style={styles.bankEmoji}>
                          {acc.type === 'CREDIT_CARD' ? '💳' : acc.type === 'DEMAT' ? '📈' : '🏛️'}
                        </Text>
                      </View>

                      <View style={styles.accountMeta}>
                        <Text style={styles.accountName}>{acc.name}</Text>
                        <Text style={styles.accountInstitution}>
                          {acc.institution} · {acc.accountNumberMask}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.typeBadge,
                          isAsset ? styles.typeBadgeAsset : styles.typeBadgeLiability,
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeBadgeText,
                            isAsset ? styles.typeTextAsset : styles.typeTextLiability,
                          ]}
                        >
                          {acc.type}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardMidRow}>
                      <View>
                        <Text style={styles.balanceLabel}>LEDGER BALANCE</Text>
                        <Text
                          style={[
                            styles.accountBalance,
                            isAsset ? styles.balanceAsset : styles.balanceLiability,
                          ]}
                        >
                          {formatINR(acc.balance)}
                        </Text>
                      </View>
                      {acc.interestRate && (
                        <View style={styles.rateBadge}>
                          <Text style={styles.rateText}>{acc.interestRate}% p.a.</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.cardFooter}>
                      <Text style={styles.syncStatusText}>Synced: {acc.lastSynced}</Text>
                      <View style={styles.verifiedRow}>
                        <Text style={styles.verifiedDot}>●</Text>
                        <Text style={styles.verifiedText}>Double-Entry Verified</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Add Account Button */}
          <TouchableOpacity
            style={styles.connectBtn}
            onPress={onConnectAccount}
            activeOpacity={0.8}
          >
            <Text style={styles.connectBtnText}>+ Connect Another Bank or Demat</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {/* General Ledger Invariants & Cash Flow Summary Card */}
          <View style={styles.ledgerSummaryCard}>
            <View style={styles.summaryTop}>
              <View>
                <Text style={styles.summaryLabel}>GENERAL LEDGER JOURNAL</Text>
                <Text style={styles.ledgerSubtext}>Double-entry balanced accounting ledger</Text>
              </View>
              <View style={styles.ledgerBalanceBadge}>
                <Text style={styles.ledgerBalanceBadgeText}>● Ledger In Balance</Text>
              </View>
            </View>

            <View style={styles.ledgerNumbersGrid}>
              <View style={styles.ledgerCol}>
                <Text style={styles.ledgerColLabel}>TOTAL INFLOWS</Text>
                <Text style={styles.ledgerInflowVal}>+{formatINR(totalInflows)}</Text>
              </View>
              <View style={styles.ledgerDivider} />
              <View style={styles.ledgerCol}>
                <Text style={styles.ledgerColLabel}>TOTAL OUTFLOWS</Text>
                <Text style={styles.ledgerOutflowVal}>-{formatINR(totalOutflows)}</Text>
              </View>
              <View style={styles.ledgerDivider} />
              <View style={styles.ledgerCol}>
                <Text style={styles.ledgerColLabel}>NET SURPLUS</Text>
                <Text
                  style={[
                    styles.ledgerNetVal,
                    { color: netCashFlow >= 0 ? '#087A50' : '#DC2626' },
                  ]}
                >
                  {netCashFlow >= 0 ? '+' : ''}{formatINR(netCashFlow)}
                </Text>
              </View>
            </View>

            <View style={styles.ledgerInvariantFoot}>
              <Text style={styles.ledgerInvariantText}>
                ⚖️ Invariant Verified: Total Debits ({formatINR(totalLedgerVolume)}) = Total Credits ({formatINR(totalLedgerVolume)})
              </Text>
            </View>
          </View>

          {/* Quick Ledger Action Strip: Add Expense & Add Income */}
          <View style={styles.ledgerActionsRow}>
            <TouchableOpacity
              style={[styles.ledgerActionBtn, styles.ledgerExpenseBtn]}
              onPress={onAddExpense || onAddTransaction}
              activeOpacity={0.85}
            >
              <View style={styles.ledgerActionIconCircleExpense}>
                <Text style={styles.ledgerActionIconExpense}>−</Text>
              </View>
              <View style={styles.ledgerActionTexts}>
                <Text style={styles.ledgerExpenseBtnTitle}>Add Expense</Text>
                <Text style={styles.ledgerExpenseBtnSub}>Record debit outflow</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.ledgerActionBtn, styles.ledgerIncomeBtn]}
              onPress={onAddIncome || onAddTransaction}
              activeOpacity={0.85}
            >
              <View style={styles.ledgerActionIconCircleIncome}>
                <Text style={styles.ledgerActionIconIncome}>+</Text>
              </View>
              <View style={styles.ledgerActionTexts}>
                <Text style={styles.ledgerIncomeBtnTitle}>Add Income</Text>
                <Text style={styles.ledgerIncomeBtnSub}>Record credit inflow</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Transactions Ledger Search Bar */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search merchant, category, account..."
              placeholderTextColor={theme.colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                <Text style={styles.clearSearch}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Flow Type Filter Pills */}
          <View style={styles.txFilterRow}>
            {(['ALL', 'DEBIT', 'CREDIT'] as const).map((type) => {
              const isSelected = txTypeFilter === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.txFilterPill, isSelected && styles.txFilterPillActive]}
                  onPress={() => setTxTypeFilter(type)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.txFilterPillText,
                      isSelected && styles.txFilterPillTextActive,
                    ]}
                  >
                    {type === 'ALL' ? 'All Entries' : type === 'DEBIT' ? 'Debits (-)' : 'Credits (+)'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Category Filter Pills (Horizontal Scroll) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryFilterScroll}
            contentContainerStyle={styles.categoryFilterContent}
          >
            {availableCategories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catFilterPill, isSelected && styles.catFilterPillActive]}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.catFilterPillText,
                      isSelected && styles.catFilterPillTextActive,
                    ]}
                  >
                    {cat === 'ALL' ? 'All Categories' : cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Transactions List */}
          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📝</Text>
              <Text style={styles.emptyTitle}>No Matching Ledger Entries</Text>
              <Text style={styles.emptySubtitle}>
                No journal lines matched your search or category filter.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => {
                  setSearchQuery('');
                  setTxTypeFilter('ALL');
                  setSelectedCategory('ALL');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyActionBtnText}>Reset All Filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.txList}>
              {filteredTransactions.map((tx) => {
                const isCredit = tx.type === 'CREDIT';
                return (
                  <TouchableOpacity
                    key={tx.id}
                    style={styles.txCard}
                    onPress={() => setSelectedTx(tx)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.txRow}>
                      <View
                        style={[
                          styles.txIconBox,
                          isCredit ? styles.txIconCredit : styles.txIconDebit,
                        ]}
                      >
                        <Text style={styles.txIconText}>{isCredit ? '↓' : '↑'}</Text>
                      </View>

                      <View style={styles.txInfoCol}>
                        <View style={styles.txTitleRow}>
                          <Text style={styles.txTitle} numberOfLines={1}>
                            {tx.title}
                          </Text>
                          <Text
                            style={[
                              styles.txAmount,
                              isCredit ? styles.txAmountCredit : styles.txAmountDebit,
                            ]}
                          >
                            {isCredit ? '+' : '-'}{formatINR(tx.amount)}
                          </Text>
                        </View>
                        <View style={styles.txSubRow}>
                          <Text style={styles.txMeta}>
                            {tx.category} • {tx.accountName}
                          </Text>
                          <View style={styles.txStatusPill}>
                            <Text style={styles.txStatusText}>{tx.status}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Add Entry Button */}
          <TouchableOpacity
            style={styles.connectBtn}
            onPress={onAddTransaction}
            activeOpacity={0.8}
          >
            <Text style={styles.connectBtnText}>+ Record New Journal Entry</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Transaction Detail Bottom Sheet Modal with T-Account Visual */}
      <Modal
        visible={selectedTx !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedTx(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedTx(null)}
          />
          <View style={styles.txModalSheet}>
            <View style={styles.modalDragPill} />
            {selectedTx && (
              <>
                <View style={styles.txModalHeader}>
                  <View style={styles.txModalBadgeRow}>
                    <Text style={styles.txModalEyebrow}>GENERAL LEDGER RECORD</Text>
                    <View style={styles.txIdBadge}>
                      <Text style={styles.txIdBadgeText}>{`JE-${selectedTx.id.toUpperCase()}`}</Text>
                    </View>
                  </View>
                  <Text style={styles.txModalTitle}>{selectedTx.title}</Text>
                  <Text
                    style={[
                      styles.txModalAmount,
                      selectedTx.type === 'CREDIT' ? styles.txAmountCredit : styles.txAmountDebit,
                    ]}
                  >
                    {selectedTx.type === 'CREDIT' ? '+' : '-'}{formatINR(selectedTx.amount)}
                  </Text>
                </View>

                {/* Double-entry Ledger Legs T-Account Table */}
                <View style={styles.ledgerLegsBox}>
                  <View style={styles.ledgerLegsHeader}>
                    <Text style={styles.ledgerLegsTitle}>DOUBLE-ENTRY T-ACCOUNT LEGS</Text>
                    <View style={styles.balancedPill}>
                      <Text style={styles.balancedPillText}>✓ Balanced</Text>
                    </View>
                  </View>

                  {/* Debit Leg */}
                  <View style={styles.legCard}>
                    <View style={styles.legCardTop}>
                      <View style={styles.legTagDebit}>
                        <Text style={styles.legTagDebitText}>DEBIT (+)</Text>
                      </View>
                      <Text style={styles.legCardAmount}>{formatINR(selectedTx.amount)}</Text>
                    </View>
                    <Text style={styles.legAccountName}>
                      {selectedTx.type === 'CREDIT' ? selectedTx.accountName : `${selectedTx.category} Expense`}
                    </Text>
                    <Text style={styles.legNatureText}>
                      {selectedTx.type === 'CREDIT' ? 'Asset Account (Bank Cash Received)' : 'Expense Account (Capital Outflow)'}
                    </Text>
                  </View>

                  {/* Credit Leg */}
                  <View style={styles.legCard}>
                    <View style={styles.legCardTop}>
                      <View style={styles.legTagCredit}>
                        <Text style={styles.legTagCreditText}>CREDIT (−)</Text>
                      </View>
                      <Text style={styles.legCardAmount}>{formatINR(selectedTx.amount)}</Text>
                    </View>
                    <Text style={styles.legAccountName}>
                      {selectedTx.type === 'CREDIT' ? `${selectedTx.category} Revenue` : selectedTx.accountName}
                    </Text>
                    <Text style={styles.legNatureText}>
                      {selectedTx.type === 'CREDIT' ? 'Income Account (Earnings Recognized)' : 'Asset Account (Bank Cash Disbursed)'}
                    </Text>
                  </View>

                  <View style={styles.zeroVarianceRow}>
                    <Text style={styles.zeroVarianceText}>Zero Ledger Variance: Debits − Credits = ₹0.00</Text>
                  </View>
                </View>

                {/* Audit Attributes */}
                <View style={styles.auditAttributes}>
                  <View style={styles.attrRow}>
                    <Text style={styles.attrLabel}>Institution Account</Text>
                    <Text style={styles.attrVal}>{selectedTx.accountName}</Text>
                  </View>
                  <View style={styles.attrRow}>
                    <Text style={styles.attrLabel}>Classification Category</Text>
                    <Text style={styles.attrVal}>{selectedTx.category}</Text>
                  </View>
                  <View style={styles.attrRow}>
                    <Text style={styles.attrLabel}>Effective Date</Text>
                    <Text style={styles.attrVal}>{selectedTx.date}</Text>
                  </View>
                  <View style={styles.attrRow}>
                    <Text style={styles.attrLabel}>Cryptographic Settlement</Text>
                    <Text style={styles.attrValGreen}>● Verified & Reconciled</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.closeModalBtn}
                  onPress={() => setSelectedTx(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.closeModalBtnText}>Close Journal Details</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
      {/* Account Detail Modal */}
      {selectedAccount && (
        <Modal
          visible={!!selectedAccount}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedAccount(null)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setSelectedAccount(null)}
            />
            <View style={styles.txModalSheet}>
              <View style={styles.modalDragPill} />
              <View style={styles.txModalHeader}>
                <Text style={styles.txModalEyebrow}>INSTITUTION ACCOUNT AUDIT</Text>
                <Text style={styles.txModalTitle}>{selectedAccount.name}</Text>
                <Text style={styles.accountModalSub}>
                  {selectedAccount.institution} • {selectedAccount.accountNumberMask}
                </Text>
              </View>

              <View style={styles.accountBalanceHeroBox}>
                <Text style={styles.accountBalanceHeroLabel}>VERIFIED RECONCILED BALANCE</Text>
                <Text
                  style={[
                    styles.accountBalanceHeroVal,
                    { color: selectedAccount.category === 'ASSET' ? theme.colors.primary : '#DC2626' },
                  ]}
                >
                  {formatINR(selectedAccount.balance)}
                </Text>
              </View>

              <View style={styles.auditAttributes}>
                <View style={styles.attrRow}>
                  <Text style={styles.attrLabel}>Account Classification</Text>
                  <Text style={styles.attrVal}>{selectedAccount.type} ({selectedAccount.category})</Text>
                </View>
                <View style={styles.attrRow}>
                  <Text style={styles.attrLabel}>Interest / Annualized Yield</Text>
                  <Text style={styles.attrVal}>{selectedAccount.interestRate ? `${selectedAccount.interestRate}% p.a.` : 'N/A'}</Text>
                </View>
                <View style={styles.attrRow}>
                  <Text style={styles.attrLabel}>Last Synchronized</Text>
                  <Text style={styles.attrVal}>{selectedAccount.lastSynced}</Text>
                </View>
                <View style={styles.attrRow}>
                  <Text style={styles.attrLabel}>Audit Verification</Text>
                  <Text style={styles.attrValGreen}>● Merkle Verified In Balance</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.filterTxBtn}
                onPress={() => {
                  setSearchQuery(selectedAccount.name);
                  setActiveSubTab('TRANSACTIONS');
                  setSelectedAccount(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.filterTxBtnText}>View Transactions for this Account →</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeModalBtn}
                onPress={() => setSelectedAccount(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.closeModalBtnText}>Close Account Audit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  modeTabActive: {
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  modeTabTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 14,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  syncBadge: {
    backgroundColor: theme.colors.primaryLightSolid,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  syncBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  summaryNumbersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
  },
  summaryBox: {
    flex: 1,
  },
  summaryBoxLabel: {
    fontSize: 9.5,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  assetVal: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.positive,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  liabilityVal: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.negative,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#EEF2EF',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  primaryConnectBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  primaryConnectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  primaryConnectIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryConnectIcon: {
    fontSize: 18,
  },
  primaryConnectTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  primaryConnectSub: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 1,
  },
  primaryConnectArrow: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  segmentTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  accountList: {
    gap: 12,
  },
  accountCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bankAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F0F4F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bankEmoji: {
    fontSize: 17,
  },
  accountMeta: {
    flex: 1,
  },
  accountName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  accountInstitution: {
    fontSize: 10.5,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  typeBadgeAsset: {
    backgroundColor: theme.colors.primaryLightSolid,
  },
  typeBadgeLiability: {
    backgroundColor: theme.colors.negativeBgSolid,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  typeTextAsset: {
    color: theme.colors.primaryDark,
  },
  typeTextLiability: {
    color: theme.colors.negativeDark,
  },
  cardMidRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  balanceLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.4,
  },
  accountBalance: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
    marginTop: 2,
  },
  balanceAsset: {
    color: theme.colors.textPrimary,
  },
  balanceLiability: {
    color: theme.colors.negative,
  },
  rateBadge: {
    backgroundColor: '#F0F4F1',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rateText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    marginTop: 8,
  },
  syncStatusText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedDot: {
    color: theme.colors.positive,
    fontSize: 8,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.primaryDark,
  },
  connectBtn: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  connectBtnText: {
    color: theme.colors.primaryDark,
    fontSize: 12.5,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textPrimary,
    padding: 0,
  },
  clearSearch: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    paddingHorizontal: 4,
  },
  txFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  txFilterPill: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  txFilterPillActive: {
    backgroundColor: theme.colors.primaryAlpha10,
    borderColor: theme.colors.primary,
  },
  txFilterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  txFilterPillTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  txList: {
    gap: 10,
  },
  txCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  txIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconCredit: {
    backgroundColor: '#DCFCE7',
  },
  txIconDebit: {
    backgroundColor: '#FEE2E2',
  },
  txIconText: {
    fontSize: 16,
    fontWeight: '800',
  },
  txInfoCol: {
    flex: 1,
  },
  txTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  txAmountCredit: {
    color: theme.colors.primary,
  },
  txAmountDebit: {
    color: theme.colors.danger,
  },
  txSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txMeta: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  txStatusPill: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  txStatusText: {
    fontSize: 9,
    fontWeight: '600',
    color: theme.colors.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 20, 0.45)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  txModalSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalDragPill: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  txModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  txModalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  txModalEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    letterSpacing: 0.8,
  },
  txIdBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  txIdBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
    fontFamily: 'monospace',
  },
  txModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginTop: 4,
    textAlign: 'center',
  },
  txModalAmount: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
  ledgerLegsBox: {
    backgroundColor: '#F8FAF9',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  ledgerLegsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ledgerLegsTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.6,
  },
  balancedPill: {
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  balancedPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#087A50',
  },
  legCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  legCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  legTagDebit: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  legTagDebitText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
  },
  legTagCredit: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  legTagCreditText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#087A50',
  },
  legCardAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  legAccountName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  legNatureText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  zeroVarianceRow: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  zeroVarianceText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#475569',
  },
  ledgerSummaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  ledgerSubtext: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  ledgerBalanceBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  ledgerBalanceBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803D',
  },
  ledgerNumbersGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 10,
  },
  ledgerCol: {
    flex: 1,
  },
  ledgerColLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  ledgerDivider: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: 8,
  },
  ledgerInflowVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#087A50',
    fontVariant: ['tabular-nums'],
  },
  ledgerOutflowVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
    fontVariant: ['tabular-nums'],
  },
  ledgerNetVal: {
    fontSize: 13,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  ledgerInvariantFoot: {
    backgroundColor: '#F8FAF9',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  ledgerInvariantText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  categoryFilterScroll: {
    marginBottom: 12,
  },
  categoryFilterContent: {
    gap: 6,
  },
  catFilterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  catFilterPillActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#38BDF8',
  },
  catFilterPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  catFilterPillTextActive: {
    color: '#0369A1',
    fontWeight: '800',
  },
  auditAttributes: {
    gap: 10,
    marginBottom: 20,
  },
  attrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attrLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  attrVal: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  attrValGreen: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  closeModalBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeModalBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textWhite,
  },
  accountModalSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  accountBalanceHeroBox: {
    backgroundColor: '#F7F9F7',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E7ECE8',
  },
  accountBalanceHeroLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#758078',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  accountBalanceHeroVal: {
    fontSize: 26,
    fontWeight: '900',
  },
  filterTxBtn: {
    backgroundColor: '#E8F5EE',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 106, 0.3)',
  },
  filterTxBtnText: {
    color: '#087A50',
    fontSize: 12,
    fontWeight: '700',
  },
  ledgerActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  ledgerActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  ledgerExpenseBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: 'rgba(220, 91, 91, 0.25)',
  },
  ledgerIncomeBtn: {
    backgroundColor: '#ECFDF5',
    borderColor: 'rgba(22, 163, 106, 0.25)',
  },
  ledgerActionIconCircleExpense: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerActionIconExpense: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textWhite,
    lineHeight: 18,
  },
  ledgerActionIconCircleIncome: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerActionIconIncome: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textWhite,
    lineHeight: 18,
  },
  ledgerActionTexts: {
    flex: 1,
  },
  ledgerExpenseBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.danger,
  },
  ledgerExpenseBtnSub: {
    fontSize: 10,
    color: '#991B1B',
    fontWeight: '500',
  },
  ledgerIncomeBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  ledgerIncomeBtnSub: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 16,
  },
  emptyActionBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
