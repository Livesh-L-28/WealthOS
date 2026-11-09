import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useTheme } from '../theme';

interface AuthScreenProps {
  onUnlock: () => void;
  activeWorkspace: string;
  onSelectWorkspace: (ws: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onUnlock,
  activeWorkspace,
  onSelectWorkspace,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const [pin, setPin] = useState<string>('');
  const [authMethod, setAuthMethod] = useState<'BIOMETRIC' | 'PIN'>('BIOMETRIC');

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 4) {
        setTimeout(onUnlock, 250);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.canvas }]}>
      <View style={styles.container}>
        {/* Top Header Controls */}
        <View style={styles.topRow}>
          <View style={[styles.statusBadge, { backgroundColor: theme.colors.primaryLightSolid }]}>
            <Text style={[styles.statusBadgeText, { color: theme.colors.primary }]}>
              HARDWARE ENCLAVE
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.themeBtn, { backgroundColor: theme.colors.cardSubtle, borderColor: theme.colors.border }]}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Text style={styles.themeBtnText}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
        </View>

        {/* Brand & Security Hero */}
        <View style={styles.brandHero}>
          <View style={[styles.logoBadge, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.logoText}>W</Text>
          </View>
          <Text style={[styles.brandTitle, { color: theme.colors.textPrimary }]}>
            Wealth<Text style={[styles.brandAccent, { color: theme.colors.primary }]}>OS</Text>
          </Text>
          <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>
            Double-Entry Wealth Operating System
          </Text>
          <Text style={[styles.custodySub, { color: theme.colors.textTertiary }]}>
            End-to-end encrypted session • Hardware KeyStore custody
          </Text>
        </View>

        {/* Tenant Workspace Selection Pills */}
        <View style={styles.workspaceSection}>
          <Text style={[styles.workspaceLabel, { color: theme.colors.textSecondary }]}>
            SIGN IN TO ENTITY
          </Text>
          <View style={styles.wsRow}>
            {['Family Office', 'Personal Holdings', 'Business Treasury'].map((ws) => {
              const isSelected = activeWorkspace === ws;
              return (
                <TouchableOpacity
                  key={ws}
                  style={[
                    styles.wsPill,
                    {
                      backgroundColor: isSelected
                        ? theme.colors.primaryLightSolid
                        : theme.colors.card,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => onSelectWorkspace(ws)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.wsPillText,
                      { color: isSelected ? theme.colors.primary : theme.colors.textSecondary },
                    ]}
                  >
                    {ws}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {authMethod === 'BIOMETRIC' ? (
          <View style={styles.biometricSection}>
            <TouchableOpacity
              style={[
                styles.biometricCircle,
                {
                  backgroundColor: theme.colors.primaryLightSolid,
                  borderColor: theme.colors.primary,
                },
              ]}
              onPress={onUnlock}
              activeOpacity={0.8}
            >
              <Text style={styles.biometricIcon}>🛡️</Text>
            </TouchableOpacity>
            <Text style={[styles.biometricPrompt, { color: theme.colors.textPrimary }]}>
              Biometric Authentication
            </Text>
            <Text style={[styles.biometricSub, { color: theme.colors.textSecondary }]}>
              Tap to verify Fingerprint or Face ID via Android KeyStore
            </Text>

            <TouchableOpacity
              style={[styles.primaryUnlockBtn, { backgroundColor: theme.colors.primary }]}
              onPress={onUnlock}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryUnlockText}>Unlock Ledger Session</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchMethodBtn}
              onPress={() => setAuthMethod('PIN')}
              activeOpacity={0.7}
            >
              <Text style={[styles.switchMethodText, { color: theme.colors.primary }]}>
                Use 4-Digit Passcode Instead
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.pinSection}>
            <Text style={[styles.pinPrompt, { color: theme.colors.textPrimary }]}>
              Enter Security PIN
            </Text>

            {/* PIN Dots */}
            <View style={styles.dotsRow}>
              {[0, 1, 2, 3].map((idx) => {
                const filled = pin.length > idx;
                return (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: filled
                          ? theme.colors.primary
                          : theme.colors.cardSubtle,
                        borderColor: filled ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  />
                );
              })}
            </View>

            {/* Keypad */}
            <View style={styles.keypad}>
              {[
                ['1', '2', '3'],
                ['4', '5', '6'],
                ['7', '8', '9'],
                ['', '0', '⌫'],
              ].map((row, rIdx) => (
                <View key={rIdx} style={styles.keypadRow}>
                  {row.map((k, kIdx) => {
                    if (!k) return <View key={kIdx} style={styles.keyEmpty} />;
                    return (
                      <TouchableOpacity
                        key={kIdx}
                        style={[
                          styles.keyBtn,
                          {
                            backgroundColor: theme.colors.card,
                            borderColor: theme.colors.border,
                          },
                        ]}
                        onPress={() => (k === '⌫' ? handleBackspace() : handleKeyPress(k))}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.keyText, { color: theme.colors.textPrimary }]}>
                          {k}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.switchMethodBtn}
              onPress={() => setAuthMethod('BIOMETRIC')}
              activeOpacity={0.7}
            >
              <Text style={[styles.switchMethodText, { color: theme.colors.primary }]}>
                Switch to Biometrics
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  themeBtnText: {
    fontSize: 16,
  },
  brandHero: {
    alignItems: 'center',
    marginVertical: 10,
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 10,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandAccent: {
    fontWeight: '900',
  },
  tagline: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  custodySub: {
    fontSize: 10,
    marginTop: 4,
  },
  workspaceSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  workspaceLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  wsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  wsPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  wsPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  biometricSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  biometricCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 14,
  },
  biometricIcon: {
    fontSize: 36,
  },
  biometricPrompt: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  biometricSub: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  primaryUnlockBtn: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 12,
  },
  primaryUnlockText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  switchMethodBtn: {
    paddingVertical: 8,
  },
  switchMethodText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pinSection: {
    alignItems: 'center',
  },
  pinPrompt: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  keypad: {
    width: '100%',
    maxWidth: 280,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  keyBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  keyEmpty: {
    width: 64,
    height: 64,
  },
  keyText: {
    fontSize: 22,
    fontWeight: '700',
  },
});
