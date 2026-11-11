import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Circle,
  Rect,
  G,
  Text as SvgText,
} from 'react-native-svg';
import { theme, useTheme } from '../../theme';
import { formatINR } from '../../formatters';
import { Transaction } from '../../types';

export interface AreaPoint {
  label: string;
  date: string;
  value: number;
}

export interface WaterfallStep {
  label: string;
  sublabel: string;
  amount: number;
  isTotal?: boolean;
  color: string;
}

function formatShortLakhs(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
  return `₹${val.toFixed(0)}`;
}

interface MobileAreaChartProps {
  currentNetWorth: number;
  monthlyInflows?: number;
  monthlyOutflows?: number;
  transactions?: Transaction[];
  onOpenNetWorth?: () => void;
}

export const MobileAreaChart: React.FC<MobileAreaChartProps> = ({
  currentNetWorth,
  monthlyInflows = 0,
  monthlyOutflows = 0,
  transactions = [],
  onOpenNetWorth,
}) => {
  const { theme, isDark } = useTheme();
  const [period, setPeriod] = useState<string>('1M');
  const [viewMode, setViewMode] = useState<'trend' | 'waterfall'>('trend');
  const [chartWidth, setChartWidth] = useState<number>(
    Math.max(280, Dimensions.get('window').width - 64)
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const hasData = currentNetWorth > 0 || transactions.length > 0;

  // Generate dynamic series based on real user state
  const series: AreaPoint[] = React.useMemo(() => {
    if (!hasData) {
      return [
        { label: 'Day 1', date: 'Period Start', value: 0 },
        { label: 'Day 10', date: 'Day 10', value: 0 },
        { label: 'Day 20', date: 'Day 20', value: 0 },
        { label: 'Today', date: 'Today', value: 0 },
      ];
    }

    if (transactions.length > 0) {
      // Build trajectory from actual transactions
      const sorted = [...transactions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      let running = 0;
      const points: AreaPoint[] = [];
      sorted.forEach((tx, i) => {
        running += tx.type === 'CREDIT' ? tx.amount : -tx.amount;
        if (i === 0 || i === Math.floor(sorted.length / 2) || i === sorted.length - 1) {
          points.push({
            label: tx.date.split(' ').slice(0, 2).join(' ') || `T${i + 1}`,
            date: tx.date,
            value: Math.max(0, running),
          });
        }
      });
      if (points.length >= 2) {
        // Ensure final point matches current net worth
        points[points.length - 1].value = currentNetWorth;
        return points;
      }
    }

    // Default curve proportional to real current net worth
    const startVal = Math.max(0, currentNetWorth - (monthlyInflows - monthlyOutflows));
    return [
      { label: 'Start', date: 'Start of period', value: startVal },
      { label: 'Mid', date: 'Mid period', value: Math.max(0, (startVal + currentNetWorth) / 2) },
      { label: 'Today', date: 'Current Reconciled', value: currentNetWorth },
    ];
  }, [hasData, transactions, currentNetWorth, monthlyInflows, monthlyOutflows]);

  const startVal = series[0]?.value || 0;
  const latestVal = series[series.length - 1]?.value || 0;
  const growth = hasData && startVal > 0 ? latestVal - startVal : 0;
  const growthPct = hasData && startVal > 0 ? (growth / startVal) * 100 : 0;

  // Dynamic Waterfall Steps
  const waterfallSteps: WaterfallStep[] = React.useMemo(() => {
    if (!hasData) {
      return [
        { label: 'Starting', sublabel: 'Period Start', amount: 0, isTotal: true, color: '#475569' },
        { label: 'Inflows', sublabel: 'Income & Credits', amount: 0, color: '#16A36A' },
        { label: 'Outflows', sublabel: 'Living Costs & Burn', amount: 0, color: '#DC2626' },
        { label: 'Current Net', sublabel: 'Reconciled Ledger', amount: 0, isTotal: true, color: '#087A50' },
      ];
    }
    const computedStart = Math.max(0, currentNetWorth - monthlyInflows + monthlyOutflows);
    return [
      { label: 'Starting Net', sublabel: 'Starting Balance', amount: computedStart, isTotal: true, color: '#475569' },
      { label: 'Inflows', sublabel: 'Income & Credits', amount: monthlyInflows, color: '#16A36A' },
      { label: 'Outflows', sublabel: 'Spend & Debits', amount: -monthlyOutflows, color: '#DC2626' },
      { label: 'Current Net', sublabel: 'Reconciled Net Worth', amount: currentNetWorth, isTotal: true, color: '#087A50' },
    ];
  }, [hasData, currentNetWorth, monthlyInflows, monthlyOutflows]);

  const onLayout = (e: LayoutChangeEvent) => {
    const cardContentW = e.nativeEvent.layout.width - 32;
    if (cardContentW > 0 && Math.abs(cardContentW - chartWidth) > 5) {
      setChartWidth(cardContentW);
    }
  };

  // Geometry
  const height = 180;
  const paddingLeft = 48;
  const paddingRight = 14;
  const paddingTop = 16;
  const paddingBottom = 26;

  const plotW = Math.max(10, chartWidth - paddingLeft - paddingRight);
  const plotH = height - paddingTop - paddingBottom;

  const values = series.map((s) => s.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const minVal = hasData ? Math.max(0, rawMin * 0.95) : 0;
  const maxVal = hasData && rawMax > 0 ? rawMax * 1.05 : 1000;

  const getX = (i: number) => paddingLeft + (i / Math.max(1, series.length - 1)) * plotW;
  const getY = (v: number) =>
    paddingTop + plotH - ((v - minVal) / Math.max(1, maxVal - minVal)) * plotH;

  const points = series.map((s, i) => ({ x: getX(i), y: getY(s.value) }));

  // Smooth bezier curve
  let curvePath = '';
  if (points.length > 0) {
    curvePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      curvePath += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
    }
  }

  const areaBottom = paddingTop + plotH;
  const areaPath = points.length
    ? `${curvePath} L ${points[points.length - 1].x} ${areaBottom} L ${points[0].x} ${areaBottom} Z`
    : '';

  const yTicks = [maxVal, minVal + (maxVal - minVal) * 0.5, minVal];
  const activePoint = selectedIndex !== null ? series[selectedIndex] : null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          borderColor: isDark ? '#1F2937' : '#E2E8F0',
        },
      ]}
      onLayout={onLayout}
    >
      {/* Header with Mode Toggle & Sheet shortcut */}
      <View style={styles.headerRow}>
        <View>
          <View style={styles.titleWithBadge}>
            <Text style={[styles.title, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              NET WORTH TRAJECTORY
            </Text>
            <View
              style={[
                styles.actualBadge,
                {
                  backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#EFF6FF',
                  borderColor: isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(37, 99, 235, 0.15)',
                },
              ]}
            >
              <Text style={[styles.actualText, { color: isDark ? '#60A5FA' : '#2563EB' }]}>
                VERIFIED
              </Text>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: isDark ? '#64748B' : '#94A3B8' }]}>
            General Journal Double-Entry
          </Text>
        </View>

        <View
          style={[
            styles.modeToggleGroup,
            { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.modeBtn,
              viewMode === 'trend' && [
                styles.modeBtnActive,
                { backgroundColor: isDark ? '#0B0F19' : '#FFFFFF' },
              ],
            ]}
            onPress={() => setViewMode('trend')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.modeBtnText,
                { color: isDark ? '#94A3B8' : '#64748B' },
                viewMode === 'trend' && [
                  styles.modeBtnTextActive,
                  { color: isDark ? '#F8FAFC' : '#0F172A' },
                ],
              ]}
            >
              Trend
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeBtn,
              viewMode === 'waterfall' && [
                styles.modeBtnActive,
                { backgroundColor: isDark ? '#0B0F19' : '#FFFFFF' },
              ],
            ]}
            onPress={() => setViewMode('waterfall')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.modeBtnText,
                { color: isDark ? '#94A3B8' : '#64748B' },
                viewMode === 'waterfall' && [
                  styles.modeBtnTextActive,
                  { color: isDark ? '#F8FAFC' : '#0F172A' },
                ],
              ]}
            >
              Bridge
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main KPI Amount & Growth Metric */}
      <View style={styles.kpiRow}>
        <View>
          <Text style={[styles.kpiAmount, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
            {formatINR(activePoint ? activePoint.value : currentNetWorth)}
          </Text>
          <View style={styles.growthRow}>
            {hasData ? (
              <>
                <View
                  style={[
                    styles.growthPill,
                    growth >= 0 ? styles.growthPositive : styles.growthNegative,
                  ]}
                >
                  <Text style={styles.growthText}>
                    {growth >= 0 ? '▲ +' : '▼ '}
                    {growthPct.toFixed(2)}% ({formatINR(growth)})
                  </Text>
                </View>
                <Text
                  style={[
                    styles.growthPeriodText,
                    { color: isDark ? '#94A3B8' : '#64748B' },
                  ]}
                >
                  {activePoint ? `on ${activePoint.date}` : `in selected ${period}`}
                </Text>
              </>
            ) : (
              <View
                style={[
                  styles.growthPill,
                  { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
                ]}
              >
                <Text
                  style={[
                    styles.growthText,
                    { color: isDark ? '#94A3B8' : '#64748B' },
                  ]}
                >
                  ● Ledger In Balance
                </Text>
              </View>
            )}
          </View>
        </View>

        {onOpenNetWorth && (
          <TouchableOpacity
            style={[
              styles.sheetBtn,
              {
                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                borderColor: isDark ? '#334155' : '#E2E8F0',
              },
            ]}
            onPress={onOpenNetWorth}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="View detailed balance sheet"
          >
            <Text
              style={[
                styles.sheetBtnText,
                { color: isDark ? '#60A5FA' : '#2563EB' },
              ]}
            >
              Balance Sheet ›
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* View Mode: Trend vs Waterfall */}
      {viewMode === 'trend' ? (
        <View style={styles.chartContainer}>
          <Svg width={chartWidth} height={height}>
            <Defs>
              <LinearGradient id="nwAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#2563EB" stopOpacity="0.28" />
                <Stop offset="70%" stopColor="#2563EB" stopOpacity="0.08" />
                <Stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
              </LinearGradient>
            </Defs>

            {/* Grid horizontal dashed lines */}
            {yTicks.map((tickVal, idx) => {
              const y = getY(tickVal);
              return (
                <G key={idx}>
                  <Line
                    x1={paddingLeft}
                    y1={y}
                    x2={chartWidth - paddingRight}
                    y2={y}
                    stroke={isDark ? '#1F2937' : '#E2E8F0'}
                    strokeDasharray="3 3"
                    strokeWidth={1}
                  />
                  <SvgText
                    x={paddingLeft - 6}
                    y={y + 3}
                    fill="#94A3B8"
                    fontSize="9"
                    fontWeight="600"
                    textAnchor="end"
                  >
                    {formatShortLakhs(tickVal)}
                  </SvgText>
                </G>
              );
            })}

            {/* Filled area gradient */}
            {areaPath ? <Path d={areaPath} fill="url(#nwAreaGrad)" /> : null}

            {/* Primary line stroke */}
            {curvePath ? (
              <Path
                d={curvePath}
                fill="none"
                stroke={hasData ? '#2563EB' : '#94A3B8'}
                strokeWidth={hasData ? 2.5 : 1.5}
                strokeDasharray={hasData ? undefined : '4 4'}
              />
            ) : null}

            {/* Data point dots & touch anchors */}
            {points.map((pt, i) => {
              const isSelected = selectedIndex === i;
              return (
                <G key={i}>
                  <Circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 6 : 3.5}
                    fill={isSelected ? '#2563EB' : '#FFFFFF'}
                    stroke="#2563EB"
                    strokeWidth={isSelected ? 3 : 2}
                  />
                  {isSelected && (
                    <>
                      <Line
                        x1={pt.x}
                        y1={paddingTop}
                        x2={pt.x}
                        y2={paddingTop + plotH}
                        stroke="#2563EB"
                        strokeDasharray="2 2"
                        strokeWidth={1.5}
                      />
                      {/* Floating Interactive Tooltip Badge */}
                      <G>
                        <Rect
                          x={Math.max(paddingLeft, Math.min(chartWidth - paddingRight - 84, pt.x - 42))}
                          y={Math.max(4, pt.y - 30)}
                          width={84}
                          height={24}
                          rx={6}
                          fill="#0F172A"
                        />
                        <SvgText
                          x={Math.max(paddingLeft, Math.min(chartWidth - paddingRight - 84, pt.x - 42)) + 42}
                          y={Math.max(4, pt.y - 30) + 15}
                          fill="#FFFFFF"
                          fontSize="9"
                          fontWeight="800"
                          textAnchor="middle"
                        >
                          {formatINR(series[i].value)}
                        </SvgText>
                      </G>
                    </>
                  )}
                  {/* Bottom date label */}
                  <SvgText
                    x={pt.x}
                    y={height - 6}
                    fill={isSelected ? '#2563EB' : '#64748B'}
                    fontSize="9.5"
                    fontWeight={isSelected ? '800' : '600'}
                    textAnchor="middle"
                  >
                    {series[i].label}
                  </SvgText>
                </G>
              );
            })}
          </Svg>

          {/* Interactive touch targets */}
          <View style={[styles.touchRow, { left: paddingLeft, width: plotW }]}>
            {series.map((_, i) => (
              <TouchableOpacity
                key={i}
                style={styles.touchCol}
                onPress={() => setSelectedIndex(selectedIndex === i ? null : i)}
                activeOpacity={1}
              />
            ))}
          </View>
        </View>
      ) : (
        /* Waterfall Mode (Bridge) */
        <View style={styles.waterfallContainer}>
          <Text style={styles.waterfallLegend}>
            PERIODIC CASH FLOW ATTRIBUTION BRIDGE
          </Text>
          <View style={styles.waterfallStepsCol}>
            {waterfallSteps.map((step, idx) => {
              const isPositive = step.amount >= 0;
              return (
                <View key={idx} style={styles.waterfallStepRow}>
                  <View style={styles.waterfallStepLeft}>
                    <View
                      style={[
                        styles.waterfallColorDot,
                        { backgroundColor: step.color },
                      ]}
                    />
                    <View>
                      <Text style={styles.waterfallStepLabel}>{step.label}</Text>
                      <Text style={styles.waterfallStepSublabel}>{step.sublabel}</Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.waterfallStepAmount,
                      { color: step.isTotal ? '#0F172A' : isPositive ? '#16A36A' : '#DC2626' },
                    ]}
                  >
                    {step.isTotal
                      ? formatINR(step.amount)
                      : `${isPositive ? '+' : ''}${formatINR(step.amount)}`}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Fresh zero state banner */}
      {!hasData && (
        <View style={styles.zeroStateBanner}>
          <Text style={styles.zeroStateIcon}>🌱</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.zeroStateTitle}>Fresh Financial Ledger Initialized</Text>
            <Text style={styles.zeroStateSub}>
              Your double-entry general journal is ready. Connect a bank account or record your first transaction to begin plotting your net worth trajectory.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#64748B',
  },
  actualBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.15)',
  },
  actualText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 2,
  },
  modeToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  modeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modeBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  modeBtnText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
  },
  modeBtnTextActive: {
    fontWeight: '800',
    color: '#0F172A',
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  kpiAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.8,
  },
  growthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  growthPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  growthPositive: {
    backgroundColor: 'rgba(22, 163, 106, 0.10)',
  },
  growthNegative: {
    backgroundColor: 'rgba(220, 38, 38, 0.10)',
  },
  growthText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A36A',
  },
  growthPeriodText: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500',
  },
  sheetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sheetBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  chartContainer: {
    position: 'relative',
    marginTop: 4,
    alignItems: 'center',
  },
  touchRow: {
    position: 'absolute',
    top: 16,
    bottom: 26,
    flexDirection: 'row',
  },
  touchCol: {
    flex: 1,
    height: '100%',
  },
  waterfallContainer: {
    marginTop: 4,
    paddingTop: 8,
  },
  waterfallLegend: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#94A3B8',
    marginBottom: 8,
  },
  waterfallStepsCol: {
    gap: 8,
  },
  waterfallStepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  waterfallStepLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waterfallColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  waterfallStepLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  waterfallStepSublabel: {
    fontSize: 9.5,
    color: '#64748B',
  },
  waterfallStepAmount: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  zeroStateBanner: {
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  zeroStateIcon: {
    fontSize: 20,
  },
  zeroStateTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  zeroStateSub: {
    fontSize: 9.5,
    color: '#64748B',
    lineHeight: 13,
  },
});
