import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal } from 'react-native';
import { theme } from '../theme';
import { InvestmentHolding } from '../types';
import { formatINR } from '../formatters';
import { MobileDonutAllocationChart } from './charts';

interface PortfolioScreenProps {
  holdings: InvestmentHolding[];
  onBack?: () => void;
  onAddInvestment?: () => void;
}

export const PortfolioScreen: React.FC<PortfolioScreenProps> = ({
  holdings,
  onBack,
  onAddInvestment,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'EQUITY' | 'MUTUAL_FUND' | 'GOLD'>('ALL');
  const [selectedHolding, setSelectedHolding] = useState<InvestmentHolding | null>(null);

  const filteredHoldings = holdings.filter(
    (h) => filter === 'ALL' || h.type === filter
  );

  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalInvested = holdings.reduce((sum, h) => sum + h.investedValue, 0);
  const totalPnl = totalValue - totalInvested;
  const pnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Portfolio Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.heroLabel}>INVESTMENT PORTFOLIO</Text>
            <View style={styles.realtimePill}>
              <Text style={styles.realtimeText}>● Live Market Quotes</Text>
            </View>
          </View>
          {onAddInvestment && (
            <TouchableOpacity
              style={styles.addAssetBtn}
              onPress={onAddInvestment}
              activeOpacity={0.8}
            >
              <Text style={styles.addAssetBtnText}>+ Add Holding</Text>
            </TouchableOpacity>
          )}
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

      {/* Interactive Wall-Street SVG Donut Allocation Chart */}
      <MobileDonutAllocationChart
        totalValue={totalValue}
        totalInvested={totalInvested}
      />

      {/* Segmented Filter Control */}
      <View style={styles.segmentedControl}>
        {(
          [
            { id: 'ALL', label: `All (${holdings.length})` },
            { id: 'EQUITY', label: 'Equities' },
            { id: 'MUTUAL_FUND', label: 'Funds' },
            { id: 'GOLD', label: 'Gold' },
          ] as const
        ).map((f) => {
          const isActive = filter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
              onPress={() => setFilter(f.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
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
            <TouchableOpacity
              key={h.id}
              style={styles.holdingCard}
              onPress={() => setSelectedHolding(h)}
              activeOpacity={0.8}
            >
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
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Holding Detail Modal */}
      {selectedHolding && (
        <Modal
          visible={!!selectedHolding}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedHolding(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.detailModalBox}>
              <View style={styles.modalBar} />
              <View style={styles.holdingModalHeader}>
                <View>
                  <Text style={styles.holdingModalSymbol}>{selectedHolding.symbol}</Text>
                  <Text style={styles.holdingModalName}>{selectedHolding.name}</Text>
                </View>
                <View style={styles.holdingTypeBadge}>
                  <Text style={styles.holdingTypeBadgeText}>{selectedHolding.type}</Text>
                </View>
              </View>

              <View style={styles.holdingModalGrid}>
                <View style={styles.holdingModalCol}>
                  <Text style={styles.holdingModalColLabel}>CURRENT VALUE</Text>
                  <Text style={styles.holdingModalColVal}>
                    {formatINR(selectedHolding.currentValue)}
                  </Text>
                </View>
                <View style={styles.holdingModalCol}>
                  <Text style={styles.holdingModalColLabel}>INVESTED CAPITAL</Text>
                  <Text style={styles.holdingModalColVal}>
                    {formatINR(selectedHolding.investedValue)}
                  </Text>
                </View>
              </View>

              <View style={styles.holdingModalGrid}>
                <View style={styles.holdingModalCol}>
                  <Text style={styles.holdingModalColLabel}>UNREALIZED P&L</Text>
                  <Text
                    style={[
                      styles.holdingModalColVal,
                      { color: selectedHolding.pnl >= 0 ? theme.colors.primary : theme.colors.danger },
                    ]}
                  >
                    {selectedHolding.pnl >= 0 ? '+' : ''}
                    {formatINR(selectedHolding.pnl)} ({selectedHolding.pnlPercentage.toFixed(2)}%)
                  </Text>
                </View>
                <View style={styles.holdingModalCol}>
                  <Text style={styles.holdingModalColLabel}>FIFO TAX LOT STATUS</Text>
                  <Text style={[styles.holdingModalColVal, { color: theme.colors.primaryDark }]}>
                    {selectedHolding.fifoLotAge}
                  </Text>
                </View>
              </View>

              <View style={styles.quoteRow}>
                <Text style={styles.quoteText}>
                  Shares: {selectedHolding.quantity} · Avg Buy: ₹{selectedHolding.avgBuyPrice.toFixed(2)} · LTP: ₹{selectedHolding.currentPrice.toFixed(2)}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedHolding(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseBtnText}>Close Holding Detail</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 106, 0.3)',
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addAssetBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  addAssetBtnText: {
    color: theme.colors.textWhite,
    fontSize: 11,
    fontWeight: '700',
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
    borderRadius: 5,
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
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#EEF2EF',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 14,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  segmentTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  holdingsList: {
    gap: 12,
  },
  holdingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
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
    fontSize: 10.5,
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
    backgroundColor: '#F0F4F1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  taxLotText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(23, 35, 29, 0.55)',
    justifyContent: 'flex-end',
  },
  detailModalBox: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  modalBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  holdingModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  holdingModalSymbol: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  holdingModalName: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  holdingTypeBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  holdingTypeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  holdingModalGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  holdingModalCol: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  holdingModalColLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  holdingModalColVal: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  quoteRow: {
    backgroundColor: '#FAFCFA',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: 16,
  },
  quoteText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalCloseBtn: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
});
