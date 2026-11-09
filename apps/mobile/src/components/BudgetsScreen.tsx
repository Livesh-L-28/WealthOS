import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal } from 'react-native';
import { theme } from '../theme';
import { BudgetEnvelope, FinancialGoal } from '../types';
import { formatINR } from '../formatters';

interface BudgetsScreenProps {
  budgets: BudgetEnvelope[];
  goals: FinancialGoal[];
  onAddTransaction?: () => void;
}

export const BudgetsScreen: React.FC<BudgetsScreenProps> = ({
  budgets,
  goals,
  onAddTransaction,
}) => {
  const [selectedEnv, setSelectedEnv] = useState<BudgetEnvelope | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null);

  const totalBudgeted = budgets.reduce((s, b) => s + b.budgeted, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const remainingBuffer = totalBudgeted - totalSpent;
  const utilizationPct = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Monthly Utilization Hero */}
      <View style={styles.utilizationCard}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardLabel}>MONTHLY BUDGET UTILIZATION</Text>
          <View style={styles.pctBadge}>
            <Text style={styles.pctBadgeText}>{utilizationPct.toFixed(0)}% USED</Text>
          </View>
        </View>

        <Text style={styles.bigSpentVal}>
          {formatINR(totalSpent)}
          <Text style={styles.totalBudgetedText}> / {formatINR(totalBudgeted)}</Text>
        </Text>

        <View style={styles.mainProgressTrack}>
          <View
            style={[
              styles.mainProgressFill,
              {
                width: `${Math.min(100, utilizationPct)}%`,
                backgroundColor:
                  utilizationPct > 95
                    ? theme.colors.negative
                    : utilizationPct > 80
                    ? theme.colors.warning
                    : theme.colors.primary,
              },
            ]}
          />
        </View>

        <Text style={styles.bufferHelpText}>
          {formatINR(remainingBuffer)} safe remaining spend for this monthly cycle.
        </Text>
      </View>

      {/* Spending Envelopes Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderTitle}>MONTHLY SPENDING ENVELOPES</Text>
        {onAddTransaction && (
          <TouchableOpacity
            style={styles.addSmallPill}
            onPress={onAddTransaction}
            activeOpacity={0.7}
          >
            <Text style={styles.addSmallPillText}>+ Add Expense</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.envelopesList}>
        {budgets.map((env) => {
          const pct = Math.min(100, (env.spent / env.budgeted) * 100);
          const isWarning = pct > 90;
          return (
            <TouchableOpacity
              key={env.id}
              style={styles.envelopeCard}
              onPress={() => setSelectedEnv(env)}
              activeOpacity={0.8}
            >
              <View style={styles.envelopeTop}>
                <View style={styles.categoryTitleRow}>
                  <View style={[styles.categoryColorDot, { backgroundColor: env.color }]} />
                  <Text style={styles.categoryName}>{env.category}</Text>
                </View>
                <Text style={styles.envelopeRatio}>
                  {formatINR(env.spent)}
                  <Text style={styles.envelopeAllocated}> / {formatINR(env.budgeted)}</Text>
                </Text>
              </View>

              <View style={styles.envelopeProgressTrack}>
                <View
                  style={[
                    styles.envelopeProgressFill,
                    {
                      width: `${pct}%`,
                      backgroundColor:
                        pct >= 100
                          ? theme.colors.negative
                          : isWarning
                          ? theme.colors.warning
                          : theme.colors.primary,
                    },
                  ]}
                />
              </View>

              <View style={styles.envelopeFooter}>
                <Text style={styles.envelopePctText}>{pct.toFixed(0)}% consumed</Text>
                <Text style={styles.envelopeRemText}>
                  {formatINR(Math.max(0, env.budgeted - env.spent))} left ›
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Strategic Financial Goals */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderTitle}>STRATEGIC FINANCIAL GOALS</Text>
      </View>

      <View style={styles.goalsList}>
        {goals.map((goal) => {
          const goalPct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
          return (
            <TouchableOpacity
              key={goal.id}
              style={styles.goalCard}
              onPress={() => setSelectedGoal(goal)}
              activeOpacity={0.8}
            >
              <View style={styles.goalTopRow}>
                <Text style={styles.goalTitle}>{goal.title}</Text>
                <View style={styles.targetYearBadge}>
                  <Text style={styles.targetYearText}>Target: {goal.targetYear}</Text>
                </View>
              </View>

              <View style={styles.goalValuesRow}>
                <Text style={styles.goalCurrentVal}>{formatINR(goal.currentAmount)}</Text>
                <Text style={styles.goalTargetVal}>of {formatINR(goal.targetAmount)}</Text>
                <View style={styles.goalPctPill}>
                  <Text style={styles.goalPctPillText}>{goalPct.toFixed(0)}%</Text>
                </View>
              </View>

              <View style={styles.goalProgressTrack}>
                <View
                  style={[
                    styles.goalProgressFill,
                    { width: `${goalPct}%`, backgroundColor: theme.colors.primary },
                  ]}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

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
                <View style={[styles.categoryColorDotLarge, { backgroundColor: selectedEnv.color }]} />
                <Text style={styles.detailModalTitle}>{selectedEnv.category} Envelope</Text>
              </View>

              <View style={styles.detailMetricGrid}>
                <View style={styles.detailMetricCol}>
                  <Text style={styles.detailMetricLabel}>BUDGET ALLOCATED</Text>
                  <Text style={styles.detailMetricValue}>{formatINR(selectedEnv.budgeted)}</Text>
                </View>
                <View style={styles.detailMetricCol}>
                  <Text style={styles.detailMetricLabel}>ACTUAL SPENT</Text>
                  <Text style={[styles.detailMetricValue, { color: theme.colors.danger }]}>
                    {formatINR(selectedEnv.spent)}
                  </Text>
                </View>
              </View>

              <View style={styles.safeRemainingBox}>
                <Text style={styles.safeRemainingLabel}>Remaining Safe Spend:</Text>
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
                  <Text style={[styles.detailMetricValue, { color: theme.colors.primary }]}>
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
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
  },
  utilizationCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  pctBadge: {
    backgroundColor: theme.colors.primaryLightSolid,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  pctBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  bigSpentVal: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  totalBudgetedText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  mainProgressTrack: {
    height: 7,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 3.5,
    marginVertical: 10,
    overflow: 'hidden',
  },
  mainProgressFill: {
    height: '100%',
    borderRadius: 3.5,
  },
  bufferHelpText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  sectionHeaderTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },
  envelopesList: {
    gap: 10,
    marginBottom: 16,
  },
  envelopeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  envelopeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  envelopeRatio: {
    fontSize: 11.5,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  envelopeAllocated: {
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  envelopeProgressTrack: {
    height: 5,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 2.5,
    overflow: 'hidden',
    marginVertical: 5,
  },
  envelopeProgressFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  envelopeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  envelopePctText: {
    fontSize: 9.5,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  envelopeRemText: {
    fontSize: 9.5,
    color: theme.colors.primaryDark,
    fontWeight: '600',
  },
  goalsList: {
    gap: 10,
  },
  goalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  goalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  goalTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  targetYearBadge: {
    backgroundColor: '#F0F4F1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  targetYearText: {
    fontSize: 9,
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
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  goalTargetVal: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  goalPctPill: {
    backgroundColor: theme.colors.primaryLightSolid,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  goalPctPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  goalProgressTrack: {
    height: 5,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  addSmallPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 106, 0.3)',
  },
  addSmallPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(23, 35, 29, 0.55)',
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
    gap: 8,
    marginBottom: 8,
  },
  categoryColorDotLarge: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  detailModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
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
    color: theme.colors.primaryDark,
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
});
