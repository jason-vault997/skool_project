// ============================================================
// BUILD100 — Phase 8: Application Backlog Engine
//
// Ranks all active (In Progress / Not Started with content)
// application_records and surfaces the highest-priority next
// experiment.
//
// Ranking algorithm (deterministic, no randomness):
//   Score = overdue_bonus + due_proximity + age_score
//
//   overdue_bonus:  commitment < today → +100
//   due_today:      commitment = today → +50
//   due_3_days:     commitment <= today+3 → +25
//   age_score:      elapsed days since created_at / 30 (FIFO)
//
// Canonical definitions (unchanged from Phase 4/7):
//   Applied  = In Progress + Completed + Failed
//   Executed = Completed + Failed
//   Successful = Completed
//
// This engine counts Completed and Failed separately.
// Both are considered executed — not failed in the "wasted" sense.
//
// Date comparisons use todayLocalYMD() for consistency.
// ============================================================

import { supabase } from '../supabase/client';
import { CLASSROOM_DATA } from '../../data/classroomCMS';
import { todayLocalYMD, offsetDate, daysBetween } from './dateUtils';
import type { ApplicationBacklog, BacklogItem } from './intelligenceTypes';

// Build a quick lookup map from lesson_id → lesson_title from the CMS
function buildLessonTitleMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const block of CLASSROOM_DATA) {
    for (const mod of block.modules) {
      for (const lesson of mod.lessons) {
        map.set(lesson.id, lesson.title);
      }
    }
  }
  return map;
}

const LESSON_TITLES = buildLessonTitleMap();

interface AppRow {
  lesson_id: string;
  mission: string | null;
  experiment: string | null;
  status: string;
  commitment: string | null;
  created_at: string;
}

type UrgencyType = 'overdue' | 'due_today' | 'due_3_days' | 'upcoming' | 'no_deadline';

function classifyUrgency(commitment: string | null, today: string, threeDaysOut: string): UrgencyType {
  if (!commitment) return 'no_deadline';
  if (commitment < today) return 'overdue';
  if (commitment === today) return 'due_today';
  if (commitment <= threeDaysOut) return 'due_3_days';
  return 'upcoming';
}

function computeRankScore(
  urgency: UrgencyType,
  createdAt: string,
  today: string
): number {
  let score = 0;
  switch (urgency) {
    case 'overdue':    score += 100; break;
    case 'due_today':  score += 50;  break;
    case 'due_3_days': score += 25;  break;
  }
  // FIFO: older records get slightly higher score
  const agedays = Math.max(0, daysBetween(createdAt.split('T')[0], today));
  score += agedays / 30;
  return score;
}

export async function computeApplicationBacklog(userId: string): Promise<ApplicationBacklog> {
  const empty: ApplicationBacklog = {
    active_count: 0,
    overdue_count: 0,
    due_today_count: 0,
    due_week_count: 0,
    upcoming_count: 0,
    completed_count: 0,
    failed_count: 0,
    sorted_backlog: [],
    next_recommended: null,
  };

  const { data, error } = await supabase
    .from('application_records')
    .select('lesson_id, mission, experiment, status, commitment, created_at')
    .eq('user_id', userId)
    .in('status', ['Not Started', 'In Progress', 'Completed', 'Failed']);

  if (error) {
    console.error('[applicationBacklogEngine] fetch error:', error.message);
    return empty;
  }

  const rows = (data ?? []) as AppRow[];
  if (rows.length === 0) return empty;

  const today = todayLocalYMD();
  const threeDaysOut = offsetDate(today, 3);
  const sevenDaysOut = offsetDate(today, 7);

  let active_count = 0;
  let overdue_count = 0;
  let due_today_count = 0;
  let due_week_count = 0;
  let upcoming_count = 0;
  let completed_count = 0;
  let failed_count = 0;

  const backlogItems: BacklogItem[] = [];

  for (const row of rows) {
    // Count Completed and Failed separately (they ARE executed, not backlog)
    if (row.status === 'Completed') { completed_count++; continue; }
    if (row.status === 'Failed') { failed_count++; continue; }

    // Active: In Progress or Not Started with actual content
    const hasContent = !!(row.mission || row.experiment);
    if (row.status === 'Not Started' && !hasContent) continue;

    const urgency = classifyUrgency(row.commitment, today, threeDaysOut);
    const rank_score = computeRankScore(urgency, row.created_at, today);

    active_count++;
    if (urgency === 'overdue') overdue_count++;
    if (urgency === 'due_today') due_today_count++;
    if (row.commitment && row.commitment > today && row.commitment <= sevenDaysOut) due_week_count++;
    if (urgency === 'upcoming') upcoming_count++;

    backlogItems.push({
      lesson_id: row.lesson_id,
      lesson_title: LESSON_TITLES.get(row.lesson_id) ?? null,
      mission: row.mission,
      experiment: row.experiment,
      status: row.status,
      commitment_date: row.commitment,
      created_at: row.created_at,
      urgency,
      rank_score,
    });
  }

  // Sort by rank_score descending (highest = most urgent)
  backlogItems.sort((a, b) => b.rank_score - a.rank_score);

  return {
    active_count,
    overdue_count,
    due_today_count,
    due_week_count,
    upcoming_count,
    completed_count,
    failed_count,
    sorted_backlog: backlogItems,
    next_recommended: backlogItems[0] ?? null,
  };
}
