import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { theme } from '../../theme';
import { formatINR } from '../../formatters';

export interface MonthlyCashFlowData {
  month: string;
  fullLabel: string;
  inflow: number;
  outflow: number;
  net: number;
}

const CASH_FLOW_HISTORY: MonthlyCashFlowData[] = [
  { month: 'Aug', fullLabel: 'August 2026', inflow: 195000, outflow: 162000, net: 33000 },
  { month: 'Sep', fullLabel: 'September 2026', inflow: 202000, outflow: 158000, net: 44000 },
  { month: 'Oct', fullLabel: 'October 2026', inflow: 198000, outflow: 168200, net: 29800 },
  { month: 'Nov', fullLabel: 'November 2026 (MTD)', inflow: 212000, outflow: 151550, net: 60450 },
];

function formatShortK(val: number): string {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
  return `₹${val}`;
}

interface MobileCashFlowBarChartProps {
  onOpenAnalytics?: () => void;
}

export const MobileCashFlowBarChart: React.FC<MobileCashFlowBarChartProps> = ({
  onOpenAnalytics,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(CASH_FLOW_HISTORY.length - 1);
  const [containerWidth, setContainerWidth] = useState<number>(
    Math.max(280, Dimensions.get('window').width - 64)
  );

  const activeMonth = CASH_FLOW_HISTORY[selectedIdx];
  const savingsRate = ((activeMonth.net / activeMonth.inflow) * 100).toFixed(1);

  const onLayout = (e: LayoutChangeEvent) => {
    const cardContentW = e.nativeEvent.layout.width - 32;
    if (cardContentW > 0 && Math.abs(cardContentW - containerWidth) > 5) {
      setContainerWidth(cardContentW);
    }
  };

  const chartHeight = 150;
  const paddingLeft = 44;
  const paddingRight = 12;
  const paddingTop = 16;
  const paddingBottom = 26;

  const plotW = Math.max(10, containerWidth - paddingLeft - paddingRight);
  const plotH = chartHeight - paddingTop - paddingBottom;

  const maxVal = 240000;
  const yTicks = [200000, 100000, 0];

  const getY = (val: number) =>
    paddingTop + plotH - (val / maxVal) * plotH;

  const numGroups = CASH_FLOW_HISTORY.length;
  const groupSlot = plotW / numGroups;
  const barW = Math.min(20, groupSlot * 0.34);
  const barGap = 4;

  return (
    <View style={styles.card} onLayout={onLayout}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>INFLOW VS OUTFLOW CASH FLOW</Text>
          <Text style={styles.subtitle}>4-Month Historical Operating Surplus</Text>
        </View>

        {onOpenAnalytics && (
          <TouchableOpacity
            style={styles.analyticsBtn}
            onPress={onOpenAnalytics}
            activeOpacity={0.7}
          >
            <Text style={styles.analyticsBtnText}>Analytics ›</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Selected Month Key Metrics */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>{activeMonth.fullLabel}</Text>
          <View style={styles.inflowOutflowRow}>
            <Text style={styles.inflowText}>+{formatINR(activeMonth.inflow)}</Text>
            <Text style={styles.vsText}>vs</Text>
            <Text style={styles.outflowText}>-{formatINR(activeMonth.outflow)}</Text>
          </View>
        </View>

        <View style={styles.surplusBadge}>
          <Text style={styles.surplusLabel}>Net Cash Surplus</Text>
          <Text style={styles.surplusVal}>+{formatINR(activeMonth.net)}</Text>
          <Text style={styles.savingsRateText}>{savingsRate}% saved</Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#16A36A' }]} />
          <Text style={styles.legendText}>Inflows (Salary/Yield)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#6366F1' }]} />
          <Text style={styles.legendText}>Outflows (Living/EMIs)</Text>
        </View>
      </View>

      {/* SVG Bar Chart */}
      <View style={styles.svgWrap}>
        <Svg width={containerWidth} height={chartHeight}>
          {/* Horizontal Gridlines */}
          {yTicks.map((val, idx) => {
            const y = getY(val);
            return (
              <React.Fragment key={idx}>
                <Line
                  x1={paddingLeft}
                  y1={y}
                  x2={containerWidth - paddingRight}
                  y2={y}
                  stroke="#E7ECE8"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <SvgText
                  x={paddingLeft - 6}
                  y={y + 3.5}
                  fill="#758078"
                  fontSize={9}
                  fontWeight="600"
                  textAnchor="end"
                >
                  {formatShortK(val)}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Grouped Bars */}
          {CASH_FLOW_HISTORY.map((item, idx) => {
            const groupCenterX = paddingLeft + (idx + 0.5) * groupSlot;
            const inflowX = groupCenterX - barW - barGap / 2;
            const outflowX = groupCenterX + barGap / 2;

            const inflowY = getY(item.inflow);
            const inflowH = Math.max(3, getY(0) - inflowY);

            const outflowY = getY(item.outflow);
            const outflowH = Math.max(3, getY(0) - outflowY);

            const isSelected = selectedIdx === idx;

            return (
              <React.Fragment key={idx}>
                {/* Highlight background column for selected month */}
                {isSelected && (
                  <Rect
                    x={groupCenterX - groupSlot / 2 + 2}
                    y={paddingTop}
                    width={groupSlot - 4}
                    height={plotH}
                    fill="rgba(22, 163, 106, 0.08)"
                    rx={8}
                  />
                )}

                {/* Inflow Bar (Emerald) */}
                <Rect
                  x={inflowX}
                  y={inflowY}
                  width={barW}
                  height={inflowH}
                  fill="#16A36A"
                  rx={4}
                  opacity={isSelected ? 1 : 0.8}
                />

                {/* Outflow Bar (Indigo) */}
                <Rect
                  x={outflowX}
                  y={outflowY}
                  width={barW}
                  height={outflowH}
                  fill="#6366F1"
                  rx={4}
                  opacity={isSelected ? 1 : 0.8}
                />

                {/* Month Label */}
                <SvgText
                  x={groupCenterX}
                  y={chartHeight - 6}
                  fill={isSelected ? '#16A36A' : '#758078'}
                  fontSize={10}
                  fontWeight={isSelected ? '800' : '600'}
                  textAnchor="middle"
                >
                  {item.month}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>

        {/* Touch Overlay to Select Month */}
        <View style={[styles.touchRow, { left: paddingLeft, width: plotW }]}>
          {CASH_FLOW_HISTORY.map((_, i) => (
            <TouchableOpacity
              key={i}
              style={styles.touchCol}
              activeOpacity={0.6}
              onPress={() => setSelectedIdx(i)}
            />
          ))}
        </View>
      </View>
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
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  analyticsBtn: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  analyticsBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.canvas,
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  kpiBox: {
    flex: 1,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  inflowOutflowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  inflowText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#087A50',
    fontVariant: ['tabular-nums'],
  },
  vsText: {
    fontSize: 10,
    color: theme.colors.textTertiary,
  },
  outflowText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#4F46E5',
    fontVariant: ['tabular-nums'],
  },
  surplusBadge: {
    alignItems: 'flex-end',
  },
  surplusLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: theme.colors.textTertiary,
  },
  surplusVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#087A50',
    fontVariant: ['tabular-nums'],
  },
  savingsRateText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#16A36A',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  svgWrap: {
    position: 'relative',
    marginTop: 6,
  },
  touchRow: {
    position: 'absolute',
    top: 0,
    bottom: 20,
    flexDirection: 'row',
  },
  touchCol: {
    flex: 1,
    height: '100%',
  },
});
