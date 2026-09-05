// ============================================================
// BUILD100 — Phase 7: Execution / Learning Ratio
//
// Formula (corrected per Phase 7 spec):
//
//   execution_actions = leads + sales_calls + clients_closed + content_posted
//
//   hours_worked is NOT included in execution_actions.
//   Hours are a different dimensional unit from counts of actions.
//   Hours worked is tracked separately as an effort metric.
//
//   execution_learning_ratio = execution_actions / all_time_completed_lessons
//
// This is a DIRECTIONAL ACTIVITY RATIO, not a productivity measurement.
//
//   ratio > 1.0  →  more execution actions than completed lessons (execution-heavy)
//   ratio < 1.0  →  fewer execution actions than lessons (learning-heavy)
//   ratio = null →  all_time_completed_lessons = 0 (no division by zero)
//
// Numerator scope: the selected date range period (business_metrics data).
// Denominator scope: all-time (stable baseline — avoids artificially high ratios
//   in short periods where few lessons were completed but many actions taken).
// ============================================================

import type { ExecutionLearningData } from './types';

/**
 * Calculates the Execution / Learning Ratio.
 *
 * @param periodLeads            leads in the selected period
 * @param periodSalesCalls       sales_calls in the selected period
 * @param periodClientsClosed    clients_closed in the selected period
 * @param periodContentPosted    content_posted in the selected period
 * @param periodHoursWorked      hours_worked in the selected period (separate metric)
 * @param allTimeCompletedLessons total lessons ever completed (all-time)
 */
export function calculateExecutionLearning(
  periodLeads: number,
  periodSalesCalls: number,
  periodClientsClosed: number,
  periodContentPosted: number,
  periodHoursWorked: number,
  allTimeCompletedLessons: number
): ExecutionLearningData {
  const execution_actions =
    periodLeads + periodSalesCalls + periodClientsClosed + periodContentPosted;

  const execution_learning_ratio =
    allTimeCompletedLessons > 0
      ? Math.round((execution_actions / allTimeCompletedLessons) * 10) / 10
      : null;

  return {
    execution_actions,
    all_time_completed_lessons: allTimeCompletedLessons,
    execution_learning_ratio,
    hours_worked: periodHoursWorked,
  };
}
