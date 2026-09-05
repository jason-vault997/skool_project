// ============================================================
// BUILD100 — Phase 8: Priority Engine
//
// Deterministic rule-based priority determination.
// Accepts bottleneck + commitment + goal risk, returns a single
// OperatorPriority with reason and urgency.
//
// Rules evaluated in strict priority order (first match wins).
// ============================================================

import type {
  BottleneckResult,
  CommitmentSummary,
  GoalRiskSummary,
  PriorityResult,
  OperatorPriority,
  PriorityUrgency,
} from './intelligenceTypes';
import { localDayOfWeek } from './dateUtils';

function make(
  priority: OperatorPriority,
  reason: string,
  metrics: string[],
  urgency: PriorityUrgency,
  horizon: string
): PriorityResult {
  return {
    priority,
    reason,
    supporting_metrics: metrics,
    urgency,
    time_horizon: horizon,
  };
}

/**
 * Computes the current highest-value operating priority.
 *
 * Rules (first match wins):
 *  1. COMMITMENT_RECOVERY — overdue commitments exist
 *  2. GOAL_RECOVERY       — any goal is CRITICAL risk
 *  3. LEAD_GENERATION     — bottleneck = LOW_LEADS
 *  4. SALES_CALLS         — bottleneck = LOW_SALES_CALLS
 *  5. CLOSING             — bottleneck = LOW_CLOSE_RATE
 *  6. APPLICATION         — bottleneck = LOW_APPLICATION
 *  7. EXECUTION           — bottleneck = LOW_EXECUTION
 *  8. CONTENT             — bottleneck = LOW_CONTENT
 *  9. SALES               — bottleneck = REVENUE_GAP
 * 10. REVIEW              — Thursday+ AND no completed review this week
 * 11. NO_PRIORITY         — ENGINE_RUNNING or NO_DATA
 */
export function computePriority(
  bottleneck: BottleneckResult,
  commitments: CommitmentSummary,
  goalRisk: GoalRiskSummary,
  hasCompletedReviewThisWeek: boolean
): PriorityResult {

  // ── 1. COMMITMENT_RECOVERY ────────────────────────────────
  if (commitments.overdue > 0) {
    return make(
      'COMMITMENT_RECOVERY',
      `You have ${commitments.overdue} overdue commitment${commitments.overdue > 1 ? 's' : ''}. These are past-deadline experiments that were never completed or failed.`,
      [`Overdue commitments: ${commitments.overdue}`, `Due today: ${commitments.due_today}`],
      'high',
      'Today'
    );
  }

  // ── 2. GOAL_RECOVERY ──────────────────────────────────────
  if (goalRisk.critical_count > 0) {
    const criticalGoal = goalRisk.items.find(g => g.risk_status === 'CRITICAL');
    return make(
      'GOAL_RECOVERY',
      `${goalRisk.critical_count} active goal${goalRisk.critical_count > 1 ? 's are' : ' is'} CRITICAL${criticalGoal ? ` — "${criticalGoal.title}" is at ${criticalGoal.progress_pct}%` : ''}.`,
      [
        `Critical goals: ${goalRisk.critical_count}`,
        criticalGoal ? `"${criticalGoal.title}": ${criticalGoal.progress_pct}% of target` : '',
      ].filter(Boolean),
      'high',
      'This week'
    );
  }

  // ── 3–9. Bottleneck-driven priorities ─────────────────────

  switch (bottleneck.bottleneck_type) {
    case 'LOW_LEADS':
      return make(
        'LEAD_GENERATION',
        'Lead volume is the primary constraint. All downstream metrics (calls, closes, revenue) are limited by pipeline volume.',
        bottleneck.evidence,
        'high',
        'Today'
      );

    case 'LOW_SALES_CALLS':
      return make(
        'SALES_CALLS',
        'Leads exist but follow-up is insufficient. The pipeline has inventory that is not being worked.',
        bottleneck.evidence,
        'high',
        'Today'
      );

    case 'LOW_CLOSE_RATE':
      return make(
        'CLOSING',
        'Call volume is adequate but close rate is below 10%. The constraint is pitch quality or offer clarity, not activity.',
        bottleneck.evidence,
        'medium',
        'This week'
      );

    case 'REVENUE_GAP':
      return make(
        'SALES',
        bottleneck.explanation,
        bottleneck.evidence,
        'high',
        'This week'
      );

    case 'LOW_APPLICATION':
      return make(
        'APPLICATION',
        'Lesson completion is outpacing application. Knowledge without real-world experimentation has no leverage.',
        bottleneck.evidence,
        'medium',
        'This week'
      );

    case 'LOW_EXECUTION':
      return make(
        'EXECUTION',
        'Applications are open but experiments are not being completed or failed. Execution (not planning) produces outcomes.',
        bottleneck.evidence,
        'medium',
        'This week'
      );

    case 'LOW_CONTENT':
      return make(
        'CONTENT',
        'Content output is below required pace. Top-of-funnel inbound activity depends on consistent content volume.',
        bottleneck.evidence,
        'medium',
        'This week'
      );

    case 'OVERLOAD':
      return make(
        'EXECUTION',
        'Too many open experiments with insufficient real-world execution. Close the loop on existing commitments before opening new ones.',
        bottleneck.evidence,
        'high',
        'Today'
      );
  }

  // ── 10. REVIEW ────────────────────────────────────────────
  // Thursday = 4, Friday = 5, Saturday = 6, Sunday = 0
  const dow = localDayOfWeek();
  const isLateWeek = dow === 0 || dow >= 4;
  if (isLateWeek && !hasCompletedReviewThisWeek) {
    return make(
      'REVIEW',
      `It is ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dow]} and the weekly review has not been completed. Closing the week is a high-leverage operating habit.`,
      ['Weekly review: not completed', `Day of week: ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dow]}`],
      'medium',
      'Before end of week'
    );
  }

  // ── 11. NO_PRIORITY ───────────────────────────────────────
  return make(
    'NO_PRIORITY',
    bottleneck.bottleneck_type === 'NO_DATA'
      ? 'Insufficient data to determine a priority. Log your business metrics and lesson progress.'
      : 'No critical constraint detected. Maintain current execution patterns.',
    [],
    'low',
    'This week'
  );
}
