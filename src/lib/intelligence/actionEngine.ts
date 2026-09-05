// ============================================================
// BUILD100 — Phase 8: Action Engine
//
// Translates the current priority + bottleneck into a single
// concrete, measurable next action.
//
// Actions are:
//   - Specific (not generic advice)
//   - Measurable (tied to an observable metric)
//   - Linked to the detected constraint
//   - Linked to active goals where relevant
// ============================================================

import type {
  BottleneckResult,
  PriorityResult,
  ActionResult,
  GoalRiskItem,
  BacklogItem,
} from './intelligenceTypes';

/**
 * Produces a concrete, measurable next action based on the current
 * priority and bottleneck. Linked to goals where available.
 */
export function computeAction(
  priority: PriorityResult,
  bottleneck: BottleneckResult,
  criticalGoal: GoalRiskItem | null,
  nextBacklogItem: BacklogItem | null
): ActionResult {

  switch (priority.priority) {

    case 'COMMITMENT_RECOVERY':
      return {
        action_text: 'Address your overdue commitments. For each one: execute and log the outcome, or mark it as failed. Do not leave them unresolved.',
        target_metric: 'Overdue commitments resolved',
        target_value: 'All resolved by end of day',
        time_horizon: 'Today',
        linked_goal_id: null,
      };

    case 'GOAL_RECOVERY':
      if (criticalGoal) {
        const pace = criticalGoal.required_daily_pace
          ? `${criticalGoal.required_daily_pace.toFixed(1)} ${criticalGoal.unit ?? 'units'}/day`
          : 'accelerated pace';
        return {
          action_text: `"${criticalGoal.title}" is CRITICAL at ${criticalGoal.progress_pct}% of target. You need ${pace} for the remaining ${criticalGoal.remaining_days ?? '?'} days. Execute the highest-leverage activity for this goal today.`,
          target_metric: criticalGoal.unit ?? 'units',
          target_value: criticalGoal.required_daily_pace
            ? `${criticalGoal.required_daily_pace.toFixed(1)} today`
            : 'Maximum output',
          time_horizon: `${criticalGoal.remaining_days ?? '?'} days remaining`,
          linked_goal_id: criticalGoal.id,
        };
      }
      return {
        action_text: 'A goal is at critical risk. Identify the gap and execute the highest-leverage activity for that goal today.',
        target_metric: 'Goal progress',
        target_value: 'Recover to on-track pace',
        time_horizon: 'Today',
        linked_goal_id: null,
      };

    case 'LEAD_GENERATION':
      return {
        action_text: 'Generate new leads through outbound prospecting. Identify and contact qualified prospects directly — DMs, cold calls, or referral asks.',
        target_metric: 'New leads generated',
        target_value: '3–5 new prospects today',
        time_horizon: 'Today',
        linked_goal_id: null,
      };

    case 'SALES_CALLS':
      return {
        action_text: 'Follow up with existing leads. Book sales calls or discovery conversations. Your pipeline has inventory — work it.',
        target_metric: 'Sales calls booked or completed',
        target_value: '2–3 calls today',
        time_horizon: 'Today',
        linked_goal_id: null,
      };

    case 'CLOSING':
      return {
        action_text: 'Review your last 3 sales calls. Identify the most common objection. Open the Application Engine and create a targeted experiment from the Objections or Pitch modules.',
        target_metric: 'Objection identified + experiment set',
        target_value: '1 experiment committed today',
        time_horizon: 'Today',
        linked_goal_id: null,
      };

    case 'CONTENT':
      return {
        action_text: 'Create and post content. Use the Content Creation track in the Classroom to apply a specific scripting or retention lesson to your next piece.',
        target_metric: 'Content pieces posted',
        target_value: '1–2 posts today',
        time_horizon: 'Today',
        linked_goal_id: null,
      };

    case 'APPLICATION':
      if (nextBacklogItem) {
        return {
          action_text: `Complete the Application Engine for "${nextBacklogItem.lesson_title ?? nextBacklogItem.lesson_id}". Write the mission, experiment, and set a commitment date.`,
          target_metric: 'Application Engine completed',
          target_value: '1 lesson applied today',
          time_horizon: 'Today',
          linked_goal_id: null,
        };
      }
      return {
        action_text: 'Open the Classroom. Find a completed lesson without an application record. Write the mission and experiment. Set a commitment date.',
        target_metric: 'Application Engine completed',
        target_value: '1 lesson applied today',
        time_horizon: 'Today',
        linked_goal_id: null,
      };

    case 'EXECUTION':
      if (nextBacklogItem) {
        return {
          action_text: `Execute the experiment for "${nextBacklogItem.lesson_title ?? nextBacklogItem.lesson_id}". Go do the real-world action. Then log the outcome — success or failure both count.`,
          target_metric: 'Experiment executed and outcome logged',
          target_value: '1 experiment closed today',
          time_horizon: 'Today',
          linked_goal_id: null,
        };
      }
      return {
        action_text: 'Pick the oldest open experiment in the Application Engine. Execute it today. Log the real-world outcome. A failure with an outcome is better than an open experiment with no data.',
        target_metric: 'Experiment executed and outcome logged',
        target_value: '1 experiment closed today',
        time_horizon: 'Today',
        linked_goal_id: null,
      };

    case 'SALES':
      return {
        action_text: 'Revenue pace is below target. Focus today entirely on revenue-generating activities: outbound prospecting, follow-up calls, or closing open proposals.',
        target_metric: 'Revenue-generating actions completed',
        target_value: 'Maximum output today',
        time_horizon: 'Today',
        linked_goal_id: criticalGoal?.id ?? null,
      };

    case 'REVIEW':
      return {
        action_text: 'Complete this week\'s operating review in the Business tab. Log your biggest win, biggest failure, and set next week\'s primary focus. This takes 10 minutes and compounds over time.',
        target_metric: 'Weekly review completed',
        target_value: '1 review submitted',
        time_horizon: 'Before end of week',
        linked_goal_id: null,
      };

    default: // NO_PRIORITY
      return {
        action_text: bottleneck.bottleneck_type === 'NO_DATA'
          ? 'Start by logging your first business metrics in the Business tab. Then mark your first lesson complete in the Classroom.'
          : 'No critical action required. Continue current execution patterns. Review goal pacing to stay ahead.',
        target_metric: bottleneck.bottleneck_type === 'NO_DATA' ? 'First data logged' : 'Maintain pace',
        target_value: bottleneck.bottleneck_type === 'NO_DATA' ? 'Log 1 day of metrics' : 'On track',
        time_horizon: 'Today',
        linked_goal_id: null,
      };
  }
}
