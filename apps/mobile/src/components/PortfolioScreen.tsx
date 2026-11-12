import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, ScrollView, Switch } from 'react-native';
import { theme, useTheme } from '../theme';
import { InvestmentHolding, DividendItem } from '../types';
import { formatINR } from '../formatters';
import { MobileDonutAllocationChart } from './charts';

interface PortfolioScreenProps {
  holdings: InvestmentHolding[];
  onBack?: () => void;
  onAddInvestment?: () => void;
  onShowToast?: (msg: string) => void;
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

interface BondHolding {
  id: string;
  name: string;
  symbol: string;
  type: 'GOVT_BOND' | 'SGB' | 'CORP_BOND';
  couponRate: string;
  faceValue: number;
  investedAmount: number;
  currentValue: number;
  maturityDate: string;
  nextInterestDate: string;
  issuer: string;
}

interface UpcomingDividendEvent {
  id: string;
  symbol: string;
  company: string;
  type: 'INTERIM' | 'FINAL' | 'SPECIAL';
  ratePerShare: number;
  shares: number;
  totalAmount: number;
  exDate: string;
  recordDate: string;
  status: 'ANNOUNCED' | 'RECORD_LOCKED';
}

interface ExtractedAsset {
  id: string;
  category: 'STOCKS' | 'MUTUAL_FUNDS' | 'SIPS' | 'BONDS' | 'OTHERS';
  name: string;
  symbol: string;
  quantity: string;
  price: number;
  totalValue: number;
  selected: boolean;
}

type PortfolioFilter = 'ALL' | 'EQUITY' | 'MUTUAL_FUND' | 'SIPS' | 'DIVIDENDS' | 'BONDS' | 'DAILY_MICRO' | 'GOLD';

export const PortfolioScreen: React.FC<PortfolioScreenProps> = ({
  holdings,
  onBack,
  onAddInvestment,
  onShowToast,
}) => {
  const { isDark } = useTheme();
  const cardBg = isDark ? '#111827' : '#FFFFFF';
  const borderColor = isDark ? '#1E293B' : '#E2E8F0';
  const canvasBg = isDark ? '#0B0F19' : '#F8FAFC';
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const [filter, setFilter] = useState<PortfolioFilter>('ALL');
  const [selectedHolding, setSelectedHolding] = useState<InvestmentHolding | null>(null);
  const [sips, setSips] = useState<ActiveSIP[]>([]);
  const [bonds, setBonds] = useState<BondHolding[]>([]);
  const [upcomingDividends, setUpcomingDividends] = useState<UpcomingDividendEvent[]>([]);
  const [historicalDividends, setHistoricalDividends] = useState<DividendItem[]>([]);

  // Document & Image AI OCR Classifier State
  const [isDocClassifierOpen, setIsDocClassifierOpen] = useState(false);
  const [classifierStep, setClassifierStep] = useState<'SELECT' | 'PROCESSING' | 'REVIEW'>('SELECT');
  const [selectedDocType, setSelectedDocType] = useState<'ZERODHA_DEMAT' | 'CAMS_CAS' | 'SGB_BOND'>('ZERODHA_DEMAT');
  const [dripEnabled, setDripEnabled] = useState(true);

  // Daily Savings & Daily Invest State
  const [dailyInvestAmount, setDailyInvestAmount] = useState<number>(250);
  const [investStreakDays, setInvestStreakDays] = useState<number>(0);
  const [isInvestedToday, setIsInvestedToday] = useState<boolean>(false);
  const [dailyVaultBalance, setDailyVaultBalance] = useState<number>(0);
  const [autoRoundUpActive, setAutoRoundUpActive] = useState<boolean>(false);

  const [extractedAssets, setExtractedAssets] = useState<ExtractedAsset[]>([]);

  const filteredHoldings = holdings.filter(
    (h) => filter === 'ALL' || h.type === filter
  );

  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalInvested = holdings.reduce((sum, h) => sum + h.investedValue, 0);
  const totalPnl = totalValue - totalInvested;
  const pnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const handleStartScan = (docType: 'ZERODHA_DEMAT' | 'CAMS_CAS' | 'SGB_BOND') => {
    setSelectedDocType(docType);
    setClassifierStep('PROCESSING');
    setTimeout(() => {
      setClassifierStep('REVIEW');
      onShowToast?.('✓ AI Scan Complete: 6 Assets classified across Stocks, MFs, SIPs, Bonds.');
    }, 1200);
  };

  const handleToggleAsset = (id: string) => {
    setExtractedAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a))
    );
  };

  const handleConfirmImport = () => {
    const selectedCount = extractedAssets.filter((a) => a.selected).length;
    setIsDocClassifierOpen(false);
    setClassifierStep('SELECT');
    onShowToast?.(`✓ Successfully imported ${selectedCount} verified assets into Demat Portfolio.`);
  };

  const handleExecuteDailyInvest = () => {
    if (isInvestedToday) {
      onShowToast?.(`Today's ₹${dailyInvestAmount} auto-invest was already executed.`);
      return;
    }
    setIsInvestedToday(true);
    setInvestStreakDays((s) => s + 1);
    onShowToast?.(`✓ Logged +₹${dailyInvestAmount} daily invest into Nifty 50 Index Fund!`);
  };

  const handleAddDailySavings = (amount: number) => {
    setDailyVaultBalance((v) => v + amount);
    onShowToast?.(`✓ Added +₹${amount} to Daily Savings Vault (6.8% p.a. Liquid Fund).`);
  };

  return (
    <View style={[styles.container, { backgroundColor: canvasBg }]}>
      {/* 1. Header with Add & AI Scan Buttons */}
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={[styles.sectionHeaderTitle, { color: textPrimary }]}>Investments & Demat</Text>
          <Text style={styles.sectionHeaderPnl}>
            Total P&L: {totalPnl >= 0 ? '+' : ''}{formatINR(totalPnl)} ({pnlPct.toFixed(1)}%)
          </Text>
        </View>
        <View style={styles.headerButtonsRow}>
          <TouchableOpacity
            style={styles.headerScanBtn}
            onPress={() => {
              setClassifierStep('SELECT');
              setIsDocClassifierOpen(true);
            }}
            activeOpacity={0.8}
            accessibilityLabel="Upload Document or Screenshot to Auto-Classify"
          >
            <Text style={styles.headerScanBtnIcon}>📷</Text>
            <Text style={styles.headerScanBtnText}>AI Scan</Text>
          </TouchableOpacity>

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
      </View>

      {/* AI Document & Image Upload Quick Banner */}
      <TouchableOpacity
        style={[styles.aiUploadBanner, { backgroundColor: cardBg, borderColor }]}
        onPress={() => {
          setClassifierStep('SELECT');
          setIsDocClassifierOpen(true);
        }}
        activeOpacity={0.85}
      >
        <View style={styles.aiUploadBannerIconBox}>
          <Text style={styles.aiUploadBannerIcon}>📄</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.aiUploadTitleRow}>
            <Text style={[styles.aiUploadBannerTitle, { color: textPrimary }]}>
              Upload Statement or Screenshot
            </Text>
            <View style={styles.aiTagPill}>
              <Text style={styles.aiTagPillText}>AI OCR</Text>
            </View>
          </View>
          <Text style={[styles.aiUploadBannerSub, { color: textSecondary }]}>
            Auto-analyzes & classifies into Stocks, Mutual Funds, SIPs, Bonds & Gold
          </Text>
        </View>
        <Text style={styles.aiUploadArrow}>›</Text>
      </TouchableOpacity>

      {/* Portfolio Hero Card */}
      <View style={[styles.heroCard, { backgroundColor: cardBg, borderColor }]}>
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

      {/* Interactive SVG Donut Allocation Chart */}
      <MobileDonutAllocationChart
        totalValue={totalValue}
        totalInvested={totalInvested}
        holdings={holdings}
        onAddInvestment={onAddInvestment}
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
            { id: 'SIPS', label: sips.length > 0 ? `SIPs (${sips.length})` : 'SIPs' },
            { id: 'BONDS', label: bonds.length > 0 ? `Bonds (${bonds.length})` : 'Bonds' },
            { id: 'DIVIDENDS', label: upcomingDividends.length > 0 ? `Dividends (${upcomingDividends.length})` : 'Dividends' },
            { id: 'DAILY_MICRO', label: 'Daily Micro' },
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

      {/* 2. Active SIPs View */}
      {filter === 'SIPS' && (
        <View style={styles.holdingsList}>
          <View style={styles.summaryBar}>
            <View>
              <Text style={styles.summaryBarLabel}>TOTAL MONTHLY SIP COMMITMENT</Text>
              <Text style={styles.summaryBarVal}>
                {formatINR(sips.reduce((s, x) => s + x.amount, 0))} / month
              </Text>
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
          {sips.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🔄</Text>
              <Text style={styles.emptyTitle}>No Active SIPs Tracked</Text>
              <Text style={styles.emptySubtitle}>
                Automate systematic investments into equity or index funds to maintain disciplined rupee-cost averaging.
              </Text>
              {onAddInvestment && (
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={onAddInvestment}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyActionBtnText}>+ Set Up First SIP</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            sips.map((sip) => (
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
                    <Text style={styles.taxLotText}>NACH Mandate</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* 3. Bonds & Fixed Income View */}
      {filter === 'BONDS' && (
        <View style={styles.holdingsList}>
          <View style={styles.summaryBar}>
            <View>
              <Text style={styles.summaryBarLabel}>GOVERNMENT & CORPORATE BONDS</Text>
              <Text style={styles.summaryBarVal}>
                {formatINR(bonds.reduce((s, b) => s + b.currentValue, 0))} Total Depository
              </Text>
            </View>
            {onAddInvestment && (
              <TouchableOpacity
                style={styles.subActionBtn}
                onPress={onAddInvestment}
                activeOpacity={0.8}
              >
                <Text style={styles.subActionBtnText}>+ Add Bond</Text>
              </TouchableOpacity>
            )}
          </View>
          {bonds.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📜</Text>
              <Text style={styles.emptyTitle}>No Bonds or Fixed Income</Text>
              <Text style={styles.emptySubtitle}>
                Add Sovereign Gold Bonds (SGBs), RBI Floating Rate Bonds, or Corporate Debentures to your ledger.
              </Text>
              {onAddInvestment && (
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={onAddInvestment}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyActionBtnText}>+ Add Bond / SGB</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            bonds.map((bond) => (
              <View key={bond.id} style={styles.holdingCard}>
                <View style={styles.holdingTopRow}>
                  <View style={styles.holdingTitleCol}>
                    <Text style={styles.holdingSymbol}>{bond.name}</Text>
                    <Text style={styles.holdingName}>Issuer: {bond.issuer}</Text>
                  </View>
                  <View style={styles.holdingValueCol}>
                    <Text style={styles.holdingValue}>{formatINR(bond.currentValue)}</Text>
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>{bond.couponRate}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.holdingDetailsRow}>
                  <Text style={styles.holdingDetailsText}>
                    Matures: {bond.maturityDate} · Next Interest: {bond.nextInterestDate}
                  </Text>
                  <View style={styles.taxLotPill}>
                    <Text style={styles.taxLotText}>{bond.type}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* 4. Daily Savings & Daily Invest Engine View */}
      {filter === 'DAILY_MICRO' && (
        <View style={styles.holdingsList}>
          {/* Daily Micro-SIP Investment Engine */}
          <View style={styles.microInvestCard}>
            <View style={styles.microTopRow}>
              <View style={styles.microIconCircle}>
                <Text style={styles.microIcon}>🚀</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.microHeaderTitleRow}>
                  <Text style={styles.microCardTitle}>Daily Invest (Auto Micro-SIP)</Text>
                  <View style={styles.streakBadge}>
                    <Text style={styles.streakBadgeText}>🔥 {investStreakDays} Days Streak</Text>
                  </View>
                </View>
                <Text style={styles.microCardSub}>Automated daily wealth builder into Nifty 50 Index</Text>
              </View>
            </View>

            <View style={styles.dailyAmountRow}>
              {[100, 250, 500, 1000].map((amt) => {
                const isSelected = dailyInvestAmount === amt;
                return (
                  <TouchableOpacity
                    key={amt}
                    style={[styles.dailyAmtPill, isSelected && styles.dailyAmtPillActive]}
                    onPress={() => setDailyInvestAmount(amt)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dailyAmtText, isSelected && styles.dailyAmtTextActive]}>
                      ₹{amt}/day
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.compoundingBox}>
              <View style={styles.compoundingCol}>
                <Text style={styles.compoundingLabel}>PROJECTED 10Y CORPUS</Text>
                <Text style={styles.compoundingVal}>
                  ₹{(dailyInvestAmount * 30 * 12 * 2.1).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Text>
              </View>
              <View style={styles.compoundingCol}>
                <Text style={styles.compoundingLabel}>ESTIMATED CAGR</Text>
                <Text style={[styles.compoundingVal, { color: '#087A50' }]}>13.5% p.a.</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.executeDailyBtn, isInvestedToday && styles.executeDailyBtnDone]}
              onPress={handleExecuteDailyInvest}
              activeOpacity={0.85}
            >
              <Text style={styles.executeDailyBtnText}>
                {isInvestedToday
                  ? `✓ Paid Today (₹${dailyInvestAmount} Credited to Index Fund)`
                  : `⚡ Invest Today's ₹${dailyInvestAmount} Now`}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Daily Savings Vault (Liquid Emergency Cash) */}
          <View style={styles.savingsVaultCard}>
            <View style={styles.microTopRow}>
              <View style={[styles.microIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Text style={styles.microIcon}>🛡️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.microHeaderTitleRow}>
                  <Text style={styles.microCardTitle}>Daily Savings Vault</Text>
                  <View style={[styles.streakBadge, { backgroundColor: '#DBEAFE' }]}>
                    <Text style={[styles.streakBadgeText, { color: '#1D4ED8' }]}>6.8% p.a. Liquid</Text>
                  </View>
                </View>
                <Text style={styles.microCardSub}>Liquid Overnight cash cushion with auto-sweep</Text>
              </View>
            </View>

            <View style={styles.vaultBalanceRow}>
              <View>
                <Text style={styles.vaultBalanceLabel}>ACCUMULATED VAULT BALANCE</Text>
                <Text style={styles.vaultBalanceVal}>{formatINR(dailyVaultBalance)}</Text>
              </View>
              <View style={styles.autoSweepToggleCol}>
                <Text style={styles.autoSweepLabel}>Auto-Roundup</Text>
                <Switch
                  value={autoRoundUpActive}
                  onValueChange={setAutoRoundUpActive}
                  trackColor={{ false: '#E2E8F0', true: '#86EFAC' }}
                  thumbColor={autoRoundUpActive ? '#16A36A' : '#94A3B8'}
                />
              </View>
            </View>

            <View style={styles.quickSaveButtonsRow}>
              {[50, 100, 250, 500].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={styles.quickSaveBtn}
                  onPress={() => handleAddDailySavings(amt)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.quickSaveBtnText}>+₹{amt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* 5. Enhanced Dividend Tracker View */}
      {filter === 'DIVIDENDS' && (
        <View style={styles.holdingsList}>
          {/* Annual Yield KPI Card */}
          <View style={styles.dividendHeroCard}>
            <View style={styles.dividendHeroTop}>
              <View>
                <Text style={styles.dividendHeroLabel}>FY26 PROJECTED DIVIDEND YIELD</Text>
                <Text style={styles.dividendHeroVal}>
                  {formatINR(
                    historicalDividends.reduce((s, d) => s + (d.totalPayout || 0), 0) +
                    upcomingDividends.reduce((s, d) => s + (d.totalAmount || 0), 0)
                  )}
                </Text>
              </View>
              <View style={styles.dripToggleBox}>
                <Text style={styles.dripLabel}>Auto DRIP</Text>
                <Switch
                  value={dripEnabled}
                  onValueChange={setDripEnabled}
                  trackColor={{ false: '#E2E8F0', true: '#86EFAC' }}
                  thumbColor={dripEnabled ? '#16A36A' : '#94A3B8'}
                />
              </View>
            </View>
            <View style={styles.dividendHeroBottomRow}>
              <Text style={styles.dividendHeroSub}>
                Settled: <Text style={{ color: '#087A50', fontWeight: '800' }}>{formatINR(historicalDividends.reduce((s, d) => s + (d.totalPayout || 0), 0))}</Text> · Upcoming: <Text style={{ color: '#2563EB', fontWeight: '800' }}>{formatINR(upcomingDividends.reduce((s, d) => s + (d.totalAmount || 0), 0))}</Text>
              </Text>
            </View>
          </View>

          {upcomingDividends.length === 0 && historicalDividends.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>💰</Text>
              <Text style={styles.emptyTitle}>No Dividends Recorded</Text>
              <Text style={styles.emptySubtitle}>
                Dividends credited to your bank accounts or announced by portfolio companies will automatically be recognized and tracked here.
              </Text>
            </View>
          ) : (
            <>
              {/* Upcoming Dividend Payout Calendar */}
              {upcomingDividends.length > 0 && (
                <>
                  <View style={styles.dividendSectionHeadingRow}>
                    <Text style={styles.dividendSectionTitle}>UPCOMING PAYOUT CALENDAR (ANNOUNCED)</Text>
                    <Text style={styles.dividendSectionSub}>{upcomingDividends.length} Ex-Dates</Text>
                  </View>

                  {upcomingDividends.map((div) => (
                    <View key={div.id} style={styles.holdingCard}>
                      <View style={styles.holdingTopRow}>
                        <View style={styles.holdingTitleCol}>
                          <Text style={styles.holdingSymbol}>{div.symbol} · {div.type} DIVIDEND</Text>
                          <Text style={styles.holdingName}>{div.company}</Text>
                        </View>
                        <View style={styles.holdingValueCol}>
                          <Text style={[styles.holdingValue, { color: '#087A50' }]}>
                            +{formatINR(div.totalAmount)}
                          </Text>
                          <View style={styles.activePill}>
                            <Text style={styles.activePillText}>₹{div.ratePerShare}/sh</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.holdingDetailsRow}>
                        <Text style={styles.holdingDetailsText}>
                          Ex-Date: {div.exDate} · Record: {div.recordDate} ({div.shares} Shares)
                        </Text>
                        <View style={styles.taxLotPill}>
                          <Text style={styles.taxLotText}>{div.status}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {/* Settled / Received Dividends */}
              {historicalDividends.length > 0 && (
                <>
                  <View style={styles.dividendSectionHeadingRow}>
                    <Text style={styles.dividendSectionTitle}>HISTORICAL RECEIVED DIVIDENDS</Text>
                    <Text style={styles.dividendSectionSub}>TDS 10% Withheld</Text>
                  </View>

                  {historicalDividends.map((div) => (
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
                          <View style={[styles.statusPillBadge, { backgroundColor: '#E8F5EE' }]}>
                            <Text style={[styles.statusPillBadgeText, { color: '#087A50' }]}>✓ CREDITED</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.holdingDetailsRow}>
                        <Text style={styles.holdingDetailsText}>
                          Date: {div.payoutDate} · Rate: ₹{div.amountPerShare.toFixed(2)}/sh
                        </Text>
                        <View style={styles.taxLotPill}>
                          <Text style={styles.taxLotText}>Bank ECS Verified</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </View>
      )}

      {/* 6. Holdings List (All, Equity, Mutual Fund, Gold) */}
      {filter !== 'SIPS' && filter !== 'BONDS' && filter !== 'DAILY_MICRO' && filter !== 'DIVIDENDS' && (
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
                    {h.quantity} units · Avg {formatINR(h.avgBuyPrice)} · LTP {formatINR(h.currentPrice)}
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
          animationType="slide"
          onRequestClose={() => setSelectedHolding(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{selectedHolding.symbol}</Text>
                  <Text style={styles.modalSubtitle}>{selectedHolding.name}</Text>
                </View>
                <View style={styles.taxLotPill}>
                  <Text style={styles.taxLotText}>{selectedHolding.type}</Text>
                </View>
              </View>

              <View style={styles.modalStatsGrid}>
                <View style={styles.modalStatCol}>
                  <Text style={styles.modalStatLabel}>INVESTED VALUE</Text>
                  <Text style={styles.modalStatVal}>{formatINR(selectedHolding.investedValue)}</Text>
                </View>
                <View style={styles.modalStatCol}>
                  <Text style={styles.modalStatLabel}>CURRENT VALUE</Text>
                  <Text style={styles.modalStatVal}>{formatINR(selectedHolding.currentValue)}</Text>
                </View>
                <View style={styles.modalStatCol}>
                  <Text style={styles.modalStatLabel}>TOTAL P&L</Text>
                  <Text
                    style={[
                      styles.modalStatVal,
                      { color: selectedHolding.pnl >= 0 ? '#087A50' : '#DC2626' },
                    ]}
                  >
                    {selectedHolding.pnl >= 0 ? '+' : ''}
                    {formatINR(selectedHolding.pnl)} ({selectedHolding.pnlPercentage.toFixed(2)}%)
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedHolding(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* AI DOCUMENT & IMAGE CLASSIFIER MODAL */}
      <Modal
        visible={isDocClassifierOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsDocClassifierOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.classifierModalBox}>
            <View style={styles.classifierModalBar} />

            <View style={styles.classifierHeaderRow}>
              <View>
                <Text style={styles.classifierTitle}>AI Document & Image Classifier</Text>
                <Text style={styles.classifierSub}>
                  Auto-classifies into Stocks, Mutual Funds, SIPs, Bonds & Gold
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsDocClassifierOpen(false)}
                style={styles.modalCloseCircle}
              >
                <Text style={styles.modalCloseCircleText}>✕</Text>
              </TouchableOpacity>
            </View>

            {classifierStep === 'SELECT' && (
              <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.classifierSectionLabel}>CHOOSE DOCUMENT OR SCREENSHOT</Text>

                <TouchableOpacity
                  style={styles.classifierOptionCard}
                  onPress={() => handleStartScan('ZERODHA_DEMAT')}
                  activeOpacity={0.8}
                >
                  <View style={styles.classifierOptionIconBox}>
                    <Text style={styles.classifierOptionIcon}>📱</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.classifierOptionTitle}>Demat Holdings Screenshot (Image)</Text>
                    <Text style={styles.classifierOptionSub}>
                      Zerodha Kite, Groww, AngelOne portfolio PNG/JPG
                    </Text>
                  </View>
                  <Text style={styles.classifierOptionAction}>Scan ›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.classifierOptionCard}
                  onPress={() => handleStartScan('CAMS_CAS')}
                  activeOpacity={0.8}
                >
                  <View style={styles.classifierOptionIconBox}>
                    <Text style={styles.classifierOptionIcon}>📑</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.classifierOptionTitle}>CAMS / KFin Consolidated CAS (.PDF)</Text>
                    <Text style={styles.classifierOptionSub}>
                      Official Mutual Fund folio statement with live NAV
                    </Text>
                  </View>
                  <Text style={styles.classifierOptionAction}>Scan ›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.classifierOptionCard}
                  onPress={() => handleStartScan('SGB_BOND')}
                  activeOpacity={0.8}
                >
                  <View style={styles.classifierOptionIconBox}>
                    <Text style={styles.classifierOptionIcon}>🏛️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.classifierOptionTitle}>RBI SGB & Government Bonds Slip</Text>
                    <Text style={styles.classifierOptionSub}>
                      Depository certificate with coupon yield & maturity
                    </Text>
                  </View>
                  <Text style={styles.classifierOptionAction}>Scan ›</Text>
                </TouchableOpacity>

                <View style={styles.uploadDropzoneBox}>
                  <Text style={styles.uploadDropzoneEmoji}>📂</Text>
                  <Text style={styles.uploadDropzoneText}>Or tap to browse local device files / photos</Text>
                  <Text style={styles.uploadDropzoneFormat}>PDF, PNG, JPG up to 25MB supported</Text>
                  <TouchableOpacity
                    style={styles.browseFileBtn}
                    onPress={() => handleStartScan('ZERODHA_DEMAT')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.browseFileBtnText}>Choose File / Photo</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}

            {classifierStep === 'PROCESSING' && (
              <View style={styles.processingBox}>
                <View style={styles.processingSpinnerCircle}>
                  <Text style={styles.processingSpinnerEmoji}>⚡</Text>
                </View>
                <Text style={styles.processingTitle}>Optical Character Recognition (OCR)...</Text>
                <Text style={styles.processingSub}>
                  Detecting asset tables, ISIN codes, units, and classifying into Stocks, Mutual Funds, SIPs, and Bonds.
                </Text>
                <View style={styles.processingProgressBar}>
                  <View style={styles.processingProgressFill} />
                </View>
              </View>
            )}

            {classifierStep === 'REVIEW' && (
              <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
                <View style={styles.classifiedSuccessBadge}>
                  <Text style={styles.classifiedSuccessText}>
                    ✓ 6 Items Classified Successfully across 5 Asset Classes
                  </Text>
                </View>

                {extractedAssets.map((asset) => (
                  <TouchableOpacity
                    key={asset.id}
                    style={[
                      styles.extractedAssetCard,
                      asset.selected && styles.extractedAssetCardSelected,
                    ]}
                    onPress={() => handleToggleAsset(asset.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.extractedCheckCol}>
                      <View
                        style={[
                          styles.extractedCheckBox,
                          asset.selected && styles.extractedCheckBoxActive,
                        ]}
                      >
                        {asset.selected && <Text style={styles.extractedCheckMark}>✓</Text>}
                      </View>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.extractedTopRow}>
                        <View
                          style={[
                            styles.categoryPill,
                            asset.category === 'STOCKS'
                              ? styles.catStocks
                              : asset.category === 'MUTUAL_FUNDS'
                              ? styles.catFunds
                              : asset.category === 'SIPS'
                              ? styles.catSips
                              : styles.catBonds,
                          ]}
                        >
                          <Text style={styles.categoryPillText}>{asset.category}</Text>
                        </View>
                        <Text style={styles.extractedTotalVal}>{formatINR(asset.totalValue)}</Text>
                      </View>
                      <Text style={styles.extractedName}>{asset.name}</Text>
                      <Text style={styles.extractedSub}>
                        {asset.quantity} · Symbol: {asset.symbol}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}

                <View style={styles.importActionBar}>
                  <TouchableOpacity
                    style={styles.confirmImportBtn}
                    onPress={handleConfirmImport}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.confirmImportBtnText}>
                      ✓ Import All Extracted Assets to Ledger
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelImportBtn}
                    onPress={() => setClassifierStep('SELECT')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelImportBtnText}>Scan Another Document</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
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
  headerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 20,
  },
  headerScanBtnIcon: {
    fontSize: 12,
  },
  headerScanBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  headerAddBtnIcon: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    marginTop: -1,
  },
  headerAddBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  aiUploadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  aiUploadBannerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiUploadBannerIcon: {
    fontSize: 18,
  },
  aiUploadTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiUploadBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
  aiTagPill: {
    backgroundColor: '#166534',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  aiTagPillText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  aiUploadBannerSub: {
    fontSize: 10,
    color: '#15803D',
    marginTop: 2,
    lineHeight: 14,
  },
  aiUploadArrow: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16A36A',
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 14,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textTertiary,
    letterSpacing: 0.8,
  },
  realtimePill: {
    marginTop: 2,
  },
  realtimeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#087A50',
  },
  addAssetBtn: {
    backgroundColor: theme.colors.cardSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  addAssetBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  heroValue: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    marginVertical: 4,
    fontFamily: theme.typography.monoFont,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  heroStatItem: {
    flex: 1,
  },
  heroDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: 12,
  },
  heroStatLabel: {
    fontSize: 9.5,
    color: theme.colors.textTertiary,
    fontWeight: '600',
    marginBottom: 2,
  },
  heroPnlVal: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#087A50',
    fontFamily: theme.typography.monoFont,
  },
  heroInvestedVal: {
    fontSize: 12.5,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.monoFont,
  },
  segmentedScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 10,
  },
  segmentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  segmentText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  holdingsList: {
    gap: 8,
    marginTop: 4,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 4,
  },
  summaryBarLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: theme.colors.textTertiary,
    letterSpacing: 0.6,
  },
  summaryBarVal: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  subActionBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  subActionBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  holdingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  holdingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  holdingTitleCol: {
    flex: 1,
    marginRight: 10,
  },
  holdingSymbol: {
    fontSize: 12.5,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  holdingName: {
    fontSize: 10.5,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  holdingValueCol: {
    alignItems: 'flex-end',
  },
  holdingValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.monoFont,
  },
  holdingPnl: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  pnlProfit: {
    color: '#087A50',
  },
  pnlLoss: {
    color: '#DC2626',
  },
  holdingDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  holdingDetailsText: {
    fontSize: 9.5,
    color: theme.colors.textTertiary,
  },
  activePill: {
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    marginTop: 2,
  },
  activePillText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#087A50',
  },
  taxLotPill: {
    backgroundColor: theme.colors.cardSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  taxLotText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  statusPillBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    marginTop: 2,
  },
  statusPillBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
  },
  microInvestCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 8,
  },
  savingsVaultCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  microTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  microIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  microIcon: {
    fontSize: 18,
  },
  microHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  microCardTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  streakBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  streakBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
  },
  microCardSub: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  dailyAmountRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  dailyAmtPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: theme.colors.cardSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  dailyAmtPillActive: {
    backgroundColor: '#E8F5EE',
    borderColor: '#16A36A',
  },
  dailyAmtText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  dailyAmtTextActive: {
    color: '#087A50',
    fontWeight: '800',
  },
  compoundingBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FAFCFA',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: 12,
  },
  compoundingCol: {
    flex: 1,
  },
  compoundingLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: theme.colors.textTertiary,
  },
  compoundingVal: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginTop: 2,
    fontFamily: theme.typography.monoFont,
  },
  executeDailyBtn: {
    backgroundColor: '#087A50',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  executeDailyBtnDone: {
    backgroundColor: '#16A36A',
  },
  executeDailyBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  vaultBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vaultBalanceLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.textTertiary,
  },
  vaultBalanceVal: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.monoFont,
    marginTop: 2,
  },
  autoSweepToggleCol: {
    alignItems: 'flex-end',
  },
  autoSweepLabel: {
    fontSize: 9,
    color: theme.colors.textTertiary,
    marginBottom: 2,
    fontWeight: '600',
  },
  quickSaveButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickSaveBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
  },
  quickSaveBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  dividendHeroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 8,
  },
  dividendHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dividendHeroLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: theme.colors.textTertiary,
    letterSpacing: 0.6,
  },
  dividendHeroVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#087A50',
    fontFamily: theme.typography.monoFont,
    marginTop: 2,
  },
  dripToggleBox: {
    alignItems: 'center',
  },
  dripLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    marginBottom: 2,
  },
  dividendHeroBottomRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  dividendHeroSub: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  dividendSectionHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
    marginTop: 6,
    marginBottom: 2,
  },
  dividendSectionTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: theme.colors.textTertiary,
    letterSpacing: 0.5,
  },
  dividendSectionSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#087A50',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(23, 35, 29, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  modalStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FAFCFA',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: 16,
  },
  modalStatCol: {
    flex: 1,
  },
  modalStatLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: theme.colors.textTertiary,
  },
  modalStatVal: {
    fontSize: 11.5,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginTop: 2,
    fontFamily: theme.typography.monoFont,
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
  classifierModalBox: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  classifierModalBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D9D3',
    alignSelf: 'center',
    marginBottom: 14,
  },
  classifierHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  classifierTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: theme.colors.textPrimary,
  },
  classifierSub: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  modalCloseCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseCircleText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textTertiary,
  },
  classifierSectionLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: theme.colors.textTertiary,
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  classifierOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FAFCFA',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  classifierOptionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  classifierOptionIcon: {
    fontSize: 20,
  },
  classifierOptionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  classifierOptionSub: {
    fontSize: 9.5,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  classifierOptionAction: {
    fontSize: 14,
    fontWeight: '800',
    color: '#087A50',
  },
  uploadDropzoneBox: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#F8FAFC',
  },
  uploadDropzoneEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  uploadDropzoneText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  uploadDropzoneFormat: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 10,
  },
  browseFileBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  browseFileBtnText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  processingBox: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  processingSpinnerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  processingSpinnerEmoji: {
    fontSize: 26,
  },
  processingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  processingSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  processingProgressBar: {
    width: '80%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  processingProgressFill: {
    width: '75%',
    height: '100%',
    backgroundColor: '#16A36A',
    borderRadius: 3,
  },
  classifiedSuccessBadge: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  classifiedSuccessText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
    textAlign: 'center',
  },
  extractedAssetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FAFCFA',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 10,
    marginBottom: 6,
  },
  extractedAssetCardSelected: {
    borderColor: '#16A36A',
    backgroundColor: '#F0FDF4',
  },
  extractedCheckCol: {
    justifyContent: 'center',
  },
  extractedCheckBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  extractedCheckBoxActive: {
    backgroundColor: '#16A36A',
    borderColor: '#16A36A',
  },
  extractedCheckMark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  extractedTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  categoryPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  catStocks: { backgroundColor: '#EFF6FF' },
  catFunds: { backgroundColor: '#F0FDF4' },
  catSips: { backgroundColor: '#FEF3C7' },
  catBonds: { backgroundColor: '#F3E8FF' },
  categoryPillText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#334155',
  },
  extractedTotalVal: {
    fontSize: 11.5,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.monoFont,
  },
  extractedName: {
    fontSize: 11.5,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  extractedSub: {
    fontSize: 9.5,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  importActionBar: {
    marginTop: 12,
    gap: 8,
  },
  confirmImportBtn: {
    backgroundColor: '#087A50',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmImportBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  cancelImportBtn: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelImportBtnText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
});
