// ============================================================
// BUILD100 — Phase 7: Goal Analytics
//
// Reuses Phase 6 goal data access and progress calculation engine.
// Does NOT create competing goal-progress logic.
//
// Phase 6 sources used:
//   getAllGoals()         → businessGoals.ts
//   getGoalCurrentValue() → businessGoals.ts
//   calculateGoalProgress()→ business/goalProgress.ts
//
// Maps results onto GoalAnalyticsItem (analytics/types.ts) to
// avoid circular imports between analytics/ and business/ layers.
// ============================================================

import { getAllGoals, getGoalCurrentValue } from '../data/businessGoals';
import { calculateGoalProgress } from '../business/goalProgress';
import type { GoalAnalytics, GoalAnalyticsItem } from './types';
import type { BusinessGoal } from '../supabase/types';

export async function getGoalAnalytics(userId: string): Promise<GoalAnalytics> {
  const allGoals = await getAllGoals(userId);

  const active    = allGoals.filter(g => g.status === 'active');
  const completed = allGoals.filter(g => g.status === 'completed');
  const paused    = allGoals.filter(g => g.status === 'paused');
  const abandoned = allGoals.filter(g => g.status === 'abandoned');

  // Enrich active goals — reuse Phase 6 computation
  const enriched: GoalAnalyticsItem[] = await Promise.all(
    active.map(async (goal: BusinessGoal): Promise<GoalAnalyticsItem> => {
      const currentValue = await getGoalCurrentValue(userId, goal);
      const p = calculateGoalProgress(goal, currentValue);
      return {
        id:           goal.id,
        title:        goal.title,
        goal_type:    goal.goal_type,
        target_value: goal.target_value,
        current_value: currentValue,
        unit:         goal.unit,
        start_date:   goal.start_date,
        target_date:  goal.target_date,
        status:       goal.status,
        priority:     goal.priority,
        progress: {
          progressPct:   p.progressPct,
          remaining:     p.remaining,
          requiredPace:  p.requiredPace,
          isOnTrack:     p.isOnTrack,
          trackSignal:   p.trackSignal,
          elapsedDays:   p.elapsedDays,
          remainingDays: p.remainingDays,
          totalDays:     p.totalDays,
        },
      };
    })
  );

  return {
    active:          enriched,
    active_count:    active.length,
    completed_count: completed.length,
    paused_count:    paused.length,
    abandoned_count: abandoned.length,
  };
}
