import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { theme } from '../theme';

interface QuickAddModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectExpense: () => void;
  onSelectIncome: () => void;
  onSelectConnectBank: () => void;
  onSelectImportStatement: () => void;
  onSelectAddInvestment: () => void;
  onSelectCreateBudget: () => void;
  onSelectCopilot: () => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  visible,
  onClose,
  onSelectExpense,
  onSelectIncome,
  onSelectConnectBank,
  onSelectImportStatement,
  onSelectAddInvestment,
  onSelectCreateBudget,
  onSelectCopilot,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.dragPill} />

              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.title}>Quick Financial Action</Text>
                  <Text style={styles.subtitle}>Post verified transactions to double-entry ledger</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Primary Dual Actions: Expense & Income */}
              <View style={styles.primaryGrid}>
                {/* Add Expense (Outflow) */}
                <TouchableOpacity
                  style={[styles.primaryCard, styles.expenseCard]}
                  onPress={() => {
                    onClose();
                    onSelectExpense();
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.iconCircleRed}>
                    <Text style={styles.iconArrowRed}>↑</Text>
                  </View>
                  <View style={styles.primaryTextCol}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.expenseTitle}>Add Expense</Text>
                      <View style={styles.tagRed}>
                        <Text style={styles.tagTextRed}>OUTFLOW</Text>
                      </View>
                    </View>
                    <Text style={styles.cardSub}>Living costs, bills, dining, EMIs</Text>
                  </View>
                </TouchableOpacity>

                {/* Add Income (Inflow) */}
                <TouchableOpacity
                  style={[styles.primaryCard, styles.incomeCard]}
                  onPress={() => {
                    onClose();
                    onSelectIncome();
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.iconCircleGreen}>
                    <Text style={styles.iconArrowGreen}>↓</Text>
                  </View>
                  <View style={styles.primaryTextCol}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.incomeTitle}>Add Income</Text>
                      <View style={styles.tagGreen}>
                        <Text style={styles.tagTextGreen}>INFLOW</Text>
                      </View>
                    </View>
                    <Text style={styles.cardSub}>Salary, dividends, client retainers</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Secondary Strategic Financial Actions */}
              <View style={styles.sectionDivider} />
              <Text style={styles.sectionLabel}>ENTERPRISE PORTFOLIO & WEALTH OPS</Text>

              <View style={styles.actionList}>
                {/* Link Institution Account */}
                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => {
                    onClose();
                    onSelectConnectBank();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionIconBox}>
                    <Text style={styles.actionIcon}>🏛️</Text>
                  </View>
                  <View style={styles.actionInfoCol}>
                    <Text style={styles.actionItemTitle}>Link Financial Institution</Text>
                    <Text style={styles.actionItemSub}>Connect bank, demat, or credit facility</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>

                {/* Add Investment Asset */}
                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => {
                    onClose();
                    onSelectAddInvestment();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionIconBox}>
                    <Text style={styles.actionIcon}>📈</Text>
                  </View>
                  <View style={styles.actionInfoCol}>
                    <Text style={styles.actionItemTitle}>Add Investment Holding</Text>
                    <Text style={styles.actionItemSub}>Stocks, Mutual Funds, SGBs, Fixed Deposits</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>

                {/* Create Budget Envelope */}
                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => {
                    onClose();
                    onSelectCreateBudget();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionIconBox}>
                    <Text style={styles.actionIcon}>🎯</Text>
                  </View>
                  <View style={styles.actionInfoCol}>
                    <Text style={styles.actionItemTitle}>Create Budget Envelope</Text>
                    <Text style={styles.actionItemSub}>Set monthly spending cap & envelope limit</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>

                {/* Import Statement */}
                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => {
                    onClose();
                    onSelectImportStatement();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionIconBox}>
                    <Text style={styles.actionIcon}>📄</Text>
                  </View>
                  <View style={styles.actionInfoCol}>
                    <Text style={styles.actionItemTitle}>Import CAS / Bank PDF</Text>
                    <Text style={styles.actionItemSub}>OCR auto-extract with arithmetic reconciliation</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>

                {/* Ask Copilot */}
                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => {
                    onClose();
                    onSelectCopilot();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: '#F0FDF4' }]}>
                    <Text style={styles.actionIcon}>✨</Text>
                  </View>
                  <View style={styles.actionInfoCol}>
                    <Text style={[styles.actionItemTitle, { color: theme.colors.primaryDark }]}>
                      Ask Financial Copilot
                    </Text>
                    <Text style={styles.actionItemSub}>Run AI scenario analysis & runway projections</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              </View>
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
    backgroundColor: 'rgba(15, 23, 20, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 12,
  },
  dragPill: {
    width: 40,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.borderStrong,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  closeBtnText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '700',
  },
  primaryGrid: {
    gap: 10,
  },
  primaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  expenseCard: {
    backgroundColor: '#FFFDFD',
    borderColor: '#FECACA',
    shadowColor: theme.colors.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  incomeCard: {
    backgroundColor: '#FCFFFD',
    borderColor: '#BBF7D0',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconCircleRed: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleGreen: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconArrowRed: {
    fontSize: 20,
    fontWeight: '900',
    color: '#DC2626',
    marginTop: -2,
  },
  iconArrowGreen: {
    fontSize: 20,
    fontWeight: '900',
    color: '#16A36A',
    marginTop: -2,
  },
  primaryTextCol: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  expenseTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#991B1B',
  },
  incomeTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#087A50',
  },
  tagRed: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  tagTextRed: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.4,
  },
  tagGreen: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  tagTextGreen: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#16A36A',
    letterSpacing: 0.4,
  },
  cardSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 14,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  actionList: {
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  actionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 16,
  },
  actionInfoCol: {
    flex: 1,
  },
  actionItemTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  actionItemSub: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  chevron: {
    fontSize: 16,
    color: theme.colors.textTertiary,
    fontWeight: '600',
  },
});

