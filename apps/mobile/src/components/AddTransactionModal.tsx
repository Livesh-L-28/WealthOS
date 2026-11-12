import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { theme, useTheme } from '../theme';
import { BankAccount } from '../types';

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  initialType?: 'DEBIT' | 'CREDIT';
  onSubmit: (data: {
    title: string;
    amount: number;
    category: string;
    type: 'DEBIT' | 'CREDIT';
    accountName: string;
  }) => void;
}

const EXPENSE_CATEGORIES = [
  'Dining & Restaurants',
  'Food & Groceries',
  'Housing & Rent',
  'Utilities & Bills',
  'Transport & Fuel',
  'Technology & Cloud',
  'Shopping & Retail',
  'Healthcare & Wellness',
  'Travel & Vacation',
  'Mutual Fund SIP',
];

const INCOME_CATEGORIES = [
  'Corporate Salary',
  'Professional / Consulting Retainer',
  'Investment Dividend Payout',
  'Rental & Real Estate Income',
  'Capital Gains / Stock Sale',
  'Interest & Term Deposit Yield',
  'Business Inflow',
  'Reimbursement / Refund',
];

const EXPENSE_PRESETS = [100, 500, 1000, 2500, 5000, 10000];
const INCOME_PRESETS = [5000, 15000, 35000, 75000, 150000, 250000];

interface HabitChip {
  icon: string;
  label: string;
  amount: number;
  category: string;
}

const QUICK_HABITS: HabitChip[] = [
  { icon: '☕', label: 'Coffee', amount: 150, category: 'Dining & Restaurants' },
  { icon: '⛽', label: 'Fuel', amount: 1000, category: 'Transport & Fuel' },
  { icon: '🛒', label: 'Groceries', amount: 750, category: 'Food & Groceries' },
  { icon: '🍽️', label: 'Dining Out', amount: 850, category: 'Dining & Restaurants' },
  { icon: '🚕', label: 'Cab / Ride', amount: 300, category: 'Transport & Fuel' },
  { icon: '📱', label: 'Mobile / Net', amount: 499, category: 'Utilities & Bills' },
];

