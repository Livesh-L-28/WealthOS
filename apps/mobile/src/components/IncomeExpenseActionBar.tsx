import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { theme, useTheme } from '../theme';

interface IncomeExpenseActionBarProps {
  onAddExpense: () => void;
  onAddIncome: () => void;
}

export const IncomeExpenseActionBar: React.FC<IncomeExpenseActionBarProps> = ({
  onAddExpense,
  onAddIncome,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.actionRow}>
        {/* Primary Add Expense Button */}
        <TouchableOpacity
          style={[
            styles.expenseCard,
            {
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA',
            },
          ]}
          onPress={onAddExpense}
          activeOpacity={0.8}
          accessibilityLabel="Add Expense (Outflow)"
        >
          <View
            style={[
              styles.iconCircleRed,
              { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2' },
            ]}
          >
            <Text style={[styles.iconArrowRed, { color: isDark ? '#F87171' : '#DC2626' }]}>↑</Text>
          </View>
          <View style={styles.textCol}>
            <View style={styles.titleBadgeRow}>
              <Text style={[styles.actionTitleRed, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
                − Add Expense
              </Text>
              <View
                style={[
                  styles.tagRed,
                  { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2' },
                ]}
              >
                <Text style={[styles.tagTextRed, { color: isDark ? '#F87171' : '#DC2626' }]}>
                  OUTFLOW
                </Text>
              </View>
            </View>
            <Text style={[styles.actionSubtext, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Spend, bills, EMIs & dining
            </Text>
          </View>
        </TouchableOpacity>

        {/* Primary Add Income Button */}
        <TouchableOpacity
          style={[
            styles.incomeCard,
            {
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : '#BBF7D0',
            },
          ]}
          onPress={onAddIncome}
          activeOpacity={0.8}
          accessibilityLabel="Add Income (Inflow)"
        >
          <View
            style={[
              styles.iconCircleGreen,
              { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7' },
            ]}
          >
            <Text style={[styles.iconArrowGreen, { color: isDark ? '#34D399' : '#059669' }]}>↓</Text>
          </View>
          <View style={styles.textCol}>
            <View style={styles.titleBadgeRow}>
              <Text style={[styles.actionTitleGreen, { color: isDark ? '#6EE7B7' : '#047857' }]}>
                + Add Income
              </Text>
              <View
                style={[
                  styles.tagGreen,
                  { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5' },
                ]}
              >
                <Text style={[styles.tagTextGreen, { color: isDark ? '#34D399' : '#059669' }]}>
                  INFLOW
                </Text>
              </View>
            </View>
            <Text style={[styles.actionSubtext, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Salary, dividend & yield
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
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

