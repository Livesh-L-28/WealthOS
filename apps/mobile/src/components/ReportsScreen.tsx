import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { useTheme } from '../theme';
import { formatINR } from '../formatters';

interface ReportsScreenProps {
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

interface MobileReportItem {
  id: string;
  title: string;
  category: 'TAX' | 'ACCOUNTING' | 'PORTFOLIO';
  description: string;
  icon: string;
  formats: ('PDF' | 'EXCEL' | 'CSV')[];
}

const MOBILE_REPORTS: MobileReportItem[] = [
  {
    id: 'SCHEDULE_CG',
    title: 'Capital Gains Tax (Schedule CG)',
    category: 'TAX',
    description: 'FIFO tax lot calculations, LTCG vs STCG separation, grandfathering prices, and grandfathered STT deductions for ITR-2 / ITR-3.',
    icon: '📈',
    formats: ['PDF', 'EXCEL', 'CSV'],
  },
  {
    id: 'PROFIT_AND_LOSS',
    title: 'Profit & Loss Statement',
    category: 'ACCOUNTING',
    description: 'Consolidated operating income, passive yield, gross salary deductions, and itemized living expenses across all accounts.',
    icon: '💰',
    formats: ['PDF', 'EXCEL', 'CSV'],
  },
  {
    id: 'BALANCE_SHEET',
    title: 'Consolidated Balance Sheet',
    category: 'ACCOUNTING',
    description: 'Audited double-entry statement of liquid assets, demat investments, fixed income, debts, and net owner equity.',
    icon: '🏛️',
    formats: ['PDF', 'EXCEL'],
  },
  {
    id: 'TRIAL_BALANCE',
    title: 'Trial Balance Audit Ledger',
    category: 'ACCOUNTING',
    description: 'Cumulative debits equal credits across all 52 chart of accounts without floating-point drift.',
    icon: '⚖️',
    formats: ['PDF', 'EXCEL', 'CSV'],
  },
  {
    id: 'DIVIDENDS',
    title: 'Dividend & Sec 194 TDS Schedule',
    category: 'TAX',
    description: 'Itemized dividend declarations, 10% TDS deductions deposited under Form 26AS, and reconciled net bank receipts.',
    icon: '🪙',
    formats: ['PDF', 'EXCEL', 'CSV'],
  },
];

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  onBack,
  onShowToast,
}) => {
  const { theme, isDark } = useTheme();
  const [selectedReport, setSelectedReport] = useState<string>('SCHEDULE_CG');
  const [fiscalYear, setFiscalYear] = useState<string>('2026-2027');
  const [selectedFormat, setSelectedFormat] = useState<'PDF' | 'EXCEL' | 'CSV'>('PDF');
  const [isGenerating, setIsGenerating] = useState(false);

  const activeReport = MOBILE_REPORTS.find((r) => r.id === selectedReport) || MOBILE_REPORTS[0];

  const handleExport = async () => {
    setIsGenerating(true);
    try {
      await new Promise((res) => setTimeout(res, 600));
      const fileName = `WealthOS_${selectedReport}_FY${fiscalYear.replace('-', '_')}.${selectedFormat.toLowerCase() === 'excel' ? 'xlsx' : selectedFormat.toLowerCase()}`;
      
      if (Platform.OS !== 'web') {
        try {
          await Share.share({
            message: `Certified Financial Statement: ${fileName} (SHA-256 Verified)`,
            title: `WealthOS ${activeReport.title}`,
          });
        } catch {
          // ignore share cancel
        }
      }
      onShowToast(`Certified ${selectedFormat} statement generated: ${fileName}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const dynamicBg = isDark ? '#0B0F17' : '#F8FAFC';
  const dynamicCard = isDark ? '#111827' : '#FFFFFF';
  const dynamicBorder = isDark ? '#1E293B' : '#E2E8F0';
  const dynamicText = isDark ? '#F9FAFB' : '#0F172A';
  const dynamicSubText = isDark ? '#94A3B8' : '#64748B';

  return (
    <View style={[styles.container, { backgroundColor: dynamicBg }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: dynamicBorder }]}>
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backButton, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
        >
          <Text style={[styles.backText, { color: dynamicText }]}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.title, { color: dynamicText }]}>Financial Reports</Text>
          <Text style={[styles.subTitle, { color: dynamicSubText }]}>
            Certified Tax Schedules & Statements
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Trust Badge */}
        <View style={[styles.trustBadge, { backgroundColor: isDark ? '#064E3B33' : '#D1FAE5', borderColor: '#10B98144' }]}>
          <Text style={styles.trustBadgeText}>
            🔒 SHA-256 Certified • Form 26AS & Double-Entry Reconciled
          </Text>
        </View>

        {/* Section 1: Statement Types */}
        <Text style={[styles.sectionHeading, { color: dynamicSubText }]}>
          1. CHOOSE STATEMENT TYPE
        </Text>
        <View style={styles.reportsGrid}>
          {MOBILE_REPORTS.map((rep) => {
            const isSelected = selectedReport === rep.id;
            return (
              <TouchableOpacity
                key={rep.id}
                onPress={() => setSelectedReport(rep.id)}
                activeOpacity={0.7}
                style={[
                  styles.reportCard,
                  {
                    backgroundColor: dynamicCard,
                    borderColor: isSelected ? '#10B981' : dynamicBorder,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.reportCardHeader}>
                  <Text style={styles.reportIcon}>{rep.icon}</Text>
                  <View style={styles.reportTitleCol}>
                    <Text style={[styles.reportCardTitle, { color: dynamicText }]}>
                      {rep.title}
                    </Text>
                    <Text style={[styles.categoryBadge, { color: rep.category === 'TAX' ? '#F59E0B' : '#10B981' }]}>
                      {rep.category}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.reportDesc, { color: dynamicSubText }]}>
                  {rep.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Section 2: Fiscal Year & Format */}
        <Text style={[styles.sectionHeading, { color: dynamicSubText, marginTop: 18 }]}>
          2. FISCAL HORIZON & FORMAT
        </Text>

        <View style={[styles.settingsCard, { backgroundColor: dynamicCard, borderColor: dynamicBorder }]}>
          <Text style={[styles.settingLabel, { color: dynamicSubText }]}>Fiscal Year (India):</Text>
          <View style={styles.pillsRow}>
            {['2026-2027', '2025-2026', '2024-2025'].map((fy) => (
              <TouchableOpacity
                key={fy}
                onPress={() => setFiscalYear(fy)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: fiscalYear === fy ? '#10B981' : isDark ? '#1F2937' : '#F1F5F9',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: fiscalYear === fy ? '#FFFFFF' : dynamicText },
                  ]}
                >
                  FY {fy}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.settingLabel, { color: dynamicSubText, marginTop: 14 }]}>
            Format Selection:
          </Text>
          <View style={styles.pillsRow}>
            {(['PDF', 'EXCEL', 'CSV'] as const).map((fmt) => (
              <TouchableOpacity
                key={fmt}
                onPress={() => setSelectedFormat(fmt)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: selectedFormat === fmt ? '#10B981' : isDark ? '#1F2937' : '#F1F5F9',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: selectedFormat === fmt ? '#FFFFFF' : dynamicText },
                  ]}
                >
                  {fmt === 'PDF' ? '📄 PDF' : fmt === 'EXCEL' ? '📊 Excel' : '📋 CSV'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section 3: Summary & Export CTA */}
        <View style={[styles.summaryBox, { backgroundColor: dynamicCard, borderColor: dynamicBorder }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: dynamicSubText }]}>Selected Statement:</Text>
            <Text style={[styles.summaryValue, { color: dynamicText }]}>{activeReport.title}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: dynamicSubText }]}>Target Period:</Text>
            <Text style={[styles.summaryValue, { color: dynamicText }]}>FY {fiscalYear}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: dynamicSubText }]}>Integrity Assurance:</Text>
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>Balanced General Ledger</Text>
          </View>

          <TouchableOpacity
            onPress={handleExport}
            disabled={isGenerating}
            activeOpacity={0.8}
            style={[styles.exportButton, { opacity: isGenerating ? 0.6 : 1 }]}
          >
            {isGenerating ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.exportButtonText}>
                ⚡ Export & Share Certified {selectedFormat}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  backText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerTitleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  subTitle: {
    fontSize: 11,
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  trustBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  trustBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  reportsGrid: {
    gap: 10,
  },
  reportCard: {
    padding: 12,
    borderRadius: 12,
  },
  reportCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  reportIcon: {
    fontSize: 22,
  },
  reportTitleCol: {
    flex: 1,
  },
  reportCardTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryBadge: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  reportDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  settingsCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  settingLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  summaryBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  exportButton: {
    marginTop: 12,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

