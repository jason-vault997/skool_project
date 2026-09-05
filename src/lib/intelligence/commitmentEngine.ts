// ============================================================
// BUILD100 — Phase 8: Commitment Engine
//
// Monitors commitment deadlines stored in application_records.
// The `commitment` field is a YYYY-MM-DD date string set by
// the operator during the Application Engine workflow.
//
// Classification uses todayLocalYMD() as the single consistent
// "today" reference to avoid UTC/local off-by-one errors.
//
// Definitions:
//   overdue:    commitment < today AND status = 'In Progress'
//   due_today:  commitment = today AND status = 'In Progress'
//   due_3_days: commitment > today AND <= today+3 AND status = 'In Progress'
//   upcoming:   commitment > today+3 AND status = 'In Progress'
//   complete:   status = 'Completed'
//   failed:     status = 'Failed'
//
// Important: 'Skipped' and 'Not Started' are excluded.
// 'Failed' is not penalised — it is valid execution data.
// ============================================================

import { supabase } from '../supabase/client';
import { todayLocalYMD, offsetDate } from './dateUtils';
import type { CommitmentSummary, CommitmentItem, CommitmentUrgency } from './intelligenceTypes';

interface CommitmentRow {
  lesson_id: string;
  mission: string | null;
  experiment: string | null;
  commitment: string | null;
  status: string;
}

/**
 * Classifies a single commitment by urgency.
 * Uses the provided today string for consistent comparison.
 */
function classifyUrgency(
  commitment: string,
  status: string,
  today: string,
  threeDaysOut: string
): CommitmentUrgency {
  if (status === 'Completed') return 'complete';
  if (status === 'Failed') return 'failed';
  // Only 'In Progress' records below this point
  if (commitment < today) return 'overdue';
  if (commitment === today) return 'due_today';
  if (commitment <= threeDaysOut) return 'due_3_days';
  return 'upcoming';
}

const URGENCY_ORDER: Record<CommitmentUrgency, number> = {
  overdue:    0,
  due_today:  1,
  due_3_days: 2,
  upcoming:   3,
  complete:   4,
  failed:     5,
};

/**
 * Fetches and classifies all application records with a commitment date.
 * Returns CommitmentSummary with counts and sorted item list.
 */
export async function computeCommitmentSummary(userId: string): Promise<CommitmentSummary> {
  const empty: CommitmentSummary = {
    overdue: 0,
    due_today: 0,
    due_3_days: 0,
    upcoming: 0,
    complete: 0,
    failed: 0,
    total_active: 0,
    items: [],
  };

  const { data, error } = await supabase
    .from('application_records')
    .select('lesson_id, mission, experiment, commitment, status')
    .eq('user_id', userId)
    .not('commitment', 'is', null)
    // Only statuses that have meaningful commitment context
    .in('status', ['In Progress', 'Completed', 'Failed']);

  if (error) {
    console.error('[commitmentEngine] fetch error:', error.message);
    return empty;
  }

  const rows = (data ?? []) as CommitmentRow[];
  if (rows.length === 0) return empty;

  const today = todayLocalYMD();
  const threeDaysOut = offsetDate(today, 3);

  const summary: CommitmentSummary = { ...empty };
  const items: CommitmentItem[] = [];

  for (const row of rows) {
    if (!row.commitment) continue;

    const urgency = classifyUrgency(row.commitment, row.status, today, threeDaysOut);

    items.push({
      lesson_id: row.lesson_id,
      mission: row.mission,
      experiment: row.experiment,
      commitment_date: row.commitment,
      urgency,
      status: row.status,
    });

    switch (urgency) {
      case 'overdue':    summary.overdue++;    summary.total_active++; break;
      case 'due_today':  summary.due_today++;  summary.total_active++; break;
      case 'due_3_days': summary.due_3_days++; summary.total_active++; break;
      case 'upcoming':   summary.upcoming++;   summary.total_active++; break;
      case 'complete':   summary.complete++;   break;
      case 'failed':     summary.failed++;     break;
    }
  }

  // Sort: overdue first → due_today → due_3_days → upcoming → complete → failed
  // Within same urgency: earliest deadline first
  items.sort((a, b) => {
    const urgencyDiff = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;
    return a.commitment_date.localeCompare(b.commitment_date);
  });

  summary.items = items;
  return summary;
}
