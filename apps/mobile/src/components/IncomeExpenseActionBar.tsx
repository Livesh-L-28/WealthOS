import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { theme } from '../theme';

interface IncomeExpenseActionBarProps {
  onAddExpense: () => void;
  onAddIncome: () => void;
}

export const IncomeExpenseActionBar: React.FC<IncomeExpenseActionBarProps> = ({
  onAddExpense,
  onAddIncome,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.actionRow}>
        {/* Primary Add Expense Button */}
        <TouchableOpacity
          style={styles.expenseCard}
          onPress={onAddExpense}
          activeOpacity={0.8}
          accessibilityLabel="Add Expense (Outflow)"
        >
          <View style={styles.iconCircleRed}>
            <Text style={styles.iconArrowRed}>↑</Text>
          </View>
          <View style={styles.textCol}>
            <View style={styles.titleBadgeRow}>
              <Text style={styles.actionTitleRed}>− Add Expense</Text>
              <View style={styles.tagRed}>
                <Text style={styles.tagTextRed}>OUTFLOW</Text>
              </View>
            </View>
            <Text style={styles.actionSubtext}>Spend, bills, EMIs & dining</Text>
          </View>
        </TouchableOpacity>

        {/* Primary Add Income Button */}
        <TouchableOpacity
          style={styles.incomeCard}
          onPress={onAddIncome}
          activeOpacity={0.8}
          accessibilityLabel="Add Income (Inflow)"
        >
          <View style={styles.iconCircleGreen}>
            <Text style={styles.iconArrowGreen}>↓</Text>
          </View>
          <View style={styles.textCol}>
            <View style={styles.titleBadgeRow}>
              <Text style={styles.actionTitleGreen}>+ Add Income</Text>
              <View style={styles.tagGreen}>
                <Text style={styles.tagTextGreen}>INFLOW</Text>
              </View>
            </View>
            <Text style={styles.actionSubtext}>Salary, dividend & yield</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  expenseCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: theme.colors.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  incomeCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  iconCircleRed: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleGreen: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconArrowRed: {
    fontSize: 18,
    fontWeight: '800',
    color: '#DC2626',
    marginTop: -2,
  },
  iconArrowGreen: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16A36A',
    marginTop: -2,
  },
  textCol: {
    flex: 1,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    marginBottom: 2,
  },
  actionTitleRed: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
  },
  actionTitleGreen: {
    fontSize: 13,
    fontWeight: '800',
    color: '#087A50',
  },
  tagRed: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tagTextRed: {
    fontSize: 8,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.3,
  },
  tagGreen: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tagTextGreen: {
    fontSize: 8,
    fontWeight: '800',
    color: '#16A36A',
    letterSpacing: 0.3,
  },
  actionSubtext: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});

