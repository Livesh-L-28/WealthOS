import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { theme } from '../theme';
import { InvestmentHolding } from '../types';
import { INITIAL_DIVIDENDS } from '../data';
import { formatINR } from '../formatters';
import { MobileDonutAllocationChart } from './charts';

interface PortfolioScreenProps {
  holdings: InvestmentHolding[];
  onBack?: () => void;
  onAddInvestment?: () => void;
}

interface ActiveSIP {
  id: string;
  fundName: string;
  amount: number;
  frequency: string;
  debitDate: string;
  nextDebit: string;
  sourceAccount: string;
  status: 'ACTIVE' | 'PAUSED';
}

const ACTIVE_SIPS: ActiveSIP[] = [
  {
    id: 'sip-1',
    fundName: 'Parag Parikh Flexi Cap Fund - Direct-G',
    amount: 50000,
    frequency: 'Monthly',
    debitDate: '01st of each month',
    nextDebit: '01 Dec 2026',
    sourceAccount: 'ICICI Privileged Savings •••• 9921',
    status: 'ACTIVE',
  },
  {
    id: 'sip-2',
    fundName: 'Mirae Asset Large Cap Fund - Direct-G',
    amount: 25000,
    frequency: 'Monthly',
    debitDate: '10th of each month',
    nextDebit: '10 Nov 2026',
    sourceAccount: 'HDFC Corporate Salary •••• 4921',
    status: 'ACTIVE',
  },
];

type PortfolioFilter = 'ALL' | 'EQUITY' | 'MUTUAL_FUND' | 'SIPS' | 'DIVIDENDS' | 'GOLD';

export const PortfolioScreen: React.FC<PortfolioScreenProps> = ({
  holdings,
  onBack,
  onAddInvestment,
}) => {
  const [filter, setFilter] = useState<PortfolioFilter>('ALL');
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
      {/* 1. Header with Add Button */}
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.sectionHeaderTitle}>Investments & Demat</Text>
          <Text style={styles.sectionHeaderPnl}>
            Total P&L: {totalPnl >= 0 ? '+' : ''}{formatINR(totalPnl)} ({pnlPct.toFixed(1)}%)
          </Text>
        </View>
        {onAddInvestment && (
          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={onAddInvestment}
            activeOpacity={0.8}
            accessibilityLabel="Add New Investment or SIP"
          >
            <Text style={styles.headerAddBtnIcon}>+</Text>
            <Text style={styles.headerAddBtnText}>Add Asset</Text>
          </TouchableOpacity>
        )}
      </View>

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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.segmentedScroll}
      >
        {(
          [
            { id: 'ALL', label: `All (${holdings.length})` },
            { id: 'EQUITY', label: 'Equities' },
            { id: 'MUTUAL_FUND', label: 'Mutual Funds' },
            { id: 'SIPS', label: `SIPs (${ACTIVE_SIPS.length})` },
            { id: 'DIVIDENDS', label: `Dividends (${INITIAL_DIVIDENDS.length})` },
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
      </ScrollView>

      {/* Active SIPs View */}
      {filter === 'SIPS' && (
        <View style={styles.holdingsList}>
          <View style={styles.summaryBar}>
            <View>
              <Text style={styles.summaryBarLabel}>TOTAL MONTHLY SIP COMMITMENT</Text>
              <Text style={styles.summaryBarVal}>₹75,000.00 / month</Text>
            </View>
            {onAddInvestment && (
              <TouchableOpacity
                style={styles.subActionBtn}
                onPress={onAddInvestment}
                activeOpacity={0.8}
              >
                <Text style={styles.subActionBtnText}>+ New SIP</Text>
              </TouchableOpacity>
            )}
          </View>
          {ACTIVE_SIPS.map((sip) => (
            <View key={sip.id} style={styles.holdingCard}>
              <View style={styles.holdingTopRow}>
                <View style={styles.holdingTitleCol}>
                  <Text style={styles.holdingSymbol}>{sip.fundName}</Text>
                  <Text style={styles.holdingName}>Auto-debit: {sip.sourceAccount}</Text>
                </View>
                <View style={styles.holdingValueCol}>
                  <Text style={styles.holdingValue}>{formatINR(sip.amount)}/mo</Text>
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>● {sip.status}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.holdingDetailsRow}>
                <Text style={styles.holdingDetailsText}>
                  Schedule: {sip.debitDate} · Next: {sip.nextDebit}
                </Text>
                <View style={styles.taxLotPill}>
                  <Text style={styles.taxLotText}>NACH Verified</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Dividends View */}
      {filter === 'DIVIDENDS' && (
        <View style={styles.holdingsList}>
          <View style={styles.summaryBar}>
            <View>
              <Text style={styles.summaryBarLabel}>ANNUAL DIVIDEND CASH FLOW</Text>
              <Text style={styles.summaryBarVal}>₹23,337.50 (Settled: ₹14,500.00)</Text>
            </View>
            <View style={styles.taxLotPill}>
              <Text style={styles.taxLotText}>TDS 10% Deducted</Text>
            </View>
          </View>
          {INITIAL_DIVIDENDS.map((div) => {
            const isSettled = div.status === 'RECEIVED';
            return (
              <View key={div.id} style={styles.holdingCard}>
                <View style={styles.holdingTopRow}>
                  <View style={styles.holdingTitleCol}>
                    <Text style={styles.holdingSymbol}>{div.symbol}</Text>
                    <Text style={styles.holdingName}>{div.company}</Text>
                  </View>
                  <View style={styles.holdingValueCol}>
                    <Text style={[styles.holdingValue, { color: '#087A50' }]}>
                      +{formatINR(div.totalPayout)}
                    </Text>
                    <View
                      style={[
                        styles.statusPillBadge,
                        { backgroundColor: isSettled ? '#E8F5EE' : '#EFF6FF' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillBadgeText,
                          { color: isSettled ? '#087A50' : '#2563EB' },
                        ]}
                      >
                        {isSettled ? '✓ SETTLED' : '● PROJECTED'}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.holdingDetailsRow}>
                  <Text style={styles.holdingDetailsText}>
                    Date: {div.payoutDate} · Rate: ₹{div.amountPerShare.toFixed(2)}/unit
                  </Text>
                  <View style={styles.taxLotPill}>
                    <Text style={styles.taxLotText}>Bank ECS</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Holdings List (All, Equity, Mutual Fund, Gold) */}
      {filter !== 'SIPS' && filter !== 'DIVIDENDS' && (
        filteredHoldings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📈</Text>
          <Text style={styles.emptyTitle}>No Investment Holdings</Text>
          <Text style={styles.emptySubtitle}>
            Track direct equities, mutual funds, or gold to monitor consolidated unrealized returns.
          </Text>
          {onAddInvestment && (
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={onAddInvestment}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyActionBtnText}>+ Add First Holding</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
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
      ))}

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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  sectionHeaderPnl: {
    fontSize: 11,
    fontWeight: '700',
    color: '#087A50',
    marginTop: 2,
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#087A50',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#087A50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  headerAddBtnIcon: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  headerAddBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  segmentedScroll: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    paddingVertical: 2,
  },
  summaryBar: {
    backgroundColor: '#F8FAF9',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E7ECE8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryBarLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  summaryBarVal: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  subActionBtn: {
    backgroundColor: '#087A50',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  subActionBtnText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  activePill: {
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#087A50',
  },
  statusPillBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  statusPillBadgeText: {
    fontSize: 9,
    fontWeight: '800',
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
  emptyContainer: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 16,
  },
  emptyActionBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
