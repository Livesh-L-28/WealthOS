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
import { theme } from '../theme';
import { ActiveScreen } from '../types';

interface EnterpriseDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeScreen: string;
  onSelectScreen: (screen: ActiveScreen) => void;
  activeWorkspace: string;
  onSelectWorkspace: (workspace: string) => void;
}

interface MenuItem {
  id: ActiveScreen;
  title: string;
  subtitle: string;
  icon: string;
  badge?: string;
  badgeType?: 'default' | 'alert' | 'success';
}

interface NavSection {
  title: string;
  items: MenuItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'COCKPIT & CONTROL',
    items: [
      {
        id: 'overview',
        title: 'Overview',
        subtitle: 'Executive cockpit & net worth trajectory',
        icon: '📊',
      },
      {
        id: 'reconciliation',
        title: 'Control Centre',
        subtitle: 'Double-entry settlement & ledger audit',
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
        subtitle: '6 Connected institutions & live balances',
        icon: '🏛️',
      },
      {
        id: 'transactions',
        title: 'Transactions',
        subtitle: 'Reconciled double-entry general journal',
        icon: '⇄',
      },
      {
        id: 'transfers',
        title: 'Transfers',
        subtitle: 'Balanced account-to-account treasury transfer',
        icon: '↔️',
      },
      {
        id: 'analytics',
        title: 'Cash Flow',
        subtitle: '50/30/20 burn rate & monthly surplus',
        icon: '👛',
      },
      {
        id: 'budgets',
        title: 'Budgets',
        subtitle: 'Category spending envelopes & daily caps',
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
        subtitle: 'Multi-asset portfolio & allocation lots',
        icon: '📈',
      },
      {
        id: 'dividends',
        title: 'Dividends & Yield',
        subtitle: 'Passive cash flow & payout calendar',
        icon: '💰',
      },
      {
        id: 'reports',
        title: 'Reports',
        subtitle: 'Balance sheet, assets vs liabilities & P&L',
        icon: '📄',
        badge: '₹75.38L',
        badgeType: 'success',
      },
    ],
  },
  {
    title: 'PLANNING & INTELLIGENCE',
    items: [
      {
        id: 'goals',
        title: 'Goals',
        subtitle: 'Strategic milestone trackers & projections',
        icon: '🎯',
      },
      {
        id: 'calendar',
        title: 'Financial Calendar',
        subtitle: 'Upcoming obligations, EMIs, SIPs & salary',
        icon: '📅',
      },
      {
        id: 'liabilities',
        title: 'Liabilities & EMIs',
        subtitle: 'Debt snowball / avalanche payoff simulator',
        icon: '💳',
      },
      {
        id: 'copilot',
        title: 'Financial Copilot',
        subtitle: 'Autonomous advisory & scenario simulation',
        icon: '✨',
        badge: 'AI',
        badgeType: 'success',
      },
      {
        id: 'household',
        title: 'Household',
        subtitle: 'Multi-member envelopes & family wealth',
        icon: '👥',
        badge: 'Shared',
        badgeType: 'success',
      },
      {
        id: 'documents',
        title: 'Documents',
        subtitle: 'Statement OCR parser & audit vault',
        icon: '📁',
        badge: '3 Stmts',
      },
    ],
  },
  {
    title: 'PREFERENCES',
    items: [
      {
        id: 'search',
        title: 'Global Search',
        subtitle: 'Instant query across transactions, accounts & lots',
        icon: '🔍',
      },
      {
        id: 'security',
        title: 'Security & Audit',
        subtitle: 'Hardware Enclave & immutable audit trails',
        icon: '🔒',
        badge: 'KeyStore',
        badgeType: 'success',
      },
      {
        id: 'settings',
        title: 'Workspace Settings',
        subtitle: 'Tenant configuration & entity switching',
        icon: '⚙️',
      },
    ],
  },
];

const WORKSPACES = [
  { id: 'family', name: 'Family Office', balance: '₹75,37,901' },
  { id: 'personal', name: 'Personal Holdings', balance: '₹42,15,000' },
  { id: 'business', name: 'Business Treasury', balance: '₹1.20 Cr' },
];

