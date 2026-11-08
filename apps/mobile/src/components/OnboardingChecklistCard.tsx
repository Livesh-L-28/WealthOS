import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

export const OnboardingChecklistCard: React.FC = () => {
  const tasks = [
    { label: 'Bank & Demat Accounts Connected', status: 'Active (6)' },
    { label: 'Double-Entry General Journal Balanced', status: '₹0.00 Variance' },
    { label: 'Automated CAS / CAMS OCR Ingestion', status: 'Synchronized' },
    { label: 'Emergency Liquid Runway Set', status: '6.2 Months Target' },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>LEDGER COMPLIANCE & SETUP</Text>
          <View style={styles.completeBadge}>
            <Text style={styles.completeText}>4/4 COMPLETE</Text>
          </View>
        </View>
      </View>

      <View style={styles.tasksContainer}>
        {tasks.map((task, idx) => (
          <View key={idx} style={styles.taskRow}>
            <View style={styles.checkCircle}>
              <Text style={styles.checkMark}>✓</Text>
            </View>
            <Text style={styles.taskLabel}>{task.label}</Text>
            <Text style={styles.taskStatus}>{task.status}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FAFCFA',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 106, 0.3)',
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  completeBadge: {
    backgroundColor: theme.colors.primaryLightSolid,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  completeText: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  tasksContainer: {
    gap: 6,
    marginTop: 4,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primaryLightSolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: theme.colors.primaryDark,
    fontSize: 10,
    fontWeight: '800',
  },
  taskLabel: {
    flex: 1,
    fontSize: 11,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  taskStatus: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.primaryDark,
  },
});
