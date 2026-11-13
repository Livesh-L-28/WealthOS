import React, { useState, useEffect } from 'react';
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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { theme, useTheme } from '../theme';
import { BankAccount } from '../types';
import {
  ScannedReceiptData,
  SAMPLE_RECEIPTS,
  PresetReceipt,
  captureReceiptFromCamera,
  pickReceiptFromLibrary,
  scanReceiptWithHybridOCR,
} from '../receiptScannerService';

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  initialType?: 'DEBIT' | 'CREDIT';
  initialScanMode?: boolean;
  onSubmit: (data: {
    title: string;
    amount: number;
    category: string;
    type: 'DEBIT' | 'CREDIT';
    accountName: string;
  }) => void;
}

const EXPENSE_CATEGORIES = [
  'Dining & Restaurants',
  'Food & Groceries',
  'Housing & Rent',
  'Utilities & Bills',
  'Transport & Fuel',
  'Technology & Cloud',
  'Shopping & Retail',
  'Healthcare & Wellness',
  'Travel & Vacation',
  'Mutual Fund SIP',
];

const INCOME_CATEGORIES = [
  'Corporate Salary',
  'Professional / Consulting Retainer',
  'Investment Dividend Payout',
  'Rental & Real Estate Income',
  'Capital Gains / Stock Sale',
  'Interest & Term Deposit Yield',
  'Business Inflow',
  'Reimbursement / Refund',
];

const EXPENSE_PRESETS = [100, 500, 1000, 2500, 5000, 10000];
const INCOME_PRESETS = [5000, 15000, 35000, 75000, 150000, 250000];

interface HabitChip {
  icon: string;
  label: string;
  amount: number;
  category: string;
}

