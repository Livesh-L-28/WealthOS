import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { theme, useTheme } from '../theme';

interface FinancialHealthCardProps {
  totalAssets?: number;
  totalLiabilities?: number;
  monthlyInflows?: number;
  monthlyOutflows?: number;
  onPress?: () => void;
}

export const FinancialHealthCard: React.FC<FinancialHealthCardProps> = ({
  totalAssets = 0,
  totalLiabilities = 0,
  monthlyInflows = 0,
  monthlyOutflows = 0,
  onPress,
}) => {
  const { isDark } = useTheme();
  const hasData = totalAssets > 0 || totalLiabilities > 0 || monthlyInflows > 0 || monthlyOutflows > 0;

  // Real calculations
  const emergencyRunwayMonths =
    monthlyOutflows > 0
      ? (totalAssets / monthlyOutflows).toFixed(1)
      : totalAssets > 0
      ? '12+'
      : '0.0';

  const debtToIncomePct =
    monthlyInflows > 0
      ? Math.min(100, Math.round((totalLiabilities / monthlyInflows) * 100))
      : totalLiabilities > 0
      ? 100
      : 0;

  const solvencyRatio =
    totalAssets > 0
      ? Math.max(0, Math.min(100, Math.round(((totalAssets - totalLiabilities) / totalAssets) * 100)))
      : 100;

  // Calculate dynamic composite health score
  let score = 0;
  let ratingText = 'INITIALIZING';
  let ratingColor = isDark ? '#94A3B8' : '#64748B';

  if (!hasData) {
    score = 0;
    ratingText = 'INITIALIZING';
    ratingColor = isDark ? '#94A3B8' : '#64748B';
  } else {
    const solvencyPts = (solvencyRatio / 100) * 40;
    const dtiPts = Math.max(0, (1 - debtToIncomePct / 100)) * 30;
    const runwayNum = parseFloat(emergencyRunwayMonths) || 0;
    const runwayPts = Math.min(30, (runwayNum / 6) * 30);
    score = Math.round(solvencyPts + dtiPts + runwayPts);

    if (score >= 80) {
      ratingText = `${score} / 100 · EXCELLENT ›`;
      ratingColor = '#10B981';
    } else if (score >= 60) {
      ratingText = `${score} / 100 · HEALTHY ›`;
      ratingColor = '#3B82F6';
    } else {
      ratingText = `${score} / 100 · ATTENTION ›`;
      ratingColor = '#F59E0B';
    }
  }

  const cardBg = isDark ? '#111827' : '#FFFFFF';
  const borderColor = isDark ? '#1F2937' : '#E2E8F0';
  const boxBg = isDark ? '#1E293B' : '#F8FAFC';
  const titleColor = isDark ? '#94A3B8' : '#64748B';
  const primaryText = isDark ? '#F8FAFC' : '#0F172A';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardBg, borderColor }]}
        onPress={onPress}
        activeOpacity={onPress ? 0.75 : 1}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel="Financial Health and Solvency Card"
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: titleColor }]}>FINANCIAL HEALTH & SOLVENCY</Text>
            <Text style={[styles.subtitle, { color: isDark ? '#64748B' : '#94A3B8' }]}>
              Autonomous Risk & Solvency Engine
            </Text>
          </View>
          <View
            style={[
              styles.scorePill,
              !hasData && {
                backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                borderColor: isDark ? '#334155' : '#E2E8F0',
              },
            ]}
          >
            <Text style={[styles.scoreText, { color: ratingColor }]}>{ratingText}</Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={[styles.metricBox, { backgroundColor: boxBg, borderColor }]}>
            <Text style={[styles.metricValue, { color: primaryText }]}>
              {hasData ? `${emergencyRunwayMonths}m` : '—'}
            </Text>
            <Text style={[styles.metricLabel, { color: titleColor }]}>Runway</Text>
            <Text style={[styles.metricStatus, { color: isDark ? '#64748B' : '#94A3B8' }]}>
              {hasData ? 'Target 6.0m' : 'Awaiting burn'}
            </Text>
          </View>

          <View style={[styles.metricBox, { backgroundColor: boxBg, borderColor }]}>
            <Text style={[styles.metricValue, { color: primaryText }]}>
              {hasData ? `${debtToIncomePct}%` : '0%'}
            </Text>
            <Text style={[styles.metricLabel, { color: titleColor }]}>Debt / Income</Text>
            <Text style={[styles.metricStatus, { color: '#10B981' }]}>
              {hasData && debtToIncomePct > 0 ? 'Managed' : 'Zero Debt'}
            </Text>
          </View>

          <View style={[styles.metricBox, { backgroundColor: boxBg, borderColor }]}>
            <Text style={[styles.metricValue, { color: primaryText }]}>
              {hasData ? `${solvencyRatio}%` : '100%'}
            </Text>
            <Text style={[styles.metricLabel, { color: titleColor }]}>Solvency</Text>
            <Text style={[styles.metricStatus, { color: '#10B981' }]}>
              {hasData ? 'Capitalized' : 'Pure Assets'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#64748B',
  },
  subtitle: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 2,
  },
  scorePill: {
    backgroundColor: 'rgba(22, 163, 106, 0.10)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 106, 0.20)',
  },
  scoreText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  metricStatus: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
});
