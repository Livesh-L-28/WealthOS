import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme, useTheme } from '../theme';

export const OnboardingChecklistCard: React.FC = () => {
  const { theme, isDark } = useTheme();

  const tasks = [
    { label: 'Bank & Demat Accounts Connected', status: 'Active (6)' },
    { label: 'Double-Entry General Journal Balanced', status: '₹0.00 Variance' },
    { label: 'Automated CAS / CAMS OCR Ingestion', status: 'Synchronized' },
    { label: 'Emergency Liquid Runway Set', status: '6.2 Months Target' },
  ];

  const cardBg = isDark ? '#111827' : '#FFFFFF';
  const borderColor = isDark ? '#1E293B' : '#E2E8F0';
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const emeraldPrimary = isDark ? '#34D399' : '#059669';
  const emeraldBg = isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5';

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: textSecondary }]}>LEDGER COMPLIANCE & SETUP</Text>
          <View style={[styles.completeBadge, { backgroundColor: emeraldBg }]}>
            <Text style={[styles.completeText, { color: emeraldPrimary }]}>4/4 COMPLETE</Text>
          </View>
        </View>
      </View>

      <View style={styles.tasksContainer}>
        {tasks.map((task, idx) => (
          <View key={idx} style={styles.taskRow}>
            <View style={[styles.checkCircle, { backgroundColor: emeraldBg }]}>
              <Text style={[styles.checkMark, { color: emeraldPrimary }]}>✓</Text>
            </View>
            <Text style={[styles.taskLabel, { color: textPrimary }]}>{task.label}</Text>
            <Text style={[styles.taskStatus, { color: emeraldPrimary }]}>{task.status}</Text>
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
