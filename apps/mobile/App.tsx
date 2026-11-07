import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="light" />
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>W</Text>
        </View>
        <View>
          <Text style={styles.brandTitle}>
            WEALTH<Text style={styles.brandAccent}>OS</Text>
          </Text>
          <Text style={styles.brandSubtitle}>ENTERPRISE SAAS · INDIA (INR)</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>TOTAL NET WORTH</Text>
          <Text style={styles.cardValue}>₹0.00</Text>
          <Text style={styles.cardHelp}>Awaiting initial statement or account connection</Text>
        </View>

        <View style={styles.setupContainer}>
          <Text style={styles.setupTitle}>Workspace Initialization</Text>
          <Text style={styles.setupSubtitle}>
            Securely link your bank account or upload an encrypted statement to begin.
          </Text>

          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>Connect Account</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.8}>
            <Text style={styles.secondaryButtonText}>Import Statement</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>WealthOS Mobile Foundation v0.2.0</Text>
        <Text style={styles.footerSubtext}>Zero-Trust Containerized Encryption</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F17',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    gap: 12,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  brandTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  brandAccent: {
    color: '#818CF8',
  },
  brandSubtitle: {
    color: '#64748B',
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 20,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  cardValue: {
    color: '#F8FAFC',
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 8,
    marginBottom: 4,
  },
  cardHelp: {
    color: '#64748B',
    fontSize: 12,
  },
  setupContainer: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  setupTitle: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  setupSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  secondaryButtonText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  footerText: {
    color: '#64748B',
    fontSize: 11,
  },
  footerSubtext: {
    color: '#475569',
    fontSize: 10,
    marginTop: 2,
  },
});
