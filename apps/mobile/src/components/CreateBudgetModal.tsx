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
import { theme } from '../theme';
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
  { name: 'Other / Custom', icon: '✨', color: '#16A36A', defaultCap: '10000' },
];

export const CreateBudgetModal: React.FC<CreateBudgetModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
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
    const newEnv: BudgetEnvelope = {
      id: `env-${Date.now()}`,
      category: customName.trim() || selectedPreset.name,
      budgeted: capNum,
      spent: 0,
      color: selectedPreset.color,
    };
    onSubmit(newEnv);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheetContainer}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Create Spending Envelope</Text>
              <Text style={styles.modalSubtitle}>Zero-Based Double-Entry Monthly Cap</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Quick Preset Selector */}
            <Text style={styles.fieldLabel}>CATEGORY PRESETS</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetsRow}
            >
              {CATEGORY_PRESETS.map((p) => {
                const isSelected = selectedPreset.name === p.name;
                return (
                  <TouchableOpacity
                    key={p.name}
                    style={[styles.presetChip, isSelected && styles.presetChipActive]}
                    onPress={() => handleSelectPreset(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.presetIcon}>{p.icon}</Text>
                    <Text style={[styles.presetText, isSelected && styles.presetTextActive]}>
                      {p.name.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Custom Name */}
            <Text style={styles.fieldLabel}>ENVELOPE TITLE</Text>
            <TextInput
              style={styles.textInput}
              value={customName}
              onChangeText={setCustomName}
              placeholder="e.g. Dining & Restaurants"
              placeholderTextColor={theme.colors.textTertiary}
            />

            {/* Monthly Budget Cap (INR) */}
            <Text style={styles.fieldLabel}>MONTHLY LIMIT (₹)</Text>
            <View style={styles.amountInputRow}>
              <Text style={styles.currencyPrefix}>₹</Text>
              <TextInput
                style={styles.amountInput}
                value={budgetCap}
                onChangeText={setBudgetCap}
                keyboardType="numeric"
                placeholder="25000"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>

            {/* Warning Threshold */}
            <Text style={styles.fieldLabel}>OVERSPEND ALERT THRESHOLD</Text>
            <View style={styles.thresholdRow}>
              {['75%', '85%', '90%', '100%'].map((t) => {
                const isSelected = warningThreshold === t.replace('%', '');
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.thresholdBtn, isSelected && styles.thresholdBtnActive]}
                    onPress={() => setWarningThreshold(t.replace('%', ''))}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.thresholdText, isSelected && styles.thresholdTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Compliance Note */}
            <View style={styles.infoBanner}>
              <Text style={styles.infoIcon}>🛡️</Text>
              <Text style={styles.infoText}>
                Envelope expenditures are calculated in real time directly from reconciled debit
                journal lines.
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>+ Create Spending Envelope</Text>
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
    backgroundColor: 'rgba(23, 35, 29, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderStrong,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  modalBody: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  presetsRow: {
    gap: 8,
    paddingBottom: 4,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: theme.colors.canvas,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  presetChipActive: {
    backgroundColor: theme.colors.primaryLightSolid,
    borderColor: theme.colors.primary,
  },
  presetIcon: {
    fontSize: 13,
  },
  presetText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  presetTextActive: {
    color: theme.colors.primaryDark,
  },
  textInput: {
    backgroundColor: theme.colors.canvas,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.canvas,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.monoFont,
    paddingVertical: 10,
  },
  thresholdRow: {
    flexDirection: 'row',
    gap: 8,
  },
  thresholdBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.canvas,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  thresholdBtnActive: {
    backgroundColor: theme.colors.primaryLightSolid,
    borderColor: theme.colors.primary,
  },
  thresholdText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  thresholdTextActive: {
    color: theme.colors.primaryDark,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(22, 163, 106, 0.08)',
    padding: 10,
    borderRadius: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 106, 0.2)',
  },
  infoIcon: {
    fontSize: 13,
  },
  infoText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.primaryDark,
    lineHeight: 14,
  },
  submitBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 20,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  submitBtnText: {
    color: theme.colors.textWhite,
    fontSize: 13,
    fontWeight: '800',
  },
});
