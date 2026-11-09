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
  Text as SvgText,
} from 'react-native-svg';
import { theme } from '../../theme';
import { formatINR } from '../../formatters';

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

const HISTORICAL_SERIES: Record<string, AreaPoint[]> = {
  '1M': [
    { label: 'Oct 10', date: '10 Oct 2026', value: 7195050 },
    { label: 'Oct 15', date: '15 Oct 2026', value: 7240200 },
    { label: 'Oct 20', date: '20 Oct 2026', value: 7298500 },
    { label: 'Oct 25', date: '25 Oct 2026', value: 7380000 },
    { label: 'Oct 30', date: '30 Oct 2026', value: 7425100 },
    { label: 'Nov 04', date: '04 Nov 2026', value: 7490000 },
    { label: 'Nov 08', date: '08 Nov 2026', value: 7537901.25 },
  ],
  '3M': [
    { label: 'Aug', date: 'August 2026', value: 6820000 },
    { label: 'Sep', date: 'September 2026', value: 7050000 },
    { label: 'Oct', date: 'October 2026', value: 7350000 },
    { label: 'Nov', date: 'November 2026', value: 7537901.25 },
  ],
  '6M': [
    { label: 'May', date: 'May 2026', value: 6410000 },
    { label: 'Jun', date: 'June 2026', value: 6580000 },
    { label: 'Jul', date: 'July 2026', value: 6720000 },
    { label: 'Aug', date: 'August 2026', value: 6890000 },
    { label: 'Sep', date: 'September 2026', value: 7180000 },
    { label: 'Nov', date: 'November 2026', value: 7537901.25 },
  ],
  '1Y': [
    { label: 'Q4 25', date: 'Q4 2025', value: 5920000 },
    { label: 'Q1 26', date: 'Q1 2026', value: 6250000 },
    { label: 'Q2 26', date: 'Q2 2026', value: 6680000 },
    { label: 'Q3 26', date: 'Q3 2026', value: 7120000 },
    { label: 'Q4 26', date: 'Q4 2026', value: 7537901.25 },
  ],
  'ALL': [
    { label: '2023', date: 'Year 2023', value: 4100000 },
    { label: '2024', date: 'Year 2024', value: 5350000 },
    { label: '2025', date: 'Year 2025', value: 6400000 },
    { label: '2026', date: 'Year 2026', value: 7537901.25 },
  ],
};

const WATERFALL_STEPS: WaterfallStep[] = [
  { label: 'Oct 10 Net', sublabel: 'Starting Net Worth', amount: 7195050, isTotal: true, color: '#475569' },
  { label: 'Income', sublabel: 'Salary & Inflows', amount: 212000, color: '#16A36A' },
  { label: 'Expenses', sublabel: 'Living Costs & Burn', amount: -151550, color: '#DC2626' },
  { label: 'Market Gains', sublabel: 'Unrealized MF/Equity Gains', amount: 324401.25, color: '#16A36A' },
  { label: 'Debt EMI', sublabel: 'Principal Amortization', amount: -42000, color: '#D99A32' },
  { label: 'Nov 08 Net', sublabel: 'Current Reconciled Net', amount: 7537901.25, isTotal: true, color: '#087A50' },
];

function formatShortLakhs(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
  return `₹${val.toFixed(0)}`;
}

interface MobileAreaChartProps {
  currentNetWorth: number;
  onOpenNetWorth?: () => void;
}

