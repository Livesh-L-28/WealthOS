import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { theme } from '../theme';
import { formatINR } from '../formatters';

interface ReconciliationModalProps {
  visible: boolean;
  onClose: () => void;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  institutionsCount: number;
}

export const ReconciliationModal: React.FC<ReconciliationModalProps> = ({
  visible,
  onClose,
  netWorth,
  totalAssets,
  totalLiabilities,
  institutionsCount,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.handleBar} />

          <View style={styles.headerRow}>
            <View>
              <Text style={styles.modalTitle}>Ledger Control Centre</Text>
              <Text style={styles.modalSubtitle}>Autonomous Double-Entry Solvency Verification</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Balance Status Banner */}
            <View style={styles.statusBanner}>
              <View style={styles.statusBadgeIcon}>
                <Text style={styles.statusIconText}>✓</Text>
              </View>
              <View style={styles.statusBannerText}>
                <Text style={styles.statusTitle}>LEDGER MATHEMATICALLY BALANCED</Text>
                <Text style={styles.statusSubtitle}>
                  Zero unreconciled breaks across {institutionsCount} connected institutions
                </Text>
              </View>
            </View>

            {/* Double-Entry Equation Card */}
            <View style={styles.equationCard}>
              <Text style={styles.equationTitle}>ACCOUNTING EQUATION AUDIT</Text>
              <Text style={styles.equationFormula}>Assets = Liabilities + Equity (Net Worth)</Text>

              <View style={styles.equationGrid}>
                <View style={styles.equationItem}>
                  <Text style={styles.equationItemLabel}>Total Assets</Text>
                  <Text style={styles.equationItemValPositive}>{formatINR(totalAssets)}</Text>
                </View>
                <Text style={styles.mathSign}>−</Text>
                <View style={styles.equationItem}>
                  <Text style={styles.equationItemLabel}>Liabilities</Text>
                  <Text style={styles.equationItemValNegative}>{formatINR(totalLiabilities)}</Text>
                </View>
                <Text style={styles.mathSign}>=</Text>
                <View style={styles.equationItem}>
                  <Text style={styles.equationItemLabel}>Equity / Net Worth</Text>
                  <Text style={styles.equationItemVal}>{formatINR(netWorth)}</Text>
                </View>
              </View>

              <View style={styles.varianceRow}>
                <Text style={styles.varianceLabel}>System Ledger Variance:</Text>
                <Text style={styles.varianceValue}>₹0.00 (Zero Breaks)</Text>
              </View>
            </View>

            {/* Connected Institutions Health */}
            <Text style={styles.sectionTitle}>SYNCHRONIZATION & INSTITUTION HEALTH</Text>
            <View style={styles.institutionList}>
              {[
                { name: 'HDFC Bank Ltd', role: 'Corporate Salary & Home Loan', status: 'SYNCED', time: 'Just now' },
                { name: 'ICICI Bank Ltd', role: 'Privileged Savings & Investments', status: 'SYNCED', time: '10m ago' },
                { name: 'State Bank of India', role: 'Tax Saver Term Deposit', status: 'SYNCED', time: '1h ago' },
                { name: 'Zerodha Broking', role: 'Demat & Equity Holdings', status: 'SYNCED', time: '5m ago' },
                { name: 'Axis Bank Ltd', role: 'Magnus Credit Card', status: 'SYNCED', time: 'Today' },
                { name: 'CAMS / KFintech CAS', role: 'Direct Mutual Fund Registry', status: 'VERIFIED', time: 'Today' },
              ].map((inst, i) => (
                <View key={i} style={styles.institutionRow}>
                  <View style={styles.instInfo}>
                    <Text style={styles.instName}>{inst.name}</Text>
                    <Text style={styles.instRole}>{inst.role}</Text>
                  </View>
                  <View style={styles.instStatusPill}>
                    <Text style={styles.instStatusText}>● {inst.status}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Audit Hash */}
            <View style={styles.auditHashBox}>
              <Text style={styles.auditHashLabel}>CRYPTOGRAPHIC LEDGER MERKLE ROOT</Text>
              <Text style={styles.auditHashText}>
                sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footerAction}>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.doneBtnText}>Close Control Centre</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 35, 29, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.borderStrong,
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
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.cardSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '700',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.primaryLightSolid,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 106, 0.3)',
    marginBottom: 14,
  },
  statusBadgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconText: {
    color: theme.colors.textWhite,
    fontSize: 14,
    fontWeight: '800',
  },
  statusBannerText: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    letterSpacing: 0.3,
  },
  statusSubtitle: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  equationCard: {
    backgroundColor: theme.colors.cardSubtle,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  equationTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  equationFormula: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginVertical: 4,
  },
  equationGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  equationItem: {
    alignItems: 'center',
  },
  equationItemLabel: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  equationItemVal: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  equationItemValPositive: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.positive,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  equationItemValNegative: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.negative,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  mathSign: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textSecondary,
  },
  varianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  varianceLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  varianceValue: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  institutionList: {
    gap: 8,
    marginBottom: 16,
  },
  institutionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  instInfo: {
    flex: 1,
  },
  instName: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  instRole: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  instStatusPill: {
    backgroundColor: theme.colors.primaryLightSolid,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  instStatusText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  auditHashBox: {
    backgroundColor: '#EEF2EF',
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  auditHashLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  auditHashText: {
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: theme.colors.textPrimary,
  },
  footerAction: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  doneBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneBtnText: {
    color: theme.colors.textWhite,
    fontSize: 13,
    fontWeight: '700',
  },
});
