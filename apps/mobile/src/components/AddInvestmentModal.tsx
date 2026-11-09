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
import { InvestmentHolding } from '../types';

interface AddInvestmentModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (holding: InvestmentHolding) => void;
}

const ASSET_CLASSES: { id: InvestmentHolding['type']; label: string; icon: string; color: string }[] = [
  { id: 'EQUITY', label: 'Equities', icon: '📈', color: '#16A36A' },
  { id: 'MUTUAL_FUND', label: 'Mutual Funds', icon: '📊', color: '#6475D8' },
  { id: 'GOLD', label: 'Gold (SGB)', icon: '🪙', color: '#D99A32' },
  { id: 'FIXED_INCOME', label: 'Fixed Income', icon: '🏦', color: '#0D9488' },
];

export const AddInvestmentModal: React.FC<AddInvestmentModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
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
      id: `hold-${Date.now()}`,
      symbol: symbol.trim().toUpperCase() || 'NEWASSET',
      name: assetName.trim() || 'New Holding',
      type: assetClass,
      quantity: qty,
      avgBuyPrice: avgPrice,
      currentPrice: ltp,
      investedValue: invested,
      currentValue: current,
      pnl: pnl,
      pnlPercentage: pnlPercent,
      fifoLotAge: 'LTCG (> 365d)',
    };

    onSubmit(newHolding);
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
              <Text style={styles.modalTitle}>Record Portfolio Asset</Text>
              <Text style={styles.modalSubtitle}>FIFO Cost-Basis Ledger Accounting</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Asset Class Selector */}
            <Text style={styles.fieldLabel}>ASSET CLASS</Text>
            <View style={styles.classesRow}>
              {ASSET_CLASSES.map((ac) => {
                const isSelected = assetClass === ac.id;
                return (
                  <TouchableOpacity
                    key={ac.id}
                    style={[styles.classChip, isSelected && styles.classChipActive]}
                    onPress={() => setAssetClass(ac.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.classIcon}>{ac.icon}</Text>
                    <Text style={[styles.classText, isSelected && styles.classTextActive]}>
                      {ac.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Asset Name */}
            <Text style={styles.fieldLabel}>ASSET / FUND NAME</Text>
            <TextInput
              style={styles.textInput}
              value={assetName}
              onChangeText={setAssetName}
              placeholder="e.g. Tata Consultancy Services"
              placeholderTextColor={theme.colors.textTertiary}
            />

            {/* Ticker / Symbol */}
            <Text style={styles.fieldLabel}>TICKER / ISIN CODE</Text>
            <TextInput
              style={styles.textInput}
              value={symbol}
              onChangeText={setSymbol}
              placeholder="e.g. TCS.NS or INE467B01029"
              placeholderTextColor={theme.colors.textTertiary}
              autoCapitalize="characters"
            />

            {/* Units & Buy Price */}
            <View style={styles.rowTwoCols}>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>QUANTITY (UNITS)</Text>
                <TextInput
                  style={styles.textInput}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>

              <View style={styles.col}>
                <Text style={styles.fieldLabel}>BUY PRICE (₹)</Text>
                <TextInput
                  style={styles.textInput}
                  value={buyPrice}
                  onChangeText={setBuyPrice}
                  keyboardType="numeric"
                  placeholder="2500"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>
            </View>

            {/* Current Market Price */}
            <Text style={styles.fieldLabel}>CURRENT MARKET PRICE (LTP ₹)</Text>
            <TextInput
              style={styles.textInput}
              value={currentPrice}
              onChangeText={setCurrentPrice}
              keyboardType="numeric"
              placeholder="2750"
              placeholderTextColor={theme.colors.textTertiary}
            />

            {/* Submit */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>+ Post Asset to Portfolio</Text>
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
  classesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  classChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: theme.colors.canvas,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  classChipActive: {
    backgroundColor: theme.colors.primaryLightSolid,
    borderColor: theme.colors.primary,
  },
  classIcon: {
    fontSize: 12,
  },
  classText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  classTextActive: {
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
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
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
