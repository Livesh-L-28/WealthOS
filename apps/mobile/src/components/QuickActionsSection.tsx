import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { theme } from '../theme';

interface QuickActionsSectionProps {
  onConnectBank: () => void;
  onImportStatement: () => void;
  onAddTransaction: () => void;
  onAddExpense?: () => void;
  onAddIncome?: () => void;
  onAskCopilot: () => void;
}

export const QuickActionsSection: React.FC<QuickActionsSectionProps> = ({
  onConnectBank,
  onImportStatement,
  onAddTransaction,
  onAddExpense,
  onAddIncome,
  onAskCopilot,
}) => {
  const actions = onAddExpense && onAddIncome
    ? [
        {
          id: 'expense',
          label: '− Expense',
          icon: '↑',
          onPress: onAddExpense,
          variant: 'expense',
        },
        {
          id: 'income',
          label: '+ Income',
          icon: '↓',
          onPress: onAddIncome,
          variant: 'income',
        },
        {
          id: 'connect',
          label: 'Link Bank',
          icon: '🏛️',
          onPress: onConnectBank,
          variant: 'default',
        },
        {
          id: 'import',
          label: 'Import CAS',
          icon: '📄',
          onPress: onImportStatement,
          variant: 'default',
        },
      ]
    : [
        {
          id: 'add',
          label: 'Add Entry',
          icon: '➕',
          onPress: onAddTransaction,
          variant: 'income',
        },
        {
          id: 'connect',
          label: 'Link Bank',
          icon: '🏛️',
          onPress: onConnectBank,
          variant: 'default',
        },
        {
          id: 'import',
          label: 'Import CAS',
          icon: '📄',
          onPress: onImportStatement,
          variant: 'default',
        },
        {
          id: 'copilot',
          label: 'Copilot',
          icon: '✨',
          onPress: onAskCopilot,
          variant: 'default',
        },
      ];

  return (
    <View style={styles.container}>
      <View style={styles.dock}>
        {actions.map((act) => (
          <TouchableOpacity
            key={act.id}
            style={styles.actionItem}
            onPress={act.onPress}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconBox,
                act.variant === 'expense' && styles.iconBoxExpense,
                act.variant === 'income' && styles.iconBoxIncome,
                act.variant === 'default' && styles.iconBoxSecondary,
              ]}
            >
              <Text
                style={[
                  styles.iconText,
                  act.variant === 'expense' && styles.iconTextExpense,
                  act.variant === 'income' && styles.iconTextIncome,
                ]}
              >
                {act.icon}
              </Text>
            </View>
            <Text
              style={[
                styles.actionLabel,
                act.variant === 'expense' && styles.actionLabelExpense,
                act.variant === 'income' && styles.actionLabelIncome,
              ]}
            >
              {act.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 14,
  },
  dock: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2,
  },
  actionItem: {
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  iconBoxExpense: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  iconBoxIncome: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  iconBoxSecondary: {
    backgroundColor: theme.colors.cardSubtle,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  iconText: {
    fontSize: 18,
  },
  iconTextExpense: {
    fontSize: 18,
    fontWeight: '900',
    color: '#DC2626',
    marginTop: -2,
  },
  iconTextIncome: {
    fontSize: 18,
    fontWeight: '900',
    color: '#16A36A',
    marginTop: -2,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  actionLabelExpense: {
    color: '#991B1B',
  },
  actionLabelIncome: {
    color: '#087A50',
  },
});
