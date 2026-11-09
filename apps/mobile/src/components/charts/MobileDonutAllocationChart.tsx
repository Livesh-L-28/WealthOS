import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { theme } from '../../theme';
import { formatINR } from '../../formatters';

export interface AssetAllocationSlice {
  id: string;
  label: string;
  pct: number;
  amount: number;
  color: string;
  pnlPct: number;
}

const ALLOCATION_SLICES: AssetAllocationSlice[] = [
  { id: 'equity', label: 'Equities', pct: 42, amount: 1982400, color: '#16A36A', pnlPct: 24.2 },
  { id: 'mf', label: 'Mutual Funds', pct: 36, amount: 1699200, color: '#6366F1', pnlPct: 15.8 },
  { id: 'gold', label: 'Gold (SGB)', pct: 12, amount: 566400, color: '#F59E0B', pnlPct: 11.4 },
  { id: 'fixed', label: 'Fixed Income', pct: 10, amount: 472000, color: '#0D9488', pnlPct: 7.2 },
];

interface MobileDonutAllocationChartProps {
  totalValue: number;
  totalInvested: number;
  onOpenPortfolio?: () => void;
}

export const MobileDonutAllocationChart: React.FC<MobileDonutAllocationChartProps> = ({
  totalValue,
  totalInvested,
  onOpenPortfolio,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const totalPnl = totalValue - totalInvested;
  const pnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const activeSlice = ALLOCATION_SLICES.find((s) => s.id === selectedId) || null;

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
          <View style={styles.pnlBadge}>
            <Text style={styles.pnlText}>
              {totalPnl >= 0 ? '+' : ''}
              {pnlPct.toFixed(1)}%
            </Text>
          </View>
          {onOpenPortfolio && (
            <TouchableOpacity
              style={styles.portfolioBtn}
              onPress={onOpenPortfolio}
              activeOpacity={0.7}
            >
              <Text style={styles.portfolioBtnText}>Portfolio ›</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Donut and Center Metric Row */}
      <View style={styles.donutRow}>
        {/* SVG Donut */}
        <View style={[styles.donutWrapper, { width: size, height: size }]}>
          <Svg width={size} height={size}>
            <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
              {ALLOCATION_SLICES.map((slice) => {
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
          {ALLOCATION_SLICES.map((slice) => {
            const isSelected = selectedId === slice.id;
            return (
              <TouchableOpacity
                key={slice.id}
                style={[styles.assetItem, isSelected && styles.assetItemActive]}
                onPress={() => setSelectedId(isSelected ? null : slice.id)}
                activeOpacity={0.7}
              >
                <View style={styles.assetItemLeft}>
                  <View style={[styles.assetDot, { backgroundColor: slice.color }]} />
                  <View>
                    <Text style={styles.assetName}>{slice.label}</Text>
                    <Text style={styles.assetValue}>{formatINR(slice.amount)}</Text>
                  </View>
                </View>
                <View style={styles.assetItemRight}>
                  <Text style={styles.assetPct}>{slice.pct}%</Text>
                  <Text style={styles.assetGain}>+{slice.pnlPct}%</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Footer Shortcut to Holdings */}
      {onOpenPortfolio && (
        <TouchableOpacity
          style={styles.portfolioFooter}
          onPress={onOpenPortfolio}
          activeOpacity={0.7}
        >
          <Text style={styles.portfolioFooterText}>
            View All 8 Holdings & FIFO Lots ›
          </Text>
        </TouchableOpacity>
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
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  portfolioBtn: {
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  portfolioBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#087A50',
  },
  pnlBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  pnlText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#087A50',
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    width: 84,
  },
  centerLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    letterSpacing: 0.3,
  },
  centerValue: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: 1,
  },
  centerSub: {
    fontSize: 8,
    fontWeight: '700',
    color: '#087A50',
    marginTop: 1,
  },
  assetList: {
    flex: 1,
    gap: 6,
  },
  assetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.canvas,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  assetItemActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceElevated,
  },
  assetItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  assetDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  assetName: {
    fontSize: 10.5,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  assetValue: {
    fontSize: 9,
    fontWeight: '600',
    color: theme.colors.textTertiary,
  },
  assetItemRight: {
    alignItems: 'flex-end',
  },
  assetPct: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  assetGain: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#087A50',
  },
  portfolioFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    alignItems: 'center',
  },
  portfolioFooterText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
});
