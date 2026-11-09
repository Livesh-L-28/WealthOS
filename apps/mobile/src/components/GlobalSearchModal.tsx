import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../theme';
import {
  BankAccount,
  Transaction,
  InvestmentHolding,
  FinancialGoal,
  DocumentItem,
  ActiveScreen,
} from '../types';
import { formatINR } from '../formatters';

interface GlobalSearchModalProps {
  visible: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  transactions: Transaction[];
  holdings: InvestmentHolding[];
  goals: FinancialGoal[];
  documents: DocumentItem[];
  onNavigate: (screen: ActiveScreen) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  visible,
  onClose,
  accounts,
  transactions,
  holdings,
  goals,
  documents,
  onNavigate,
}) => {
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<
    'ALL' | 'TRANSACTIONS' | 'ACCOUNTS' | 'INVESTMENTS' | 'GOALS' | 'DOCS'
  >('ALL');

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results: Array<{
      id: string;
      title: string;
      subtitle: string;
      type: string;
      targetScreen: ActiveScreen;
      badge?: string;
      amount?: number;
    }> = [];

    // Search Accounts
    if (filterType === 'ALL' || filterType === 'ACCOUNTS') {
      accounts.forEach((acc) => {
        if (
          acc.name.toLowerCase().includes(q) ||
          acc.institution.toLowerCase().includes(q) ||
          acc.type.toLowerCase().includes(q)
        ) {
          results.push({
            id: acc.id,
            title: acc.name,
            subtitle: `${acc.institution} • ${acc.type}`,
            type: 'ACCOUNT',
            targetScreen: 'accounts',
            amount: acc.balance,
            badge: acc.category,
          });
        }
      });
    }

    // Search Transactions
    if (filterType === 'ALL' || filterType === 'TRANSACTIONS') {
      transactions.forEach((tx) => {
        if (
          tx.title.toLowerCase().includes(q) ||
          tx.category.toLowerCase().includes(q) ||
          tx.accountName.toLowerCase().includes(q)
        ) {
          results.push({
            id: tx.id,
            title: tx.title,
            subtitle: `${tx.category} • ${tx.accountName} • ${tx.date}`,
            type: 'TRANSACTION',
            targetScreen: 'transactions',
            amount: tx.amount,
            badge: tx.type,
          });
        }
      });
    }

    // Search Holdings
    if (filterType === 'ALL' || filterType === 'INVESTMENTS') {
      holdings.forEach((h) => {
        if (
          h.symbol.toLowerCase().includes(q) ||
          h.name.toLowerCase().includes(q) ||
          h.type.toLowerCase().includes(q)
        ) {
          results.push({
            id: h.id,
            title: `${h.symbol} - ${h.name}`,
            subtitle: `Qty: ${h.quantity} • ${h.fifoLotAge}`,
            type: 'INVESTMENT',
            targetScreen: 'investments',
            amount: h.currentValue,
            badge: `${h.pnlPercentage > 0 ? '+' : ''}${h.pnlPercentage.toFixed(1)}%`,
          });
        }
      });
    }

    // Search Goals
    if (filterType === 'ALL' || filterType === 'GOALS') {
      goals.forEach((g) => {
        if (g.title.toLowerCase().includes(q) || g.category.toLowerCase().includes(q)) {
          results.push({
            id: g.id,
            title: g.title,
            subtitle: `Target ${g.targetYear} • ${g.category}`,
            type: 'GOAL',
            targetScreen: 'goals',
            amount: g.targetAmount,
          });
        }
      });
    }

    // Search Documents
    if (filterType === 'ALL' || filterType === 'DOCS') {
      documents.forEach((d) => {
        if (d.name.toLowerCase().includes(q) || d.status.toLowerCase().includes(q)) {
          results.push({
            id: d.id,
            title: d.name,
            subtitle: `${d.size} • ${d.uploadDate}`,
            type: 'DOCUMENT',
            targetScreen: 'documents',
            badge: `${Math.round(d.confidence * 100)}% OCR`,
          });
        }
      });
    }

    return results;
  }, [query, filterType, accounts, transactions, holdings, goals, documents]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.container}>
          {/* Search Header Bar */}
          <View style={[styles.searchBarRow, { borderColor: theme.colors.border }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { color: theme.colors.textPrimary }]}
              placeholder="Search transactions, accounts, stocks, goals..."
              placeholderTextColor={theme.colors.textTertiary}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
                <Text style={[styles.clearBtnText, { color: theme.colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={[styles.cancelBtnText, { color: theme.colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Pills Carousel */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPillsScroll}
          >
            {(
              [
                { id: 'ALL', label: 'All Results' },
                { id: 'TRANSACTIONS', label: 'Transactions' },
                { id: 'ACCOUNTS', label: 'Accounts' },
                { id: 'INVESTMENTS', label: 'Holdings' },
                { id: 'GOALS', label: 'Goals' },
                { id: 'DOCS', label: 'Documents' },
              ] as const
            ).map((f) => {
              const isSelected = filterType === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: isSelected
                        ? theme.colors.primary
                        : theme.colors.cardSubtle,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setFilterType(f.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary },
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Results List */}
          <ScrollView style={styles.resultsScroll} showsVerticalScrollIndicator={false}>
            {query.trim().length === 0 ? (
              <View style={styles.emptyPrompt}>
                <Text style={styles.emptyEmoji}>⚡</Text>
                <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                  Global Ledger Search
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                  Quickly locate any double-entry journal posting, bank account, mutual fund lot, or OCR document.
                </Text>
              </View>
            ) : searchResults.length === 0 ? (
              <View style={styles.emptyPrompt}>
                <Text style={styles.emptyEmoji}>🔎</Text>
                <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                  No Ledger Records Found
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                  No items matched &quot;{query}&quot;. Try searching for institution names, payees, or stock tickers.
                </Text>
              </View>
            ) : (
              <View style={styles.resultsList}>
                <Text style={[styles.resultsCount, { color: theme.colors.textSecondary }]}>
                  Found {searchResults.length} matching records
                </Text>

                {searchResults.map((item) => (
                  <TouchableOpacity
                    key={`${item.type}-${item.id}`}
                    style={[
                      styles.resultCard,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={() => {
                      onClose();
                      onNavigate(item.targetScreen);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.resultLeft}>
                      <View style={styles.resultTitleRow}>
                        <View
                          style={[
                            styles.typeBadge,
                            { backgroundColor: theme.colors.primaryLightSolid },
                          ]}
                        >
                          <Text style={[styles.typeBadgeText, { color: theme.colors.primary }]}>
                            {item.type}
                          </Text>
                        </View>
                        <Text
                          style={[styles.resultTitle, { color: theme.colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                      </View>
                      <Text
                        style={[styles.resultSubtitle, { color: theme.colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {item.subtitle}
                      </Text>
                    </View>

                    <View style={styles.resultRight}>
                      {item.amount !== undefined && (
                        <Text style={[styles.resultAmount, { color: theme.colors.textPrimary }]}>
                          {formatINR(item.amount)}
                        </Text>
                      )}
                      {item.badge && (
                        <View
                          style={[
                            styles.metricBadge,
                            { backgroundColor: theme.colors.cardSubtle },
                          ]}
                        >
                          <Text
                            style={[
                              styles.metricBadgeText,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            {item.badge}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 8,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  searchIcon: {
    fontSize: 18,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
    fontWeight: '600',
  },
  clearBtn: {
    padding: 6,
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  filterPillsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  resultsScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyPrompt: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  resultsList: {
    paddingBottom: 30,
  },
  resultsCount: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 10,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  resultLeft: {
    flex: 1,
    marginRight: 12,
  },
  resultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  resultSubtitle: {
    fontSize: 11,
  },
  resultRight: {
    alignItems: 'flex-end',
  },
  resultAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  metricBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  metricBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
});

