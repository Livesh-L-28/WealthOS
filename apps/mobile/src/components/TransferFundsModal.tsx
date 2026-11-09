import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { useTheme } from '../theme';
import { BankAccount } from '../types';
import { formatINR } from '../formatters';

interface TransferFundsModalProps {
  visible: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  onSubmit: (transfer: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    notes?: string;
  }) => void;
}

export const TransferFundsModal: React.FC<TransferFundsModalProps> = ({
  visible,
  onClose,
  accounts,
  onSubmit,
}) => {
  const { theme } = useTheme();
  const assetAccounts = accounts.filter((a) => a.category === 'ASSET');

  const [fromAccountId, setFromAccountId] = useState(assetAccounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(assetAccounts[1]?.id || '');
  const [amountStr, setAmountStr] = useState('');
  const [notes, setNotes] = useState('Account-to-account treasury transfer');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fromAcc = accounts.find((a) => a.id === fromAccountId);
  const toAcc = accounts.find((a) => a.id === toAccountId);

  const handleTransfer = () => {
    const val = parseFloat(amountStr.replace(/,/g, ''));
    if (!val || val <= 0) {
      setErrorMsg('Please enter a valid transfer amount.');
      return;
    }
    if (fromAccountId === toAccountId) {
      setErrorMsg('Source and destination accounts must be different.');
      return;
    }
    if (fromAcc && val > fromAcc.balance) {
      setErrorMsg(`Insufficient funds in ${fromAcc.name} (Max: ${formatINR(fromAcc.balance)})`);
      return;
    }

    setErrorMsg(null);
    onSubmit({
      fromAccountId,
      toAccountId,
      amount: val,
      notes,
    });
    setAmountStr('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
              <View style={[styles.dragPill, { backgroundColor: theme.colors.borderStrong }]} />

              <View style={styles.headerRow}>
                <View>
                  <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                    Transfer Between Accounts
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                    Balanced double-entry journal transfer with zero float
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                  <Text style={[styles.closeBtnText, { color: theme.colors.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {errorMsg && (
                  <View style={[styles.errorBox, { backgroundColor: theme.colors.negativeBgSolid }]}>
                    <Text style={[styles.errorText, { color: theme.colors.negativeDark }]}>
                      ⚠️ {errorMsg}
                    </Text>
                  </View>
                )}

                {/* Amount Input */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                    TRANSFER AMOUNT (INR)
                  </Text>
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        backgroundColor: theme.colors.cardSubtle,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.currencySymbol, { color: theme.colors.primary }]}>₹</Text>
                    <TextInput
                      style={[styles.inputAmount, { color: theme.colors.textPrimary }]}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor={theme.colors.textTertiary}
                      value={amountStr}
                      onChangeText={setAmountStr}
                      autoFocus
                    />
                  </View>
                </View>

                {/* Source Account */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                    FROM (CREDIT SOURCE)
                  </Text>
                  <View style={styles.accountPills}>
                    {assetAccounts.map((acc) => {
                      const isSelected = fromAccountId === acc.id;
                      return (
                        <TouchableOpacity
                          key={`from-${acc.id}`}
                          style={[
                            styles.accPill,
                            {
                              backgroundColor: isSelected
                                ? theme.colors.primaryLightSolid
                                : theme.colors.cardSubtle,
                              borderColor: isSelected
                                ? theme.colors.primary
                                : theme.colors.border,
                            },
                          ]}
                          onPress={() => setFromAccountId(acc.id)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.accPillText,
                              {
                                color: isSelected
                                  ? theme.colors.primary
                                  : theme.colors.textPrimary,
                              },
                            ]}
                          >
                            {acc.name}
                          </Text>
                          <Text style={[styles.accPillBal, { color: theme.colors.textSecondary }]}>
                            {formatINR(acc.balance)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Destination Account */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                    TO (DEBIT DESTINATION)
                  </Text>
                  <View style={styles.accountPills}>
                    {assetAccounts.map((acc) => {
                      const isSelected = toAccountId === acc.id;
                      return (
                        <TouchableOpacity
                          key={`to-${acc.id}`}
                          style={[
                            styles.accPill,
                            {
                              backgroundColor: isSelected
                                ? theme.colors.primaryLightSolid
                                : theme.colors.cardSubtle,
                              borderColor: isSelected
                                ? theme.colors.primary
                                : theme.colors.border,
                            },
                          ]}
                          onPress={() => setToAccountId(acc.id)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.accPillText,
                              {
                                color: isSelected
                                  ? theme.colors.primary
                                  : theme.colors.textPrimary,
                              },
                            ]}
                          >
                            {acc.name}
                          </Text>
                          <Text style={[styles.accPillBal, { color: theme.colors.textSecondary }]}>
                            {formatINR(acc.balance)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Notes Input */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>MEMO / NOTE</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: theme.colors.cardSubtle,
                        borderColor: theme.colors.border,
                        color: theme.colors.textPrimary,
                      },
                    ]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="E.g. Treasury rebalance"
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                </View>

                {/* Execution Button */}
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleTransfer}
                  activeOpacity={0.85}
                >
                  <Text style={styles.submitText}>Post Transfer to Ledger</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  dragPill: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  errorBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '800',
    marginRight: 6,
  },
  inputAmount: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
  },
  accountPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  accPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  accPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  accPillBal: {
    fontSize: 10,
    marginTop: 2,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
  },
  submitButton: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});

