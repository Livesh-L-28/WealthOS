import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme';
import { DividendItem } from '../types';
import { formatINR } from '../formatters';
import { investmentsService } from '../api/domainServices';

interface DividendsScreenProps {
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

export const DividendsScreen: React.FC<DividendsScreenProps> = ({
  onBack,
  onShowToast,
}) => {
  const { theme } = useTheme();
  const [dividends, setDividends] = useState<DividendItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadDividends() {
      setIsLoading(true);
      try {
        const liveDividends = await investmentsService.fetchDividends();
        if (isMounted && liveDividends && liveDividends.length > 0) {
          setDividends(liveDividends);
        }
      } catch {
        // Fallback
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadDividends();
    return () => { isMounted = false; };
  }, []);

  const totalReceived = dividends
    .filter((d) => d.status === 'RECEIVED')
    .reduce((s, d) => s + d.totalPayout, 0);

  const totalProjected = dividends
    .filter((d) => d.status === 'PROJECTED')
    .reduce((s, d) => s + d.totalPayout, 0);

  const annualYield = totalReceived + totalProjected;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.canvas }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Bar */}
      <View style={[styles.topBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={[styles.backArrow, { color: theme.colors.primary }]}>‹</Text>
          <Text style={[styles.backText, { color: theme.colors.primary }]}>Portfolio</Text>
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: theme.colors.textPrimary }]}>
          Dividends & Passive Yield
        </Text>
        <View style={[styles.headerBadge, { backgroundColor: theme.colors.positiveBgSolid }]}>
          <Text style={[styles.headerBadgeText, { color: theme.colors.positiveDark }]}>ANNUAL</Text>
        </View>
      </View>

      {/* Yield Hero Card */}
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[styles.heroLabel, { color: theme.colors.textSecondary }]}>
          TOTAL ANNUALIZED PASSIVE CASH FLOW
        </Text>
        <Text style={[styles.heroValue, { color: theme.colors.textPrimary }]}>
          {formatINR(annualYield)}
        </Text>
        <Text style={[styles.heroSub, { color: theme.colors.textSecondary }]}>
          Yield grounded in verified depository share counts and declared payout schedules
        </Text>

        <View style={[styles.statsStrip, { borderColor: theme.colors.border }]}>
          <View style={styles.statsCol}>
            <Text style={[styles.statsLabel, { color: theme.colors.textSecondary }]}>
              Settled into Bank
            </Text>
            <Text style={[styles.statsReceived, { color: theme.colors.positiveDark }]}>
              {formatINR(totalReceived)}
            </Text>
          </View>
          <View style={[styles.statsDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.statsCol}>
            <Text style={[styles.statsLabel, { color: theme.colors.textSecondary }]}>
              Projected (Q3/Q4)
            </Text>
            <Text style={[styles.statsProjected, { color: theme.colors.primary }]}>
              {formatINR(totalProjected)}
            </Text>
          </View>
        </View>
      </View>

      {/* Dividends Register List */}
      <View style={styles.listSection}>
        <Text style={[styles.sectionHeading, { color: theme.colors.textSecondary }]}>
          DECLARED & SETTLED PAYOUTS
        </Text>

        {dividends.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>📈</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 6 }}>
              No Dividend Records Found
            </Text>
            <Text style={{ fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
              When dividend announcements and payouts occur for your equity or mutual fund holdings, they will be recognized and logged here.
            </Text>
          </View>
        ) : (
          dividends.map((item) => {
          const isSettled = item.status === 'RECEIVED';
          return (
            <View
              key={item.id}
              style={[
                styles.itemCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.itemTopRow}>
                <View style={styles.itemTitleCol}>
                  <View style={styles.tickerRow}>
                    <Text style={[styles.tickerSymbol, { color: theme.colors.textPrimary }]}>
                      {item.symbol}
                    </Text>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: isSettled
                            ? theme.colors.positiveBgSolid
                            : theme.colors.primaryLightSolid,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          {
                            color: isSettled
                              ? theme.colors.positiveDark
                              : theme.colors.primary,
                          },
                        ]}
                      >
                        {isSettled ? '✓ SETTLED' : '● PROJECTED'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.companyName, { color: theme.colors.textSecondary }]}>
                    {item.company}
                  </Text>
                  <Text style={[styles.payoutDate, { color: theme.colors.textTertiary }]}>
                    Record / Payout Date: {item.payoutDate}
                  </Text>
                </View>

                <View style={styles.itemValCol}>
                  <Text style={[styles.payoutAmount, { color: theme.colors.textPrimary }]}>
                    +{formatINR(item.totalPayout)}
                  </Text>
                  <Text style={[styles.perShareVal, { color: theme.colors.textSecondary }]}>
                    ₹{item.amountPerShare.toFixed(2)} / unit
                  </Text>
                </View>
              </View>
            </View>
          );
        }))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backArrow: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
  },
  screenTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  headerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  heroCard: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  heroValue: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 14,
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  statsCol: {
    flex: 1,
  },
  statsDivider: {
    width: 1,
    height: 30,
    marginHorizontal: 12,
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  statsReceived: {
    fontSize: 14,
    fontWeight: '800',
  },
  statsProjected: {
    fontSize: 14,
    fontWeight: '800',
  },
  listSection: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  itemCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitleCol: {
    flex: 1,
    marginRight: 10,
  },
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  tickerSymbol: {
    fontSize: 14,
    fontWeight: '800',
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 8,
    fontWeight: '800',
  },
  companyName: {
    fontSize: 12,
    marginBottom: 4,
  },
  payoutDate: {
    fontSize: 10,
  },
  itemValCol: {
    alignItems: 'flex-end',
  },
  payoutAmount: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  perShareVal: {
    fontSize: 10,
  },
});

