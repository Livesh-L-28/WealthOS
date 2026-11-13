import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { theme, useTheme } from '../theme';

interface QuickActionsSectionProps {
  onConnectBank: () => void;
  onImportStatement: () => void;
  onAddTransaction: () => void;
  onAddExpense?: () => void;
  onAddIncome?: () => void;
  onAddInvestment?: () => void;
  onScanReceipt?: () => void;
  onAskCopilot: () => void;
  accountsCount?: number;
}

export const QuickActionsSection: React.FC<QuickActionsSectionProps> = ({
  onConnectBank,
  onImportStatement,
  onAddTransaction,
  onAddExpense,
  onAddIncome,
  onAddInvestment,
  onScanReceipt,
  onAskCopilot,
  accountsCount = 0,
}) => {
  const { theme, isDark } = useTheme();

  const actions = [
    {
      id: 'connect',
      label: 'Link Bank',
      icon: '🏛️',
      sublabel: `${accountsCount} Linked`,
      onPress: onConnectBank,
    },
    {
      id: 'scan',
      label: 'Scan Bill',
      icon: '📷',
      sublabel: 'AI OCR',
      onPress: onScanReceipt || onAddTransaction,
    },
    {
      id: 'import',
      label: 'Import CAS',
      icon: '📄',
      sublabel: 'Bank / MF',
      onPress: onImportStatement,
    },
    {
      id: 'invest',
      label: 'Add Asset',
      icon: '📈',
      sublabel: 'Equities',
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
      <View
        style={[
          styles.dock,
          {
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
            borderColor: isDark ? '#1E293B' : '#E2E8F0',
          },
        ]}
      >
        {actions.map((act) => (
          <TouchableOpacity
            key={act.id}
            style={styles.actionItem}
            onPress={act.onPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${act.label}, ${act.sublabel}`}
          >
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              <Text style={styles.iconText}>{act.icon}</Text>
            </View>
            <Text
              style={[styles.actionLabel, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
              numberOfLines={1}
            >
              {act.label}
            </Text>
            <Text
              style={[styles.actionSublabel, { color: isDark ? '#94A3B8' : '#64748B' }]}
              numberOfLines={1}
            >
              {act.sublabel}
            </Text>
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
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 106, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  actionItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 2,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  iconText: {
    fontSize: 18,
  },
  actionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  actionSublabel: {
    fontSize: 8.5,
    color: theme.colors.textTertiary,
    marginTop: 1,
    textAlign: 'center',
  },
});
