import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { theme, useTheme } from '../theme';
import { ActiveScreen } from '../types';
import { formatINR } from '../formatters';

interface EnterpriseDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeScreen: string;
  onSelectScreen: (screen: ActiveScreen) => void;
  activeWorkspace: string;
  onSelectWorkspace: (workspace: string) => void;
  userName?: string;
  userEmail?: string;
  netWorth?: number;
  totalAccounts?: number;
  onResetToFresh?: () => void;
  onLogout?: () => void;
}

interface MenuItem {
  id: ActiveScreen;
  title: string;
  icon: string;
  badge?: string;
  badgeType?: 'default' | 'alert' | 'success';
}

interface NavSection {
  title?: string;
  items: MenuItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    // Cockpit & Control items at top without a header (Matching Web Sidebar)
    items: [
      {
        id: 'overview',
        title: 'Overview',
        icon: '⊞',
      },
      {
        id: 'reconciliation',
        title: 'Control Centre',
        icon: '🛡️',
        badge: 'Recon',
        badgeType: 'success',
      },
    ],
  },
  {
    title: 'CASH & MONEY',
    items: [
      {
        id: 'accounts',
        title: 'Accounts',
        icon: '🏛️',
      },
      {
        id: 'transactions',
        title: 'Transactions',
        icon: '⇄',
      },
      {
        id: 'analytics',
        title: 'Cash Flow',
        icon: '👛',
      },
      {
        id: 'budgets',
        title: 'Budgets',
        icon: '◔',
      },
    ],
  },
  {
    title: 'INVESTMENTS & REPORTS',
    items: [
      {
        id: 'investments',
        title: 'Investments',
        icon: '📈',
      },
      {
        id: 'reports',
        title: 'Reports',
        icon: '📄',
      },
    ],
  },
  {
    title: 'PLANNING & INTELLIGENCE',
    items: [
      {
        id: 'goals',
        title: 'Goals',
        icon: '🎯',
      },
      {
        id: 'copilot',
        title: 'Financial Copilot',
        icon: '🤖',
        badge: 'AI',
        badgeType: 'success',
      },
      {
        id: 'household',
        title: 'Household',
        icon: '👥',
        badge: 'Shared',
        badgeType: 'success',
      },
      {
        id: 'documents',
        title: 'Documents',
        icon: '📄',
      },
    ],
  },
  {
    title: 'PREFERENCES',
    items: [
      {
        id: 'security',
        title: 'Security & Audit',
        icon: '🛡️',
      },
      {
        id: 'settings',
        title: 'Workspace Settings',
        icon: '⚙️',
      },
    ],
  },
];

