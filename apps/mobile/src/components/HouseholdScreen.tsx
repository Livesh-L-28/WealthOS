import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { theme, useTheme } from '../theme';
import { formatINR } from '../formatters';
import { householdService } from '../api/domainServices';
import { HouseholdMember } from '../types';

interface HouseholdScreenProps {
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

export const HouseholdScreen: React.FC<HouseholdScreenProps> = ({
  onBack,
  onShowToast,
}) => {
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadHousehold() {
      setIsLoading(true);
      try {
        const liveMembers = await householdService.fetchHouseholdNetWorth();
        if (isMounted && liveMembers && liveMembers.length > 0) {
          setMembers(liveMembers);
        }
      } catch {
        // Fallback
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadHousehold();
    return () => { isMounted = false; };
  }, []);

  const { isDark } = useTheme();
  const cardBg = isDark ? '#111827' : '#FFFFFF';
  const borderColor = isDark ? '#1F2937' : '#E2E8F0';
  const canvasBg = isDark ? '#0B0F19' : '#F8FAFC';
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';

  const totalJointWealth = members.reduce(
    (sum, m) => sum + (m.sharedAssets - m.sharedLiabilities),
    0
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: canvasBg }]} showsVerticalScrollIndicator={false}>
      {/* Top Bar */}
      <View style={[styles.topBar, { borderBottomColor: borderColor }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={[styles.backArrow, { color: textSecondary }]}>‹</Text>
          <Text style={[styles.backLabel, { color: textSecondary }]}>Overview</Text>
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: textPrimary }]}>Household & Shared Wealth</Text>
        <View style={styles.topRightBadge}>
          <Text style={styles.topRightBadgeText}>JOINT</Text>
        </View>
      </View>

      {/* Joint Wealth Hero Card */}
      <View style={[styles.heroCard, { backgroundColor: cardBg, borderColor }]}>
        <Text style={styles.heroEyebrow}>COMBINED HOUSEHOLD NET WEALTH</Text>
        <Text style={styles.heroValue}>{formatINR(totalJointWealth)}</Text>
        <Text style={styles.heroSubtext}>
          {members.length === 0
            ? 'Unified multi-entity ledger for your family & shared wealth'
            : `Unified multi-entity ledger across ${members.length} family members`}
        </Text>

        <View style={styles.quickStatsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Active Members</Text>
            <Text style={styles.statValue}>{members.length} Persons</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Shared Envelopes</Text>
            <Text style={styles.statValue}>{members.length === 0 ? '0 Envelopes' : '4 Joint Budgets'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Access Level</Text>
            <Text style={styles.statValueGreen}>Role-Based</Text>
          </View>
        </View>
      </View>

      {/* Member Roster */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>HOUSEHOLD MEMBER ROSTER</Text>
        <TouchableOpacity
          onPress={() => onShowToast('Invite link generated for family member')}
          activeOpacity={0.7}
        >
          <Text style={styles.inviteLink}>+ Invite Member</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.membersList}>
        {members.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>👨‍👩‍👧</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 6 }}>
              No Household Members Added
            </Text>
            <Text style={{ fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 16 }}>
              Invite family members or business co-owners to view consolidated family office net worth with strict role-based data partitioning.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}
              onPress={() => onShowToast('Invite link generated for family member')}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>+ Invite First Member</Text>
            </TouchableOpacity>
          </View>
        ) : (
          members.map((m) => (
          <View key={m.id} style={[styles.memberCard, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.memberTopRow}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>
                  {m.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </Text>
              </View>
              <View style={styles.memberInfoCol}>
                <View style={styles.memberNameRow}>
                  <Text style={styles.memberName}>{m.name}</Text>
                  <View
                    style={[
                      styles.rolePill,
                      m.role === 'OWNER' && styles.roleOwner,
                      m.role === 'ADMIN' && styles.roleAdmin,
                      m.role === 'VIEWER' && styles.roleViewer,
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleText,
                        m.role === 'OWNER' && styles.roleTextOwner,
                        m.role === 'ADMIN' && styles.roleTextAdmin,
                        m.role === 'VIEWER' && styles.roleTextViewer,
                      ]}
                    >
                      {m.role}
                    </Text>
                  </View>
                </View>
                <Text style={styles.contributionText}>
                  Net Contribution: {m.netContributionPercentage}% of joint flows
                </Text>
              </View>
            </View>

            <View style={styles.memberMetricsRow}>
              <View style={styles.memberMetricCol}>
                <Text style={styles.memberMetricLabel}>Shared Assets</Text>
                <Text style={styles.memberMetricAsset}>{formatINR(m.sharedAssets)}</Text>
              </View>
              <View style={styles.memberMetricDivider} />
              <View style={styles.memberMetricCol}>
                <Text style={styles.memberMetricLabel}>Shared Liabilities</Text>
                <Text style={styles.memberMetricDebt}>{formatINR(m.sharedLiabilities)}</Text>
              </View>
              <View style={styles.memberMetricDivider} />
              <View style={styles.memberMetricCol}>
                <Text style={styles.memberMetricLabel}>Net Capital</Text>
                <Text style={styles.memberMetricNet}>
                  {formatINR(m.sharedAssets - m.sharedLiabilities)}
                </Text>
              </View>
            </View>
          </View>
        )))}
      </View>

      {/* Shared Household Envelopes */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>SHARED BUDGET ENVELOPES</Text>
        <Text style={styles.sectionCount}>Joint Commitments</Text>
      </View>

      <View style={[styles.envelopesCard, { backgroundColor: cardBg, borderColor }]}>
        {members.length === 0 ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 26, marginBottom: 6 }}>🎯</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary, marginBottom: 4 }}>No Shared Budgets Configured</Text>
            <Text style={{ fontSize: 12, color: textSecondary, textAlign: 'center' }}>
              Create joint household envelopes to manage pooled family expenses and goals.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.envelopeItem}>
              <View style={styles.envelopeTopRow}>
                <Text style={styles.envelopeName}>Shared Family Residence & Living</Text>
                <Text style={styles.envelopeAmount}>{formatINR(95000)} / {formatINR(120000)}</Text>
              </View>
              <View style={styles.envelopeTrack}>
                <View style={[styles.envelopeFill, { width: '79%' }]} />
              </View>
              <View style={styles.envelopeSubRow}>
                <Text style={styles.envelopeSub}>79% utilized</Text>
                <Text style={styles.envelopeSurplus}>₹25,000 remaining</Text>
              </View>
            </View>

            <View style={styles.envelopeDivider} />

            <View style={styles.envelopeItem}>
              <View style={styles.envelopeTopRow}>
                <Text style={styles.envelopeName}>Child Higher Education Trust Fund</Text>
                <Text style={styles.envelopeAmount}>{formatINR(45000)} / {formatINR(50000)}</Text>
              </View>
              <View style={styles.envelopeTrack}>
                <View style={[styles.envelopeFillBlue, { width: '90%' }]} />
              </View>
              <View style={styles.envelopeSubRow}>
                <Text style={styles.envelopeSub}>90% funded for month</Text>
                <Text style={styles.envelopeSurplus}>₹5,000 needed</Text>
              </View>
            </View>
          </>
        )}
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
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    letterSpacing: 0.8,
  },
  heroValue: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginVertical: 6,
    letterSpacing: -0.5,
  },
  heroSubtext: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 15,
  },
  quickStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceElevated,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.borderLight,
  },
  statLabel: {
    fontSize: 9,
    color: theme.colors.textTertiary,
    fontWeight: '500',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  statValueGreen: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
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
  sectionCount: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  inviteLink: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  membersList: {
    gap: 12,
    marginBottom: 20,
  },
  memberCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  memberTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryAlpha10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  memberInfoCol: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  rolePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleOwner: {
    backgroundColor: '#DCFCE7',
  },
  roleAdmin: {
    backgroundColor: '#E0E7FF',
  },
  roleViewer: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  roleText: {
    fontSize: 9,
    fontWeight: '700',
  },
  roleTextOwner: {
    color: '#15803D',
  },
  roleTextAdmin: {
    color: '#3730A3',
  },
  roleTextViewer: {
    color: theme.colors.textSecondary,
  },
  contributionText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  memberMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 10,
    padding: 10,
  },
  memberMetricCol: {
    flex: 1,
    alignItems: 'center',
  },
  memberMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.borderLight,
  },
  memberMetricLabel: {
    fontSize: 9,
    color: theme.colors.textTertiary,
    marginBottom: 2,
  },
  memberMetricAsset: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  memberMetricDebt: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.danger,
  },
  memberMetricNet: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  envelopesCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 20,
  },
  envelopeItem: {
    gap: 6,
  },
  envelopeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  envelopeName: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  envelopeAmount: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  envelopeTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceElevated,
    overflow: 'hidden',
  },
  envelopeFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  envelopeFillBlue: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  envelopeSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  envelopeSub: {
    fontSize: 10,
    color: theme.colors.textTertiary,
  },
  envelopeSurplus: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.primaryDark,
  },
  envelopeDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: 14,
  },
});

