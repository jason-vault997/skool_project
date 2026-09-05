// ============================================================
// BUILD100 — Phase 8: Goal Risk Engine
//
// Enriches active business goals with a GoalRiskStatus.
// Reuses Phase 6's calculateGoalProgress() — does not duplicate
// or contradict the existing goal progress calculation engine.
//
// Risk classification:
//   COMPLETE  progressPct >= 100
//   ON_TRACK  trackSignal = 'ahead' or 'on-track'
//   WATCH     trackSignal = 'behind' AND progressPct >= 50
//   AT_RISK   trackSignal = 'behind' AND 25 <= progressPct < 50
//   CRITICAL  trackSignal = 'behind' AND progressPct < 25
//             OR: remaining_days <= 3 AND remaining > 0
//   NO_DATE   no target_date — cannot classify
//
// Date math uses todayLocalYMD() for consistency.
// ============================================================

import { getActiveGoals, getGoalCurrentValue } from '../data/businessGoals';
import { calculateGoalProgress } from '../business/goalProgress';
import type { GoalRiskSummary, GoalRiskItem, GoalRiskStatus } from './intelligenceTypes';
import type { BusinessGoal } from '../supabase/types';

function classifyRisk(
  progressPct: number,
  trackSignal: string,
  remainingDays: number | null,
  remaining: number
): GoalRiskStatus {
  if (progressPct >= 100) return 'COMPLETE';
  if (trackSignal === 'no-data') return 'NO_DATE';

  // Critical override: deadline within 3 days AND still has work to do
  if (remainingDays !== null && remainingDays <= 3 && remaining > 0) return 'CRITICAL';

  if (trackSignal === 'ahead' || trackSignal === 'on-track') return 'ON_TRACK';

  // trackSignal = 'behind'
  if (progressPct >= 50) return 'WATCH';
  if (progressPct >= 25) return 'AT_RISK';
  return 'CRITICAL';
}

export async function computeGoalRisk(userId: string): Promise<GoalRiskSummary> {
  const empty: GoalRiskSummary = {
    items: [],
    critical_count: 0,
    at_risk_count: 0,
    watch_count: 0,
    on_track_count: 0,
    complete_count: 0,
    has_any_risk: false,
  };

  const goals = await getActiveGoals(userId);
  if (goals.length === 0) return empty;

  const enriched: GoalRiskItem[] = await Promise.all(
    goals.map(async (goal: BusinessGoal): Promise<GoalRiskItem> => {
      const currentValue = await getGoalCurrentValue(userId, goal);
      const p = calculateGoalProgress(goal, currentValue);

      const risk_status = classifyRisk(
        p.progressPct,
        p.trackSignal,
        p.remainingDays,
        p.remaining
      );

      // Required daily pace: remaining / remaining_days
      const required_daily_pace =
        p.remainingDays && p.remainingDays > 0 && p.remaining > 0
          ? p.remaining / p.remainingDays
          : null;

      // Current daily pace: current_value / elapsed_days
      const current_daily_pace =
        p.elapsedDays && p.elapsedDays > 0 && currentValue > 0
          ? currentValue / p.elapsedDays
          : null;

      // Projected final value: current_daily_pace × total_days
      const projected_final_value =
        current_daily_pace !== null && p.totalDays !== null
          ? current_daily_pace * p.totalDays
          : null;

      // Gap: how far the projection is from target (positive = behind)
      const gap =
        projected_final_value !== null
          ? Math.max(0, goal.target_value - projected_final_value)
          : p.remaining;

      return {
        id: goal.id,
        title: goal.title,
        goal_type: goal.goal_type,
        target_value: Number(goal.target_value),
        current_value: currentValue,
        unit: goal.unit,
        start_date: goal.start_date,
        target_date: goal.target_date,
        priority: goal.priority,
        risk_status,
        progress_pct: p.progressPct,
        remaining: p.remaining,
        remaining_days: p.remainingDays,
        required_daily_pace,
        current_daily_pace,
        projected_final_value,
        gap,
      };
    })
  );

  // Sort: CRITICAL → AT_RISK → WATCH → ON_TRACK → COMPLETE → NO_DATE
  const RISK_ORDER: Record<GoalRiskStatus, number> = {
    CRITICAL: 0,
    AT_RISK: 1,
    WATCH: 2,
    ON_TRACK: 3,
    COMPLETE: 4,
    NO_DATE: 5,
  };
  enriched.sort((a, b) => RISK_ORDER[a.risk_status] - RISK_ORDER[b.risk_status]);

  const summary: GoalRiskSummary = {
    items: enriched,
    critical_count: enriched.filter(g => g.risk_status === 'CRITICAL').length,
    at_risk_count: enriched.filter(g => g.risk_status === 'AT_RISK').length,
    watch_count: enriched.filter(g => g.risk_status === 'WATCH').length,
    on_track_count: enriched.filter(g => g.risk_status === 'ON_TRACK').length,
    complete_count: enriched.filter(g => g.risk_status === 'COMPLETE').length,
    has_any_risk: false,
  };
  summary.has_any_risk = summary.critical_count > 0 || summary.at_risk_count > 0;

  return summary;
}
