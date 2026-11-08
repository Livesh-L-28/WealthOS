import React, { useState } from 'react';
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
} from 'react-native';
import { theme } from '../theme';
import { BankAccount } from '../types';

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  onSubmit: (data: {
    title: string;
    amount: number;
    category: string;
    type: 'DEBIT' | 'CREDIT';
    accountName: string;
  }) => void;
}

const CATEGORIES = [
  'Food & Dining',
  'Shopping & Retail',
  'Housing & Rent',
  'Professional Income',
  'Investment Yield',
  'Utilities & Bills',
  'Mutual Fund SIP',
  'Healthcare',
  'Travel & Transport',
];

const PRESETS = [500, 1000, 2500, 5000, 15000, 50000];

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  visible,
  onClose,
  accounts,
  onSubmit,
}) => {
  const [type, setType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.name || 'Primary Operating Savings');

  const handleSubmit = () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (!title.trim()) {
      alert('Please enter a description or merchant name');
      return;
    }

    onSubmit({
      title: title.trim(),
      amount: parsedAmount,
      category,
      type,
      accountName: selectedAccount,
    });

    // Reset
    setAmount('');
    setTitle('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalSheet}>
          <View style={styles.handleBar} />

          <View style={styles.headerRow}>
            <View>
              <Text style={styles.modalTitle}>Record Ledger Entry</Text>
              <Text style={styles.modalSubtitle}>Double-Entry Balanced Transaction Posting</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
            {/* Debit / Credit Switcher */}
            <View style={styles.typeSwitcher}>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'DEBIT' && styles.typeBtnDebitActive]}
                onPress={() => setType('DEBIT')}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeBtnText, type === 'DEBIT' && styles.typeBtnTextActive]}>
                  ↑ Outflow (Expense / Debit)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeBtn, type === 'CREDIT' && styles.typeBtnCreditActive]}
                onPress={() => setType('CREDIT')}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeBtnText, type === 'CREDIT' && styles.typeBtnTextActive]}>
                  ↓ Inflow (Income / Credit)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Amount Input */}
            <Text style={styles.label}>AMOUNT (INR)</Text>
            <View style={styles.amountInputRow}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
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
              {PRESETS.map((val) => (
                <TouchableOpacity
                  key={val}
                  style={styles.presetChip}
                  onPress={() => setAmount(val.toString())}
                >
                  <Text style={styles.presetChipText}>+₹{val >= 1000 ? `${val / 1000}k` : val}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Description Input */}
            <Text style={styles.label}>DESCRIPTION / MERCHANT</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Swiggy, Amazon AWS, Infy Advisory"
              placeholderTextColor={theme.colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            {/* Category Selector */}
            <Text style={styles.label}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, category === cat && styles.catChipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Account Selector */}
            <Text style={styles.label}>POSTING ACCOUNT</Text>
            <View style={styles.accountPicker}>
              {accounts.slice(0, 4).map((acc) => (
                <TouchableOpacity
                  key={acc.id}
                  style={[
                    styles.accountChoice,
                    selectedAccount === acc.name && styles.accountChoiceActive,
                  ]}
                  onPress={() => setSelectedAccount(acc.name)}
                >
                  <Text
                    style={[
                      styles.accountChoiceText,
                      selectedAccount === acc.name && styles.accountChoiceTextActive,
                    ]}
                  >
                    {acc.name}
                  </Text>
                  <Text style={styles.accountChoiceMask}>{acc.accountNumberMask}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.8}>
              <Text style={styles.submitBtnText}>Post to General Ledger</Text>
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
    maxHeight: '90%',
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
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.cardSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '700',
  },
  formBody: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#EEF2EF',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  typeBtnDebitActive: {
    backgroundColor: theme.colors.negativeBgSolid,
  },
  typeBtnCreditActive: {
    backgroundColor: theme.colors.primaryLightSolid,
  },
  typeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  typeBtnTextActive: {
    color: theme.colors.textPrimary,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFCFA',
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primary,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    paddingVertical: 10,
    fontVariant: ['tabular-nums'],
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  presetChip: {
    backgroundColor: theme.colors.cardSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  presetChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  textInput: {
    backgroundColor: '#FAFCFA',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  chipsScroll: {
    marginBottom: 4,
  },
  catChip: {
    backgroundColor: theme.colors.cardSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 6,
  },
  catChipActive: {
    backgroundColor: theme.colors.primaryLightSolid,
    borderColor: theme.colors.primary,
  },
  catChipText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  catChipTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
  accountPicker: {
    gap: 6,
    marginBottom: 16,
  },
  accountChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.cardSubtle,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  accountChoiceActive: {
    backgroundColor: theme.colors.primaryLightSolid,
    borderColor: theme.colors.primary,
  },
  accountChoiceText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  accountChoiceTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
  accountChoiceMask: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: theme.colors.cardSubtle,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textWhite,
  },
});

