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
import { theme } from '../theme';
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

const EXPENSE_PRESETS = [500, 1000, 2500, 5000, 10000, 25000];
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
  { icon: '🛒', label: 'Groceries', amount: 600, category: 'Food & Groceries' },
  { icon: '🍽️', label: 'Dining Out', amount: 850, category: 'Dining & Restaurants' },
  { icon: '🚕', label: 'Cab / Ride', amount: 250, category: 'Transport & Fuel' },
  { icon: '📱', label: 'Mobile / Net', amount: 299, category: 'Utilities & Bills' },
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
    }
  }, [visible, initialType]);

  const handleTypeChange = (newType: 'DEBIT' | 'CREDIT') => {
    setType(newType);
    setCategory(newType === 'CREDIT' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
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
      accountName: selectedAccount,
    });

    // Reset
    setAmount('');
    setTitle('');
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
        <View style={styles.modalSheet}>
          <View style={styles.handleBar} />

          <View style={styles.headerRow}>
            <View>
              <Text style={styles.modalTitle}>
                {isIncome ? '+ Record Income (Inflow)' : '− Record Expense (Outflow)'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {isIncome
                  ? 'Double-Entry Inflow Posted to Bank Ledger'
                  : 'Double-Entry Expense Debited from Account'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
            {/* Primary Income / Expense Mode Switcher */}
            <View style={styles.typeSwitcher}>
              <TouchableOpacity
                style={[styles.typeBtn, !isIncome && styles.typeBtnDebitActive]}
                onPress={() => handleTypeChange('DEBIT')}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeBtnText, !isIncome && styles.typeBtnTextDebitActive]}>
                  ↑ Expense (Outflow)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeBtn, isIncome && styles.typeBtnCreditActive]}
                onPress={() => handleTypeChange('CREDIT')}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeBtnText, isIncome && styles.typeBtnTextCreditActive]}>
                  ↓ Income (Inflow)
                </Text>
              </TouchableOpacity>
            </View>

            {/* 1-Tap Frictionless Habit Chips (Daily Spends) */}
            {!isIncome && (
              <View style={styles.habitsSection}>
                <Text style={styles.habitsLabel}>⚡ 1-TAP QUICK LOG HABITS</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.habitsScroll}>
                  {QUICK_HABITS.map((h, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.habitChip}
                      onPress={() => handleApplyHabit(h)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.habitChipIcon}>{h.icon}</Text>
                      <Text style={styles.habitChipText}>{h.label}</Text>
                      <Text style={styles.habitChipAmount}>₹{h.amount}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Natural Language Quick Input */}
            <View style={styles.nlBox}>
              <View style={styles.nlLabelRow}>
                <Text style={styles.nlLabel}>SMART ONE-LINER QUICK PARSER</Text>
                <View style={styles.nlAiBadge}>
                  <Text style={styles.nlAiBadgeText}>Instant</Text>
                </View>
              </View>
              <TextInput
                style={styles.nlInput}
                placeholder="e.g. 'Coffee 150 Cash', 'Dinner 850 HDFC', 'Salary 150000'"
                placeholderTextColor="#94A3B8"
                value={quickInput}
                onChangeText={handleQuickInputChange}
                autoCapitalize="sentences"
              />
            </View>

            {/* Amount Input */}
            <Text style={styles.label}>
              {isIncome ? 'INCOME AMOUNT (INR)' : 'EXPENSE AMOUNT (INR)'}
            </Text>
            <View style={[styles.amountInputRow, isIncome ? styles.borderGreen : styles.borderRed]}>
              <Text style={[styles.currencySymbol, isIncome ? styles.textGreen : styles.textRed]}>
                ₹
              </Text>
              <TextInput
                style={[styles.amountInput, isIncome ? styles.textGreen : styles.textRed]}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                autoFocus={true}
              />
            </View>

            {/* Quick Presets */}
            <View style={styles.presetsRow}>
              {currentPresets.map((val) => (
                <TouchableOpacity
                  key={val}
                  style={styles.presetChip}
                  onPress={() => setAmount(val.toString())}
                  activeOpacity={0.7}
                >
                  <Text style={styles.presetChipText}>
                    +₹{val >= 100000 ? `${val / 100000}L` : val >= 1000 ? `${val / 1000}k` : val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Description / Merchant */}
            <Text style={styles.label}>
              {isIncome ? 'SOURCE / CLIENT / PAYER' : 'DESCRIPTION / MERCHANT'}
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder={
                isIncome
                  ? 'e.g. Infy Advisory Retainer, TCS Dividend, Salary'
                  : 'e.g. Whole Foods Organic, Amazon AWS, Shell Fuel'
              }
              placeholderTextColor={theme.colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            {/* Category Selector */}
            <Text style={styles.label}>
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
                      isSelected && (isIncome ? styles.catChipGreenActive : styles.catChipRedActive),
                    ]}
                    onPress={() => setCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        isSelected && styles.catChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Account Selector */}
            <Text style={styles.label}>
              {isIncome ? 'DEPOSITING ACCOUNT (RECEIVER)' : 'SOURCE PAYMENT ACCOUNT (DEBIT)'}
            </Text>
            <View style={styles.accountPicker}>
              {accounts.slice(0, 4).map((acc) => {
                const isSelected = selectedAccount === acc.name;
                return (
                  <TouchableOpacity
                    key={acc.id}
                    style={[
                      styles.accountChoice,
                      isSelected && (isIncome ? styles.accountGreenActive : styles.accountChoiceActive),
                    ]}
                    onPress={() => setSelectedAccount(acc.name)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.accountChoiceText,
                        isSelected && styles.accountChoiceTextActive,
                      ]}
                    >
                      {acc.name}
                    </Text>
                    <Text style={styles.accountChoiceMask}>{acc.accountNumberMask}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, isIncome ? styles.submitBtnGreen : styles.submitBtnRed]}
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
    backgroundColor: 'rgba(23, 35, 29, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 24,
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.borderStrong,
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
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '700',
  },
  formBody: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#EEF2EF',
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
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  typeBtnCreditActive: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  typeBtnTextDebitActive: {
    color: '#991B1B',
    fontWeight: '800',
  },
  typeBtnTextCreditActive: {
    color: '#15803D',
    fontWeight: '800',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 8,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 10,
  },
  borderGreen: {
    borderColor: '#BBF7D0',
  },
  borderRed: {
    borderColor: '#FECACA',
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '800',
    marginRight: 6,
  },
  textGreen: {
    color: '#15803D',
  },
  textRed: {
    color: '#DC2626',
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    paddingVertical: 6,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  presetChip: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  presetChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  textInput: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  chipsScroll: {
    marginBottom: 14,
  },
  catChip: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
  },
  catChipRedActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  catChipGreenActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  catChipTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  accountPicker: {
    gap: 8,
    marginBottom: 18,
  },
  accountChoice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  accountChoiceActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
  },
  accountGreenActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#4ADE80',
  },
  accountChoiceText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  accountChoiceTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  accountChoiceMask: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnGreen: {
    backgroundColor: '#16A36A',
  },
  submitBtnRed: {
    backgroundColor: '#DC2626',
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textWhite,
  },
  habitsSection: {
    marginBottom: 14,
  },
  habitsLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  habitsScroll: {
    flexDirection: 'row',
  },
  habitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginRight: 8,
  },
  habitChipIcon: {
    fontSize: 13,
  },
  habitChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  habitChipAmount: {
    fontSize: 10,
    fontWeight: '800',
    color: '#087A50',
  },
  nlBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  nlLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  nlLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  nlAiBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  nlAiBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB',
  },
  nlInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0F172A',
  },
});
