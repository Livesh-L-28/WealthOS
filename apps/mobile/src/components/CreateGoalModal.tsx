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
  { title: 'Other / Custom Goal', target: '1000000', year: '2030', icon: '✨', color: '#10B981' },
];

export const CreateGoalModal: React.FC<CreateGoalModalProps> = ({
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

  const [selectedPreset, setSelectedPreset] = useState(GOAL_PRESETS[1]);
  const [goalTitle, setGoalTitle] = useState(GOAL_PRESETS[1].title);
  const [targetAmount, setTargetAmount] = useState(GOAL_PRESETS[1].target);
  const [savedAmount, setSavedAmount] = useState('0');
  const [targetYear, setTargetYear] = useState(GOAL_PRESETS[1].year);

  const handleSelectPreset = (p: typeof GOAL_PRESETS[0]) => {
    setSelectedPreset(p);
    setGoalTitle(p.title === 'Other / Custom Goal' ? '' : p.title);
    setTargetAmount(p.target);
    setTargetYear(p.year);
  };

  const handleSubmit = () => {
    const target = parseFloat(targetAmount) || 1000000;
    const current = parseFloat(savedAmount) || 0;
    const progress = target > 0 ? (current / target) * 100 : 0;

    const newGoal: FinancialGoal = {
      id: `goal-${Date.now()}`,
      title: goalTitle.trim() || selectedPreset.title,
      targetAmount: target,
      currentAmount: current,
      targetYear: parseInt(targetYear, 10) || 2028,
      category: 'WEALTH_CREATION',
    };

    onSubmit(newGoal);
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
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Create Financial Milestone</Text>
              <Text style={[styles.modalSubtitle, { color: textSecondary }]}>Model required SIP & target horizon</Text>
            </View>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: cardSubtle }]} onPress={onClose} activeOpacity={0.7}>
              <Text style={[styles.closeBtnText, { color: textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
            {/* Presets Grid */}
            <Text style={[styles.label, { color: textSecondary }]}>MILESTONE BLUEPRINTS</Text>
            <View style={styles.presetsGrid}>
              {GOAL_PRESETS.map((p) => {
                const isActive = selectedPreset.title === p.title;
                return (
                  <TouchableOpacity
                    key={p.title}
                    style={[
                      styles.presetCard,
                      {
                        backgroundColor: isActive
                          ? isDark ? 'rgba(59, 130, 246, 0.25)' : '#EFF6FF'
                          : cardSubtle,
                        borderColor: isActive
                          ? isDark ? '#3B82F6' : '#2563EB'
                          : borderSubtle,
                      },
                    ]}
                    onPress={() => handleSelectPreset(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.presetIcon}>{p.icon}</Text>
                    <Text
                      style={[
                        styles.presetCardTitle,
                        { color: isActive ? (isDark ? '#60A5FA' : '#2563EB') : textPrimary },
                        isActive && { fontWeight: '800' },
                      ]}
                      numberOfLines={1}
                    >
                      {p.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Goal Name */}
            <Text style={[styles.label, { color: textSecondary }]}>GOAL TITLE</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: inputBg, borderColor: borderSubtle, color: textPrimary }]}
              placeholder="e.g. Dream House Fund"
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={goalTitle}
              onChangeText={setGoalTitle}
            />

            {/* Target Amount */}
            <Text style={[styles.label, { color: textSecondary }]}>TARGET CORPUS (INR)</Text>
            <View style={[styles.amountInputRow, { backgroundColor: inputBg, borderColor: borderSubtle }]}>
              <Text style={[styles.currencyPrefix, { color: isDark ? '#3B82F6' : '#2563EB' }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: textPrimary }]}
                keyboardType="numeric"
                value={targetAmount}
                onChangeText={setTargetAmount}
                placeholder="25,00,000"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              />
            </View>

            {/* Row: Currently Saved & Target Year */}
            <View style={styles.rowTwoCols}>
              <View style={styles.col}>
                <Text style={[styles.label, { color: textSecondary }]}>CURRENT CAPITAL (₹)</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: inputBg, borderColor: borderSubtle, color: textPrimary }]}
                  placeholder="0"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  keyboardType="numeric"
                  value={savedAmount}
                  onChangeText={setSavedAmount}
                />
              </View>

              <View style={styles.col}>
                <Text style={[styles.label, { color: textSecondary }]}>TARGET YEAR</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: inputBg, borderColor: borderSubtle, color: textPrimary }]}
                  placeholder="2028"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  keyboardType="numeric"
                  value={targetYear}
                  onChangeText={setTargetYear}
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.8}>
              <Text style={styles.submitBtnText}>+ Activate Goal Tracking</Text>
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
    maxHeight: '90%',
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
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  presetCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetIcon: {
    fontSize: 15,
  },
  presetCardTitle: {
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
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
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#2563EB',
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
