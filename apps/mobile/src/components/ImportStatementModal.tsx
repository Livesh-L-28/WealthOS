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
import { theme, useTheme } from '../theme';

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
  const { isDark } = useTheme();
  const sheetBg = isDark ? '#111827' : '#FFFFFF';
  const borderColor = isDark ? '#1F2937' : '#E2E8F0';
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const inputBg = isDark ? '#0B0F19' : '#F8FAFC';
  const cardSubtle = isDark ? '#1E293B' : '#F1F5F9';
  const borderSubtle = isDark ? '#334155' : '#CBD5E1';

  const [isParsing, setIsParsing] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'CAS' | 'BANK_PDF' | 'ZERODHA'>('CAS');

  const handleSimulate = () => {
    setIsParsing(true);
    setTimeout(() => {
      setIsParsing(false);
      onImportSuccess();
      onClose();
    }, 1000);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: sheetBg, borderColor }]}>
          <View style={[styles.handleBar, { backgroundColor: borderSubtle }]} />

          <View style={[styles.headerRow, { borderBottomColor: borderColor }]}>
            <View>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Import Financial Statement</Text>
              <Text style={[styles.modalSubtitle, { color: textSecondary }]}>Universal OCR & Structured Document Parser</Text>
            </View>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: cardSubtle }]} onPress={onClose} activeOpacity={0.7}>
              <Text style={[styles.closeBtnText, { color: textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
            {/* Format Selector */}
            <Text style={[styles.label, { color: textSecondary }]}>DOCUMENT FORMAT</Text>
            <View style={styles.formatRow}>
              {[
                { id: 'CAS', label: 'CAMS / KFin CAS' },
                { id: 'BANK_PDF', label: 'Bank E-Statement' },
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
                          ? isDark ? 'rgba(16, 185, 129, 0.25)' : '#DCFCE7'
                          : cardSubtle,
                        borderColor: isActive
                          ? isDark ? '#10B981' : '#059669'
                          : borderSubtle,
                      },
                    ]}
                    onPress={() => setSelectedFormat(f.id as any)}
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

            {/* Drag & Drop Simulation Dropzone */}
            <View style={[styles.dropZone, { backgroundColor: inputBg, borderColor: isDark ? '#334155' : '#CBD5E1' }]}>
              <Text style={styles.dropIcon}>📄</Text>
              <Text style={[styles.dropTitle, { color: textPrimary }]}>Select or drop PDF / CSV file</Text>
              <Text style={[styles.dropSub, { color: textSecondary }]}>Supports password-protected e-statements</Text>
            </View>

            {/* Parsing Progress / Action */}
            {isParsing ? (
              <View style={styles.parsingState}>
                <ActivityIndicator size="small" color="#10B981" />
                <Text style={[styles.parsingText, { color: textSecondary }]}>
                  Extracting line items & validating double-entry sigma...
                </Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.submitBtn} onPress={handleSimulate} activeOpacity={0.8}>
                <Text style={styles.submitBtnText}>⚡ Simulate OCR Extraction</Text>
              </TouchableOpacity>
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
    maxHeight: '75%',
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
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 8,
  },
  formatRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
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
    fontSize: 10.5,
    fontWeight: '600',
  },
  dropZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  dropIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  dropTitle: {
    fontSize: 13,
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
  submitBtn: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
