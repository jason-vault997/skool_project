// ============================================================
// BUILD100 — Phase 6: Goal Progress Calculation Engine
//
// Pure calculation utility — no Supabase calls, no side effects.
// All input/output is typed. No `any`.
//
// Corrections applied:
//   - 0% actual progress IS valid data (not filtered out)
//   - On-track requires start_date + target_date, NOT current_value > 0
//   - target_value = 0 is guarded against (DB also enforces target_value > 0)
//   - required_pace handles expired target_date (returns null)
// ============================================================

import type { BusinessGoal } from '../supabase/types';

export type TrackSignal = 'ahead' | 'on-track' | 'behind' | 'no-data';

export interface GoalProgressResult {
  /** Clamped 0–100. Represents actual progress. */
  progressPct: number;
  /** target - current (never negative). */
  remaining: number;
  /** Units per week needed to hit target. Null if target_date passed or no date data. */
  requiredPace: number | null;
  /** null if insufficient date data (needs start_date + target_date). */
  isOnTrack: boolean | null;
  trackSignal: TrackSignal;
  /** Days since start_date. Null if start_date missing. */
  elapsedDays: number | null;
  /** Days until target_date. 0 if target_date is today or past. Null if target_date missing. */
  remainingDays: number | null;
  /** Total days in goal period (target_date - start_date). Null if either date missing. */
  totalDays: number | null;
}

/**
 * Calculates goal progress and on-track signal.
 *
 * @param goal - The BusinessGoal DB record
 * @param computedCurrentValue - For connected goal types, pass the value computed
 *   from business_metrics. For 'custom' goals, omit this and goal.current_value is used.
 */
export function calculateGoalProgress(
  goal: BusinessGoal,
  computedCurrentValue?: number
): GoalProgressResult {
  const current = computedCurrentValue !== undefined ? computedCurrentValue : goal.current_value;
  const target  = Number(goal.target_value);

  // Guard: target must be positive (DB constraint enforces this, but be safe)
  if (!target || target <= 0) {
    return {
      progressPct:   0,
      remaining:     0,
      requiredPace:  null,
      isOnTrack:     null,
      trackSignal:   'no-data',
      elapsedDays:   null,
      remainingDays: null,
      totalDays:     null,
    };
  }

  const progressPct = Math.min(100, Math.max(0, Math.round((current / target) * 100)));
  const remaining   = Math.max(0, target - current);

  // Default: no date-based forecasting
  let trackSignal:  TrackSignal = 'no-data';
  let isOnTrack:    boolean | null = null;
  let elapsedDays:  number | null = null;
  let remainingDays: number | null = null;
  let totalDays:    number | null = null;
  let requiredPace: number | null = null;

  if (goal.start_date && goal.target_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(goal.start_date + 'T00:00:00');
    const end   = new Date(goal.target_date + 'T00:00:00');

    totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));

    // elapsedDays: clamped to [0, totalDays] — can't be "before start" or "past end"
    const rawElapsed = Math.round((today.getTime() - start.getTime()) / 86_400_000);
    elapsedDays = Math.min(totalDays, Math.max(0, rawElapsed));

    // remainingDays: how many calendar days until target_date (0 if past)
    remainingDays = Math.max(0, Math.round((end.getTime() - today.getTime()) / 86_400_000));

    // Expected progress at this point in time
    const expectedPct = (elapsedDays / totalDays) * 100;

    // On-track thresholds: ±10 percentage points of expected pace
    // A 0% actual result when 30% of time has elapsed IS "behind" — this is correct.
    if (progressPct >= Math.min(100, expectedPct + 10)) {
      trackSignal = 'ahead';
      isOnTrack   = true;
    } else if (progressPct >= expectedPct - 10) {
      trackSignal = 'on-track';
      isOnTrack   = true;
    } else {
      trackSignal = 'behind';
      isOnTrack   = false;
    }

    // Required pace: units needed per week to hit target from today
    // If target_date has passed: don't produce infinite/invalid values
    if (remainingDays > 0 && remaining > 0) {
      const remainingWeeks = remainingDays / 7;
      // Round up to 1 decimal — never show 0 if there's still remaining work
      requiredPace = Math.ceil((remaining / remainingWeeks) * 10) / 10;
    }
    // else: either already hit target (remaining=0) or deadline passed (remainingDays=0)
    // → leave requiredPace as null in both cases
  }

  return {
    progressPct,
    remaining,
    requiredPace,
    isOnTrack,
    trackSignal,
    elapsedDays,
    remainingDays,
    totalDays,
  };
}

// ── Display helpers ───────────────────────────────────────────

export const TRACK_SIGNAL_LABELS: Record<TrackSignal, string> = {
  'ahead':    'Ahead',
  'on-track': 'On track',
  'behind':   'Behind',
  'no-data':  '',
};

export const TRACK_SIGNAL_COLORS: Record<TrackSignal, string> = {
  'ahead':    'var(--accent-emerald)',
  'on-track': 'var(--accent-blue)',
  'behind':   'var(--accent-rose)',
  'no-data':  'var(--text-muted)',
};
