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
import { theme, useTheme } from '../theme';
import { BankAccount } from '../types';

interface ConnectAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (acc: BankAccount) => void;
}

const BANKS = [
  'HDFC Bank',
  'ICICI Bank',
  'State Bank of India',
  'Axis Bank',
  'Kotak Mahindra',
  'Zerodha Broking',
  'Manual / Custom',
];

const ACCOUNT_TYPES: Array<'SAVINGS' | 'TERM_DEPOSIT' | 'DEMAT' | 'CREDIT_CARD' | 'LOAN'> = [
  'SAVINGS',
  'TERM_DEPOSIT',
  'DEMAT',
  'CREDIT_CARD',
  'LOAN',
];

export const ConnectAccountModal: React.FC<ConnectAccountModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const { isDark } = useTheme();
  const sheetBg = isDark ? '#111827' : '#FFFFFF';
  const borderColor = isDark ? '#1F2937' : '#E2E8F0';
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const inputBg = isDark ? '#0B0F19' : '#F8FAFC';
  const cardSubtle = isDark ? '#1E293B' : '#F1F5F9';
  const borderSubtle = isDark ? '#334155' : '#CBD5E1';

  const [bank, setBank] = useState(BANKS[0]);
  const [customName, setCustomName] = useState('');
  const [type, setType] = useState<'SAVINGS' | 'TERM_DEPOSIT' | 'DEMAT' | 'CREDIT_CARD' | 'LOAN'>('SAVINGS');
  const [balance, setBalance] = useState('');
  const [mask, setMask] = useState('');

  const handleConnect = () => {
    const bal = parseFloat(balance) || 0;
    const isLiability = type === 'LOAN' || type === 'CREDIT_CARD';
    const isManual = bank === 'Manual / Custom';
    const accName = isManual
      ? (customName.trim() || 'Custom Ledger Account')
      : `${bank} ${type === 'SAVINGS' ? 'Savings' : type.replace('_', ' ')}`;

    const newAcc: BankAccount = {
      id: `acc-${Date.now()}`,
      name: accName,
      institution: isManual ? 'Custom Ledger' : bank,
      accountNumberMask: mask || '•••• 0000',
      type,
      category: isLiability ? 'LIABILITY' : 'ASSET',
      balance: bal,
      currency: 'INR',
      status: 'ACTIVE',
      lastSynced: 'Just now',
    };

    onSubmit(newAcc);
    setBalance('');
    setCustomName('');
    onClose();
  };

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
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Connect Institution</Text>
              <Text style={[styles.modalSubtitle, { color: textSecondary }]}>Link via Account Aggregator or Direct API</Text>
            </View>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: cardSubtle }]} onPress={onClose} activeOpacity={0.7}>
              <Text style={[styles.closeBtnText, { color: textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
            {/* Institution Grid (Clean 2-Column Responsive) */}
            <Text style={[styles.label, { color: textSecondary }]}>SELECT FINANCIAL INSTITUTION</Text>
            <View style={styles.bankGrid}>
              {BANKS.map((b) => {
                const isActive = bank === b;
                return (
                  <TouchableOpacity
                    key={b}
                    style={[
                      styles.bankCard,
                      {
                        backgroundColor: isActive
                          ? isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5'
                          : cardSubtle,
                        borderColor: isActive
                          ? isDark ? '#10B981' : '#059669'
                          : borderSubtle,
                      },
                    ]}
                    onPress={() => setBank(b)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.bankIcon}>🏛️</Text>
                    <Text
                      style={[
                        styles.bankName,
                        { color: isActive ? (isDark ? '#34D399' : '#059669') : textPrimary },
                        isActive && { fontWeight: '800' },
                      ]}
                    >
                      {b}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Account Name Input when Manual / Custom is selected */}
            {bank === 'Manual / Custom' && (
              <View style={styles.customFieldContainer}>
                <Text style={[styles.label, { color: textSecondary }]}>CUSTOM ACCOUNT NAME</Text>
                <TextInput
                  style={[styles.maskInput, { backgroundColor: inputBg, borderColor: borderSubtle, color: textPrimary }]}
                  placeholder="e.g. Physical Cash Reserve, Offshore Treasury"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  value={customName}
                  onChangeText={setCustomName}
                />
              </View>
            )}

            {/* Account Type Selector */}
            <Text style={[styles.label, { color: textSecondary }]}>ACCOUNT CATEGORY & TYPE</Text>
            <View style={styles.typeRow}>
              {ACCOUNT_TYPES.map((t) => {
                const isActive = type === t;
                const label =
                  t === 'SAVINGS'
                    ? 'Savings'
                    : t === 'TERM_DEPOSIT'
                    ? 'Term Deposit'
                    : t === 'DEMAT'
                    ? 'Demat / Stocks'
                    : t === 'CREDIT_CARD'
                    ? 'Credit Card'
                    : 'Loan / Mortgage';
                return (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typePill,
                      {
                        backgroundColor: isActive
                          ? isDark ? 'rgba(37, 99, 235, 0.25)' : '#EFF6FF'
                          : cardSubtle,
                        borderColor: isActive
                          ? isDark ? '#3B82F6' : '#2563EB'
                          : borderSubtle,
                      },
                    ]}
                    onPress={() => setType(t)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        { color: isActive ? (isDark ? '#60A5FA' : '#2563EB') : textSecondary },
                        isActive && { fontWeight: '800' },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Opening Balance Input */}
            <Text style={[styles.label, { color: textSecondary }]}>OPENING / CURRENT CLEARED BALANCE (INR)</Text>
            <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor: borderSubtle }]}>
              <Text style={[styles.currencyPrefix, { color: isDark ? '#10B981' : '#059669' }]}>₹</Text>
              <TextInput
                style={[styles.textInput, { color: textPrimary }]}
                placeholder="0.00"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                keyboardType="numeric"
                value={balance}
                onChangeText={setBalance}
              />
            </View>

            {/* Masked Account Number / Identifier */}
            <Text style={[styles.label, { color: textSecondary }]}>ACCOUNT NUMBER / IDENTIFIER (MASKED)</Text>
            <TextInput
              style={[styles.maskInput, { backgroundColor: inputBg, borderColor: borderSubtle, color: textPrimary }]}
              placeholder="•••• 1234"
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={mask}
              onChangeText={setMask}
            />
          </ScrollView>

          {/* Action Footer Buttons */}
          <View style={[styles.actionRow, { borderTopColor: borderColor }]}>
            <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: cardSubtle }]} onPress={onClose} activeOpacity={0.7}>
              <Text style={[styles.cancelBtnText, { color: textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.submitBtn} onPress={handleConnect} activeOpacity={0.8}>
              <Text style={styles.submitBtnText}>✓ Add Account to Ledger</Text>
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
    maxHeight: '90%',
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
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 10,
  },
  bankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  bankCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  bankIcon: {
    fontSize: 16,
  },
  bankName: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  typePill: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '800',
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 10,
    fontVariant: ['tabular-nums'],
  },
  maskInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 16,
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
    paddingVertical: 12,
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
    paddingVertical: 12,
    backgroundColor: '#10B981',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  customFieldContainer: {
    marginBottom: 4,
  },
});
