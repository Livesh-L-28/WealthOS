import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

interface FinancialHealthCardProps {
  score?: number;
  emergencyRunwayMonths?: number;
  debtToIncomePct?: number;
  solvencyRatio?: number;
}

export const FinancialHealthCard: React.FC<FinancialHealthCardProps> = ({
  score = 88,
  emergencyRunwayMonths = 6.2,
  debtToIncomePct = 18.2,
  solvencyRatio = 79.9,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>FINANCIAL HEALTH & SOLVENCY</Text>
            <Text style={styles.subtitle}>Autonomous Risk & Solvency Engine</Text>
          </View>
          <View style={styles.scorePill}>
            <Text style={styles.scoreText}>{score} / 100 · EXCELLENT</Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{emergencyRunwayMonths} Mos</Text>
            <Text style={styles.metricLabel}>Runway</Text>
            <Text style={styles.metricStatus}>Target 6.0m</Text>
          </View>

          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{debtToIncomePct}%</Text>
            <Text style={styles.metricLabel}>Debt-to-Income</Text>
            <Text style={styles.metricStatus}>Safe (&lt; 35%)</Text>
          </View>

          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{solvencyRatio}%</Text>
            <Text style={styles.metricLabel}>Solvency</Text>
            <Text style={styles.metricStatus}>5x Buffer</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 14,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 10.5,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  scorePill: {
    backgroundColor: theme.colors.primaryLightSolid,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scoreText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: 12,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#FAFCFA',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  metricLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  metricStatus: {
    fontSize: 8.5,
    fontWeight: '600',
    color: theme.colors.primaryDark,
    marginTop: 3,
    textAlign: 'center',
  },
});
