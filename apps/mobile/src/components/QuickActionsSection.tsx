import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { theme } from '../theme';

interface QuickActionsSectionProps {
  onConnectBank: () => void;
  onImportStatement: () => void;
  onAddTransaction: () => void;
  onAddExpense?: () => void;
  onAddIncome?: () => void;
  onAddInvestment?: () => void;
  onAskCopilot: () => void;
}

export const QuickActionsSection: React.FC<QuickActionsSectionProps> = ({
  onConnectBank,
  onImportStatement,
  onAddTransaction,
  onAddExpense,
  onAddIncome,
  onAddInvestment,
  onAskCopilot,
}) => {
  const actions = [
    {
      id: 'connect',
      label: 'Link Bank',
      icon: '🏛️',
      sublabel: '6 Connected',
      onPress: onConnectBank,
    },
    {
      id: 'import',
      label: 'Import CAS',
      icon: '📄',
      sublabel: 'CAMS / KFin',
      onPress: onImportStatement,
    },
    {
      id: 'invest',
      label: 'Add Asset',
      icon: '📈',
      sublabel: 'MF / Equity',
      onPress: onAddInvestment || onAddTransaction,
    },
    {
      id: 'copilot',
      label: 'Copilot AI',
      icon: '✨',
      sublabel: 'Live Twin',
      onPress: onAskCopilot,
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
            <View style={styles.iconBox}>
              <Text style={styles.iconText}>{act.icon}</Text>
            </View>
            <Text style={styles.actionLabel}>{act.label}</Text>
            <Text style={styles.actionSublabel}>{act.sublabel}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 14,
  },
  dock: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 106, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
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
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  iconText: {
    fontSize: 20,
  },
  actionLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  actionSublabel: {
    fontSize: 9,
    color: theme.colors.textTertiary,
    marginTop: 1,
    textAlign: 'center',
  },
});