const getHabitTint = (index: number, isDark: boolean) => {
  const tints = [
    { bg: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7', border: isDark ? 'rgba(245, 158, 11, 0.35)' : '#FDE68A', accent: isDark ? '#FBBF24' : '#D97706' }, // Coffee (Caramel)
    { bg: isDark ? 'rgba(234, 88, 12, 0.12)' : '#FFEDD5', border: isDark ? 'rgba(234, 88, 12, 0.35)' : '#FED7AA', accent: isDark ? '#FB923C' : '#EA580C' }, // Fuel (Orange)
    { bg: isDark ? 'rgba(16, 185, 129, 0.12)' : '#D1FAE5', border: isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0', accent: isDark ? '#34D399' : '#059669' }, // Groceries (Emerald)
    { bg: isDark ? 'rgba(244, 63, 94, 0.12)' : '#FFE4E6', border: isDark ? 'rgba(244, 63, 94, 0.35)' : '#FECDD3', accent: isDark ? '#FB7185' : '#E11D48' }, // Dining (Rose)
    { bg: isDark ? 'rgba(14, 165, 233, 0.12)' : '#E0F2FE', border: isDark ? 'rgba(14, 165, 233, 0.35)' : '#BAE6FD', accent: isDark ? '#38BDF8' : '#0284C7' }, // Cab (Sky)
    { bg: isDark ? 'rgba(139, 92, 246, 0.12)' : '#EDE9FE', border: isDark ? 'rgba(139, 92, 246, 0.35)' : '#DDD6FE', accent: isDark ? '#A78BFA' : '#7C3AED' }, // Mobile (Purple)
  ];
  return tints[index % tints.length];
};

const QUICK_HABITS: HabitChip[] = [
  { icon: '☕', label: 'Coffee', amount: 150, category: 'Dining & Restaurants' },
  { icon: '⛽', label: 'Fuel', amount: 1000, category: 'Transport & Fuel' },
  { icon: '🛒', label: 'Groceries', amount: 750, category: 'Food & Groceries' },
  { icon: '🍽️', label: 'Dining Out', amount: 850, category: 'Dining & Restaurants' },
  { icon: '🚕', label: 'Cab / Ride', amount: 300, category: 'Transport & Fuel' },
  { icon: '📱', label: 'Mobile / Net', amount: 499, category: 'Utilities & Bills' },
];

function parseNaturalLanguage(text: string, accounts: BankAccount[]) {
  const words = text.trim().split(/\s+/);
  let parsedAmount = '';
  const remainingWords: string[] = [];
  let matchedCat = '';
  let matchedAcc = '';
  let matchedType: 'DEBIT' | 'CREDIT' = 'DEBIT';

  for (const w of words) {
    const cleanNum = w.replace(/[₹,]/g, '');
    if (!parsedAmount && !isNaN(Number(cleanNum)) && Number(cleanNum) > 0) {
      parsedAmount = cleanNum;
      continue;
    }
    const lower = w.toLowerCase();
    if (['salary', 'bonus', 'dividend', 'interest', 'stipend'].includes(lower)) {
      matchedType = 'CREDIT';
      if (lower === 'salary') matchedCat = 'Corporate Salary';
      if (lower === 'dividend') matchedCat = 'Investment Dividend Payout';
      continue;
    }
    if (['coffee', 'tea', 'cafe', 'starbucks'].includes(lower)) {
      matchedCat = 'Dining & Restaurants';
    } else if (['grocery', 'groceries', 'supermarket', 'blinkit', 'zepto'].includes(lower)) {
      matchedCat = 'Food & Groceries';
    } else if (['fuel', 'petrol', 'diesel', 'shell'].includes(lower)) {
      matchedCat = 'Transport & Fuel';
    } else if (['cab', 'uber', 'ola', 'auto'].includes(lower)) {
      matchedCat = 'Transport & Fuel';
    } else if (['recharge', 'wifi', 'broadband', 'electricity', 'bill'].includes(lower)) {
      matchedCat = 'Utilities & Bills';
    }

    const foundAcc = accounts.find(
      (a) => a.name.toLowerCase().includes(lower) || a.institution.toLowerCase().includes(lower)
    );
    if (foundAcc) {
      matchedAcc = foundAcc.name;
      continue;
    }

    remainingWords.push(w);
  }

  return {
    amount: parsedAmount,
    title: remainingWords.join(' '),
    category: matchedCat,
    account: matchedAcc,
    type: matchedType,
  };
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  visible,
  onClose,
  accounts,
  initialType = 'DEBIT',
  initialScanMode = false,
  onSubmit,
}) => {
  const { isDark } = useTheme();
  const sheetBg = isDark ? '#111827' : '#FFFFFF';
  const borderColor = isDark ? '#1F2937' : '#E2E8F0';
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const inputBg = isDark ? '#0B0F19' : '#F8FAFC';
  const cardSubtle = isDark ? '#1E293B' : '#F1F5F9';
  const borderSubtle = isDark ? '#334155' : '#E2E8F0';

  const [type, setType] = useState<'DEBIT' | 'CREDIT'>(initialType);
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [quickInput, setQuickInput] = useState('');
  const [category, setCategory] = useState(
    initialType === 'CREDIT' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]
  );
  const [selectedAccount, setSelectedAccount] = useState(
    accounts[0]?.name || 'Primary Operating Savings'
  );

  const [isScannerOpen, setIsScannerOpen] = useState(initialScanMode);
  const [isScanning, setIsScanning] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [scannedReceipt, setScannedReceipt] = useState<ScannedReceiptData | null>(null);

  useEffect(() => {
    if (visible && initialScanMode) {
      setIsScannerOpen(true);
    }
  }, [visible, initialScanMode]);

  const handleCameraScan = async () => {
    try {
      setIsScanning(true);
      const photo = await captureReceiptFromCamera();
      if (!photo) {
        setIsScanning(false);
        return;
      }
      const data = await scanReceiptWithHybridOCR({
        imageUri: photo.uri,
        imageBase64: photo.base64,
        source: 'CAMERA',
      });
      setScannedReceipt(data);
    } catch (err: any) {
      Alert.alert('Camera Notice', err.message || 'Unable to access camera.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleGalleryScan = async () => {
    try {
      setIsScanning(true);
      const photo = await pickReceiptFromLibrary();
      if (!photo) {
        setIsScanning(false);
        return;
      }
      const data = await scanReceiptWithHybridOCR({
        imageUri: photo.uri,
        imageBase64: photo.base64,
        source: 'GALLERY',
      });
      setScannedReceipt(data);
    } catch (err: any) {
      Alert.alert('Gallery Notice', err.message || 'Unable to access photo library.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectPreset = async (preset: PresetReceipt) => {
    setIsScanning(true);
    setShowPresets(false);
    setTimeout(async () => {
      const data = await scanReceiptWithHybridOCR({
        rawText: preset.rawText,
        source: 'PRESET',
      });
      setScannedReceipt(data);
      setIsScanning(false);
    }, 400);
  };

  const handleApplyScannedReceipt = () => {
    if (!scannedReceipt) return;
    setAmount(scannedReceipt.amount.toString());
    setTitle(scannedReceipt.merchantName);
    setCategory(scannedReceipt.category);
    setType('DEBIT');
    setIsScannerOpen(false);
  };

  const handleApplyHabit = (habit: HabitChip) => {
    setType('DEBIT');
    setTitle(habit.label);
    setAmount(habit.amount.toString());
    setCategory(habit.category);
    setQuickInput('');
  };

  const handleQuickInputChange = (txt: string) => {
    setQuickInput(txt);
    if (txt.trim().length > 1) {
      const parsed = parseNaturalLanguage(txt, accounts);
      if (parsed.amount) setAmount(parsed.amount);
      if (parsed.title) setTitle(parsed.title);
      if (parsed.category) setCategory(parsed.category);
      if (parsed.account) setSelectedAccount(parsed.account);
      if (parsed.type) setType(parsed.type);
    }
  };

  useEffect(() => {
    if (visible) {
      setType(initialType);
      setCategory(initialType === 'CREDIT' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
      if (accounts.length > 0 && !selectedAccount) {
        setSelectedAccount(accounts[0].name);
      }
    }
  }, [visible, initialType, accounts]);

  const handleTypeChange = (newType: 'DEBIT' | 'CREDIT') => {
    setType(newType);
    setCategory(newType === 'CREDIT' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
  };

  const handleAddIncrement = (val: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + val).toString());
  };

  const handleSubmit = () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid transaction amount.');
      return;
    }
    const finalTitle = title.trim() || `${category} ${isIncome ? 'Inflow' : 'Expense'}`;

    onSubmit({
      title: finalTitle,
      amount: parsedAmount,
      category,
      type,
      accountName: selectedAccount || 'Cash Wallet',
    });

    // Reset
    setAmount('');
    setTitle('');
    setQuickInput('');
    onClose();
  };

  const currentCategories = type === 'CREDIT' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const currentPresets = type === 'CREDIT' ? INCOME_PRESETS : EXPENSE_PRESETS;
  const isIncome = type === 'CREDIT';

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
              <Text style={[styles.modalTitle, { color: textPrimary }]}>
                {isIncome ? '+ Record Income (Inflow)' : '− Record Expense (Outflow)'}
              </Text>
              <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                {isIncome
                  ? 'Double-Entry Inflow Posted to Bank Ledger'
                  : 'Double-Entry Expense Debited from Account'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: cardSubtle }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.closeBtnText, { color: textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Primary Income / Expense Mode Switcher */}
            <View style={[styles.typeSwitcher, { backgroundColor: isDark ? '#0B0F19' : '#EEF2EF' }]}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  !isIncome && [
                    styles.typeBtnDebitActive,
                    {
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2',
                      borderColor: isDark ? '#EF4444' : '#FECACA',
                    },
                  ],
                ]}
                onPress={() => handleTypeChange('DEBIT')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    { color: textSecondary },
                    !isIncome && { color: isDark ? '#F87171' : '#DC2626', fontWeight: '800' },
                  ]}
                >
                  ↑ Expense (Outflow)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  isIncome && [
                    styles.typeBtnCreditActive,
                    {
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7',
                      borderColor: isDark ? '#10B981' : '#BBF7D0',
                    },
                  ],
                ]}
                onPress={() => handleTypeChange('CREDIT')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    { color: textSecondary },
                    isIncome && { color: isDark ? '#34D399' : '#059669', fontWeight: '800' },
                  ]}
                >
                  ↓ Income (Inflow)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Receipt OCR Scanner Hero Bar */}
            {!isIncome && (
              <View style={{ marginBottom: 12 }}>
                <TouchableOpacity
                  style={[
                    styles.scannerTrigger,
                    {
                      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : '#EEF2FF',
                      borderColor: isDark ? 'rgba(99, 102, 241, 0.35)' : '#C7D2FE',
                    },
                  ]}
                  onPress={() => setIsScannerOpen(!isScannerOpen)}
                  activeOpacity={0.8}
                >
                  <View style={styles.scannerTriggerLeft}>
                    <View style={[styles.scannerIconBadge, { backgroundColor: isDark ? '#4F46E5' : '#6366F1' }]}>
                      <Text style={styles.scannerIconText}>📷</Text>
                    </View>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.scannerTriggerTitle, { color: textPrimary }]}>
                          Scan Receipt / Invoice
                        </Text>
                        <View style={styles.ocrPill}>
                          <Text style={styles.ocrPillText}>AI OCR</Text>
                        </View>
                      </View>
                      <Text style={[styles.scannerTriggerSubtitle, { color: textSecondary }]}>
                        Auto-extract merchant, total, category & GST
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.scannerChevron, { color: isDark ? '#A5B4FC' : '#4F46E5' }]}>
                    {isScannerOpen ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>

                {/* Expanded Scanner Card */}
                {isScannerOpen && (
                  <View style={[styles.scannerCard, { backgroundColor: cardSubtle, borderColor: borderSubtle }]}>
                    <View style={styles.scannerActionsRow}>
                      <TouchableOpacity
                        style={[styles.scannerActionBtn, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: borderSubtle }]}
                        onPress={handleCameraScan}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.scannerActionIcon}>📸</Text>
                        <Text style={[styles.scannerActionText, { color: textPrimary }]}>Camera</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.scannerActionBtn, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: borderSubtle }]}
                        onPress={handleGalleryScan}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.scannerActionIcon}>🖼️</Text>
                        <Text style={[styles.scannerActionText, { color: textPrimary }]}>Gallery</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.scannerActionBtn,
                          { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: borderSubtle },
                          showPresets && { borderColor: isDark ? '#818CF8' : '#4F46E5', borderWidth: 1.5 },
                        ]}
                        onPress={() => setShowPresets(!showPresets)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.scannerActionIcon}>⚡</Text>
                        <Text style={[styles.scannerActionText, { color: textPrimary }]}>Samples</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Presets List */}
                    {showPresets && (
                      <View style={styles.presetsContainer}>
                        <Text style={[styles.presetHelperText, { color: textSecondary }]}>
                          Instant sample receipts (test without camera):
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsList}>
                          {SAMPLE_RECEIPTS.map((preset) => (
                            <TouchableOpacity
                              key={preset.id}
                              style={[
                                styles.presetButton,
                                {
                                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                                  borderColor: borderSubtle,
                                },
                              ]}
                              onPress={() => handleSelectPreset(preset)}
                              activeOpacity={0.75}
                            >
                              <Text style={{ fontSize: 18 }}>{preset.icon}</Text>
                              <View>
                                <Text style={[styles.presetButtonTitle, { color: textPrimary }]}>{preset.label}</Text>
                                <Text style={[styles.presetButtonAmount, { color: isDark ? '#34D399' : '#059669' }]}>
                                  ₹{preset.amount}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {/* Scanning in progress HUD */}
                    {isScanning && (
                      <View style={styles.scanningHud}>
                        <ActivityIndicator size="small" color={isDark ? '#818CF8' : '#4F46E5'} />
                        <Text style={[styles.scanningHudText, { color: textPrimary }]}>
                          Scanning receipt with AI OCR engine...
                        </Text>
                      </View>
                    )}

                    {/* Extracted Receipt Card */}
                    {scannedReceipt && !isScanning && (
                      <View style={[styles.extractedCard, { backgroundColor: isDark ? '#0B0F19' : '#FFFFFF', borderColor: isDark ? '#059669' : '#10B981' }]}>
                        <View style={styles.extractedHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 13, color: isDark ? '#34D399' : '#059669', fontWeight: '800' }}>✓</Text>
                            <Text style={[styles.extractedBadgeText, { color: isDark ? '#34D399' : '#059669' }]}>
                              RECEIPT PARSED ({Math.round(scannedReceipt.confidence * 100)}% CONFIDENCE)
                            </Text>
                          </View>
                          <TouchableOpacity onPress={() => setScannedReceipt(null)}>
                            <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '700' }}>✕ Dismiss</Text>
                          </TouchableOpacity>
                        </View>

                        <View style={styles.extractedGrid}>
                          <View style={styles.extractedItem}>
                            <Text style={[styles.extractedItemLabel, { color: textSecondary }]}>MERCHANT</Text>
                            <Text style={[styles.extractedItemValue, { color: textPrimary }]}>{scannedReceipt.merchantName}</Text>
                          </View>

                          <View style={styles.extractedItem}>
                            <Text style={[styles.extractedItemLabel, { color: textSecondary }]}>TOTAL AMOUNT</Text>
                            <Text style={[styles.extractedItemValue, { color: isDark ? '#F87171' : '#DC2626', fontWeight: '800' }]}>
                              ₹{scannedReceipt.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Text>
                          </View>

                          <View style={styles.extractedItem}>
                            <Text style={[styles.extractedItemLabel, { color: textSecondary }]}>CATEGORY</Text>
                            <Text style={[styles.extractedItemValue, { color: textPrimary }]}>{scannedReceipt.category}</Text>
                          </View>

                          <View style={styles.extractedItem}>
                            <Text style={[styles.extractedItemLabel, { color: textSecondary }]}>TAXES / GST</Text>
                            <Text style={[styles.extractedItemValue, { color: textPrimary }]}>
                              {scannedReceipt.taxes ? `₹${scannedReceipt.taxes.toFixed(2)}` : 'Included'}
                            </Text>
                          </View>
                        </View>

                        {/* Apply Button */}
                        <TouchableOpacity
                          style={[styles.applyReceiptBtn, { backgroundColor: isDark ? '#059669' : '#10B981' }]}
                          onPress={handleApplyScannedReceipt}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.applyReceiptBtnText}>✓ Apply Extracted Details to Form</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* 1-Tap Frictionless Habit Chips (Daily Spends) */}
            {!isIncome && (
              <View style={styles.habitsSection}>
                <Text style={[styles.habitsLabel, { color: textSecondary }]}>⚡ 1-TAP QUICK LOG HABITS</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.habitsScroll}>
                  {QUICK_HABITS.map((h, i) => {
                    const tint = getHabitTint(i, isDark);
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.habitChip,
                          {
                            backgroundColor: tint.bg,
                            borderColor: tint.border,
                          },
                        ]}
                        onPress={() => handleApplyHabit(h)}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.habitChipIcon}>{h.icon}</Text>
                        <Text style={[styles.habitChipText, { color: textPrimary }]}>{h.label}</Text>
                        <View style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={[styles.habitChipAmount, { color: tint.accent, fontWeight: '700' }]}>
                            ₹{h.amount}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Natural Language Quick Input */}
            <View style={[styles.nlBox, { backgroundColor: cardSubtle, borderColor: borderSubtle }]}>
              <View style={styles.nlLabelRow}>
                <Text style={[styles.nlLabel, { color: textSecondary }]}>SMART ONE-LINER QUICK PARSER</Text>
                <View style={styles.nlAiBadge}>
                  <Text style={styles.nlAiBadgeText}>⚡ Instant</Text>
                </View>
              </View>
              <TextInput
                style={[styles.nlInput, { backgroundColor: inputBg, borderColor: borderSubtle, color: textPrimary }]}
                placeholder="e.g. 'Coffee 150 Cash', 'Dinner 850 HDFC', 'Salary 150000'"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                value={quickInput}
                onChangeText={handleQuickInputChange}
                autoCapitalize="sentences"
              />
            </View>

            {/* Amount Input */}
            <Text style={[styles.label, { color: textSecondary }]}>
              {isIncome ? 'INCOME AMOUNT (INR)' : 'EXPENSE AMOUNT (INR)'}
            </Text>
            <View
              style={[
                styles.amountInputRow,
                {
                  backgroundColor: inputBg,
                  borderColor: isIncome
                    ? isDark ? '#10B981' : '#059669'
                    : isDark ? '#EF4444' : '#DC2626',
                },
              ]}
            >
              <Text
                style={[
                  styles.currencySymbol,
                  { color: isIncome ? (isDark ? '#34D399' : '#059669') : (isDark ? '#F87171' : '#DC2626') },
                ]}
              >
                ₹
              </Text>
              <TextInput
                style={[
                  styles.amountInput,
                  { color: isIncome ? (isDark ? '#34D399' : '#059669') : (isDark ? '#F87171' : '#DC2626') },
                ]}
                placeholder="0.00"
                placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                autoFocus={true}
              />
            </View>

            {/* Quick Presets & Increment Buttons */}
            <View style={styles.presetsRow}>
              {currentPresets.map((val) => {
                const isLarge = val >= 1000;
                return (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: isLarge
                          ? (isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5')
                          : cardSubtle,
                        borderColor: isLarge
                          ? (isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0')
                          : borderSubtle,
                      },
                    ]}
                    onPress={() => handleAddIncrement(val)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        {
                          color: isLarge
                            ? (isDark ? '#34D399' : '#059669')
                            : textPrimary,
                          fontWeight: isLarge ? '700' : '600',
                        },
                      ]}
                    >
                      +₹{val >= 100000 ? `${val / 100000}L` : val >= 1000 ? `${val / 1000}k` : val}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Description / Merchant */}
            <Text style={[styles.label, { color: textSecondary }]}>
              {isIncome ? 'SOURCE / CLIENT / PAYER' : 'DESCRIPTION / MERCHANT'}
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: inputBg, borderColor: borderSubtle, color: textPrimary }]}
              placeholder={
                isIncome
                  ? 'e.g. Infy Advisory Retainer, TCS Dividend, Salary'
                  : 'e.g. Whole Foods Organic, Amazon AWS, Shell Fuel'
              }
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={title}
              onChangeText={setTitle}
            />

            {/* Category Selector */}
            <Text style={[styles.label, { color: textSecondary }]}>
              {isIncome ? 'INCOME CATEGORY' : 'EXPENSE CATEGORY'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {currentCategories.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: isSelected
                          ? isIncome
                            ? isDark ? 'rgba(16, 185, 129, 0.25)' : '#DCFCE7'
                            : isDark ? 'rgba(239, 68, 68, 0.25)' : '#FEE2E2'
                          : cardSubtle,
                        borderColor: isSelected
                          ? isIncome
                            ? '#10B981'
                            : '#EF4444'
                          : borderSubtle,
                      },
                    ]}
                    onPress={() => setCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        {
                          color: isSelected
                            ? isIncome
                              ? isDark ? '#34D399' : '#059669'
                              : isDark ? '#F87171' : '#DC2626'
                            : textSecondary,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Account Selector */}
            <Text style={[styles.label, { color: textSecondary }]}>
              {isIncome ? 'DEPOSITING ACCOUNT (RECEIVER)' : 'SOURCE PAYMENT ACCOUNT (DEBIT)'}
            </Text>
            <View style={styles.accountPicker}>
              {(accounts.length > 0 ? accounts.slice(0, 4) : [{ id: 'cash', name: 'Cash Wallet', accountNumberMask: '•••• Cash' }]).map((acc) => {
                const isSelected = selectedAccount === acc.name;
                return (
                  <TouchableOpacity
                    key={acc.id}
                    style={[
                      styles.accountChoice,
                      {
                        backgroundColor: isSelected
                          ? isIncome
                            ? isDark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7'
                            : isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF'
                          : cardSubtle,
                        borderColor: isSelected
                          ? isIncome
                            ? '#10B981'
                            : '#3B82F6'
                          : borderSubtle,
                      },
                    ]}
                    onPress={() => setSelectedAccount(acc.name)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.accountChoiceText,
                        {
                          color: isSelected ? textPrimary : textSecondary,
                          fontWeight: isSelected ? '700' : '600',
                        },
                      ]}
                    >
                      {acc.name}
                    </Text>
                    <Text style={[styles.accountChoiceMask, { color: textSecondary }]}>
                      {acc.accountNumberMask}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={[styles.actionRow, { borderTopColor: borderColor }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: cardSubtle }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelBtnText, { color: textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                {
                  backgroundColor: isIncome ? '#10B981' : '#EF4444',
                },
              ]}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>
                {isIncome ? '+ Post Income to Ledger' : '− Post Expense to Ledger'}
              </Text>
            </TouchableOpacity>
          </View>
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
    maxHeight: '92%',
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
  typeSwitcher: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  typeBtnDebitActive: {
    borderWidth: 1,
  },
  typeBtnCreditActive: {
    borderWidth: 1,
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  habitsSection: {
    marginBottom: 14,
  },
  habitsLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  habitsScroll: {
    flexDirection: 'row',
  },
  habitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    gap: 6,
  },
  habitChipIcon: {
    fontSize: 14,
  },
  habitChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  habitChipAmount: {
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  nlBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    marginBottom: 16,
  },
  nlLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nlLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  nlAiBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nlAiBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
  },
  nlInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 6,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '800',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: '900',
    paddingVertical: 10,
    fontVariant: ['tabular-nums'],
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 12,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
  },
  chipsScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  catChipText: {
    fontSize: 11,
  },
  accountPicker: {
    gap: 8,
    marginBottom: 16,
  },
  accountChoice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  accountChoiceText: {
    fontSize: 12,
  },
  accountChoiceMask: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scannerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  scannerTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scannerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerIconText: {
    fontSize: 18,
  },
  scannerTriggerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  ocrPill: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ocrPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  scannerTriggerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  scannerChevron: {
    fontSize: 12,
    fontWeight: '700',
  },
  scannerCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  scannerActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scannerActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  scannerActionIcon: {
    fontSize: 14,
  },
  scannerActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  presetsContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  presetHelperText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  presetsList: {
    flexDirection: 'row',
  },
  presetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  presetButtonTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  presetButtonAmount: {
    fontSize: 10,
    fontWeight: '800',
  },
  scanningHud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  scanningHudText: {
    fontSize: 12,
    fontWeight: '700',
  },
  extractedCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  extractedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  extractedBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  extractedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  extractedItem: {
    width: '48%',
    padding: 6,
    borderRadius: 6,
  },
  extractedItemLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 2,
  },
  extractedItemValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  applyReceiptBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyReceiptBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
