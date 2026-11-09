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
  const [bank, setBank] = useState(BANKS[0]);
  const [customName, setCustomName] = useState('');
  const [type, setType] = useState<'SAVINGS' | 'TERM_DEPOSIT' | 'DEMAT' | 'CREDIT_CARD' | 'LOAN'>('SAVINGS');
  const [balance, setBalance] = useState('');
  const [mask, setMask] = useState('•••• 6720');

  const handleConnect = () => {
    const bal = parseFloat(balance) || 50000;
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
              <Text style={styles.modalTitle}>Connect Institution</Text>
              <Text style={styles.modalSubtitle}>Link via Account Aggregator or Direct API</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
            {/* Institution Grid (Clean 2-Column Responsive) */}
            <Text style={styles.label}>SELECT FINANCIAL INSTITUTION</Text>
            <View style={styles.bankGrid}>
              {BANKS.map((b) => {
                const isActive = bank === b;
                return (
                  <TouchableOpacity
                    key={b}
                    style={[styles.bankCard, isActive && styles.bankCardActive]}
                    onPress={() => setBank(b)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.bankIcon}>🏛️</Text>
                    <Text style={[styles.bankName, isActive && styles.bankNameActive]}>
                      {b}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Account Name Input when Manual / Custom is selected */}
            {bank === 'Manual / Custom' && (
              <View style={styles.customFieldContainer}>
                <Text style={styles.label}>CUSTOM ACCOUNT NAME</Text>
                <TextInput
                  style={styles.maskInput}
                  placeholder="e.g. Kotak 811, Petty Cash, or Demat"
                  placeholderTextColor={theme.colors.textMuted}
                  value={customName}
                  onChangeText={setCustomName}
                />
              </View>
            )}

            {/* Account Category */}
            <Text style={styles.label}>ACCOUNT TYPE & CLASSIFICATION</Text>
            <View style={styles.typeRow}>
              {ACCOUNT_TYPES.map((t) => {
                const isActive = type === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typePill, isActive && styles.typePillActive]}
                    onPress={() => setType(t)}
                  >
                    <Text style={[styles.typeText, isActive && styles.typeTextActive]}>
                      {t.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Current Balance */}
            <Text style={styles.label}>VERIFIED CURRENT BALANCE (INR)</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencyPrefix}>₹</Text>
              <TextInput
                style={styles.textInput}
                placeholder="50,000"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                value={balance}
                onChangeText={setBalance}
              />
            </View>

            {/* Mask */}
            <Text style={styles.label}>ACCOUNT IDENTIFIER / MASK</Text>
            <TextInput
              style={styles.maskInput}
              placeholder="•••• 1234"
              placeholderTextColor={theme.colors.textMuted}
              value={mask}
              onChangeText={setMask}
            />
          </ScrollView>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleConnect} activeOpacity={0.8}>
              <Text style={styles.submitBtnText}>Connect & Sync</Text>
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
    maxHeight: '88%',
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
    backgroundColor: '#F0F4F1',
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
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },
  bankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bankCard: {
    width: '48.5%',
    backgroundColor: '#FAFCFA',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bankCardActive: {
    backgroundColor: theme.colors.primaryLightSolid,
    borderColor: theme.colors.primary,
  },
  bankIcon: {
    fontSize: 16,
  },
  bankName: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  bankNameActive: {
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typePill: {
    backgroundColor: '#F0F4F1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  typePillActive: {
    backgroundColor: theme.colors.primaryLightSolid,
    borderColor: theme.colors.primary,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  typeTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFCFA',
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primary,
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    paddingVertical: 10,
    fontVariant: ['tabular-nums'],
  },
  maskInput: {
    backgroundColor: '#FAFCFA',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: theme.colors.textPrimary,
    marginBottom: 16,
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
    backgroundColor: '#F0F4F1',
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
  customFieldContainer: {
    marginBottom: 4,
  },
});
