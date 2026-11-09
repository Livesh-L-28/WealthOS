import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal } from 'react-native';
import { theme } from '../theme';
import { BudgetEnvelope, FinancialGoal } from '../types';
import { formatINR } from '../formatters';

interface BudgetsScreenProps {
  budgets: BudgetEnvelope[];
  goals: FinancialGoal[];
  onAddTransaction?: () => void;
  onAddEnvelope?: () => void;
  onAddGoal?: () => void;
  initialSubTab?: 'BUDGETS' | 'GOALS' | 'ALL';
}

const CATEGORY_EMOJIS: Record<string, string> = {
  'Housing & EMI': '🏠',
  'Food & Groceries': '🛒',
  'Transportation & Fuel': '⛽',
  'Utilities & Telecom': '⚡',
  'Discretionary & Dining': '🍽️',
  'Investments & SIPs': '📈',
  'Healthcare': '💊',
  'Travel': '✈️',
  'Shopping': '🛍️',
};

const GOAL_EMOJIS: Record<string, string> = {
  'Villa Down Payment Fund': '🏡',
  'Emergency Liquid Reserve': '🛡️',
  'Child Higher Education': '🎓',
  'Retirement Freedom Corpus': '🏖️',
};

export const BudgetsScreen: React.FC<BudgetsScreenProps> = ({
  budgets,
  goals,
  onAddTransaction,
  onAddEnvelope,
  onAddGoal,
  initialSubTab,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'BUDGETS' | 'GOALS' | 'ALL'>(
    initialSubTab || 'ALL'
  );
  const [selectedEnv, setSelectedEnv] = useState<BudgetEnvelope | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null);

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const totalBudgeted = budgets.reduce((s, b) => s + b.budgeted, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const remainingBuffer = totalBudgeted - totalSpent;
  const utilizationPct = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
  const daysRemainingInMonth = 21; // MTD cycle projection
  const safeDailySpend = remainingBuffer > 0 ? Math.round(remainingBuffer / daysRemainingInMonth) : 0;

  return (
    <View style={styles.container}>
      {/* Top Segmented Mode Switcher */}
      <View style={styles.modeTabs}>
        <TouchableOpacity
          style={[styles.modeTab, activeSubTab === 'ALL' && styles.modeTabActive]}
          onPress={() => setActiveSubTab('ALL')}
          activeOpacity={0.7}
        >
          <Text style={[styles.modeTabText, activeSubTab === 'ALL' && styles.modeTabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, activeSubTab === 'BUDGETS' && styles.modeTabActive]}
          onPress={() => setActiveSubTab('BUDGETS')}
          activeOpacity={0.7}
        >
          <Text style={[styles.modeTabText, activeSubTab === 'BUDGETS' && styles.modeTabTextActive]}>
            Envelopes ({budgets.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, activeSubTab === 'GOALS' && styles.modeTabActive]}
          onPress={() => setActiveSubTab('GOALS')}
          activeOpacity={0.7}
        >
          <Text style={[styles.modeTabText, activeSubTab === 'GOALS' && styles.modeTabTextActive]}>
            Goals ({goals.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 1. Monthly Budget Cockpit Utilization Card (Show when ALL or BUDGETS) */}
      {(activeSubTab === 'ALL' || activeSubTab === 'BUDGETS') && (
        <>
          <View style={styles.utilizationCard}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardLabel}>MONTHLY BUDGET UTILIZATION</Text>
            <Text style={styles.cycleSubtext}>Cycle: Nov 01 – Nov 30 (21 days left)</Text>
          </View>
          <View
            style={[
              styles.pctBadge,
              utilizationPct > 95
                ? styles.pctBadgeDanger
                : utilizationPct > 80
                ? styles.pctBadgeWarning
                : styles.pctBadgeNormal,
            ]}
          >
            <Text
              style={[
                styles.pctBadgeText,
                utilizationPct > 95
                  ? styles.pctTextDanger
                  : utilizationPct > 80
                  ? styles.pctTextWarning
                  : styles.pctTextNormal,
              ]}
            >
              {utilizationPct.toFixed(1)}% USED
            </Text>
          </View>
        </View>

        {/* Big Consumed Value */}
        <View style={styles.amountDisplayRow}>
          <Text style={styles.bigSpentVal}>{formatINR(totalSpent)}</Text>
          <Text style={styles.totalBudgetedText}> / {formatINR(totalBudgeted)}</Text>
        </View>

        {/* Dual-Tone Capsule Progress Track */}
        <View style={styles.mainProgressTrack}>
          <View
            style={[
              styles.mainProgressFill,
              {
                width: `${Math.min(100, utilizationPct)}%`,
                backgroundColor:
                  utilizationPct > 95
                    ? '#DC2626'
                    : utilizationPct > 80
                    ? '#F59E0B'
                    : '#16A36A',
              },
            ]}
          />
        </View>

        {/* Safe Remaining Metrics Strip */}
        <View style={styles.safeStrip}>
          <View style={styles.safeStripItem}>
            <Text style={styles.safeStripLabel}>Safe Remaining Spend</Text>
            <Text style={styles.safeStripValue}>
              {formatINR(Math.max(0, remainingBuffer))}
            </Text>
          </View>
          <View style={styles.safeStripDivider} />
          <View style={styles.safeStripItem}>
            <Text style={styles.safeStripLabel}>Recommended Daily Cap</Text>
            <Text style={styles.safeStripDaily}>
              {formatINR(safeDailySpend)} / day
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Monthly Spending Envelopes Section */}
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.sectionHeaderTitle}>MONTHLY SPENDING ENVELOPES</Text>
          <Text style={styles.sectionHeaderSub}>Zero-based envelope accounting with live burn</Text>
        </View>
        <View style={styles.headerButtonsRow}>
          {onAddEnvelope && (
            <TouchableOpacity
              style={styles.addEnvelopeBtn}
              onPress={onAddEnvelope}
              activeOpacity={0.8}
            >
              <Text style={styles.addEnvelopeBtnIcon}>+</Text>
              <Text style={styles.addEnvelopeBtnText}>Budget</Text>
            </TouchableOpacity>
          )}
          {onAddTransaction && (
            <TouchableOpacity
              style={styles.addExpenseBtn}
              onPress={onAddTransaction}
              activeOpacity={0.8}
            >
              <Text style={styles.addExpenseBtnIcon}>+</Text>
              <Text style={styles.addExpenseBtnText}>Expense</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {budgets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🎯</Text>
          <Text style={styles.emptyTitle}>No Budgets Configured</Text>
          <Text style={styles.emptySubtitle}>
            Create category spending envelopes to control monthly burn rate and track remaining buffer.
          </Text>
          {onAddEnvelope && (
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={onAddEnvelope}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyActionBtnText}>+ Create First Budget</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.envelopesList}>
          {budgets.map((env) => {
            const pct = Math.min(100, (env.spent / env.budgeted) * 100);
            const isOver = env.spent >= env.budgeted;
            const isWarning = !isOver && pct >= 85;
            const remaining = Math.max(0, env.budgeted - env.spent);
            const emoji = CATEGORY_EMOJIS[env.category] || '📦';

            return (
              <TouchableOpacity
                key={env.id}
                style={[styles.envelopeCard, isOver && styles.envelopeCardOver]}
                onPress={() => setSelectedEnv(env)}
                activeOpacity={0.8}
              >
                <View style={styles.envelopeTop}>
                  {/* Category Avatar & Title */}
                  <View style={styles.categoryTitleRow}>
                    <View style={[styles.categoryAvatar, { backgroundColor: `${env.color}18` }]}>
                      <Text style={styles.categoryAvatarEmoji}>{emoji}</Text>
                    </View>
                    <View>
                      <Text style={styles.categoryName}>{env.category}</Text>
                      <Text style={styles.envelopeSubtext}>
                        {isOver ? 'Limit reached' : `${formatINR(remaining)} buffer`}
                      </Text>
                    </View>
                  </View>

                  {/* Amounts Ratio */}
                  <View style={styles.ratioCol}>
                    <Text style={styles.envelopeRatio}>
                      {formatINR(env.spent)}
                      <Text style={styles.envelopeAllocated}> / {formatINR(env.budgeted)}</Text>
                    </Text>
                    <View
                      style={[
                        styles.envPctBadge,
                        isOver
                          ? styles.envPctBadgeDanger
                          : isWarning
                          ? styles.envPctBadgeWarning
                          : styles.envPctBadgeNormal,
                      ]}
                    >
                      <Text
                        style={[
                          styles.envPctBadgeText,
                          isOver
                            ? styles.pctTextDanger
                            : isWarning
                            ? styles.pctTextWarning
                            : styles.pctTextNormal,
                        ]}
                      >
                        {pct.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Enhanced Modern Fintech Envelope Progress Bar Capsule */}
                <View style={styles.envelopeProgressTrack}>
                  {/* 80% Caution Threshold Marker */}
                  <View style={[styles.progressTick, { left: '80%' }]} />
                  <View
                    style={[
                      styles.envelopeProgressFill,
                      {
                        width: `${Math.max(4, pct)}%`,
                        backgroundColor: isOver ? '#DC2626' : isWarning ? '#F59E0B' : '#10B981',
                      },
                    ]}
                  >
                    <View style={styles.progressLeadHead} />
                  </View>
                </View>

                {/* Envelope Footer */}
                <View style={styles.envelopeFooter}>
                  <Text style={[styles.envelopeRemText, isOver && styles.envelopeRemTextOver]}>
                    {isOver ? '⚠️ 100% budget consumed' : `${formatINR(remaining)} remaining safe spend`}
                  </Text>
                  <Text style={styles.envelopeActionText}>Details ›</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </>
  )}

  {/* 3. Strategic Financial Goals (Show when ALL or GOALS) */}
  {(activeSubTab === 'ALL' || activeSubTab === 'GOALS') && (
    <>
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.sectionHeaderTitle}>STRATEGIC FINANCIAL GOALS</Text>
          <Text style={styles.sectionHeaderSub}>Target wealth milestones & capital allocation</Text>
        </View>
        {onAddGoal && (
          <TouchableOpacity
            style={styles.addGoalBtn}
            onPress={onAddGoal}
            activeOpacity={0.8}
          >
            <Text style={styles.addGoalBtnIcon}>+</Text>
            <Text style={styles.addGoalBtnText}>Add Goal</Text>
          </TouchableOpacity>
        )}
      </View>

      {goals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🎯</Text>
          <Text style={styles.emptyTitle}>No Strategic Goals Configured</Text>
          <Text style={styles.emptySubtitle}>
            Define target wealth milestones, retirement corpus, or capital allocation goals.
          </Text>
          {onAddGoal && (
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={onAddGoal}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyActionBtnText}>+ Set First Strategic Goal</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.goalsList}>
          {goals.map((goal) => {
            const goalPct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
            const shortfall = Math.max(0, goal.targetAmount - goal.currentAmount);
            const emoji = GOAL_EMOJIS[goal.title] || '🎯';
            const isCompleted = goalPct >= 100;

            return (
              <TouchableOpacity
                key={goal.id}
                style={styles.goalCard}
                onPress={() => setSelectedGoal(goal)}
                activeOpacity={0.8}
              >
                <View style={styles.goalTopRow}>
                  <View style={styles.goalTitleWrap}>
                    <View style={styles.goalAvatar}>
                      <Text style={styles.goalAvatarEmoji}>{emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.goalTitle} numberOfLines={1}>{goal.title}</Text>
                      <Text style={styles.goalShortfallText}>
                        {isCompleted ? '✓ Target milestone reached' : `Shortfall: ${formatINR(shortfall)}`}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.targetYearBadge}>
                    <Text style={styles.targetYearText}>Target: {goal.targetYear}</Text>
                  </View>
                </View>

                <View style={styles.goalValuesRow}>
                  <Text style={styles.goalCurrentVal}>{formatINR(goal.currentAmount)}</Text>
                  <Text style={styles.goalTargetVal}>of {formatINR(goal.targetAmount)}</Text>
                  <View style={[styles.goalPctPill, isCompleted && styles.goalPctPillComplete]}>
                    <Text style={[styles.goalPctPillText, isCompleted && styles.goalPctPillTextComplete]}>
                      {isCompleted ? '✓ 100% FUNDED' : `${goalPct.toFixed(0)}% FUNDED`}
                    </Text>
                  </View>
                </View>

                {/* Enhanced Modern Fintech Goal Completion Bar */}
                <View style={styles.goalProgressTrack}>
                  {/* Subtle Milestone Stage Ticks: 25%, 50%, 75% */}
                  <View style={[styles.progressTick, { left: '25%' }]} />
                  <View style={[styles.progressTick, { left: '50%' }]} />
                  <View style={[styles.progressTick, { left: '75%' }]} />
                  <View
                    style={[
                      styles.goalProgressFill,
                      {
                        width: `${Math.max(4, goalPct)}%`,
                        backgroundColor: isCompleted ? '#087A50' : '#10B981',
                      },
                    ]}
                  >
                    <View style={styles.progressLeadHead} />
                  </View>
                </View>

                {/* Completion Milestone Sub-Info */}
                <View style={styles.goalProgressMetaRow}>
                  <Text style={styles.goalProgressMetaLeft}>
                    {isCompleted ? '🎉 Milestone Complete' : `${formatINR(goal.currentAmount)} accumulated`}
                  </Text>
                  <Text style={styles.goalProgressMetaRight}>
                    {isCompleted ? 'Target corpus achieved' : `${formatINR(shortfall)} to go`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Interactive Create Goal Quick Card */}
          {onAddGoal && (
            <TouchableOpacity
              style={styles.addGoalCard}
              onPress={onAddGoal}
              activeOpacity={0.8}
            >
              <View style={styles.addGoalCardIconWrap}>
                <Text style={styles.addGoalCardIcon}>🎯</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addGoalCardTitle}>Create Strategic Wealth Goal</Text>
                <Text style={styles.addGoalCardSub}>Set target corpus, timeline & auto-allocation</Text>
              </View>
              <Text style={styles.addGoalCardArrow}>+ Add Goal ›</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  )}

      {/* Envelope Detail Modal */}
      {selectedEnv && (
        <Modal
          visible={!!selectedEnv}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedEnv(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.detailModalBox}>
              <View style={styles.modalBar} />
              <View style={styles.modalHeaderRow}>
                <View style={[styles.categoryAvatarLarge, { backgroundColor: `${selectedEnv.color}20` }]}>
                  <Text style={styles.categoryAvatarLargeEmoji}>
                    {CATEGORY_EMOJIS[selectedEnv.category] || '📦'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.detailModalTitle}>{selectedEnv.category}</Text>
                  <Text style={styles.detailModalSub}>Monthly Budget Envelope</Text>
                </View>
              </View>

              <View style={styles.detailMetricGrid}>
                <View style={styles.detailMetricCol}>
                  <Text style={styles.detailMetricLabel}>BUDGET ALLOCATED</Text>
                  <Text style={styles.detailMetricValue}>{formatINR(selectedEnv.budgeted)}</Text>
                </View>
                <View style={styles.detailMetricCol}>
                  <Text style={styles.detailMetricLabel}>ACTUAL SPENT</Text>
                  <Text style={[styles.detailMetricValue, { color: '#DC2626' }]}>
                    {formatINR(selectedEnv.spent)}
                  </Text>
                </View>
              </View>

              <View style={styles.safeRemainingBox}>
                <Text style={styles.safeRemainingLabel}>Safe Remaining Spend:</Text>
                <Text style={styles.safeRemainingValue}>
                  {formatINR(Math.max(0, selectedEnv.budgeted - selectedEnv.spent))}
                </Text>
              </View>

              {onAddTransaction && (
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={() => {
                    setSelectedEnv(null);
                    onAddTransaction();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalPrimaryBtnText}>+ Log Expense to this Category</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedEnv(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Goal Detail Modal */}
      {selectedGoal && (
        <Modal
          visible={!!selectedGoal}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedGoal(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.detailModalBox}>
              <View style={styles.modalBar} />
              <Text style={styles.detailModalTitle}>{selectedGoal.title}</Text>
              <Text style={styles.detailModalSubtitle}>
                Target Year: {selectedGoal.targetYear} · Double-Entry Backed Asset
              </Text>

              <View style={styles.detailMetricGrid}>
                <View style={styles.detailMetricCol}>
                  <Text style={styles.detailMetricLabel}>SAVED SO FAR</Text>
                  <Text style={[styles.detailMetricValue, { color: '#16A36A' }]}>
                    {formatINR(selectedGoal.currentAmount)}
                  </Text>
                </View>
                <View style={styles.detailMetricCol}>
                  <Text style={styles.detailMetricLabel}>TARGET GOAL</Text>
                  <Text style={styles.detailMetricValue}>
                    {formatINR(selectedGoal.targetAmount)}
                  </Text>
                </View>
              </View>

              <View style={styles.safeRemainingBox}>
                <Text style={styles.safeRemainingLabel}>Capital Shortfall:</Text>
                <Text style={styles.safeRemainingValue}>
                  {formatINR(Math.max(0, selectedGoal.targetAmount - selectedGoal.currentAmount))}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedGoal(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  modeTabActive: {
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  modeTabTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  utilizationCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 106, 0.25)',
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  cycleSubtext: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginTop: 2,
    fontWeight: '500',
  },
  pctBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 7,
  },
  pctBadgeNormal: {
    backgroundColor: '#DCFCE7',
  },
  pctBadgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  pctBadgeDanger: {
    backgroundColor: '#FEE2E2',
  },
  pctBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  pctTextNormal: {
    color: '#15803D',
  },
  pctTextWarning: {
    color: '#B45309',
  },
  pctTextDanger: {
    color: '#B91C1C',
  },
  amountDisplayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  bigSpentVal: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.6,
  },
  totalBudgetedText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  mainProgressTrack: {
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 14,
  },
  mainProgressFill: {
    height: '100%',
    borderRadius: 5,
  },
  safeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF9',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  safeStripItem: {
    flex: 1,
  },
  safeStripLabel: {
    fontSize: 9.5,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  safeStripValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#087A50',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  safeStripDaily: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  safeStripDivider: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.border,
    marginHorizontal: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 6,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  sectionHeaderSub: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addGoalBtn: {
    backgroundColor: '#087A50',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#087A50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 3,
    elevation: 3,
  },
  addGoalBtnIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 15,
  },
  addGoalBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  addExpenseBtn: {
    backgroundColor: '#087A50',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#087A50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 3,
    elevation: 3,
  },
  addExpenseBtnIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 15,
  },
  addExpenseBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  addEnvelopeBtn: {
    backgroundColor: '#E8F5EE',
    borderWidth: 1,
    borderColor: 'rgba(8, 122, 80, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addEnvelopeBtnIcon: {
    color: '#087A50',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 15,
  },
  addEnvelopeBtnText: {
    color: '#087A50',
    fontSize: 11,
    fontWeight: '700',
  },
  addSmallPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 106, 0.35)',
  },
  addSmallPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#087A50',
  },
  addSmallPillSecondary: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  addSmallPillSecondaryText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  envelopesList: {
    gap: 10,
    marginBottom: 18,
  },
  envelopeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2,
  },
  envelopeCardOver: {
    borderColor: 'rgba(220, 38, 38, 0.3)',
    backgroundColor: '#FFFAFA',
  },
  envelopeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  categoryAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryAvatarEmoji: {
    fontSize: 17,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  envelopeSubtext: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  ratioCol: {
    alignItems: 'flex-end',
    gap: 3,
  },
  envelopeRatio: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  envelopeAllocated: {
    color: theme.colors.textTertiary,
    fontWeight: '500',
  },
  envPctBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  envPctBadgeNormal: {
    backgroundColor: '#DCFCE7',
  },
  envPctBadgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  envPctBadgeDanger: {
    backgroundColor: '#FEE2E2',
  },
  envPctBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  envelopeProgressTrack: {
    height: 8,
    backgroundColor: '#EEF2EF',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 5,
    position: 'relative',
    borderWidth: 0.5,
    borderColor: '#DFE5E1',
  },
  envelopeProgressFill: {
    height: '100%',
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  progressTick: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    zIndex: 10,
  },
  progressLeadHead: {
    width: 3,
    height: '70%',
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    marginRight: 2,
  },
  envelopeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  envelopeRemText: {
    fontSize: 10.5,
    color: '#087A50',
    fontWeight: '600',
  },
  envelopeRemTextOver: {
    color: '#DC2626',
    fontWeight: '700',
  },
  envelopeActionText: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    fontWeight: '600',
  },
  goalsList: {
    gap: 12,
  },
  goalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2,
  },
  goalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  goalTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  goalAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalAvatarEmoji: {
    fontSize: 17,
  },
  goalTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  goalShortfallText: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  targetYearBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  targetYearText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  goalValuesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 6,
  },
  goalCurrentVal: {
    fontSize: 15,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  goalTargetVal: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  goalPctPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  goalPctPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#087A50',
  },
  goalPctPillComplete: {
    backgroundColor: '#E8F5EE',
  },
  goalPctPillTextComplete: {
    color: '#087A50',
  },
  goalProgressTrack: {
    height: 10,
    backgroundColor: '#E7ECE8',
    borderRadius: 5,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 0.5,
    borderColor: '#DFE5E1',
    marginVertical: 4,
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 5,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  goalProgressMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  goalProgressMetaLeft: {
    fontSize: 10,
    fontWeight: '700',
    color: '#087A50',
  },
  goalProgressMetaRight: {
    fontSize: 9.5,
    fontWeight: '600',
    color: theme.colors.textTertiary,
  },
  addGoalCard: {
    marginTop: 4,
    backgroundColor: '#F8FAF9',
    borderWidth: 1.5,
    borderColor: '#C6DCDB',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addGoalCardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addGoalCardIcon: {
    fontSize: 18,
  },
  addGoalCardTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#17231D',
  },
  addGoalCardSub: {
    fontSize: 10,
    color: '#758078',
    marginTop: 2,
  },
  addGoalCardArrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#087A50',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 20, 0.55)',
    justifyContent: 'flex-end',
  },
  detailModalBox: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  modalBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  categoryAvatarLarge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryAvatarLargeEmoji: {
    fontSize: 22,
  },
  detailModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  detailModalSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  detailModalSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 14,
  },
  detailMetricGrid: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 14,
  },
  detailMetricCol: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  detailMetricLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  detailMetricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  safeRemainingBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 106, 0.25)',
  },
  safeRemainingLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  safeRemainingValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#087A50',
  },
  modalPrimaryBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textWhite,
  },
  modalCloseBtn: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 16,
  },
  emptyActionBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
