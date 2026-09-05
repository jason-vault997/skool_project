// ============================================================
// BUILD100 — Phase 8: Operating Plan Engine
//
// Generates today's ordered operating plan (max 4 items) from
// intelligence outputs. Pure function — no Supabase calls.
//
// Slots:
//   1. Top-priority action (from actionEngine)
//   2. Most urgent commitment (if overdue or due today)
//   3. Next recommended application experiment (from backlog)
//   4. Review / measurement action
//
// Does not create unrealistic schedules. Items are only included
// if they are genuinely relevant based on the current state.
// ============================================================

import type {
  DailyOperatingPlan,
  PlanItem,
  ActionResult,
  CommitmentSummary,
  ApplicationBacklog,
} from './intelligenceTypes';
import { todayLocalYMD } from './dateUtils';

interface PlanInputs {
  action: ActionResult;
  commitments: CommitmentSummary;
  backlog: ApplicationBacklog;
  hasMetricsToday: boolean;
  hasCompletedReviewThisWeek: boolean;
  isWeeklyReviewDay: boolean; // Thursday or later
}

export function computeOperatingPlan(inputs: PlanInputs): DailyOperatingPlan {
  const { action, commitments, backlog, hasMetricsToday, hasCompletedReviewThisWeek, isWeeklyReviewDay } = inputs;
  const items: PlanItem[] = [];

  // ── Slot 1: Primary action ────────────────────────────────
  items.push({
    slot: 1,
    label: 'PRIMARY ACTION',
    action: action.action_text,
    why: `Target: ${action.target_value} — ${action.time_horizon}`,
    estimated_minutes: 60,
  });

  // ── Slot 2: Urgent commitment ─────────────────────────────
  const urgentCommitment = commitments.items.find(
    c => c.urgency === 'overdue' || c.urgency === 'due_today'
  );
  if (urgentCommitment && items.length < 4) {
    const isOverdue = urgentCommitment.urgency === 'overdue';
    items.push({
      slot: 2 as 2,
      label: isOverdue ? 'OVERDUE COMMITMENT' : 'COMMITMENT DUE TODAY',
      action: `Complete or close the experiment for lesson: "${urgentCommitment.lesson_id}". ${urgentCommitment.mission ? `Mission: ${urgentCommitment.mission}` : ''}`,
      why: isOverdue
        ? `Commitment was due ${urgentCommitment.commitment_date}. Mark executed or failed — both close the loop.`
        : `Committed to execute by today. Complete or log a failure with reflection.`,
      estimated_minutes: 30,
    });
  }

  // ── Slot 3: Application experiment ───────────────────────
  const nextApp = backlog.next_recommended;
  if (nextApp && items.length < 4) {
    // Only add if different from what's already in Slot 2
    const alreadyCovered = items.some(i => i.action.includes(nextApp.lesson_id));
    if (!alreadyCovered) {
      items.push({
        slot: items.length + 1 as 1 | 2 | 3 | 4,
        label: 'APPLICATION / LEARNING',
        action: `Work on the experiment for "${nextApp.lesson_title ?? nextApp.lesson_id}". ${nextApp.experiment ? `Experiment: ${nextApp.experiment}` : 'Execute the real-world action.'}`,
        why: nextApp.urgency === 'overdue'
          ? 'This experiment is overdue. Execute or close it today.'
          : `${backlog.active_count} active experiment${backlog.active_count !== 1 ? 's' : ''} in backlog — keeping the queue moving.`,
        estimated_minutes: 20,
      });
    }
  }

  // ── Slot 4: Review / measurement ─────────────────────────
  if (items.length < 4) {
    if (!hasMetricsToday) {
      items.push({
        slot: items.length + 1 as 1 | 2 | 3 | 4,
        label: 'MEASUREMENT',
        action: 'Log today\'s business metrics in the Business tab: leads, sales calls, clients closed, revenue, content posted, and hours worked.',
        why: 'No metrics logged today. Daily tracking is the data that powers goal pacing and intelligence.',
        estimated_minutes: 5,
      });
    } else if (isWeeklyReviewDay && !hasCompletedReviewThisWeek) {
      items.push({
        slot: items.length + 1 as 1 | 2 | 3 | 4,
        label: 'WEEKLY REVIEW',
        action: 'Complete this week\'s operating review in the Business tab. Log your biggest win, biggest failure, key learning, and next week\'s priority.',
        why: 'Review not yet completed this week. Closing the week takes 10 minutes and compounds over time.',
        estimated_minutes: 10,
      });
    }
  }

  return {
    items,
    generated_at: new Date().toISOString(),
    plan_date: todayLocalYMD(),
  };
}

/** Returns true if today is Thursday, Friday, Saturday, or Sunday */
export function isWeeklyReviewDay(): boolean {
  const dow = new Date().getDay(); // 0=Sun
  return dow === 0 || dow >= 4;
}
