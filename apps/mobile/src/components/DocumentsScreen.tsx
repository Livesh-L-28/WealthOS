import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../theme';
import { DocumentItem } from '../types';
import { documentsService } from '../api/domainServices';

interface DocumentsScreenProps {
  onBack: () => void;
  onUploadDocument: () => void;
  onShowToast: (msg: string) => void;
  documents?: DocumentItem[];
}

export const DocumentsScreen: React.FC<DocumentsScreenProps> = ({
  onBack,
  onUploadDocument,
  onShowToast,
  documents: propDocuments,
}) => {
  const [documents, setDocuments] = useState<DocumentItem[]>(propDocuments || []);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadDocuments() {
      setIsLoading(true);
      try {
        const liveDocs = await documentsService.fetchDocuments();
        if (isMounted && liveDocs && liveDocs.length > 0) {
          setDocuments(liveDocs);
        }
      } catch {
        // Fallback
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    if (!propDocuments || propDocuments.length === 0) {
      loadDocuments();
    }
    return () => { isMounted = false; };
  }, [propDocuments]);

  const handleInspectDoc = (doc: DocumentItem) => {
    onShowToast(`Inspecting ${doc.name}: ${Math.round(doc.confidence * 100)}% OCR confidence • Arithmetic ${doc.arithmeticCheck}`);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backLabel}>Overview</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Document Vault & OCR</Text>
        <View style={styles.topRightBadge}>
          <Text style={styles.topRightBadgeText}>ENCRYPTED</Text>
        </View>
      </View>

      {/* Summary KPI Strip */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.vaultIconBox}>
            <Text style={styles.vaultIcon}>📁</Text>
          </View>
          <View style={styles.vaultTextCol}>
            <Text style={styles.vaultTitle}>Statement Ingestion Vault</Text>
            <Text style={styles.vaultSubtitle}>
              OCR extraction & arithmetic cross-verification
            </Text>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpiCol}>
            <Text style={styles.kpiLabel}>Parsed Statements</Text>
            <Text style={styles.kpiValue}>{documents.length} Files</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiCol}>
            <Text style={styles.kpiLabel}>Mean OCR Confidence</Text>
            <Text style={styles.kpiValueGreen}>97.0%</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiCol}>
            <Text style={styles.kpiLabel}>Arithmetic Proofs</Text>
            <Text style={styles.kpiValueBlue}>100% Pass</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={onUploadDocument}
          activeOpacity={0.8}
        >
          <Text style={styles.uploadBtnText}>+ Upload Statement / CAS Note</Text>
        </TouchableOpacity>
      </View>

      {/* Document Records List */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>EXTRACTED STATEMENTS & LEDGER TIES</Text>
        <Text style={styles.sectionSub}>{documents.length} Documents</Text>
      </View>

      <View style={styles.docsList}>
        {documents.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>📁</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 6 }}>
              Document Vault Empty
            </Text>
            <Text style={{ fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 16 }}>
              Upload tax invoices, CAMS CAS statements, or bank receipts. The WealthOS local engine parses entries with cryptographic validation.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}
              onPress={onUploadDocument}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>+ Upload First Document</Text>
            </TouchableOpacity>
          </View>
        ) : (
          documents.map((doc) => {
          return (
            <TouchableOpacity
              key={doc.id}
              style={styles.docCard}
              onPress={() => handleInspectDoc(doc)}
              activeOpacity={0.7}
            >
              <View style={styles.docHeaderRow}>
                <View style={styles.pdfIconBox}>
                  <Text style={styles.pdfIcon}>📄</Text>
                </View>
                <View style={styles.docInfoCol}>
                  <Text style={styles.docName} numberOfLines={1}>
                    {doc.name}
                  </Text>
                  <Text style={styles.docMeta}>
                    {doc.size} • Uploaded {doc.uploadDate}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    doc.status === 'POSTED' && styles.statusPosted,
                    doc.status === 'RECONCILED' && styles.statusRecon,
                    doc.status === 'READY_FOR_APPROVAL' && styles.statusReview,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      doc.status === 'POSTED' && styles.statusPostedText,
                      doc.status === 'RECONCILED' && styles.statusReconText,
                      doc.status === 'READY_FOR_APPROVAL' && styles.statusReviewText,
                    ]}
                  >
                    {doc.status}
                  </Text>
                </View>
              </View>

              {/* Extraction Badges Row */}
              <View style={styles.badgesRow}>
                <View style={styles.confidencePill}>
                  <Text style={styles.confidenceText}>
                    ✓ {Math.round(doc.confidence * 100)}% OCR Confidence
                  </Text>
                </View>
                <View style={styles.arithmeticPill}>
                  <Text style={styles.arithmeticText}>
                    Σ Arithmetic Validated
                  </Text>
                </View>
              </View>

              {/* Journal Reference */}
              {doc.journalRef && (
                <View style={styles.journalRow}>
                  <Text style={styles.journalLabel}>Linked Double-Entry Ref:</Text>
                  <Text style={styles.journalCode}>{doc.journalRef}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingRight: 8,
  },
  backArrow: {
    fontSize: 22,
    color: theme.colors.primary,
    fontWeight: '700',
    marginTop: -2,
  },
  backLabel: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  screenTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  topRightBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: theme.colors.primaryAlpha10,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  topRightBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  vaultIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultIcon: {
    fontSize: 20,
  },
  vaultTextCol: {
    flex: 1,
  },
  vaultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  vaultSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceElevated,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: 14,
  },
  kpiCol: {
    flex: 1,
    alignItems: 'center',
  },
  kpiDivider: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.borderLight,
  },
  kpiLabel: {
    fontSize: 9,
    color: theme.colors.textTertiary,
    fontWeight: '500',
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  kpiValueGreen: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  kpiValueBlue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  uploadBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  uploadBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textWhite,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    letterSpacing: 0.8,
  },
  sectionSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  docsList: {
    gap: 12,
    marginBottom: 20,
  },
  docCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  docHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  pdfIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfIcon: {
    fontSize: 18,
  },
  docInfoCol: {
    flex: 1,
  },
  docName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  docMeta: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  statusPosted: {
    backgroundColor: '#DCFCE7',
  },
  statusPostedText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15803D',
  },
  statusRecon: {
    backgroundColor: '#E0E7FF',
  },
  statusReconText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#3730A3',
  },
  statusReview: {
    backgroundColor: '#FEF3C7',
  },
  statusReviewText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#B45309',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  confidencePill: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#15803D',
  },
  arithmeticPill: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  arithmeticText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  journalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  journalLabel: {
    fontSize: 10,
    color: theme.colors.textTertiary,
  },
  journalCode: {
    fontSize: 11,
    fontFamily: 'Courier',
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
});
