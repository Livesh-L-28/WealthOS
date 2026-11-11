import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { theme } from '../../theme';
import { formatINR } from '../../formatters';
import { InvestmentHolding } from '../../types';

export interface AssetAllocationSlice {
  id: string;
  label: string;
  pct: number;
  amount: number;
  color: string;
  pnlPct: number;
}

interface MobileDonutAllocationChartProps {
  totalValue: number;
  totalInvested: number;
  holdings?: InvestmentHolding[];
  onOpenPortfolio?: () => void;
  onAddInvestment?: () => void;
}

export const MobileDonutAllocationChart: React.FC<MobileDonutAllocationChartProps> = ({
  totalValue,
  totalInvested,
  holdings = [],
  onOpenPortfolio,
  onAddInvestment,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const totalPnl = totalValue - totalInvested;
  const pnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  // Dynamically compute slices from actual user holdings
  const slices: AssetAllocationSlice[] = useMemo(() => {
    if (!holdings || holdings.length === 0 || totalValue <= 0) {
      return [];
    }

    const typeConfig: Record<string, { label: string; color: string }> = {
      EQUITY: { label: 'Equities', color: '#16A36A' },
      MUTUAL_FUND: { label: 'Mutual Funds', color: '#6366F1' },
      GOLD: { label: 'Gold (SGB)', color: '#F59E0B' },
      FIXED_INCOME: { label: 'Fixed Income', color: '#0D9488' },
      REAL_ESTATE: { label: 'Real Estate', color: '#8B5CF6' },
      CRYPTO: { label: 'Digital Assets', color: '#EC4899' },
    };

    const grouped: Record<string, { amount: number; invested: number }> = {};
    holdings.forEach((h) => {
      const t = h.type || 'EQUITY';
      if (!grouped[t]) grouped[t] = { amount: 0, invested: 0 };
      grouped[t].amount += h.currentValue || (h.quantity * h.currentPrice);
      grouped[t].invested += (h.investedValue || (h.quantity * (h.avgBuyPrice || 0)));
    });

    const result: AssetAllocationSlice[] = [];
    Object.keys(grouped).forEach((typeKey) => {
      const g = grouped[typeKey];
      const cfg = typeConfig[typeKey] || { label: typeKey, color: '#3B82F6' };
      const pct = Math.round((g.amount / totalValue) * 100);
      const gain = g.amount - g.invested;
      const gainPct = g.invested > 0 ? (gain / g.invested) * 100 : 0;
      result.push({
        id: typeKey.toLowerCase(),
        label: cfg.label,
        pct: Math.max(1, pct),
        amount: g.amount,
        color: cfg.color,
        pnlPct: gainPct,
      });
    });

    return result;
  }, [holdings, totalValue]);

  const activeSlice = slices.find((s) => s.id === selectedId) || null;

  // Responsive donut geometry
  const windowW = Dimensions.get('window').width;
  const size = Math.min(136, windowW * 0.35);
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPct = 0;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>PORTFOLIO ASSET ALLOCATION</Text>
          <Text style={styles.subtitle}>Multi-Asset Distribution & Returns</Text>
        </View>

        <View style={styles.headerActions}>
          {totalValue > 0 && (
            <View style={styles.pnlBadge}>
              <Text style={styles.pnlText}>
                {totalPnl >= 0 ? '+' : ''}
                {pnlPct.toFixed(1)}%
              </Text>
            </View>
          )}
          {onOpenPortfolio && (
            <TouchableOpacity
              style={styles.portfolioBtn}
              onPress={onOpenPortfolio}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Open Portfolio View"
            >
              <Text style={styles.portfolioBtnText}>Portfolio ›</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Donut and Center Metric Row */}
      {totalValue <= 0 || slices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📈</Text>
          <Text style={styles.emptyTitle}>No Investment Holdings Tracked</Text>
          <Text style={styles.emptySubtitle}>
            Add equities, mutual funds, gold or SIPs to monitor your unified portfolio allocation and unrealized gains.
          </Text>
          {onAddInvestment && (
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={onAddInvestment}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyActionBtnText}>+ Add First Investment</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.donutRow}>
          {/* SVG Donut */}
          <View style={[styles.donutWrapper, { width: size, height: size }]}>
            <Svg width={size} height={size}>
              <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
                {slices.map((slice) => {
                  const strokeDasharray = `${(slice.pct / 100) * circumference} ${circumference}`;
                  const strokeDashoffset = -((accumulatedPct / 100) * circumference);
                  accumulatedPct += slice.pct;

                  const isSelected = selectedId === slice.id;

                  return (
                    <Circle
                      key={slice.id}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      opacity={selectedId ? (isSelected ? 1 : 0.4) : 1}
                    />
                  );
                })}
              </G>
            </Svg>

            {/* Central Cutout Info */}
            <View style={styles.centerHole} pointerEvents="none">
              <Text style={styles.centerLabel}>
                {activeSlice ? activeSlice.label.toUpperCase() : 'PORTFOLIO'}
              </Text>
              <Text style={styles.centerValue}>
                {activeSlice ? `${activeSlice.pct}%` : formatINR(totalValue)}
              </Text>
              <Text style={styles.centerSub}>
                {activeSlice
                  ? formatINR(activeSlice.amount)
                  : `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}% Gain`}
              </Text>
            </View>
          </View>

          {/* Right Asset Breakdown List */}
          <View style={styles.assetList}>
            {slices.map((slice) => {
              const isSelected = selectedId === slice.id;
              return (
                <TouchableOpacity
                  key={slice.id}
                  style={[styles.assetRow, isSelected && styles.assetRowSelected]}
                  onPress={() => setSelectedId(selectedId === slice.id ? null : slice.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.assetLeft}>
                    <View style={[styles.colorDot, { backgroundColor: slice.color }]} />
                    <View>
                      <Text style={styles.assetLabel}>{slice.label}</Text>
                      <Text style={styles.assetAmount}>{formatINR(slice.amount)}</Text>
                    </View>
                  </View>
                  <View style={styles.assetRight}>
                    <Text style={styles.assetPct}>{slice.pct}%</Text>
                    <Text
                      style={[
                        styles.assetPnl,
                        slice.pnlPct >= 0 ? styles.pnlGreen : styles.pnlRed,
                      ]}
                    >
                      {slice.pnlPct >= 0 ? '▲ +' : '▼ '}
                      {slice.pnlPct.toFixed(1)}%
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pnlBadge: {
    backgroundColor: 'rgba(22, 163, 106, 0.10)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pnlText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A36A',
  },
  portfolioBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  portfolioBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  donutWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerHole: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '70%',
    height: '70%',
  },
  centerLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: '#94A3B8',
  },
  centerValue: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 1,
  },
  centerSub: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#16A36A',
  },
  assetList: {
    flex: 1,
    gap: 6,
  },
  assetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  assetRowSelected: {
    backgroundColor: '#F8FAFC',
  },
  assetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  assetLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  assetAmount: {
    fontSize: 9,
    color: '#64748B',
  },
  assetRight: {
    alignItems: 'flex-end',
  },
  assetPct: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  assetPnl: {
    fontSize: 8.5,
    fontWeight: '700',
  },
  pnlGreen: {
    color: '#16A36A',
  },
  pnlRed: {
    color: '#DC2626',
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
    marginBottom: 10,
  },
  emptyActionBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
