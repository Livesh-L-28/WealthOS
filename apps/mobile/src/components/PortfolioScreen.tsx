import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from '../theme';
import { InvestmentHolding } from '../types';
import { formatINR } from '../formatters';

interface PortfolioScreenProps {
  holdings: InvestmentHolding[];
}

export const PortfolioScreen: React.FC<PortfolioScreenProps> = ({ holdings }) => {
  const [filter, setFilter] = useState<'ALL' | 'EQUITY' | 'MUTUAL_FUND' | 'GOLD'>('ALL');

  const filteredHoldings = holdings.filter(
    (h) => filter === 'ALL' || h.type === filter
  );

  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalInvested = holdings.reduce((sum, h) => sum + h.investedValue, 0);
  const totalPnl = totalValue - totalInvested;
  const pnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Portfolio Value Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <Text style={styles.heroLabel}>INVESTMENT PORTFOLIO VALUE</Text>
          <View style={styles.realtimePill}>
            <Text style={styles.realtimeText}>● Live Market Quotes</Text>
          </View>
        </View>

        <Text style={styles.heroValue}>{formatINR(totalValue)}</Text>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatLabel}>Total Unrealized P&L</Text>
            <Text style={styles.heroPnlVal}>
              {totalPnl >= 0 ? '+' : ''}
              {formatINR(totalPnl)} ({pnlPct.toFixed(2)}%)
            </Text>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatLabel}>Invested Capital</Text>
            <Text style={styles.heroInvestedVal}>{formatINR(totalInvested)}</Text>
          </View>
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {(
          [
            { id: 'ALL', label: `All (${holdings.length})` },
            { id: 'EQUITY', label: 'Equities' },
            { id: 'MUTUAL_FUND', label: 'Mutual Funds' },
            { id: 'GOLD', label: 'Gold (SGB)' },
          ] as const
        ).map((f) => {
          const isActive = filter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setFilter(f.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Holdings List */}
      <View style={styles.holdingsList}>
        {filteredHoldings.map((h) => {
          const isProfit = h.pnl >= 0;
          return (
            <View key={h.id} style={styles.holdingCard}>
              <View style={styles.holdingTopRow}>
                <View style={styles.holdingTitleCol}>
                  <Text style={styles.holdingSymbol}>{h.symbol}</Text>
                  <Text style={styles.holdingName} numberOfLines={1}>
                    {h.name}
                  </Text>
                </View>

                <View style={styles.holdingValueCol}>
                  <Text style={styles.holdingValue}>{formatINR(h.currentValue)}</Text>
                  <Text
                    style={[
                      styles.holdingPnl,
                      isProfit ? styles.pnlProfit : styles.pnlLoss,
                    ]}
                  >
                    {isProfit ? '+' : ''}
                    {formatINR(h.pnl)} ({h.pnlPercentage.toFixed(1)}%)
                  </Text>
                </View>
              </View>

              <View style={styles.holdingDetailsRow}>
                <Text style={styles.holdingDetailsText}>
                  Qty: {h.quantity} · Avg: ₹{h.avgBuyPrice.toFixed(1)} · LTP: ₹{h.currentPrice.toFixed(1)}
                </Text>
                <View style={styles.taxLotPill}>
                  <Text style={styles.taxLotText}>{h.fifoLotAge}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 106, 0.3)',
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  realtimePill: {
    backgroundColor: theme.colors.primaryLightSolid,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  realtimeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  heroValue: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.6,
    marginBottom: 12,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  heroStatItem: {
    flex: 1,
  },
  heroStatLabel: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  heroPnlVal: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.positive,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  heroInvestedVal: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: theme.colors.cardSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primaryLightSolid,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
  holdingsList: {
    gap: 10,
  },
  holdingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  holdingTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  holdingTitleCol: {
    flex: 1,
    marginRight: 10,
  },
  holdingSymbol: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  holdingName: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  holdingValueCol: {
    alignItems: 'flex-end',
  },
  holdingValue: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  holdingPnl: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  pnlProfit: {
    color: theme.colors.positive,
  },
  pnlLoss: {
    color: theme.colors.negative,
  },
  holdingDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    marginTop: 2,
  },
  holdingDetailsText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  taxLotPill: {
    backgroundColor: theme.colors.cardSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: theme.colors.border,
  },
  taxLotText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
});
