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
      id: 'connect',
      title: 'Connect Bank',
      subtitle: 'Account Aggregator',
      icon: '🏛️',
      onPress: onConnectBank,
      isPrimary: true,
    },
    {
      id: 'import',
      title: 'Import CAS/PDF',
      subtitle: 'OCR Statement Parser',
      icon: '📄',
      onPress: onImportStatement,
    },
    {
      id: 'add',
      title: 'Add Entry',
      subtitle: 'Double-Entry Ledger',
      icon: '➕',
      onPress: onAddTransaction,
    },
    {
      id: 'copilot',
      title: 'Ask Copilot',
      subtitle: 'AI Financial Twin',
      icon: '✨',
      onPress: onAskCopilot,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeaderTitle}>QUICK ACTIONS</Text>
      <View style={styles.actionGrid}>
        {actions.map((act) => (
          <TouchableOpacity
            key={act.id}
            style={[styles.actionCard, act.isPrimary && styles.actionCardPrimary]}
            onPress={act.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrapper, act.isPrimary && styles.iconWrapperPrimary]}>
              <Text style={styles.iconText}>{act.icon}</Text>
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.actionTitle, act.isPrimary && styles.actionTitlePrimary]}>
                {act.title}
              </Text>
              <Text style={styles.actionSubtitle}>{act.subtitle}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginVertical: 6,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionCard: {
    width: '48.6%',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  actionCardPrimary: {
    borderColor: 'rgba(22, 163, 106, 0.4)',
    backgroundColor: '#FAFCFA',
  },
  iconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.colors.cardSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperPrimary: {
    backgroundColor: theme.colors.primaryLightSolid,
  },
  iconText: {
    fontSize: 16,
  },
  textContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  actionTitlePrimary: {
    color: theme.colors.primaryDark,
  },
  actionSubtitle: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
});

