import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { theme, useTheme } from '../theme';
import { BudgetEnvelope } from '../types';

interface CreateBudgetModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (envelope: BudgetEnvelope) => void;
}

const CATEGORY_PRESETS = [
  { name: 'Dining & Restaurants', icon: '🍽️', color: '#EC4899', defaultCap: '25000' },
  { name: 'Shopping & Apparel', icon: '🛍️', color: '#8B5CF6', defaultCap: '20000' },
  { name: 'Entertainment & OTT', icon: '🍿', color: '#3B82F6', defaultCap: '8000' },
  { name: 'Education & Learning', icon: '📚', color: '#10B981', defaultCap: '15000' },
  { name: 'Fitness & Wellness', icon: '🏃', color: '#14B8A6', defaultCap: '10000' },
  { name: 'Travel & Vacation', icon: '✈️', color: '#F59E0B', defaultCap: '35000' },
  { name: 'Home Repairs', icon: '🛠️', color: '#6366F1', defaultCap: '12000' },
  { name: 'Other / Custom', icon: '✨', color: '#10B981', defaultCap: '10000' },
];

export const CreateBudgetModal: React.FC<CreateBudgetModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const { isDark } = useTheme();
  const sheetBg = isDark ? '#111827' : '#FFFFFF';
  const borderColor = isDark ? '#1F2937' : '#E2E8F0';
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const inputBg = isDark ? '#0B0F19' : '#F8FAFC';
  const cardSubtle = isDark ? '#1E293B' : '#F1F5F9';
  const borderSubtle = isDark ? '#334155' : '#CBD5E1';

  const [selectedPreset, setSelectedPreset] = useState(CATEGORY_PRESETS[0]);
  const [customName, setCustomName] = useState(CATEGORY_PRESETS[0].name);
  const [budgetCap, setBudgetCap] = useState(CATEGORY_PRESETS[0].defaultCap);
  const [warningThreshold, setWarningThreshold] = useState('85');

  const handleSelectPreset = (p: typeof CATEGORY_PRESETS[0]) => {
    setSelectedPreset(p);
    setCustomName(p.name);
    setBudgetCap(p.defaultCap);
  };

  const handleSubmit = () => {
    const capNum = parseFloat(budgetCap) || 15000;
    const threshNum = parseFloat(warningThreshold) || 85;

    const newEnvelope: BudgetEnvelope = {
      id: `bgt-${Date.now()}`,
      category: customName.trim() || selectedPreset.name,
      budgeted: capNum,
      spent: 0,
      color: selectedPreset.color,
    };

    onSubmit(newEnvelope);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalSheet, { backgroundColor: sheetBg, borderColor }]}>
          <View style={[styles.handleBar, { backgroundColor: borderSubtle }]} />

          <View style={[styles.headerRow, { borderBottomColor: borderColor }]}>
            <View>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Create Budget Envelope</Text>
              <Text style={[styles.modalSubtitle, { color: textSecondary }]}>Cap spending with proactive threshold alerts</Text>
            </View>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: cardSubtle }]} onPress={onClose} activeOpacity={0.7}>
              <Text style={[styles.closeBtnText, { color: textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
            {/* Category Presets Carousel */}
            <Text style={[styles.label, { color: textSecondary }]}>CHOOSE CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
              {CATEGORY_PRESETS.map((p) => {
                const isActive = selectedPreset.name === p.name;
                return (
                  <TouchableOpacity
                    key={p.name}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: isActive
                          ? isDark ? 'rgba(16, 185, 129, 0.25)' : '#DCFCE7'
                          : cardSubtle,
                        borderColor: isActive
                          ? isDark ? '#10B981' : '#059669'
                          : borderSubtle,
                      },
                    ]}
                    onPress={() => handleSelectPreset(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.presetIcon}>{p.icon}</Text>
                    <Text
                      style={[
                        styles.presetText,
                        { color: isActive ? (isDark ? '#34D399' : '#059669') : textSecondary },
                        isActive && { fontWeight: '800' },
                      ]}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Custom Envelope Name */}
            <Text style={[styles.label, { color: textSecondary }]}>ENVELOPE / CATEGORY NAME</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: inputBg, borderColor: borderSubtle, color: textPrimary }]}
              value={customName}
              onChangeText={setCustomName}
              placeholder="e.g. Fine Dining, Uber & Cabs"
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            />

            {/* Monthly Limit */}
            <Text style={[styles.label, { color: textSecondary }]}>MONTHLY SPENDING CAP (INR)</Text>
            <View style={[styles.amountInputRow, { backgroundColor: inputBg, borderColor: borderSubtle }]}>
              <Text style={[styles.currencyPrefix, { color: isDark ? '#10B981' : '#059669' }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: textPrimary }]}
                keyboardType="numeric"
                value={budgetCap}
                onChangeText={setBudgetCap}
                placeholder="20,000"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              />
            </View>

            {/* Alert Threshold */}
            <Text style={[styles.label, { color: textSecondary }]}>EARLY WARNING THRESHOLD</Text>
            <View style={styles.thresholdRow}>
              {['70', '80', '85', '90'].map((thresh) => {
                const isActive = warningThreshold === thresh;
                return (
                  <TouchableOpacity
                    key={thresh}
                    style={[
                      styles.thresholdBtn,
                      {
                        backgroundColor: isActive
                          ? isDark ? 'rgba(37, 99, 235, 0.25)' : '#EFF6FF'
                          : cardSubtle,
                        borderColor: isActive
                          ? isDark ? '#3B82F6' : '#2563EB'
                          : borderSubtle,
                      },
                    ]}
                    onPress={() => setWarningThreshold(thresh)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.thresholdText,
                        { color: isActive ? (isDark ? '#60A5FA' : '#2563EB') : textSecondary },
                        isActive && { fontWeight: '800' },
                      ]}
                    >
                      {thresh}%
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Info Notice */}
            <View style={[styles.infoBanner, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)' }]}>
              <Text style={styles.infoIcon}>💡</Text>
              <Text style={[styles.infoText, { color: isDark ? '#34D399' : '#059669' }]}>
                WealthOS automatically computes real-time spend from matched general journal debits against this category.
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.8}>
              <Text style={styles.submitBtnText}>✓ Create Budget Envelope</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: '88%',
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
    marginTop: 10,
    marginBottom: 6,
  },
  presetsScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  presetIcon: {
    fontSize: 13,
  },
  presetText: {
    fontSize: 11,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '800',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    paddingVertical: 10,
    fontVariant: ['tabular-nums'],
  },
  thresholdRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  thresholdBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  thresholdText: {
    fontSize: 12,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 14,
  },
  infoIcon: {
    fontSize: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
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
