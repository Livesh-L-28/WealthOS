import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { theme } from '../theme';

interface QuickActionsSectionProps {
  onConnectBank: () => void;
  onImportStatement: () => void;
  onAddTransaction: () => void;
  onAskCopilot: () => void;
}

export const QuickActionsSection: React.FC<QuickActionsSectionProps> = ({
  onConnectBank,
  onImportStatement,
  onAddTransaction,
  onAskCopilot,
}) => {
  const actions = [
    {
      id: 'add',
      label: 'Add Entry',
      icon: '➕',
      onPress: onAddTransaction,
      isPrimary: true,
    },
    {
      id: 'connect',
      label: 'Link Bank',
      icon: '🏛️',
      onPress: onConnectBank,
    },
    {
      id: 'import',
      label: 'Import CAS',
      icon: '📄',
      onPress: onImportStatement,
    },
    {
      id: 'copilot',
      label: 'Copilot',
      icon: '✨',
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
            <View
              style={[
                styles.iconBox,
                act.isPrimary ? styles.iconBoxPrimary : styles.iconBoxSecondary,
              ]}
            >
              <Text
                style={[
                  styles.iconText,
                  act.isPrimary && styles.iconTextPrimary,
                ]}
              >
                {act.icon}
              </Text>
            </View>
            <Text style={[styles.actionLabel, act.isPrimary && styles.actionLabelPrimary]}>
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
    justifyContent: 'center',
    minWidth: 64,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  iconBoxPrimary: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  iconBoxSecondary: {
    backgroundColor: '#F0F4F1',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  iconText: {
    fontSize: 18,
  },
  iconTextPrimary: {
    color: theme.colors.textWhite,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  actionLabelPrimary: {
    color: theme.colors.primaryDark,
  },
});