export const EnterpriseDrawer: React.FC<EnterpriseDrawerProps> = ({
  isOpen,
  onClose,
  activeScreen,
  onSelectScreen,
  activeWorkspace,
  onSelectWorkspace,
}) => {
  return (
    <Modal visible={isOpen} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <SafeAreaView style={styles.drawerContainer}>
          {/* Header Drag Pill & Close Button */}
          <View style={styles.drawerTopBar}>
            <View style={styles.dragPill} />
            <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.drawerScroll} showsVerticalScrollIndicator={false}>
            {/* User Profile / Identity Card */}
            <View style={styles.profileCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>LJ</Text>
              </View>
              <View style={styles.profileTextCol}>
                <View style={styles.profileNameRow}>
                  <Text style={styles.profileName}>Livesh J</Text>
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>EXECUTIVE</Text>
                  </View>
                </View>
                <Text style={styles.profileRole}>Principal Family Wealth Architect</Text>
                <Text style={styles.profileUid}>ID: #WOS-8942 • Hardware Enclave</Text>
              </View>
            </View>

            {/* Workspace Selector */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>ACTIVE TENANT WORKSPACE</Text>
            </View>
            <View style={styles.workspacePillsRow}>
              {WORKSPACES.map((w) => {
                const isSelected = activeWorkspace === w.name;
                return (
                  <TouchableOpacity
                    key={w.id}
                    style={[styles.workspacePill, isSelected && styles.workspacePillActive]}
                    onPress={() => onSelectWorkspace(w.name)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.workspacePillText,
                        isSelected && styles.workspacePillTextActive,
                      ]}
                    >
                      {w.name}
                    </Text>
                    <Text
                      style={[
                        styles.workspaceBalanceText,
                        isSelected && styles.workspaceBalanceTextActive,
                      ]}
                    >
                      {w.balance}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* All Categorized Navigation Sections (Matching Web Sidebar) */}
            {NAV_SECTIONS.map((section, sIdx) => (
              <View key={section.title} style={sIdx > 0 ? styles.sectionSpacing : undefined}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionLabel}>{section.title}</Text>
                </View>

                <View style={styles.menuContainer}>
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
                        <View style={styles.menuIconBox}>
                          <Text style={styles.menuIconText}>{item.icon}</Text>
                        </View>

                        <View style={styles.menuContentCol}>
                          <View style={styles.menuTitleRow}>
                            <Text style={[styles.menuTitle, isActive && styles.menuTitleActive]}>
                              {item.title}
                            </Text>
                            {item.badge && (
                              <View
                                style={[
                                  styles.menuBadge,
                                  item.badgeType === 'alert' && styles.menuBadgeAlert,
                                  item.badgeType === 'success' && styles.menuBadgeSuccess,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.menuBadgeText,
                                    item.badgeType === 'alert' && styles.menuBadgeTextAlert,
                                    item.badgeType === 'success' && styles.menuBadgeTextSuccess,
                                  ]}
                                >
                                  {item.badge}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                        </View>

                        <Text style={styles.menuChevron}>›</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            {/* System Security / Ledger Assurance Strip */}
            <View style={styles.assuranceCard}>
              <View style={styles.assuranceIconBox}>
                <Text style={styles.assuranceIcon}>🔒</Text>
              </View>
              <View style={styles.assuranceTextCol}>
                <Text style={styles.assuranceTitle}>Double-Entry Ledger In Balance</Text>
                <Text style={styles.assuranceSub}>
                  Zero variance (₹0.00) • AES-256-GCM SecureStore • Tamper-evident Merkle hash
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 20, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  drawerContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  drawerTopBar: {
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  dragPill: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '700',
  },
  drawerScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
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
    gap: 10,
    marginBottom: 20,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  menuItemRowActive: {
    backgroundColor: theme.colors.primaryAlpha10,
    borderColor: theme.colors.primary,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconText: {
    fontSize: 18,
  },
  menuContentCol: {
    flex: 1,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  menuTitleActive: {
    color: theme.colors.primaryDark,
  },
  menuSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  menuBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  menuBadgeAlert: {
    backgroundColor: theme.colors.dangerAlpha10,
    borderColor: theme.colors.danger,
  },
  menuBadgeSuccess: {
    backgroundColor: theme.colors.primaryAlpha10,
    borderColor: theme.colors.primary,
  },
  menuBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  menuBadgeTextAlert: {
    color: theme.colors.danger,
  },
  menuBadgeTextSuccess: {
    color: theme.colors.primary,
  },
  menuChevron: {
    fontSize: 18,
    color: theme.colors.textTertiary,
    fontWeight: '600',
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
});

