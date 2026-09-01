// ============================================================
// BUILD100 — Phase 4: Application Engine Data Access Layer
// Handles all Supabase reads/writes for application_records.
// ============================================================

import { supabase } from '../supabase/client';
import {
  ApplicationRecord,
  ApplicationStatus,
  AppIndicatorStatus,
} from '../supabase/types';

const TABLE = 'application_records';

const SELECT_FIELDS = [
  'id', 'lesson_id', 'notes', 'key_concepts', 'importance',
  'mission', 'commitment', 'experiment', 'status',
  'outcome', 'reflection', 'review_date',
  'created_at', 'updated_at', 'completed_at',
].join(', ');

// ── Fetch ────────────────────────────────────────────────────

/** Fetch the application record for a single lesson. Returns null if none exists. */
export async function getApplicationRecord(
  userId: string,
  lessonId: string
): Promise<ApplicationRecord | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT_FIELDS)
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (error) {
    console.error('[applicationRecords] fetch error:', error.message);
    return null;
  }

  return data as unknown as ApplicationRecord | null;
}

/** Fetch all application records for the user, returned as a Map keyed by lesson_id. */
export async function getAllApplicationRecords(
  userId: string
): Promise<Map<string, ApplicationRecord>> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT_FIELDS)
    .eq('user_id', userId);

  if (error) {
    console.error('[applicationRecords] fetch-all error:', error.message);
    return new Map();
  }

  const rows = (data ?? []) as unknown as ApplicationRecord[];
  return new Map(rows.map(r => [r.lesson_id, r]));
}

// ── Upsert ───────────────────────────────────────────────────

export interface ApplicationFields {
  notes?: string;
  key_concepts?: string;
  importance?: string;
  mission?: string;
  commitment?: string;
  experiment?: string;
  status?: ApplicationStatus;
  outcome?: string;
  reflection?: string;
  review_date?: string | null;
}

/**
 * Create or update (upsert) the application record for a lesson.
 * Uses UNIQUE(user_id, lesson_id) conflict target.
 * Returns the saved record, or null on error.
 */
export async function upsertApplicationRecord(
  userId: string,
  lessonId: string,
  fields: ApplicationFields
): Promise<ApplicationRecord | null> {
  const now = new Date().toISOString();

  const payload = {
    user_id:      userId,
    lesson_id:    lessonId,
    notes:        fields.notes        ?? null,
    key_concepts: fields.key_concepts ?? null,
    importance:   fields.importance   ?? null,
    mission:      fields.mission      ?? null,
    commitment:   fields.commitment   ?? null,
    experiment:   fields.experiment   ?? null,
    status:       fields.status       ?? 'Not Started',
    outcome:      fields.outcome      ?? null,
    reflection:   fields.reflection   ?? null,
    review_date:  fields.review_date  ?? null,
    updated_at:   now,
  };

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(payload, { onConflict: 'user_id,lesson_id' })
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    console.error('[applicationRecords] upsert error:', error.message);
    return null;
  }

  return data as unknown as ApplicationRecord;
}

// ── Delete ───────────────────────────────────────────────────

/** Delete the application record for a lesson (full reset). */
export async function deleteApplicationRecord(
  userId: string,
  lessonId: string
): Promise<boolean> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('user_id', userId)
    .eq('lesson_id', lessonId);

  if (error) {
    console.error('[applicationRecords] delete error:', error.message);
    return false;
  }
  return true;
}

// ── Helpers ──────────────────────────────────────────────────

/**
 * Derive sidebar indicator status from an application record.
 * none     = no record exists
 * started  = record exists but status is Not Started or In Progress
 * completed = status is Completed
 * failed   = status is Failed
 */
export function getAppIndicatorStatus(
  record: ApplicationRecord | null | undefined
): AppIndicatorStatus {
  if (!record) return 'none';
  if (record.status === 'Completed') return 'completed';
  if (record.status === 'Failed') return 'failed';
  // Has a record but not completed/failed → started
  const hasContent = !!(
    record.notes || record.mission || record.commitment ||
    record.key_concepts || record.outcome || record.reflection
  );
  return hasContent || record.status !== 'Not Started' ? 'started' : 'none';
}

/**
 * Build a Map<lessonId, AppIndicatorStatus> from the full application records map.
 * Used to show sidebar indicators efficiently without per-lesson fetches.
 */
export function buildAppIndicatorMap(
  records: Map<string, ApplicationRecord>
): Map<string, AppIndicatorStatus> {
  const result = new Map<string, AppIndicatorStatus>();
  for (const [lessonId, record] of records) {
    result.set(lessonId, getAppIndicatorStatus(record));
  }
  return result;
}

/**
 * Count application records at block level for summary stats.
 * Returns { total: number, started: number, completed: number }
 */
export function calcBlockApplicationStats(
  lessonIds: string[],
  records: Map<string, ApplicationRecord>
): { total: number; started: number; completed: number } {
  let started = 0;
  let completed = 0;
  for (const id of lessonIds) {
    const rec = records.get(id);
    if (!rec) continue;
    const status = getAppIndicatorStatus(rec);
    if (status === 'completed') completed++;
    else if (status === 'started') started++;
  }
  return { total: lessonIds.length, started, completed };
}
