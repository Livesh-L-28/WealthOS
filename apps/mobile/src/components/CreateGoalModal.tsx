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
import { FinancialGoal } from '../types';

interface CreateGoalModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (goal: FinancialGoal) => void;
}

const GOAL_PRESETS = [
  { title: 'Emergency Reserve', target: '600000', year: '2026', icon: '🛡️', color: '#10B981' },
  { title: 'Luxury EV Purchase', target: '2500000', year: '2027', icon: '🚗', color: '#3B82F6' },
  { title: 'Global Vacation', target: '750000', year: '2027', icon: '🏖️', color: '#F59E0B' },
  { title: 'Child Higher Education', target: '5000000', year: '2030', icon: '🎓', color: '#8B5CF6' },
  { title: 'Beach Villa Downpayment', target: '8000000', year: '2029', icon: '🏡', color: '#EC4899' },
];

export const CreateGoalModal: React.FC<CreateGoalModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const [selectedPreset, setSelectedPreset] = useState(GOAL_PRESETS[1]);
  const [goalTitle, setGoalTitle] = useState(GOAL_PRESETS[1].title);
  const [targetAmount, setTargetAmount] = useState(GOAL_PRESETS[1].target);
  const [savedAmount, setSavedAmount] = useState('0');
  const [targetYear, setTargetYear] = useState(GOAL_PRESETS[1].year);

  const handleSelectPreset = (p: typeof GOAL_PRESETS[0]) => {
    setSelectedPreset(p);
    setGoalTitle(p.title);
    setTargetAmount(p.target);
    setTargetYear(p.year);
  };

  const handleSubmit = () => {
    const target = parseFloat(targetAmount) || 1000000;
    const current = parseFloat(savedAmount) || 0;
    const newGoal: FinancialGoal = {
      id: `goal-${Date.now()}`,
      title: goalTitle.trim() || selectedPreset.title,
      targetAmount: target,
      currentAmount: current,
      targetYear: parseInt(targetYear, 10) || 2028,
      category: 'Strategic Corpus',
      monthlySavingsTarget: Math.round(target / 36),
    };
    onSubmit(newGoal);
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
          <View style={styles.handleBar} />

          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Set Financial Milestone</Text>
              <Text style={styles.modalSubtitle}>Strategic Horizon & Capital Allocation</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Quick Presets */}
            <Text style={styles.fieldLabel}>MILESTONE TEMPLATES</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetsRow}
            >
              {GOAL_PRESETS.map((p) => {
                const isSelected = selectedPreset.title === p.title;
                return (
                  <TouchableOpacity
                    key={p.title}
                    style={[styles.presetChip, isSelected && styles.presetChipActive]}
                    onPress={() => handleSelectPreset(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.presetIcon}>{p.icon}</Text>
                    <Text style={[styles.presetText, isSelected && styles.presetTextActive]}>
                      {p.title.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Goal Title */}
            <Text style={styles.fieldLabel}>GOAL TITLE</Text>
            <TextInput
              style={styles.textInput}
              value={goalTitle}
              onChangeText={setGoalTitle}
              placeholder="e.g. Electric SUV Purchase"
              placeholderTextColor={theme.colors.textTertiary}
            />

            {/* Target Amount */}
            <Text style={styles.fieldLabel}>TARGET CORPUS (₹)</Text>
            <View style={styles.amountInputRow}>
              <Text style={styles.currencyPrefix}>₹</Text>
              <TextInput
                style={styles.amountInput}
                value={targetAmount}
                onChangeText={setTargetAmount}
                keyboardType="numeric"
                placeholder="2500000"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>

            {/* Current Saved Initial */}
            <Text style={styles.fieldLabel}>INITIAL CAPITAL ALLOCATED (₹)</Text>
            <View style={styles.amountInputRow}>
              <Text style={styles.currencyPrefix}>₹</Text>
              <TextInput
                style={styles.amountInput}
                value={savedAmount}
                onChangeText={setSavedAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>

            {/* Target Year Selector */}
            <Text style={styles.fieldLabel}>HORIZON TARGET YEAR</Text>
            <View style={styles.yearsRow}>
              {['2026', '2027', '2028', '2030', '2035'].map((y) => {
                const isSelected = targetYear === y;
                return (
                  <TouchableOpacity
                    key={y}
                    style={[styles.yearBtn, isSelected && styles.yearBtnActive]}
                    onPress={() => setTargetYear(y)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.yearText, isSelected && styles.yearTextActive]}>
                      {y}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>+ Establish Strategic Goal</Text>
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
  yearsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  yearBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.canvas,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  yearBtnActive: {
    backgroundColor: theme.colors.primaryLightSolid,
    borderColor: theme.colors.primary,
  },
  yearText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  yearTextActive: {
    color: theme.colors.primaryDark,
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
