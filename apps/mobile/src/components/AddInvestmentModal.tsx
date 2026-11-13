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
import { InvestmentHolding } from '../types';

interface AddInvestmentModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (holding: InvestmentHolding) => void;
}

const ASSET_CLASSES: { id: InvestmentHolding['type']; label: string; icon: string; color: string }[] = [
  { id: 'EQUITY', label: 'Equities', icon: '📈', color: '#10B981' },
  { id: 'MUTUAL_FUND', label: 'Mutual Funds', icon: '📊', color: '#3B82F6' },
  { id: 'GOLD', label: 'Gold (SGB)', icon: '🪙', color: '#F59E0B' },
  { id: 'FIXED_INCOME', label: 'Fixed Income', icon: '🏦', color: '#06B6D4' },
];

export const AddInvestmentModal: React.FC<AddInvestmentModalProps> = ({
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

  const [assetClass, setAssetClass] = useState<InvestmentHolding['type']>('EQUITY');
  const [assetName, setAssetName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [buyPrice, setBuyPrice] = useState('2500');
  const [currentPrice, setCurrentPrice] = useState('2750');

  const handleSubmit = () => {
    const qty = parseFloat(quantity) || 1;
    const avgPrice = parseFloat(buyPrice) || 100;
    const ltp = parseFloat(currentPrice) || avgPrice;
    const invested = qty * avgPrice;
    const current = qty * ltp;
    const pnl = current - invested;
    const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;

    const newHolding: InvestmentHolding = {
      id: `inv-${Date.now()}`,
      symbol: symbol.toUpperCase() || 'EQUITY',
      name: assetName.trim() || 'Investment Asset',
      type: assetClass,
      quantity: qty,
      avgBuyPrice: avgPrice,
      currentPrice: ltp,
      investedValue: invested,
      currentValue: current,
      pnl: pnl,
      pnlPercentage: pnlPercent,
      fifoLotAge: 'Recent',
    };

    onSubmit(newHolding);
    setAssetName('');
    setSymbol('');
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
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Add Portfolio Asset</Text>
              <Text style={[styles.modalSubtitle, { color: textSecondary }]}>Track equities, mutual funds, or sovereign debt</Text>
            </View>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: cardSubtle }]} onPress={onClose} activeOpacity={0.7}>
              <Text style={[styles.closeBtnText, { color: textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Asset Class Selector */}
            <Text style={[styles.label, { color: textSecondary }]}>ASSET CLASS</Text>
            <View style={styles.classesRow}>
              {ASSET_CLASSES.map((c) => {
                const isActive = assetClass === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.classChip,
                      {
                        backgroundColor: isActive
                          ? isDark ? 'rgba(16, 185, 129, 0.25)' : '#DCFCE7'
                          : cardSubtle,
                        borderColor: isActive
                          ? isDark ? '#10B981' : '#059669'
                          : borderSubtle,
                      },
                    ]}
                    onPress={() => setAssetClass(c.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.classIcon}>{c.icon}</Text>
                    <Text
                      style={[
                        styles.classText,
                        { color: isActive ? (isDark ? '#34D399' : '#059669') : textSecondary },
                        isActive && { fontWeight: '800' },
                      ]}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Asset Name */}
            <Text style={[styles.label, { color: textSecondary }]}>ASSET / SCHEME NAME</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: inputBg, borderColor: borderSubtle, color: textPrimary }]}
              placeholder="e.g. HDFC Bank Ltd, Parag Parikh Flexi Cap"
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={assetName}
              onChangeText={setAssetName}
            />

            {/* Symbol / Ticker */}
            <Text style={[styles.label, { color: textSecondary }]}>SYMBOL / TICKER / ISIN</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: inputBg, borderColor: borderSubtle, color: textPrimary }]}
              placeholder="e.g. HDFCBANK, PPFAS, INF200K01VG3"
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={symbol}
              onChangeText={setSymbol}
              autoCapitalize="characters"
            />

            {/* Row with Qty and Buy Price */}
            <View style={styles.rowTwoCols}>
              <View style={styles.col}>
                <Text style={[styles.label, { color: textSecondary }]}>QUANTITY</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: inputBg, borderColor: borderSubtle, color: textPrimary }]}
                  placeholder="10"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>

              <View style={styles.col}>
                <Text style={[styles.label, { color: textSecondary }]}>BUY AVG PRICE (₹)</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: inputBg, borderColor: borderSubtle, color: textPrimary }]}
                  placeholder="2500"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  keyboardType="numeric"
                  value={buyPrice}
                  onChangeText={setBuyPrice}
                />
              </View>
            </View>

            {/* Current Market Price */}
            <Text style={[styles.label, { color: textSecondary }]}>CURRENT MARKET PRICE / NAV (₹)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: inputBg, borderColor: borderSubtle, color: textPrimary }]}
              placeholder="2750"
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              keyboardType="numeric"
              value={currentPrice}
              onChangeText={setCurrentPrice}
            />

            {/* Submit Button */}
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.8}>
              <Text style={styles.submitBtnText}>+ Add Holding to Portfolio</Text>
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
  classesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  classChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  classIcon: {
    fontSize: 12,
  },
  classText: {
    fontSize: 11,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  submitBtn: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
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
