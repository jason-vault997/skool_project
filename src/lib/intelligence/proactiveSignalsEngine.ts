// ============================================================
// BUILD100 — Phase 8: Proactive Signals Engine
//
// Generates internal proactive alert conditions. These are shown
// inside the application as banners or cards.
//
// No external notifications. Internal-first.
//
// Conditions (in priority order, max 3 returned):
//   OVERDUE_COMMITMENT    — overdue commitments > 0
//   COMMITMENT_DUE_TODAY  — due_today > 0
//   GOAL_AT_RISK          — any CRITICAL or AT_RISK goal
//   REVIEW_DUE            — Thursday+ AND no completed review this week
//   BACKLOG_GROWING       — active backlog >= 8
//   NO_RECENT_ACTIVITY    — no business_metrics in last 5 days
//   METRIC_DROP           — 7d leads < 30d weekly avg * 0.5 (with data)
//
// STREAK_AT_RISK has been intentionally EXCLUDED:
//   The BUILD100 streak (profiles.streak_days) is a manually-managed
//   counter in the DB with no automatic daily-trigger mechanism.
//   No daily business_metrics row does NOT necessarily mean a streak
//   is at risk. This signal cannot be reliably determined without
//   knowing the streak's actual increment/decrement mechanism.
//   It is therefore excluded to avoid false positives.
// ============================================================

import type {
  ProactiveAlert,
  CommitmentSummary,
  GoalRiskSummary,
  ApplicationBacklog,
} from './intelligenceTypes';

interface ProactiveSignalInputs {
  commitments: CommitmentSummary;
  goalRisk: GoalRiskSummary;
  backlog: ApplicationBacklog;
  /** Number of days since any business_metrics row (0 = logged today). null if no data ever. */
  daysSinceLastMetric: number | null;
  /** 7-day lead count */
  leads7d: number;
  /** 30-day weekly average leads (30d leads / (days_with_data / 7)) */
  leads30dWeeklyAvg: number | null;
  hasCompletedReviewThisWeek: boolean;
  isWeeklyReviewDay: boolean;
}

export function computeProactiveSignals(inputs: ProactiveSignalInputs): ProactiveAlert[] {
  const {
    commitments,
    goalRisk,
    backlog,
    daysSinceLastMetric,
    leads7d,
    leads30dWeeklyAvg,
    hasCompletedReviewThisWeek,
    isWeeklyReviewDay,
  } = inputs;

  const alerts: ProactiveAlert[] = [];

  // 1. OVERDUE_COMMITMENT
  if (commitments.overdue > 0) {
    alerts.push({
      type: 'OVERDUE_COMMITMENT',
      severity: 'critical',
      title: `${commitments.overdue} OVERDUE COMMITMENT${commitments.overdue > 1 ? 'S' : ''}`,
      message: `${commitments.overdue} experiment${commitments.overdue > 1 ? 's have' : ' has'} passed its commitment date. Execute or close with a failure log.`,
      action_label: 'View Commitments',
    });
  }

  // 2. COMMITMENT_DUE_TODAY
  if (commitments.due_today > 0 && alerts.length < 3) {
    alerts.push({
      type: 'COMMITMENT_DUE_TODAY',
      severity: 'warning',
      title: `${commitments.due_today} COMMITMENT${commitments.due_today > 1 ? 'S' : ''} DUE TODAY`,
      message: `You committed to completing ${commitments.due_today} experiment${commitments.due_today > 1 ? 's' : ''} today. Execute and log the outcome.`,
      action_label: 'View Commitments',
    });
  }

  // 3. GOAL_AT_RISK
  if (goalRisk.has_any_risk && alerts.length < 3) {
    const criticalGoal = goalRisk.items.find(g => g.risk_status === 'CRITICAL');
    const atRiskGoal = goalRisk.items.find(g => g.risk_status === 'AT_RISK');
    const riskGoal = criticalGoal ?? atRiskGoal;
    alerts.push({
      type: 'GOAL_AT_RISK',
      severity: criticalGoal ? 'critical' : 'warning',
      title: criticalGoal
        ? `GOAL CRITICAL — "${criticalGoal.title}"`
        : `GOAL AT RISK — "${atRiskGoal?.title ?? 'Active Goal'}"`,
      message: riskGoal
        ? `"${riskGoal.title}" is at ${riskGoal.progress_pct}% with ${riskGoal.remaining_days ?? '?'} days remaining.`
        : `${goalRisk.critical_count + goalRisk.at_risk_count} active goal${goalRisk.critical_count + goalRisk.at_risk_count > 1 ? 's need' : ' needs'} recovery action.`,
      action_label: 'View Goals',
    });
  }

  // 4. REVIEW_DUE
  if (isWeeklyReviewDay && !hasCompletedReviewThisWeek && alerts.length < 3) {
    alerts.push({
      type: 'REVIEW_DUE',
      severity: 'info',
      title: 'WEEKLY REVIEW DUE',
      message: 'The weekly operating review has not been completed. Complete it before the week closes.',
      action_label: 'Open Review',
    });
  }

  // 5. BACKLOG_GROWING
  if (backlog.active_count >= 8 && alerts.length < 3) {
    alerts.push({
      type: 'BACKLOG_GROWING',
      severity: 'warning',
      title: 'EXPERIMENT BACKLOG GROWING',
      message: `${backlog.active_count} active experiments are open. Having too many open experiments without outcomes produces no data.`,
      action_label: 'View Backlog',
    });
  }

  // 6. NO_RECENT_ACTIVITY
  if (daysSinceLastMetric !== null && daysSinceLastMetric >= 5 && alerts.length < 3) {
    alerts.push({
      type: 'NO_RECENT_ACTIVITY',
      severity: 'warning',
      title: 'NO METRICS LOGGED IN 5+ DAYS',
      message: `Last business metric was logged ${daysSinceLastMetric} days ago. Intelligence accuracy degrades without recent data.`,
      action_label: 'Log Metrics',
    });
  }

  // 7. METRIC_DROP (leads)
  if (
    leads30dWeeklyAvg !== null &&
    leads30dWeeklyAvg > 0 &&
    leads7d < leads30dWeeklyAvg * 0.5 &&
    alerts.length < 3
  ) {
    alerts.push({
      type: 'METRIC_DROP',
      severity: 'warning',
      title: 'LEAD VOLUME DROP',
      message: `7-day leads (${leads7d}) are below 50% of your recent weekly average (${Math.round(leads30dWeeklyAvg)} leads/week). Pipeline may be drying up.`,
      action_label: 'View Analytics',
    });
  }

  return alerts.slice(0, 3);
}