export const MobileAreaChart: React.FC<MobileAreaChartProps> = ({
  currentNetWorth,
  onOpenNetWorth,
}) => {
  const [period, setPeriod] = useState<string>('1M');
  const [viewMode, setViewMode] = useState<'trend' | 'waterfall'>('trend');
  const [chartWidth, setChartWidth] = useState<number>(
    Math.max(280, Dimensions.get('window').width - 64)
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const series = HISTORICAL_SERIES[period] || HISTORICAL_SERIES['1M'];
  const startVal = series[0].value;
  const latestVal = series[series.length - 1].value;
  const growth = latestVal - startVal;
  const growthPct = (growth / startVal) * 100;

  const onLayout = (e: LayoutChangeEvent) => {
    const cardContentW = e.nativeEvent.layout.width - 32; // account for card padding
    if (cardContentW > 0 && Math.abs(cardContentW - chartWidth) > 5) {
      setChartWidth(cardContentW);
    }
  };

  // Geometry
  const height = 180;
  const paddingLeft = 44;
  const paddingRight = 12;
  const paddingTop = 16;
  const paddingBottom = 26;

  const plotW = Math.max(10, chartWidth - paddingLeft - paddingRight);
  const plotH = height - paddingTop - paddingBottom;

  const values = series.map((s) => s.value);
  const minVal = Math.min(...values) * 0.985;
  const maxVal = Math.max(...values) * 1.015;

  const getX = (i: number) => paddingLeft + (i / (series.length - 1)) * plotW;
  const getY = (v: number) =>
    paddingTop + plotH - ((v - minVal) / (maxVal - minVal || 1)) * plotH;

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

  // 3 grid ticks
  const yTicks = [maxVal, minVal + (maxVal - minVal) * 0.5, minVal];

  const activePoint = selectedIndex !== null ? series[selectedIndex] : null;

  return (
    <View style={styles.card} onLayout={onLayout}>
      {/* Header with Mode Toggle & Sheet shortcut */}
      <View style={styles.headerRow}>
        <View>
          <View style={styles.titleWithBadge}>
            <Text style={styles.title}>NET WORTH TRAJECTORY</Text>
            <View style={styles.actualBadge}>
              <Text style={styles.actualText}>DOUBLE-ENTRY</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>Verified Against General Journal</Text>
        </View>

        <View style={styles.modeToggleGroup}>
          <TouchableOpacity
            style={[styles.modeBtn, viewMode === 'trend' && styles.modeBtnActive]}
            onPress={() => setViewMode('trend')}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeBtnText, viewMode === 'trend' && styles.modeBtnTextActive]}>
              Trend
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, viewMode === 'waterfall' && styles.modeBtnActive]}
            onPress={() => setViewMode('waterfall')}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeBtnText, viewMode === 'waterfall' && styles.modeBtnTextActive]}>
              Bridge
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main KPI Amount & Growth Metric */}
      <View style={styles.kpiRow}>
        <View>
          <Text style={styles.kpiAmount}>
            {formatINR(activePoint ? activePoint.value : currentNetWorth)}
          </Text>
          <View style={styles.growthRow}>
            <View style={[styles.growthPill, growth >= 0 ? styles.growthPositive : styles.growthNegative]}>
              <Text style={styles.growthText}>
                {growth >= 0 ? '▲ +' : '▼ '}
                {growthPct.toFixed(2)}% ({formatINR(growth)})
              </Text>
            </View>
            <Text style={styles.growthPeriodText}>
              {activePoint ? `on ${activePoint.date}` : `in selected ${period}`}
            </Text>
          </View>
        </View>

        {onOpenNetWorth && (
          <TouchableOpacity
            style={styles.sheetBtn}
            onPress={onOpenNetWorth}
            activeOpacity={0.7}
          >
            <Text style={styles.sheetBtnText}>Balance Sheet ›</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* View Mode 1: Interactive SVG Area Chart */}
      {viewMode === 'trend' && (
        <>
          <View style={styles.svgContainer}>
            <Svg width={chartWidth} height={height}>
              <Defs>
                <LinearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#16A36A" stopOpacity="0.35" />
                  <Stop offset="65%" stopColor="#16A36A" stopOpacity="0.09" />
                  <Stop offset="100%" stopColor="#16A36A" stopOpacity="0.0" />
                </LinearGradient>
              </Defs>

              {/* Gridlines & Y Axis Ticks */}
              {yTicks.map((val, idx) => {
                const y = getY(val);
                return (
                  <React.Fragment key={idx}>
                    <Line
                      x1={paddingLeft}
                      y1={y}
                      x2={chartWidth - paddingRight}
                      y2={y}
                      stroke="#E7ECE8"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                    />
                    <SvgText
                      x={paddingLeft - 6}
                      y={y + 3.5}
                      fill="#758078"
                      fontSize={9.5}
                      fontWeight="600"
                      textAnchor="end"
                    >
                      {formatShortLakhs(val)}
                    </SvgText>
                  </React.Fragment>
                );
              })}

              {/* Area Gradient Fill */}
              {areaPath ? <Path d={areaPath} fill="url(#emeraldGradient)" /> : null}

              {/* Bezier Stroke Line */}
              {curvePath ? (
                <Path
                  d={curvePath}
                  fill="none"
                  stroke="#16A36A"
                  strokeWidth={2.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}

              {/* Crosshair when item selected */}
              {selectedIndex !== null && (
                <Line
                  x1={getX(selectedIndex)}
                  y1={paddingTop}
                  x2={getX(selectedIndex)}
                  y2={areaBottom}
                  stroke="#16A36A"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
              )}

              {/* Data Points */}
              {points.map((pt, idx) => {
                const isSelected = selectedIndex === idx;
                const isLatest = idx === points.length - 1;
                return (
                  <Circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 6 : isLatest ? 4.5 : 3.2}
                    fill={isLatest ? '#16A36A' : '#FFFFFF'}
                    stroke="#16A36A"
                    strokeWidth={isSelected ? 3 : 2}
                  />
                );
              })}

              {/* X Axis Labels */}
              {series.map((s, idx) => {
                const x = getX(idx);
                return (
                  <SvgText
                    key={idx}
                    x={x}
                    y={height - 6}
                    fill={selectedIndex === idx ? '#16A36A' : '#758078'}
                    fontSize={9.5}
                    fontWeight={selectedIndex === idx ? '800' : '600'}
                    textAnchor="middle"
                  >
                    {s.label}
                  </SvgText>
                );
              })}
            </Svg>

            {/* Interactive Touch Target Row */}
            <View style={[styles.touchRow, { left: paddingLeft, width: plotW }]}>
              {series.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.touchTarget}
                  activeOpacity={0.6}
                  onPress={() => setSelectedIndex(selectedIndex === i ? null : i)}
                />
              ))}
            </View>
          </View>

          {/* Period Selector Tabs */}
          <View style={styles.periodRow}>
            {['1M', '3M', '6M', '1Y', 'ALL'].map((p) => {
              const active = period === p;
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodTab, active && styles.periodTabActive]}
                  onPress={() => {
                    setPeriod(p);
                    setSelectedIndex(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.periodTabText, active && styles.periodTabTextActive]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {/* View Mode 2: Waterfall Attribution Bridge */}
      {viewMode === 'waterfall' && (
        <View style={styles.waterfallContainer}>
          <Text style={styles.waterfallTitle}>MoM Net Worth Movement Attribution</Text>
          {WATERFALL_STEPS.map((step, idx) => {
            const isPos = step.amount >= 0;
            return (
              <View key={idx} style={styles.waterfallRow}>
                <View style={styles.waterfallLeft}>
                  <View style={[styles.waterfallBarIndicator, { backgroundColor: step.color }]} />
                  <View>
                    <Text style={styles.waterfallLabel}>{step.label}</Text>
                    <Text style={styles.waterfallSublabel}>{step.sublabel}</Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.waterfallAmount,
                    step.isTotal
                      ? styles.waterfallTotal
                      : isPos
                      ? styles.waterfallPos
                      : styles.waterfallNeg,
                  ]}
                >
                  {step.isTotal ? '' : isPos ? '+' : ''}
                  {formatINR(step.amount)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 106, 0.25)',
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  actualBadge: {
    backgroundColor: theme.colors.primaryLightSolid,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  actualText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  subtitle: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  modeToggleGroup: {
    flexDirection: 'row',
    backgroundColor: theme.colors.canvas,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modeBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modeBtnActive: {
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  modeBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textTertiary,
  },
  modeBtnTextActive: {
    color: theme.colors.textPrimary,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 10,
    marginBottom: 6,
  },
  kpiAmount: {
    fontSize: 25,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    letterSpacing: -0.6,
  },
  growthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  growthPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  growthPositive: {
    backgroundColor: 'rgba(22, 163, 106, 0.12)',
  },
  growthNegative: {
    backgroundColor: 'rgba(220, 91, 91, 0.12)',
  },
  growthText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  growthPeriodText: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    fontWeight: '500',
  },
  sheetBtn: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
  },
  sheetBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  svgContainer: {
    position: 'relative',
    marginVertical: 4,
  },
  touchRow: {
    position: 'absolute',
    top: 0,
    bottom: 20,
    flexDirection: 'row',
  },
  touchTarget: {
    flex: 1,
    height: '100%',
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 8,
    marginTop: 4,
  },
  periodTab: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  periodTabActive: {
    backgroundColor: theme.colors.primaryLightSolid,
  },
  periodTabText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: theme.colors.textTertiary,
  },
  periodTabTextActive: {
    color: theme.colors.primaryDark,
  },
  waterfallContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  waterfallTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  waterfallRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
  },
  waterfallLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waterfallBarIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
  },
  waterfallLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  waterfallSublabel: {
    fontSize: 9.5,
    color: theme.colors.textTertiary,
  },
  waterfallAmount: {
    fontSize: 12,
    fontWeight: '800',
  },
  waterfallTotal: {
    color: theme.colors.textPrimary,
  },
  waterfallPos: {
    color: theme.colors.primaryDark,
  },
  waterfallNeg: {
    color: '#DC2626',
  },
});
