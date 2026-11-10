import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { useTheme } from '../theme';

interface QuickAddModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectExpense: () => void;
  onSelectIncome: () => void;
  onSelectTransfer: () => void;
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
  onSelectTransfer,
  onSelectConnectBank,
  onSelectImportStatement,
  onSelectAddInvestment,
  onSelectCreateBudget,
  onSelectCopilot,
}) => {
  const { theme } = useTheme();

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
                    Quick Actions
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                    Record a transaction, transfer money, or manage your wealth
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                  <Text style={[styles.closeBtnText, { color: theme.colors.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Primary Dual Actions: Expense & Income */}
                <View style={styles.primaryGrid}>
                  {/* Add Expense (Outflow) */}
                  <TouchableOpacity
                    style={[
                      styles.primaryCard,
                      {
                        backgroundColor: theme.colors.negativeBgSolid,
                        borderColor: 'rgba(220, 38, 38, 0.25)',
                      },
                    ]}
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
                        <Text style={[styles.expenseTitle, { color: theme.colors.negativeDark }]}>
                          Add Expense
                        </Text>
                        <View style={styles.tagRed}>
                          <Text style={styles.tagTextRed}>OUTFLOW</Text>
                        </View>
                      </View>
                      <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]}>
                        Living costs, bills, dining, EMIs
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Add Income (Inflow) */}
                  <TouchableOpacity
                    style={[
                      styles.primaryCard,
                      {
                        backgroundColor: theme.colors.positiveBgSolid,
                        borderColor: 'rgba(5, 150, 105, 0.25)',
                      },
                    ]}
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
                        <Text style={[styles.incomeTitle, { color: theme.colors.positiveDark }]}>
                          Add Income
                        </Text>
                        <View style={styles.tagGreen}>
                          <Text style={styles.tagTextGreen}>INFLOW</Text>
                        </View>
                      </View>
                      <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]}>
                        Salary, dividends, retainers
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Transfer Funds Action Button */}
                <TouchableOpacity
                  style={[
                    styles.transferCard,
                    {
                      backgroundColor: theme.colors.primaryLightSolid,
                      borderColor: 'rgba(37, 99, 235, 0.25)',
                    },
                  ]}
                  onPress={() => {
                    onClose();
                    onSelectTransfer();
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[styles.transferIconBox, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.transferIconText}>⇄</Text>
                  </View>
                  <View style={styles.transferTextCol}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={[styles.transferTitle, { color: theme.colors.primaryDark }]}>
                        Transfer Between Accounts
                      </Text>
                      <View style={[styles.tagBlue, { backgroundColor: theme.colors.primary }]}>
                        <Text style={styles.tagTextWhite}>TRANSFER</Text>
                      </View>
                    </View>
                    <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]}>
                      Move funds between verified banks with zero double-entry float
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Secondary Strategic Financial Actions */}
                <View style={[styles.sectionDivider, { backgroundColor: theme.colors.border }]} />
                <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
                  PORTFOLIO & WEALTH OPERATIONS
                </Text>

                <View style={styles.actionList}>
                  {/* Link Institution Account */}
                  <TouchableOpacity
                    style={[styles.actionRow, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
                    onPress={() => {
                      onClose();
                      onSelectConnectBank();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconPill, { backgroundColor: theme.colors.primaryLightSolid }]}>
                      <Text style={styles.actionIcon}>🏛️</Text>
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={[styles.actionTitle, { color: theme.colors.textPrimary }]}>
                        Connect Bank or Demat
                      </Text>
                      <Text style={[styles.actionSub, { color: theme.colors.textSecondary }]}>
                        Link bank account, FD or brokerage
                      </Text>
                    </View>
                    <Text style={[styles.actionArrow, { color: theme.colors.primary }]}>›</Text>
                  </TouchableOpacity>

                  {/* Add Investment */}
                  <TouchableOpacity
                    style={[styles.actionRow, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
                    onPress={() => {
                      onClose();
                      onSelectAddInvestment();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconPill, { backgroundColor: theme.colors.primaryLightSolid }]}>
                      <Text style={styles.actionIcon}>📈</Text>
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={[styles.actionTitle, { color: theme.colors.textPrimary }]}>
                        Add Investment Holding
                      </Text>
                      <Text style={[styles.actionSub, { color: theme.colors.textSecondary }]}>
                        Record equities, mutual fund lots, or SGBs
                      </Text>
                    </View>
                    <Text style={[styles.actionArrow, { color: theme.colors.primary }]}>›</Text>
                  </TouchableOpacity>

                  {/* Import Statement */}
                  <TouchableOpacity
                    style={[styles.actionRow, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
                    onPress={() => {
                      onClose();
                      onSelectImportStatement();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconPill, { backgroundColor: theme.colors.primaryLightSolid }]}>
                      <Text style={styles.actionIcon}>📄</Text>
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={[styles.actionTitle, { color: theme.colors.textPrimary }]}>
                        Import Statement OCR
                      </Text>
                      <Text style={[styles.actionSub, { color: theme.colors.textSecondary }]}>
                        Extract PDF / Excel with AI cross-verification
                      </Text>
                    </View>
                    <Text style={[styles.actionArrow, { color: theme.colors.primary }]}>›</Text>
                  </TouchableOpacity>

                  {/* Create Budget Envelope */}
                  <TouchableOpacity
                    style={[styles.actionRow, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
                    onPress={() => {
                      onClose();
                      onSelectCreateBudget();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconPill, { backgroundColor: theme.colors.primaryLightSolid }]}>
                      <Text style={styles.actionIcon}>◔</Text>
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={[styles.actionTitle, { color: theme.colors.textPrimary }]}>
                        Create Budget Envelope
                      </Text>
                      <Text style={[styles.actionSub, { color: theme.colors.textSecondary }]}>
                        Zero-based monthly spending cap
                      </Text>
                    </View>
                    <Text style={[styles.actionArrow, { color: theme.colors.primary }]}>›</Text>
                  </TouchableOpacity>
                </View>
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
    maxHeight: '88%',
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
  primaryGrid: {
    gap: 10,
    marginBottom: 10,
  },
  primaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconCircleRed: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconArrowRed: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  iconCircleGreen: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconArrowGreen: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
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
    fontSize: 15,
    fontWeight: '800',
  },
  incomeTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  tagRed: {
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagTextRed: {
    color: '#DC2626',
    fontSize: 9,
    fontWeight: '800',
  },
  tagGreen: {
    backgroundColor: 'rgba(5, 150, 105, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagTextGreen: {
    color: '#059669',
    fontSize: 9,
    fontWeight: '800',
  },
  cardSub: {
    fontSize: 11,
  },
  transferCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  transferIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transferIconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  transferTextCol: {
    flex: 1,
  },
  transferTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  tagBlue: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagTextWhite: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  sectionDivider: {
    height: 1,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  actionList: {
    gap: 8,
    paddingBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionIconPill: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionIcon: {
    fontSize: 16,
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  actionSub: {
    fontSize: 11,
  },
  actionArrow: {
    fontSize: 16,
    fontWeight: '700',
  },
});