function parseNaturalLanguage(text: string, accounts: BankAccount[]) {
  const words = text.trim().split(/\s+/);
  let parsedAmount = '';
  const remainingWords: string[] = [];
  let matchedCat = '';
  let matchedAcc = '';
  let matchedType: 'DEBIT' | 'CREDIT' = 'DEBIT';

  for (const w of words) {
    const cleanNum = w.replace(/[₹,]/g, '');
    if (!parsedAmount && !isNaN(Number(cleanNum)) && Number(cleanNum) > 0) {
      parsedAmount = cleanNum;
      continue;
    }
    const lower = w.toLowerCase();
    if (['salary', 'bonus', 'dividend', 'interest', 'stipend'].includes(lower)) {
      matchedType = 'CREDIT';
      if (lower === 'salary') matchedCat = 'Corporate Salary';
      if (lower === 'dividend') matchedCat = 'Investment Dividend Payout';
      continue;
    }
    if (['coffee', 'tea', 'cafe', 'starbucks'].includes(lower)) {
      matchedCat = 'Dining & Restaurants';
    } else if (['grocery', 'groceries', 'supermarket', 'blinkit', 'zepto'].includes(lower)) {
      matchedCat = 'Food & Groceries';
    } else if (['fuel', 'petrol', 'diesel', 'shell'].includes(lower)) {
      matchedCat = 'Transport & Fuel';
    } else if (['cab', 'uber', 'ola', 'auto'].includes(lower)) {
      matchedCat = 'Transport & Fuel';
    } else if (['recharge', 'wifi', 'broadband', 'electricity', 'bill'].includes(lower)) {
      matchedCat = 'Utilities & Bills';
    }

    const foundAcc = accounts.find(
      (a) => a.name.toLowerCase().includes(lower) || a.institution.toLowerCase().includes(lower)
    );
    if (foundAcc) {
      matchedAcc = foundAcc.name;
      continue;
    }

    remainingWords.push(w);
  }

  return {
    amount: parsedAmount,
    title: remainingWords.join(' '),
    category: matchedCat,
    account: matchedAcc,
    type: matchedType,
  };
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  visible,
  onClose,
  accounts,
  initialType = 'DEBIT',
  onSubmit,
}) => {
  const { isDark } = useTheme();
  const sheetBg = isDark ? '#111827' : '#FFFFFF';
  const borderColor = isDark ? '#1F2937' : '#E2E8F0';
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const inputBg = isDark ? '#0B0F19' : '#F8FAFC';
  const cardSubtle = isDark ? '#1E293B' : '#F1F5F9';
  const borderSubtle = isDark ? '#334155' : '#E2E8F0';

  const [type, setType] = useState<'DEBIT' | 'CREDIT'>(initialType);
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [quickInput, setQuickInput] = useState('');
  const [category, setCategory] = useState(
    initialType === 'CREDIT' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]
  );
  const [selectedAccount, setSelectedAccount] = useState(
    accounts[0]?.name || 'Primary Operating Savings'
  );

  const handleApplyHabit = (habit: HabitChip) => {
    setType('DEBIT');
    setTitle(habit.label);
    setAmount(habit.amount.toString());
    setCategory(habit.category);
    setQuickInput('');
  };

  const handleQuickInputChange = (txt: string) => {
    setQuickInput(txt);
    if (txt.trim().length > 1) {
      const parsed = parseNaturalLanguage(txt, accounts);
      if (parsed.amount) setAmount(parsed.amount);
      if (parsed.title) setTitle(parsed.title);
      if (parsed.category) setCategory(parsed.category);
      if (parsed.account) setSelectedAccount(parsed.account);
      if (parsed.type) setType(parsed.type);
    }
  };

  useEffect(() => {
    if (visible) {
      setType(initialType);
      setCategory(initialType === 'CREDIT' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
      if (accounts.length > 0 && !selectedAccount) {
        setSelectedAccount(accounts[0].name);
      }
    }
  }, [visible, initialType, accounts]);

  const handleTypeChange = (newType: 'DEBIT' | 'CREDIT') => {
    setType(newType);
    setCategory(newType === 'CREDIT' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
  };

  const handleAddIncrement = (val: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + val).toString());
  };

  const handleSubmit = () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid transaction amount.');
      return;
    }
    const finalTitle = title.trim() || `${category} ${isIncome ? 'Inflow' : 'Expense'}`;

    onSubmit({
      title: finalTitle,
      amount: parsedAmount,
      category,
      type,
      accountName: selectedAccount || 'Cash Wallet',
    });

    // Reset
    setAmount('');
    setTitle('');
    setQuickInput('');
    onClose();
  };

  const currentCategories = type === 'CREDIT' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const currentPresets = type === 'CREDIT' ? INCOME_PRESETS : EXPENSE_PRESETS;
  const isIncome = type === 'CREDIT';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalSheet, { backgroundColor: sheetBg, borderColor }]}>
          <View style={[styles.handleBar, { backgroundColor: borderSubtle }]} />

          <View style={[styles.headerRow, { borderBottomColor: borderColor }]}>
            <View>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>
                {isIncome ? '+ Record Income (Inflow)' : '− Record Expense (Outflow)'}
              </Text>
              <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                {isIncome
                  ? 'Double-Entry Inflow Posted to Bank Ledger'
                  : 'Double-Entry Expense Debited from Account'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: cardSubtle }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.closeBtnText, { color: textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
            {/* Primary Income / Expense Mode Switcher */}
            <View style={[styles.typeSwitcher, { backgroundColor: isDark ? '#0B0F19' : '#EEF2EF' }]}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  !isIncome && [
                    styles.typeBtnDebitActive,
                    {
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2',
                      borderColor: isDark ? '#EF4444' : '#FECACA',
                    },
                  ],
                ]}
                onPress={() => handleTypeChange('DEBIT')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    { color: textSecondary },
                    !isIncome && { color: isDark ? '#F87171' : '#DC2626', fontWeight: '800' },
                  ]}
                >
                  ↑ Expense (Outflow)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  isIncome && [
                    styles.typeBtnCreditActive,
                    {
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7',
                      borderColor: isDark ? '#10B981' : '#BBF7D0',
                    },
                  ],
                ]}
                onPress={() => handleTypeChange('CREDIT')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    { color: textSecondary },
                    isIncome && { color: isDark ? '#34D399' : '#059669', fontWeight: '800' },
                  ]}
                >
                  ↓ Income (Inflow)
                </Text>
              </TouchableOpacity>
            </View>

            {/* 1-Tap Frictionless Habit Chips (Daily Spends) */}
            {!isIncome && (
              <View style={styles.habitsSection}>
                <Text style={[styles.habitsLabel, { color: textSecondary }]}>⚡ 1-TAP QUICK LOG HABITS</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.habitsScroll}>
                  {QUICK_HABITS.map((h, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.habitChip,
                        {
                          backgroundColor: cardSubtle,
                          borderColor: borderSubtle,
                        },
                      ]}
                      onPress={() => handleApplyHabit(h)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.habitChipIcon}>{h.icon}</Text>
                      <Text style={[styles.habitChipText, { color: textPrimary }]}>{h.label}</Text>
                      <Text style={[styles.habitChipAmount, { color: isDark ? '#38BDF8' : '#2563EB' }]}>
                        ₹{h.amount}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Natural Language Quick Input */}
            <View style={[styles.nlBox, { backgroundColor: cardSubtle, borderColor: borderSubtle }]}>
              <View style={styles.nlLabelRow}>
                <Text style={[styles.nlLabel, { color: textSecondary }]}>SMART ONE-LINER QUICK PARSER</Text>
                <View style={styles.nlAiBadge}>
                  <Text style={styles.nlAiBadgeText}>⚡ Instant</Text>
                </View>
              </View>
              <TextInput
                style={[styles.nlInput, { backgroundColor: inputBg, borderColor: borderSubtle, color: textPrimary }]}
                placeholder="e.g. 'Coffee 150 Cash', 'Dinner 850 HDFC', 'Salary 150000'"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                value={quickInput}
                onChangeText={handleQuickInputChange}
                autoCapitalize="sentences"
              />
            </View>

            {/* Amount Input */}
            <Text style={[styles.label, { color: textSecondary }]}>
              {isIncome ? 'INCOME AMOUNT (INR)' : 'EXPENSE AMOUNT (INR)'}
            </Text>
            <View
              style={[
                styles.amountInputRow,
                {
                  backgroundColor: inputBg,
                  borderColor: isIncome
                    ? isDark ? '#10B981' : '#059669'
                    : isDark ? '#EF4444' : '#DC2626',
                },
              ]}
            >
              <Text
                style={[
                  styles.currencySymbol,
                  { color: isIncome ? (isDark ? '#34D399' : '#059669') : (isDark ? '#F87171' : '#DC2626') },
                ]}
              >
                ₹
              </Text>
              <TextInput
                style={[
                  styles.amountInput,
                  { color: isIncome ? (isDark ? '#34D399' : '#059669') : (isDark ? '#F87171' : '#DC2626') },
                ]}
                placeholder="0.00"
                placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                autoFocus={true}
              />
            </View>

            {/* Quick Presets & Increment Buttons */}
            <View style={styles.presetsRow}>
              {currentPresets.map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.presetChip, { backgroundColor: cardSubtle, borderColor: borderSubtle }]}
                  onPress={() => handleAddIncrement(val)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.presetChipText, { color: textPrimary }]}>
                    +₹{val >= 100000 ? `${val / 100000}L` : val >= 1000 ? `${val / 1000}k` : val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Description / Merchant */}
            <Text style={[styles.label, { color: textSecondary }]}>
              {isIncome ? 'SOURCE / CLIENT / PAYER' : 'DESCRIPTION / MERCHANT'}
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: inputBg, borderColor: borderSubtle, color: textPrimary }]}
              placeholder={
                isIncome
                  ? 'e.g. Infy Advisory Retainer, TCS Dividend, Salary'
                  : 'e.g. Whole Foods Organic, Amazon AWS, Shell Fuel'
              }
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={title}
              onChangeText={setTitle}
            />

            {/* Category Selector */}
            <Text style={[styles.label, { color: textSecondary }]}>
              {isIncome ? 'INCOME CATEGORY' : 'EXPENSE CATEGORY'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {currentCategories.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: isSelected
                          ? isIncome
                            ? isDark ? 'rgba(16, 185, 129, 0.25)' : '#DCFCE7'
                            : isDark ? 'rgba(239, 68, 68, 0.25)' : '#FEE2E2'
                          : cardSubtle,
                        borderColor: isSelected
                          ? isIncome
                            ? '#10B981'
                            : '#EF4444'
                          : borderSubtle,
                      },
                    ]}
                    onPress={() => setCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        {
                          color: isSelected
                            ? isIncome
                              ? isDark ? '#34D399' : '#059669'
                              : isDark ? '#F87171' : '#DC2626'
                            : textSecondary,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Account Selector */}
            <Text style={[styles.label, { color: textSecondary }]}>
              {isIncome ? 'DEPOSITING ACCOUNT (RECEIVER)' : 'SOURCE PAYMENT ACCOUNT (DEBIT)'}
            </Text>
            <View style={styles.accountPicker}>
              {(accounts.length > 0 ? accounts.slice(0, 4) : [{ id: 'cash', name: 'Cash Wallet', accountNumberMask: '•••• Cash' }]).map((acc) => {
                const isSelected = selectedAccount === acc.name;
                return (
                  <TouchableOpacity
                    key={acc.id}
                    style={[
                      styles.accountChoice,
                      {
                        backgroundColor: isSelected
                          ? isIncome
                            ? isDark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7'
                            : isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF'
                          : cardSubtle,
                        borderColor: isSelected
                          ? isIncome
                            ? '#10B981'
                            : '#3B82F6'
                          : borderSubtle,
                      },
                    ]}
                    onPress={() => setSelectedAccount(acc.name)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.accountChoiceText,
                        {
                          color: isSelected ? textPrimary : textSecondary,
                          fontWeight: isSelected ? '700' : '600',
                        },
                      ]}
                    >
                      {acc.name}
                    </Text>
                    <Text style={[styles.accountChoiceMask, { color: textSecondary }]}>
                      {acc.accountNumberMask}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={[styles.actionRow, { borderTopColor: borderColor }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: cardSubtle }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelBtnText, { color: textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                {
                  backgroundColor: isIncome ? '#10B981' : '#EF4444',
                },
              ]}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>
                {isIncome ? '+ Post Income to Ledger' : '− Post Expense to Ledger'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 13, 22, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '92%',
    paddingBottom: 24,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  formBody: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  typeSwitcher: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  typeBtnDebitActive: {
    borderWidth: 1,
  },
  typeBtnCreditActive: {
    borderWidth: 1,
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  habitsSection: {
    marginBottom: 14,
  },
  habitsLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  habitsScroll: {
    flexDirection: 'row',
  },
  habitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    gap: 6,
  },
  habitChipIcon: {
    fontSize: 14,
  },
  habitChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  habitChipAmount: {
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  nlBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    marginBottom: 16,
  },
  nlLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nlLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  nlAiBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nlAiBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
  },
  nlInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 6,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '800',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: '900',
    paddingVertical: 10,
    fontVariant: ['tabular-nums'],
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 12,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
  },
  chipsScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  catChipText: {
    fontSize: 11,
  },
  accountPicker: {
    gap: 8,
    marginBottom: 16,
  },
  accountChoice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  accountChoiceText: {
    fontSize: 12,
  },
  accountChoiceMask: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