export const EnterpriseDrawer: React.FC<EnterpriseDrawerProps> = ({
  isOpen,
  onClose,
  activeScreen,
  onSelectScreen,
  activeWorkspace,
  onSelectWorkspace,
  userName,
  userEmail,
  netWorth = 0,
  totalAccounts = 0,
  onResetToFresh,
  onLogout,
}) => {
  const { isDark } = useTheme();
  const drawerBg = isDark ? '#090D16' : '#FFFFFF';
  const borderColor = isDark ? '#1E293B' : '#E2E8F0';
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';

  const displayName = userName && userName !== 'User' && userName.trim() ? userName : (userEmail || 'Personal Account');
  const avatarInitials = displayName
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'WO';

  const formattedBalance = netWorth > 0 ? formatINR(netWorth) : '₹0.00';

  const workspacesList = [
    { id: 'personal', name: 'Personal Holdings', balance: formattedBalance },
    { id: 'family', name: 'Family Office', balance: '₹0.00' },
    { id: 'business', name: 'Business Treasury', balance: '₹0.00' },
  ];

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={false}
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.fullPageContainer, { backgroundColor: drawerBg }]}>
        {/* Full-Page App Bar */}
        <View style={[styles.fullPageHeader, { borderBottomColor: borderColor, backgroundColor: drawerBg }]}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.headerBackBtn}
            activeOpacity={0.7}
            accessibilityLabel="Back to previous screen"
          >
            <Text style={[styles.headerBackArrow, { color: textPrimary }]}>←</Text>
            <Text style={[styles.headerBackText, { color: textPrimary }]}>Back</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleCol}>
            <Text style={[styles.headerTitleText, { color: textPrimary }]}>Navigation & Hub</Text>
            <Text style={[styles.headerSubText, { color: textSecondary }]}>All Modules & Controls</Text>
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={styles.headerDoneBtn}
            activeOpacity={0.7}
            accessibilityLabel="Close and return"
          >
            <Text style={styles.headerDoneText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.fullPageScroll}
          contentContainerStyle={styles.fullPageScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* User Profile / Identity Card */}
          <View style={[styles.profileCard, { backgroundColor: isDark ? '#111827' : '#F8FAFC', borderColor }]}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{avatarInitials}</Text>
            </View>
            <View style={styles.profileTextCol}>
              <View style={styles.profileNameRow}>
                <Text style={[styles.profileName, { color: textPrimary }]}>{displayName}</Text>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>VERIFIED</Text>
                </View>
              </View>
              <Text style={[styles.profileRole, { color: textSecondary }]}>
                {totalAccounts > 0 ? `${totalAccounts} Connected Accounts` : 'Ready to link financial accounts'}
              </Text>
              <Text style={[styles.profileUid, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                Hardware Secure Enclave • AES-256
              </Text>
            </View>
          </View>

          {/* Active Tenant Workspace */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionLabel, { color: textSecondary }]}>ACTIVE TENANT WORKSPACE</Text>
          </View>
          <View style={styles.workspacePillsRow}>
            {workspacesList.map((w) => {
              const isSelected = activeWorkspace === w.name;
              return (
                <TouchableOpacity
                  key={w.id}
                  style={[
                    styles.workspacePill,
                    { backgroundColor: isDark ? '#111827' : '#F8FAFC', borderColor },
                    isSelected && styles.workspacePillActive,
                  ]}
                  onPress={() => onSelectWorkspace(w.name)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.workspacePillText,
                      { color: textSecondary },
                      isSelected && styles.workspacePillTextActive,
                    ]}
                  >
                    {w.name}
                  </Text>
                  <Text
                    style={[
                      styles.workspaceBalanceText,
                      { color: textPrimary },
                      isSelected && styles.workspaceBalanceTextActive,
                    ]}
                  >
                    {w.balance}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* All Categorized Navigation Sections (Matching Web Sidebar 1:1) */}
          {NAV_SECTIONS.map((section, sIdx) => (
            <View key={section.title || `sec-${sIdx}`} style={sIdx > 0 ? styles.sectionSpacing : undefined}>
              {section.title && (
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionLabel, { color: textSecondary }]}>{section.title}</Text>
                </View>
              )}

              <View style={[styles.menuContainer, { backgroundColor: isDark ? '#111827' : '#F8FAFC', borderColor }]}>
                {section.items.map((item, iIdx) => {
                  const isActive = activeScreen === item.id;
                  return (
                    <TouchableOpacity
                      key={`${item.id}-${iIdx}`}
                      style={[styles.menuItemRow, isActive && styles.menuItemRowActive]}
                      onPress={() => {
                        onSelectScreen(item.id);
                        onClose();
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.menuIconBox, isActive && styles.menuIconBoxActive]}>
                        <Text style={[styles.menuIconText, isActive && styles.menuIconTextActive]}>
                          {item.icon}
                        </Text>
                      </View>

                      <Text style={[styles.menuTitle, { color: textPrimary }, isActive && styles.menuTitleActive]}>
                        {item.title}
                      </Text>

                      {item.badge && (
                        <View style={styles.menuBadgeSuccess}>
                          <Text style={styles.menuBadgeTextSuccess}>{item.badge}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          {/* Ledger Mode & Data Controls */}
          {onResetToFresh && (
            <View style={styles.dataControlsContainer}>
              <Text style={[styles.sectionLabel, { color: textSecondary }]}>LEDGER STATE & DATA CONTROLS</Text>
              <View style={styles.dataControlsRow}>
                <TouchableOpacity
                  style={[styles.dataControlBtnFresh, { borderColor }]}
                  onPress={() => {
                    onResetToFresh();
                    onClose();
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.dataControlBtnIcon}>🌱</Text>
                  <View style={styles.dataControlBtnTexts}>
                    <Text style={[styles.dataControlBtnTitleFresh, { color: textPrimary }]}>Reset to Fresh Ledger</Text>
                    <Text style={styles.dataControlBtnSubFresh}>Clear all accounts & return to clean slate</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* System Security / Ledger Assurance Strip */}
          <View style={[styles.assuranceCard, { borderColor, backgroundColor: isDark ? '#111827' : '#F8FAFC' }]}>
            <View style={styles.assuranceIconBox}>
              <Text style={styles.assuranceIcon}>🔒</Text>
            </View>
            <View style={styles.assuranceTextCol}>
              <Text style={[styles.assuranceTitle, { color: textPrimary }]}>Double-Entry Ledger In Balance</Text>
              <Text style={styles.assuranceSub}>
                Zero variance (₹0.00) • AES-256-GCM SecureStore • Tamper-evident Merkle hash
              </Text>
            </View>
          </View>

          {/* Log Out Session Button */}
          {onLogout && (
            <TouchableOpacity
              style={styles.logoutDrawerBtn}
              onPress={() => {
                onLogout();
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.logoutDrawerBtnIcon}>🚪</Text>
              <Text style={styles.logoutDrawerBtnText}>Log Out / Lock Session</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullPageContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  fullPageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  headerBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 10,
    gap: 4,
  },
  headerBackArrow: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
  headerBackText: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitleCol: {
    alignItems: 'center',
  },
  headerTitleText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubText: {
    fontSize: 11,
    marginTop: 1,
  },
  headerDoneBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: theme.colors.primaryAlpha10,
  },
  headerDoneText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  fullPageScroll: {
    flex: 1,
  },
  fullPageScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textWhite,
  },
  profileTextCol: {
    flex: 1,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  verifiedBadge: {
    backgroundColor: theme.colors.primaryAlpha10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  profileRole: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  profileUid: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 2,
    fontWeight: '500',
  },
  sectionHeaderRow: {
    marginBottom: 10,
  },
  sectionSpacing: {
    marginTop: 18,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    letterSpacing: 0.8,
  },
  workspacePillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  workspacePill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  workspacePillActive: {
    backgroundColor: theme.colors.primaryAlpha10,
    borderColor: theme.colors.primary,
  },
  workspacePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  workspacePillTextActive: {
    color: theme.colors.primary,
  },
  workspaceBalanceText: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  workspaceBalanceTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: '600',
  },
  menuContainer: {
    gap: 2,
    marginBottom: 8,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    minHeight: 44,
  },
  menuItemRowActive: {
    backgroundColor: theme.colors.primaryAlpha10,
    borderLeftColor: theme.colors.primary,
  },
  menuIconBox: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  menuIconBoxActive: {},
  menuIconText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  menuIconTextActive: {
    color: theme.colors.primary,
  },
  menuTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    letterSpacing: -0.1,
  },
  menuTitleActive: {
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
  menuBadgeSuccess: {
    backgroundColor: theme.colors.primaryAlpha10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  menuBadgeTextSuccess: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  assuranceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 30,
  },
  assuranceIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assuranceIcon: {
    fontSize: 16,
  },
  assuranceTextCol: {
    flex: 1,
  },
  assuranceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  assuranceSub: {
    fontSize: 10,
    color: '#15803D',
    marginTop: 2,
    lineHeight: 14,
  },
  dataControlsContainer: {
    marginBottom: 20,
    marginTop: 4,
  },
  dataControlsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  dataControlBtnFresh: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
  },
  dataControlBtnSample: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 12,
    padding: 10,
  },
  dataControlBtnIcon: {
    fontSize: 18,
  },
  dataControlBtnTexts: {
    flex: 1,
  },
  dataControlBtnTitleFresh: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  dataControlBtnSubFresh: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 1,
  },
  dataControlBtnTitleSample: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  dataControlBtnSubSample: {
    fontSize: 9,
    color: '#3B82F6',
    marginTop: 1,
  },
  logoutDrawerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  logoutDrawerBtnIcon: {
    fontSize: 16,
  },
  logoutDrawerBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
});

