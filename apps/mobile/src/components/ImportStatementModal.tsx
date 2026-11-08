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
import { theme } from '../theme';

interface ImportStatementModalProps {
  visible: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export const ImportStatementModal: React.FC<ImportStatementModalProps> = ({
  visible,
  onClose,
  onImportSuccess,
}) => {
  const [isParsing, setIsParsing] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'CAS' | 'BANK_PDF' | 'ZERODHA'>('CAS');

  const handleSimulate = () => {
    setIsParsing(true);
    setTimeout(() => {
      setIsParsing(false);
      onImportSuccess();
    }, 1000);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.handleBar} />

          <View style={styles.headerRow}>
            <View>
              <Text style={styles.modalTitle}>Import Financial Statement</Text>
              <Text style={styles.modalSubtitle}>Universal OCR & Structured Document Parser</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
            {/* Format Selector */}
            <Text style={styles.label}>DOCUMENT FORMAT</Text>
            <View style={styles.formatRow}>
              {[
                { id: 'CAS', label: 'CAMS / KFin CAS' },
                { id: 'BANK_PDF', label: 'Bank E-Statement' },
                { id: 'ZERODHA', label: 'Zerodha Tradebook' },
              ].map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.formatPill, selectedFormat === f.id && styles.formatPillActive]}
                  onPress={() => setSelectedFormat(f.id as any)}
                >
                  <Text
                    style={[
                      styles.formatPillText,
                      selectedFormat === f.id && styles.formatPillTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Upload Area */}
            <TouchableOpacity
              style={styles.uploadArea}
              onPress={handleSimulate}
              disabled={isParsing}
              activeOpacity={0.8}
            >
              {isParsing ? (
                <View style={styles.parsingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.parsingTitle}>Extracting & Balancing Ledger Entries...</Text>
                  <Text style={styles.parsingSubtitle}>
                    Reconciling debits, credits, and capital gains lots
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.uploadIconBadge}>
                    <Text style={styles.uploadIconText}>📄</Text>
                  </View>
                  <Text style={styles.uploadTitle}>Tap to Ingest Sample Statement</Text>
                  <Text style={styles.uploadSubtitle}>
                    Simulates instant OCR parsing of dividend yields (+₹8,750) and healthcare entries (-₹2,450)
                  </Text>
                  <View style={styles.supportedBadge}>
                    <Text style={styles.supportedText}>Protected with 256-Bit Ledger Verification</Text>
                  </View>
                </>
              )}
            </TouchableOpacity>

            {/* Ledger Audit Note */}
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>SECURITY & PRIVACY GUARANTEE</Text>
              <Text style={styles.infoText}>
                WealthOS parses statement documents client-side or in secure enclaves. Password protected PDFs are decrypted in memory with zero persistence.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isParsing}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSimulate}
              disabled={isParsing}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>
                {isParsing ? 'Processing...' : 'Parse & Reconcile'}
              </Text>
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
  formBody: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  formatRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  formatPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: theme.colors.cardSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  formatPillActive: {
    backgroundColor: theme.colors.primaryLightSolid,
    borderColor: theme.colors.primary,
  },
  formatPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  formatPillTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: 'rgba(22, 163, 106, 0.4)',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#FAFCFA',
    gap: 8,
    marginBottom: 16,
  },
  uploadIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryLightSolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconText: {
    fontSize: 22,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  uploadSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  supportedBadge: {
    backgroundColor: theme.colors.primaryLightSolid,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  supportedText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  parsingContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  parsingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  parsingSubtitle: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  infoBox: {
    backgroundColor: theme.colors.cardSubtle,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: theme.colors.cardSubtle,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textWhite,
  },
});

