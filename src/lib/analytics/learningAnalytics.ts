// ============================================================
// BUILD100 — Phase 7: Learning & Application Analytics
//
// Definitions (Phase 7 corrections applied):
//
//   STARTED   = classroom_progress where:
//               progress_pct > 0 OR last_pos_sec > 0 OR completed = true
//               (blank/zero-progress records are NOT counted)
//
//   COMPLETED = classroom_progress.completed = true
//
//   APPLIED   = application_records.status IN ['In Progress', 'Completed', 'Failed']
//
//   EXECUTED  = application_records.status IN ['Completed', 'Failed']
//
//   SUCCESSFUL= application_records.status = 'Completed'
//
//   FAILED    = application_records.status = 'Failed'
//
//   SKIPPED   = application_records.status = 'Skipped'
//
//   Not Started / null = NOT applied
// ============================================================

import { supabase } from '../supabase/client';
import type { LearningFunnel, ApplicationBreakdown } from './types';

// ── Raw types ─────────────────────────────────────────────────

export interface ProgressRow {
  lesson_id: string;
  progress_pct: number;
  completed: boolean;
  last_pos_sec: number;
  completed_at: string | null;
}

export interface AppStatusRow {
  lesson_id: string;
  status: string;
}

// ── Fetching ──────────────────────────────────────────────────

export async function fetchLearningRawData(userId: string): Promise<{
  progressRows: ProgressRow[];
  appRows: AppStatusRow[];
}> {
  const [progressResult, appResult] = await Promise.all([
    supabase
      .from('classroom_progress')
      .select('lesson_id, progress_pct, completed, last_pos_sec, completed_at')
      .eq('user_id', userId),
    supabase
      .from('application_records')
      .select('lesson_id, status')
      .eq('user_id', userId),
  ]);

  if (progressResult.error) {
    console.error('[learningAnalytics] classroom_progress:', progressResult.error.message);
  }
  if (appResult.error) {
    console.error('[learningAnalytics] application_records:', appResult.error.message);
  }

  return {
    progressRows: (progressResult.data ?? []) as ProgressRow[],
    appRows:      (appResult.data      ?? []) as AppStatusRow[],
  };
}

// ── Learning funnel calculation ───────────────────────────────

const APPLIED_STATUSES  = new Set(['In Progress', 'Completed', 'Failed']);
const EXECUTED_STATUSES = new Set(['Completed', 'Failed']);

export function calculateLearningFunnel(
  progressRows: ProgressRow[],
  appRows: AppStatusRow[]
): LearningFunnel {
  // Started: has any meaningful progress
  const started   = progressRows.filter(
    r => r.progress_pct > 0 || r.last_pos_sec > 0 || r.completed === true
  ).length;

  const completed = progressRows.filter(r => r.completed === true).length;

  // Application status counts (per unique lesson_id)
  const appMap = new Map<string, string>();
  for (const row of appRows) appMap.set(row.lesson_id, row.status);

  let applied = 0, executed = 0, successful = 0, failed_apps = 0, skipped_apps = 0;
  for (const [, status] of appMap) {
    if (APPLIED_STATUSES.has(status))  applied++;
    if (EXECUTED_STATUSES.has(status)) executed++;
    if (status === 'Completed') successful++;
    if (status === 'Failed')    failed_apps++;
    if (status === 'Skipped')   skipped_apps++;
  }

  return {
    started,
    completed,
    applied,
    executed,
    successful,
    failed_apps,
    skipped_apps,
    started_to_completed_pct: started   > 0 ? Math.round((completed  / started)   * 100) : null,
    completed_to_applied_pct: completed > 0 ? Math.round((applied    / completed) * 100) : null,
    applied_to_executed_pct:  applied   > 0 ? Math.round((executed   / applied)   * 100) : null,
  };
}

// ── Application breakdown ─────────────────────────────────────

export function calculateApplicationBreakdown(
  appRows: AppStatusRow[],
  allTimeCompletedLessons: number
): ApplicationBreakdown {
  let not_started = 0, in_progress = 0, completed = 0, failed = 0, skipped = 0;

  for (const row of appRows) {
    switch (row.status) {
      case 'Not Started': not_started++; break;
      case 'In Progress': in_progress++; break;
      case 'Completed':   completed++;   break;
      case 'Failed':      failed++;      break;
      case 'Skipped':     skipped++;     break;
    }
  }

  const applied = in_progress + completed + failed;
  const application_rate = allTimeCompletedLessons > 0
    ? Math.round((applied / allTimeCompletedLessons) * 100)
    : null;

  return {
    not_started,
    in_progress,
    completed,
    failed,
    skipped,
    total_records: appRows.length,
    application_rate,
  };
}
