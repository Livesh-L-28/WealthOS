import React, { useState, useMemo } from 'react';
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
import { Transaction } from '../../types';

export interface MonthlyCashFlowData {
  month: string;
  fullLabel: string;
  inflow: number;
  outflow: number;
  net: number;
}

function formatShortK(val: number): string {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
  return `₹${val.toFixed(0)}`;
}

interface MobileCashFlowBarChartProps {
  monthlyInflows?: number;
  monthlyOutflows?: number;
  transactions?: Transaction[];
  onOpenAnalytics?: () => void;
}

export const MobileCashFlowBarChart: React.FC<MobileCashFlowBarChartProps> = ({
  monthlyInflows = 0,
  monthlyOutflows = 0,
  transactions = [],
  onOpenAnalytics,
}) => {
  const hasData = monthlyInflows > 0 || monthlyOutflows > 0 || transactions.length > 0;

  const cashFlowHistory: MonthlyCashFlowData[] = useMemo(() => {
    if (!hasData) {
      return [];
    }

    // Group actual transactions by month if available
    const monthsMap: Record<string, { inflow: number; outflow: number }> = {};
    if (transactions.length > 0) {
      transactions.forEach((tx) => {
        const d = new Date(tx.date);
        const mKey = isNaN(d.getTime())
          ? 'Current'
          : d.toLocaleString('en-US', { month: 'short' });
        if (!monthsMap[mKey]) monthsMap[mKey] = { inflow: 0, outflow: 0 };
        if (tx.type === 'CREDIT') {
          monthsMap[mKey].inflow += tx.amount;
        } else {
          monthsMap[mKey].outflow += tx.amount;
        }
      });
    }

    const monthKeys = Object.keys(monthsMap);
    if (monthKeys.length > 0) {
      return monthKeys.map((m) => {
        const inf = monthsMap[m].inflow;
        const out = monthsMap[m].outflow;
        return {
          month: m,
          fullLabel: `${m} 2026`,
          inflow: inf,
          outflow: out,
          net: inf - out,
        };
      });
    }

    // Single active month from props
    return [
      {
        month: 'Current',
        fullLabel: 'Current Month',
        inflow: monthlyInflows,
        outflow: monthlyOutflows,
        net: monthlyInflows - monthlyOutflows,
      },
    ];
  }, [hasData, transactions, monthlyInflows, monthlyOutflows]);

  const [selectedIdx, setSelectedIdx] = useState<number>(
    Math.max(0, cashFlowHistory.length - 1)
  );
  const [containerWidth, setContainerWidth] = useState<number>(
    Math.max(280, Dimensions.get('window').width - 64)
  );

  const activeMonth = cashFlowHistory[selectedIdx] || {
    month: 'Current',
    fullLabel: 'Current Month',
    inflow: 0,
    outflow: 0,
    net: 0,
  };
  const savingsRate =
    activeMonth.inflow > 0
      ? ((activeMonth.net / activeMonth.inflow) * 100).toFixed(1)
      : '0.0';

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

  const allAmounts = cashFlowHistory.flatMap((c) => [c.inflow, c.outflow]);
  const maxVal = Math.max(1000, ...allAmounts) * 1.15;

  const getY = (v: number) => paddingTop + plotH - (v / maxVal) * plotH;
  const barW = Math.min(18, (plotW / Math.max(1, cashFlowHistory.length)) * 0.28);
  const groupSpacing = plotW / Math.max(1, cashFlowHistory.length);

  return (
    <View style={styles.card} onLayout={onLayout}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>CASH FLOW INFLOW VS OUTFLOW</Text>
          <Text style={styles.subtitle}>Net Monthly Savings Trajectory</Text>
        </View>

        {onOpenAnalytics && (
          <TouchableOpacity
            style={styles.analyticsBtn}
            onPress={onOpenAnalytics}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Open Cash Flow Analytics"
          >
            <Text style={styles.analyticsBtnText}>Analytics ›</Text>
          </TouchableOpacity>
        )}
      </View>

      {!hasData || cashFlowHistory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyTitle}>No Cash Flow Data Yet</Text>
          <Text style={styles.emptySubtitle}>
            Monthly cash inflows and expenditure burn will be automatically plotted here as you record income and expenses.
          </Text>
        </View>
      ) : (
        <>
          {/* Active Month KPI Summary */}
          <View style={styles.kpiRow}>
            <View>
              <Text style={styles.kpiMonthLabel}>{activeMonth.fullLabel}</Text>
              <View style={styles.inOutRow}>
                <View style={styles.metricItem}>
                  <View style={[styles.dot, { backgroundColor: '#16A36A' }]} />
                  <Text style={styles.metricText}>
                    In: <Text style={styles.valGreen}>{formatINR(activeMonth.inflow)}</Text>
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <View style={[styles.dot, { backgroundColor: '#DC2626' }]} />
                  <Text style={styles.metricText}>
                    Out: <Text style={styles.valRed}>{formatINR(activeMonth.outflow)}</Text>
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.netPillBox}>
              <Text style={styles.netLabel}>NET SURPLUS</Text>
              <Text
                style={[
                  styles.netVal,
                  activeMonth.net >= 0 ? styles.valGreen : styles.valRed,
                ]}
              >
                {activeMonth.net >= 0 ? '+' : ''}
                {formatINR(activeMonth.net)}
              </Text>
              <Text style={styles.savingsRateText}>{savingsRate}% saved</Text>
            </View>
          </View>

          {/* Svg Dual Bar Chart */}
          <Svg width={containerWidth} height={chartHeight}>
            {/* Grid baseline */}
            <Line
              x1={paddingLeft}
              y1={paddingTop + plotH}
              x2={containerWidth - paddingRight}
              y2={paddingTop + plotH}
              stroke="#E2E8F0"
              strokeWidth={1}
            />

            {/* Grid upper dashed line */}
            <Line
              x1={paddingLeft}
              y1={getY(maxVal * 0.5)}
              x2={containerWidth - paddingRight}
              y2={getY(maxVal * 0.5)}
              stroke="#E2E8F0"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <SvgText
              x={paddingLeft - 6}
              y={getY(maxVal * 0.5) + 3}
              fill="#94A3B8"
              fontSize="9"
              fontWeight="600"
              textAnchor="end"
            >
              {formatShortK(maxVal * 0.5)}
            </SvgText>

            {cashFlowHistory.map((item, idx) => {
              const groupCenterX = paddingLeft + (idx + 0.5) * groupSpacing;
              const inX = groupCenterX - barW - 2;
              const outX = groupCenterX + 2;

              const inY = getY(item.inflow);
              const inH = Math.max(2, paddingTop + plotH - inY);

              const outY = getY(item.outflow);
              const outH = Math.max(2, paddingTop + plotH - outY);

              const isSelected = selectedIdx === idx;

              return (
                <React.Fragment key={idx}>
                  {/* Inflow Bar */}
                  <Rect
                    x={inX}
                    y={inY}
                    width={barW}
                    height={inH}
                    rx={3}
                    fill="#16A36A"
                    opacity={isSelected ? 1 : 0.65}
                  />

                  {/* Outflow Bar */}
                  <Rect
                    x={outX}
                    y={outY}
                    width={barW}
                    height={outH}
                    rx={3}
                    fill="#DC2626"
                    opacity={isSelected ? 1 : 0.65}
                  />

                  {/* Month Label */}
                  <SvgText
                    x={groupCenterX}
                    y={chartHeight - 6}
                    fill={isSelected ? '#0F172A' : '#64748B'}
                    fontSize="9.5"
                    fontWeight={isSelected ? '800' : '600'}
                    textAnchor="middle"
                  >
                    {item.month}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
        </>
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
    alignItems: 'center',
    marginBottom: 12,
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
  analyticsBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  analyticsBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
  },
  kpiMonthLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  inOutRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metricText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  valGreen: {
    color: '#16A36A',
    fontWeight: '800',
  },
  valRed: {
    color: '#DC2626',
    fontWeight: '800',
  },
  netPillBox: {
    alignItems: 'flex-end',
  },
  netLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.4,
  },
  netVal: {
    fontSize: 12.5,
    fontWeight: '900',
    marginTop: 1,
  },
  savingsRateText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#16A36A',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  emptyEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 14,
    maxWidth: 280,
  },
});
