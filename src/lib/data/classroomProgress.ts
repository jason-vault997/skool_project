import { supabase } from '../supabase/client';

export interface ClassroomProgressRow {
  lesson_id: string;
  progress_pct: number;
  completed: boolean;
  last_pos_sec: number;
  completed_at: string | null;
}

/** Fetch all progress rows for the given user, keyed by lesson_id */
export async function getLessonProgressMap(userId: string): Promise<Map<string, ClassroomProgressRow>> {
  const { data, error } = await supabase
    .from('classroom_progress')
    .select('lesson_id, progress_pct, completed, last_pos_sec, completed_at')
    .eq('user_id', userId);

  if (error) {
    console.error('[classroomProgress] fetch error:', error.message);
    return new Map();
  }

  const rows = (data ?? []) as ClassroomProgressRow[];
  return new Map(rows.map(r => [r.lesson_id, r]));
}

/** Upsert progress for a single lesson */
export async function upsertLessonProgress(
  userId: string,
  lessonId: string,
  progressPct: number,
  lastPosSec: number,
  completed: boolean
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('classroom_progress')
    .upsert({
      user_id: userId,
      lesson_id: lessonId,
      progress_pct: Math.min(100, Math.max(0, progressPct)),
      last_pos_sec: lastPosSec,
      completed,
      completed_at: completed ? now : null,
      updated_at: now,
    }, { onConflict: 'user_id,lesson_id' });

  if (error) {
    console.error('[classroomProgress] upsert error:', error.message);
  }
}

/** Mark a lesson as 100% complete */
export async function markLessonComplete(userId: string, lessonId: string): Promise<void> {
  await upsertLessonProgress(userId, lessonId, 100, 0, true);
}

/** Mark a lesson as not started (reset) */
export async function resetLessonProgress(userId: string, lessonId: string): Promise<void> {
  await upsertLessonProgress(userId, lessonId, 0, 0, false);
}
