import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme';
import { BankAccount } from '../types';
import { formatINR } from '../formatters';
import {
  ParsedStatementResult,
  parseBankStatementCsv,
  parseZerodhaTradebook,
  parseCamsCas,
  pickStatementFile,
  SAMPLE_HDFC_STATEMENT_CSV,
  SAMPLE_ZERODHA_TRADEBOOK_CSV,
  SAMPLE_CAMS_CAS_TEXT,
} from '../statementParserService';

interface ImportStatementModalProps {
  visible: boolean;
  onClose: () => void;
  accounts?: BankAccount[];
  onImportSuccess: (result: ParsedStatementResult, targetAccountId?: string) => void;
}

export const ImportStatementModal: React.FC<ImportStatementModalProps> = ({
  visible,
  onClose,
  accounts = [],
  onImportSuccess,
}) => {
  const { isDark } = useTheme();

  const sheetBg = isDark ? '#111827' : '#FFFFFF';
  const borderColor = isDark ? '#1F2937' : '#E2E8F0';
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const inputBg = isDark ? '#0B0F19' : '#F8FAFC';
  const cardSubtle = isDark ? '#1E293B' : '#F1F5F9';
  const borderSubtle = isDark ? '#334155' : '#CBD5E1';

  const [selectedFormat, setSelectedFormat] = useState<'BANK_CSV' | 'CAS' | 'ZERODHA'>('BANK_CSV');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts.length > 0 ? accounts[0].id : ''
  );
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedStatementResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetState = () => {
    setParsedResult(null);
    setErrorMessage(null);
    setIsParsing(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFilePick = async () => {
    setErrorMessage(null);
    setIsParsing(true);
    try {
      const file = await pickStatementFile();
      if (!file) {
        setIsParsing(false);
        return;
      }

      let res: ParsedStatementResult;
      if (selectedFormat === 'ZERODHA') {
        res = parseZerodhaTradebook(file.content, file.filename);
      } else if (selectedFormat === 'CAS') {
        res = parseCamsCas(file.content, file.filename);
      } else {
        res = parseBankStatementCsv(file.content, file.filename);
      }

      setParsedResult(res);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to parse file. Please verify file format.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleLoadPreset = (type: 'HDFC' | 'ZERODHA' | 'CAMS') => {
    setErrorMessage(null);
    setIsParsing(true);
    setTimeout(() => {
      try {
        let res: ParsedStatementResult;
        if (type === 'HDFC') {
          setSelectedFormat('BANK_CSV');
          res = parseBankStatementCsv(SAMPLE_HDFC_STATEMENT_CSV, 'hdfc_nov2026.csv');
        } else if (type === 'ZERODHA') {
          setSelectedFormat('ZERODHA');
          res = parseZerodhaTradebook(SAMPLE_ZERODHA_TRADEBOOK_CSV, 'zerodha_trades.csv');
        } else {
          setSelectedFormat('CAS');
          res = parseCamsCas(SAMPLE_CAMS_CAS_TEXT, 'cams_cas_statement.txt');
        }
        setParsedResult(res);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to load preset statement.');
      } finally {
        setIsParsing(false);
      }
    }, 400);
  };

  const handleConfirmImport = () => {
    if (!parsedResult) return;
    onImportSuccess(parsedResult, selectedAccountId || undefined);
    handleClose();
  };

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: sheetBg, borderColor }]}>
          <View style={[styles.handleBar, { backgroundColor: borderSubtle }]} />

          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: borderColor }]}>
            <View>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>
                Import Financial Statement
              </Text>
              <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                Universal Bank, Broker CAS, and Tradebook Parser
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: cardSubtle }]}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.closeBtnText, { color: textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Format Selector */}
            <Text style={[styles.label, { color: textSecondary }]}>DOCUMENT CATEGORY</Text>
            <View style={styles.formatRow}>
              {[
                { id: 'BANK_CSV', label: 'Bank Statement' },
                { id: 'CAS', label: 'CAMS CAS' },
                { id: 'ZERODHA', label: 'Zerodha Tradebook' },
              ].map((f) => {
                const isActive = selectedFormat === f.id;
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[
                      styles.formatBtn,
                      {
                        backgroundColor: isActive
                          ? isDark
                            ? 'rgba(16, 185, 129, 0.25)'
                            : '#DCFCE7'
                          : cardSubtle,
                        borderColor: isActive
                          ? isDark
                            ? '#10B981'
                            : '#059669'
                          : borderSubtle,
                      },
                    ]}
                    onPress={() => {
                      setSelectedFormat(f.id as any);
                      setParsedResult(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.formatBtnText,
                        { color: isActive ? (isDark ? '#34D399' : '#059669') : textSecondary },
                        isActive && { fontWeight: '800' },
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Error Message Alert */}
            {errorMessage && (
              <View style={[styles.errorBox, { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' }]}>
                <Text style={[styles.errorText, { color: isDark ? '#FCA5A5' : '#B91C1C' }]}>
                  ⚠ {errorMessage}
                </Text>
              </View>
            )}

            {!parsedResult ? (
              <>
                {/* File Dropzone */}
                <TouchableOpacity
                  style={[
                    styles.dropZone,
                    { backgroundColor: inputBg, borderColor: isDark ? '#334155' : '#CBD5E1' },
                  ]}
                  onPress={handleFilePick}
                  activeOpacity={0.8}
                  disabled={isParsing}
                >
                  {isParsing ? (
                    <View style={styles.parsingState}>
                      <ActivityIndicator size="small" color="#10B981" />
                      <Text style={[styles.parsingText, { color: textSecondary }]}>
                        Reading file & validating double-entry invariants...
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.dropIcon}>📁</Text>
                      <Text style={[styles.dropTitle, { color: textPrimary }]}>
                        Select CSV, TXT, or PDF File
                      </Text>
                      <Text style={[styles.dropSub, { color: textSecondary }]}>
                        Tap to browse on-device documents or cloud drives
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Instant Real Samples */}
                <Text style={[styles.label, { color: textSecondary, marginTop: 12 }]}>
                  QUICK TEST WITH REAL STATEMENTS
                </Text>
                <View style={styles.presetGrid}>
                  <TouchableOpacity
                    style={[styles.presetCard, { backgroundColor: cardSubtle, borderColor: borderSubtle }]}
                    onPress={() => handleLoadPreset('HDFC')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.presetBadge}>🏦 BANK</Text>
                    <Text style={[styles.presetTitle, { color: textPrimary }]}>HDFC Bank Statement</Text>
                    <Text style={[styles.presetDesc, { color: textSecondary }]}>
                      6 line items • Salary, Swiggy, Shell, BESCOM
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.presetCard, { backgroundColor: cardSubtle, borderColor: borderSubtle }]}
                    onPress={() => handleLoadPreset('ZERODHA')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.presetBadge}>📈 EQUITIES</Text>
                    <Text style={[styles.presetTitle, { color: textPrimary }]}>Zerodha Tradebook</Text>
                    <Text style={[styles.presetDesc, { color: textSecondary }]}>
                      4 equity trades • HDFCBANK, RELIANCE, INFY
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.presetCard, { backgroundColor: cardSubtle, borderColor: borderSubtle }]}
                    onPress={() => handleLoadPreset('CAMS')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.presetBadge}>📊 MUTUAL FUNDS</Text>
                    <Text style={[styles.presetTitle, { color: textPrimary }]}>CAMS CAS Statement</Text>
                    <Text style={[styles.presetDesc, { color: textSecondary }]}>
                      2 mutual fund folios • Parag Parikh, Mirae Asset
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* Parsed Result Verification HUD */
              <View style={styles.resultContainer}>
                {/* Header Summary */}
                <View style={[styles.summaryCard, { backgroundColor: cardSubtle, borderColor: borderSubtle }]}>
                  <View style={styles.summaryTopRow}>
                    <View>
                      <Text style={[styles.institutionName, { color: textPrimary }]}>
                        {parsedResult.institution}
                      </Text>
                      <Text style={[styles.summarySub, { color: textSecondary }]}>
                        {parsedResult.filename || 'Parsed Statement'}
                        {parsedResult.accountNumberMask ? ` • ${parsedResult.accountNumberMask}` : ''}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.balancedBadge,
                        {
                          backgroundColor: parsedResult.isBalanced
                            ? isDark
                              ? 'rgba(16, 185, 129, 0.2)'
                              : '#DCFCE7'
                            : isDark
                              ? 'rgba(239, 68, 68, 0.2)'
                              : '#FEE2E2',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.balancedBadgeText,
                          { color: parsedResult.isBalanced ? '#10B981' : '#EF4444' },
                        ]}
                      >
                        {parsedResult.isBalanced ? '✓ BALANCED (Σ = 0)' : '⚠ VARIANCE DETECTED'}
                      </Text>
                    </View>
                  </View>

                  {/* Financial Metrics Strip */}
                  <View style={styles.metricRow}>
                    <View style={styles.metricBox}>
                      <Text style={[styles.metricLabel, { color: textSecondary }]}>TOTAL INFLOW</Text>
                      <Text style={[styles.metricValue, { color: '#10B981' }]}>
                        +{formatINR(parsedResult.totalCredits)}
                      </Text>
                    </View>
                    <View style={styles.metricBox}>
                      <Text style={[styles.metricLabel, { color: textSecondary }]}>TOTAL OUTFLOW</Text>
                      <Text style={[styles.metricValue, { color: '#EF4444' }]}>
                        -{formatINR(parsedResult.totalDebits)}
                      </Text>
                    </View>
                    <View style={styles.metricBox}>
                      <Text style={[styles.metricLabel, { color: textSecondary }]}>NET CASH FLOW</Text>
                      <Text
                        style={[
                          styles.metricValue,
                          {
                            color: parsedResult.netChange >= 0 ? '#10B981' : textPrimary,
                          },
                        ]}
                      >
                        {parsedResult.netChange >= 0 ? '+' : ''}
                        {formatINR(parsedResult.netChange)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Target Account Linkage */}
                {accounts.length > 0 && (
                  <View style={styles.accountSection}>
                    <Text style={[styles.label, { color: textSecondary }]}>TARGET ACCOUNT TO UPDATE</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accScroll}>
                      {accounts.map((acc) => {
                        const isSelected = (selectedAccountId || accounts[0].id) === acc.id;
                        return (
                          <TouchableOpacity
                            key={acc.id}
                            style={[
                              styles.accPill,
                              {
                                backgroundColor: isSelected
                                  ? isDark
                                    ? 'rgba(16, 185, 129, 0.25)'
                                    : '#DCFCE7'
                                  : cardSubtle,
                                borderColor: isSelected
                                  ? isDark
                                    ? '#10B981'
                                    : '#059669'
                                  : borderSubtle,
                              },
                            ]}
                            onPress={() => setSelectedAccountId(acc.id)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.accPillName,
                                { color: isSelected ? (isDark ? '#34D399' : '#059669') : textPrimary },
                                isSelected && { fontWeight: '800' },
                              ]}
                            >
                              {acc.name}
                            </Text>
                            <Text style={[styles.accPillBal, { color: textSecondary }]}>
                              Bal: {formatINR(acc.balance)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Extracted Transactions List */}
                <Text style={[styles.label, { color: textSecondary, marginTop: 14 }]}>
                  EXTRACTED JOURNAL ENTRIES ({parsedResult.transactions.length})
                </Text>
                <View style={[styles.txListCard, { backgroundColor: cardSubtle, borderColor: borderSubtle }]}>
                  {parsedResult.transactions.map((tx, idx) => (
                    <View
                      key={tx.id || idx}
                      style={[
                        styles.txRow,
                        idx > 0 && { borderTopWidth: 1, borderTopColor: borderSubtle },
                      ]}
                    >
                      <View style={styles.txLeft}>
                        <Text style={[styles.txDate, { color: textSecondary }]}>{tx.date}</Text>
                        <Text style={[styles.txDesc, { color: textPrimary }]} numberOfLines={1}>
                          {tx.description}
                        </Text>
                        <View style={styles.txTag}>
                          <Text style={styles.txTagText}>{tx.category}</Text>
                        </View>
                      </View>
                      <View style={styles.txRight}>
                        <Text
                          style={[
                            styles.txAmount,
                            { color: tx.type === 'CREDIT' ? '#10B981' : '#EF4444' },
                          ]}
                        >
                          {tx.type === 'CREDIT' ? '+' : '-'}
                          {formatINR(tx.amount)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Extracted Holdings Preview (if CAS or Zerodha) */}
                {parsedResult.holdings.length > 0 && (
                  <>
                    <Text style={[styles.label, { color: textSecondary, marginTop: 14 }]}>
                      PORTFOLIO HOLDINGS TO UPDATE ({parsedResult.holdings.length})
                    </Text>
                    <View style={[styles.txListCard, { backgroundColor: cardSubtle, borderColor: borderSubtle }]}>
                      {parsedResult.holdings.map((h, idx) => (
                        <View
                          key={h.id || idx}
                          style={[
                            styles.txRow,
                            idx > 0 && { borderTopWidth: 1, borderTopColor: borderSubtle },
                          ]}
                        >
                          <View style={styles.txLeft}>
                            <Text style={[styles.txDesc, { color: textPrimary }]} numberOfLines={1}>
                              {h.symbol} • {h.name}
                            </Text>
                            <Text style={[styles.txDate, { color: textSecondary }]}>
                              Qty: {h.quantity} @ ₹{h.avgBuyPrice}
                            </Text>
                          </View>
                          <View style={styles.txRight}>
                            <Text style={[styles.txAmount, { color: textPrimary }]}>
                              {formatINR(h.investedValue)}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </>
                )}

                {/* Action Buttons */}
                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={[styles.resetBtn, { backgroundColor: cardSubtle, borderColor: borderSubtle }]}
                    onPress={resetState}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.resetBtnText, { color: textSecondary }]}>🔄 Try Another</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={handleConfirmImport}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.confirmBtnText}>
                      ✓ Reconcile & Import ({parsedResult.transactions.length})
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 13, 22, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  formBody: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 8,
  },
  formatRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  formatBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  formatBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  errorBox: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dropZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dropIcon: {
    fontSize: 30,
    marginBottom: 6,
  },
  dropTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  dropSub: {
    fontSize: 11,
  },
  parsingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  parsingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  presetGrid: {
    gap: 8,
    marginBottom: 20,
  },
  presetCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  presetBadge: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  presetTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  presetDesc: {
    fontSize: 11,
  },
  resultContainer: {
    paddingBottom: 20,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  institutionName: {
    fontSize: 15,
    fontWeight: '800',
  },
  summarySub: {
    fontSize: 11,
    marginTop: 2,
  },
  balancedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  balancedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
  },
  metricBox: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  accountSection: {
    marginBottom: 12,
  },
  accScroll: {
    flexDirection: 'row',
  },
  accPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  accPillName: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  accPillBal: {
    fontSize: 10,
    marginTop: 2,
  },
  txListCard: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  txLeft: {
    flex: 1,
    marginRight: 10,
  },
  txDate: {
    fontSize: 9.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  txDesc: {
    fontSize: 12,
    fontWeight: '700',
  },
  txTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  txTagText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#10B981',
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    marginBottom: 14,
  },
  resetBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
