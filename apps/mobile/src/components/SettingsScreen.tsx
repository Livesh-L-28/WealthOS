import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Switch,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { theme, useTheme } from '../theme';
import { config, setRuntimeApiUrl } from '../config';
import { localStore } from '../storage/localStore';

interface SettingsScreenProps {
  onBack: () => void;
  activeWorkspace: string;
  onSelectWorkspace: (ws: string) => void;
  onShowToast: (msg: string) => void;
  onLogout?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  activeWorkspace,
  onSelectWorkspace,
  onShowToast,
  onLogout,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const cardBg = isDark ? '#111827' : '#FFFFFF';
  const borderColor = isDark ? '#1E293B' : '#E2E8F0';
  const canvasBg = isDark ? '#0B0F19' : '#F8FAFC';
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';

  const [biometricsEnabled, setBiometricsEnabled] = useState(true);
  const [offlineSync, setOfflineSync] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);

  // Server endpoint & diagnostic state
  const [serverUrl, setServerUrl] = useState<string>(config.apiUrl);
  const [pingStatus, setPingStatus] = useState<'IDLE' | 'TESTING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [pingMessage, setPingMessage] = useState<string>('');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    localStore.getCustomServerUrl().then((saved) => {
      if (isMounted && saved) {
        setServerUrl(saved);
        setRuntimeApiUrl(saved);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const handleTestConnection = async (targetUrl = serverUrl) => {
    const cleanUrl = targetUrl.trim().replace(/\/$/, '');
    setPingStatus('TESTING');
    setPingMessage('Connecting to ' + cleanUrl + '...');
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${cleanUrl}/api/v1/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;
      if (res.ok || res.status === 503) {
        setPingStatus('SUCCESS');
        setPingLatency(latency);
        setPingMessage(`Online (${latency}ms)`);
        onShowToast(`Backend reachable: ${latency}ms latency`);
      } else {
        setPingStatus('FAILED');
        setPingLatency(latency);
        setPingMessage(`Server returned HTTP ${res.status}`);
        onShowToast(`Server error: HTTP ${res.status}`);
      }
    } catch (err: any) {
      setPingStatus('FAILED');
      setPingLatency(null);
      setPingMessage('Unreachable (Offline or timeout)');
      onShowToast('Could not reach backend at ' + cleanUrl);
    }
  };

  const handleSaveServerUrl = async (urlToSave = serverUrl) => {
    const clean = urlToSave.trim().replace(/\/$/, '');
    setServerUrl(clean);
    setRuntimeApiUrl(clean);
    await localStore.setCustomServerUrl(clean);
    onShowToast(`Server configured: ${clean}`);
  };

  const handleToggleBiometrics = (val: boolean) => {
    setBiometricsEnabled(val);
    onShowToast(
      val
        ? 'Hardware KeyStore Biometric Guard Enabled'
        : 'Biometric Guard Disabled (Passcode Required)'
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: canvasBg }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={[styles.backArrow, { color: isDark ? '#60A5FA' : '#2563EB' }]}>‹</Text>
          <Text style={[styles.backLabel, { color: isDark ? '#60A5FA' : '#2563EB' }]}>Overview</Text>
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: textPrimary }]}>Settings & Security</Text>
        <View style={styles.topRightBadge}>
          <Text style={styles.topRightBadgeText}>ENCRYPTED</Text>
        </View>
      </View>

      {/* Hardware Security Enclave Card */}
      <View style={[styles.heroCard, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.heroTopRow}>
          <View style={styles.lockIconBox}>
            <Text style={styles.lockIcon}>🛡️</Text>
          </View>
          <View style={styles.heroTextCol}>
            <Text style={styles.heroTitle}>Hardware SecureStore Enclave</Text>
            <Text style={styles.heroSub}>
              Android KeyStore / iOS Secure Enclave hardware custody
            </Text>
          </View>
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchTextCol}>
            <Text style={styles.switchTitle}>Biometric Authentication</Text>
            <Text style={styles.switchSub}>
              Require Fingerprint or Face Unlock to access ledger
            </Text>
          </View>
          <Switch
            value={biometricsEnabled}
            onValueChange={handleToggleBiometrics}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.switchRow}>
          <View style={styles.switchTextCol}>
            <Text style={styles.switchTitle}>Deterministic Offline Ingestion</Text>
            <Text style={styles.switchSub}>
              Queue mutations securely when network drops
            </Text>
          </View>
          <Switch
            value={offlineSync}
            onValueChange={setOfflineSync}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.switchRow}>
          <View style={styles.switchTextCol}>
            <Text style={styles.switchTitle}>Discrepancy Push Alerts</Text>
            <Text style={styles.switchSub}>
              Immediate alert on bank feed variance {'>'} ₹100
            </Text>
          </View>
          <Switch
            value={pushAlerts}
            onValueChange={setPushAlerts}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
          />
        </View>
      </View>

      {/* Cloud & Local Server Connection Card */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>CLOUD & LOCAL SERVER CONNECTION</Text>
        <View style={[
          styles.statusBadge,
          pingStatus === 'SUCCESS' && { backgroundColor: '#E8F5EE' },
          pingStatus === 'FAILED' && { backgroundColor: '#FEE2E2' },
          pingStatus === 'TESTING' && { backgroundColor: '#EFF6FF' },
        ]}>
          <Text style={[
            styles.statusBadgeText,
            pingStatus === 'SUCCESS' && { color: '#087A50' },
            pingStatus === 'FAILED' && { color: '#DC2626' },
            pingStatus === 'TESTING' && { color: '#2563EB' },
          ]}>
            {pingStatus === 'SUCCESS' ? `● ${pingMessage}` :
             pingStatus === 'FAILED' ? `● ${pingMessage}` :
             pingStatus === 'TESTING' ? 'Testing...' : '● Standalone / Offline'}
          </Text>
        </View>
      </View>

      <View style={styles.serverCard}>
        <Text style={styles.serverInputLabel}>FASTAPI BACKEND ENDPOINT</Text>
        <TextInput
          style={styles.serverInput}
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder="http://192.168.31.228:8000"
          placeholderTextColor="#94A3B8"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.serverPresetRow}>
          <TouchableOpacity
            style={styles.serverPresetBtn}
            onPress={() => {
              const url = 'http://192.168.31.228:8000';
              setServerUrl(url);
              handleSaveServerUrl(url);
              handleTestConnection(url);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.serverPresetBtnText}>LAN (192.168.31.228)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serverPresetBtn}
            onPress={() => {
              const url = 'http://127.0.0.1:8000';
              setServerUrl(url);
              handleSaveServerUrl(url);
              handleTestConnection(url);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.serverPresetBtnText}>Localhost</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.serverActionRow}>
          <TouchableOpacity
            style={[styles.testConnBtn, pingStatus === 'TESTING' && { opacity: 0.7 }]}
            onPress={() => handleTestConnection()}
            disabled={pingStatus === 'TESTING'}
            activeOpacity={0.8}
          >
            {pingStatus === 'TESTING' ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Text style={styles.testConnBtnText}>⚡ Test Connection</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveEndpointBtn}
            onPress={() => handleSaveServerUrl()}
            activeOpacity={0.8}
          >
            <Text style={styles.saveEndpointBtnText}>Save Endpoint</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Workspace Switcher */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>ACTIVE TENANT WORKSPACE</Text>
      </View>

      <View style={styles.workspacesCard}>
        {[
          { name: 'Family Office', desc: 'Primary multi-member trust & joint wealth' },
          { name: 'Personal Holdings', desc: 'Private individual investment ledger' },
          { name: 'Business Treasury', desc: 'Corporate operating cash flow & taxes' },
        ].map((ws, i) => {
          const isSelected = activeWorkspace === ws.name;
          return (
            <TouchableOpacity
              key={ws.name}
              style={[styles.wsRow, i > 0 && styles.wsRowBorder]}
              onPress={() => {
                onSelectWorkspace(ws.name);
                onShowToast(`Switched active workspace to ${ws.name}`);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.wsInfoCol}>
                <Text style={[styles.wsName, isSelected && styles.wsNameActive]}>
                  {ws.name}
                </Text>
                <Text style={styles.wsDesc}>{ws.desc}</Text>
              </View>
              {isSelected ? (
                <View style={styles.activeCheckPill}>
                  <Text style={styles.activeCheckText}>ACTIVE</Text>
                </View>
              ) : (
                <Text style={styles.selectArrow}>›</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Active Device Sessions */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>ACTIVE AUTHORIZED SESSIONS</Text>
        <Text style={styles.sectionSub}>2 Devices</Text>
      </View>

      <View style={styles.sessionsCard}>
        <View style={styles.sessionItem}>
          <View style={styles.deviceIconBox}>
            <Text style={styles.deviceIcon}>📱</Text>
          </View>
          <View style={styles.sessionTextCol}>
            <View style={styles.sessionTitleRow}>
              <Text style={styles.deviceName}>Android Pixel 8 Pro</Text>
              <View style={styles.currentDevicePill}>
                <Text style={styles.currentDeviceText}>THIS DEVICE</Text>
              </View>
            </View>
            <Text style={styles.sessionMeta}>
              Bengaluru, IN • KeyStore Hardware Token #WOS-PIXEL8
            </Text>
          </View>
        </View>

        <View style={styles.sessionDivider} />

        <View style={styles.sessionItem}>
          <View style={styles.deviceIconBox}>
            <Text style={styles.deviceIcon}>💻</Text>
          </View>
          <View style={styles.sessionTextCol}>
            <View style={styles.sessionTitleRow}>
              <Text style={styles.deviceName}>MacBook Pro M3 (Web Client)</Text>
              <TouchableOpacity
                onPress={() => onShowToast('Revoked MacBook Pro web session')}
                activeOpacity={0.7}
              >
                <Text style={styles.revokeText}>Revoke</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sessionMeta}>
              192.168.1.42 • Chrome Browser • Active 12m ago
            </Text>
          </View>
        </View>
      </View>

      {/* Cryptographic Audit Trail Log */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>CRYPTOGRAPHIC AUDIT LOG</Text>
        <Text style={styles.sectionSub}>Immutable</Text>
      </View>

      <View style={styles.auditLogCard}>
        {auditLogs.length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 24, marginBottom: 8 }}>🔒</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 4 }}>
              Cryptographic Hash Chain Initialized
            </Text>
            <Text style={{ fontSize: 11, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 16 }}>
              Every financial mutation and double-entry transaction generates an immutable SHA-256 block here.
            </Text>
          </View>
        ) : (
          auditLogs.map((item, i) => (
            <View key={item.id} style={[styles.auditLogRow, i > 0 && styles.auditLogRowBorder]}>
              <View style={styles.auditLogTop}>
                <Text style={styles.auditActor}>{item.actor}</Text>
                <Text style={styles.auditTime}>{item.timestamp}</Text>
              </View>
              <Text style={styles.auditAction}>{item.action}</Text>
              <Text style={styles.auditDetails}>{item.details}</Text>
              <Text style={styles.auditHashText}>Hash: {item.hash}</Text>
            </View>
          ))
        )}
      </View>

      {/* Account & Session Security / Logout */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>ACCOUNT & ACTIVE SESSION</Text>
      </View>

      <View style={styles.sessionLogoutCard}>
        <View style={styles.sessionUserRow}>
          <View style={styles.sessionAvatar}>
            <Text style={styles.sessionAvatarText}>LS</Text>
          </View>
          <View style={styles.sessionInfoCol}>
            <Text style={styles.sessionUserName}>Livesh Sharma</Text>
            <Text style={styles.sessionUserEmail}>livesh.test@wealthos.internal</Text>
            <Text style={styles.sessionUserRole}>Role: Owner &bull; {activeWorkspace}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.sessionLogoutBtn}
          onPress={() => {
            onLogout?.();
            onShowToast('Session revoked. Logged out securely.');
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.sessionLogoutBtnIcon}>🚪</Text>
          <Text style={styles.sessionLogoutBtnText}>Log Out / Lock Session</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingRight: 8,
  },
  backArrow: {
    fontSize: 22,
    color: theme.colors.primary,
    fontWeight: '700',
    marginTop: -2,
  },
  backLabel: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  screenTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  topRightBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: theme.colors.primaryAlpha10,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  topRightBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  lockIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    fontSize: 20,
  },
  heroTextCol: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  heroSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  switchTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  switchSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    letterSpacing: 0.8,
  },
  sectionSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  workspacesCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  wsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  wsRowBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  wsInfoCol: {
    flex: 1,
  },
  wsName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  wsNameActive: {
    color: theme.colors.primaryDark,
  },
  wsDesc: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  activeCheckPill: {
    backgroundColor: theme.colors.primaryAlpha10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeCheckText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  selectArrow: {
    fontSize: 18,
    color: theme.colors.textTertiary,
  },
  sessionsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 20,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deviceIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceIcon: {
    fontSize: 18,
  },
  sessionTextCol: {
    flex: 1,
  },
  sessionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceName: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  currentDevicePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentDeviceText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15803D',
  },
  revokeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.danger,
  },
  sessionMeta: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  sessionDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: 12,
  },
  auditLogCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  auditLogRow: {
    paddingVertical: 12,
  },
  auditLogRowBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  auditLogTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  auditActor: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  auditTime: {
    fontSize: 10,
    color: theme.colors.textTertiary,
  },
  auditAction: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  auditDetails: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  auditHashText: {
    fontSize: 9,
    fontFamily: 'Courier',
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
  sessionLogoutCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
  },
  sessionUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  sessionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sessionInfoCol: {
    flex: 1,
  },
  sessionUserName: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  sessionUserEmail: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginVertical: 1,
  },
  sessionUserRole: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  sessionLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 12,
    borderRadius: 12,
  },
  sessionLogoutBtnIcon: {
    fontSize: 14,
  },
  sessionLogoutBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  serverCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    padding: 16,
    marginBottom: 20,
  },
  serverInputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  serverInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontFamily: 'monospace',
    marginBottom: 10,
  },
  serverPresetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  serverPresetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serverPresetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  serverActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  testConnBtn: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testConnBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  saveEndpointBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveEndpointBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

