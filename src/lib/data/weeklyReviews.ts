// ============================================================
// BUILD100 — Phase 6: Weekly Reviews Data Access Layer
// Handles business_metrics aggregation and weekly_reviews CRUD.
//
// Week boundaries: always Monday (week_start) → Sunday (week_end).
// Metric numbers are auto-aggregated; never manually entered.
// ============================================================

import { supabase } from '../supabase/client';
import type { WeeklyReview } from '../supabase/types';

// ── WeekMetrics: aggregated business data for a date range ──

export interface WeekMetrics {
  leads:          number;
  sales_calls:    number;
  clients_closed: number;
  revenue:        number;
  content_posted: number;
  hours_worked:   number;
}

export const EMPTY_METRICS: WeekMetrics = {
  leads:          0,
  sales_calls:    0,
  clients_closed: 0,
  revenue:        0,
  content_posted: 0,
  hours_worked:   0,
};

// ── Week boundary helpers ────────────────────────────────────

/**
 * Returns the Monday and Sunday of the week containing `date` (default: today).
 * Always produces explicit date strings in 'YYYY-MM-DD' format.
 * Day-of-week math: 0=Sun, 1=Mon, ..., 6=Sat
 */
export function getWeekBounds(date?: Date): { weekStart: string; weekEnd: string } {
  const d = date ? new Date(date) : new Date();
  d.setHours(0, 0, 0, 0);

  const dow = d.getDay();
  const daysFromMonday = dow === 0 ? 6 : dow - 1; // Sunday wraps to 6

  const monday = new Date(d);
  monday.setDate(d.getDate() - daysFromMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    weekStart: monday.toISOString().split('T')[0],
    weekEnd:   sunday.toISOString().split('T')[0],
  };
}

/** Returns the week bounds for the week immediately before `weekStart`. */
export function getPreviousWeekBounds(weekStart: string): { weekStart: string; weekEnd: string } {
  const d = new Date(weekStart + 'T00:00:00');
  d.setDate(d.getDate() - 7);
  return getWeekBounds(d);
}

/** Navigate N weeks relative to weekStart. Positive = forward, negative = back. */
export function offsetWeekBounds(
  weekStart: string,
  weeks: number
): { weekStart: string; weekEnd: string } {
  const d = new Date(weekStart + 'T00:00:00');
  d.setDate(d.getDate() + weeks * 7);
  return getWeekBounds(d);
}

// ── Metric aggregation ───────────────────────────────────────

/**
 * Aggregates business_metrics for a given userId and date range (inclusive).
 * Returns EMPTY_METRICS (all zeros) if no data exists — never returns null.
 */
export async function getWeekMetrics(
  userId: string,
  weekStart: string,
  weekEnd: string
): Promise<WeekMetrics> {
  const { data, error } = await supabase
    .from('business_metrics')
    .select('leads, sales_calls, clients_closed, revenue, content_posted, hours_worked')
    .eq('user_id', userId)
    .gte('date', weekStart)
    .lte('date', weekEnd);

  if (error) {
    console.error('[weeklyReviews] getWeekMetrics:', error.message);
    return { ...EMPTY_METRICS };
  }

  if (!data || data.length === 0) return { ...EMPTY_METRICS };

  return data.reduce(
    (acc, row) => ({
      leads:          acc.leads          + (row.leads          ?? 0),
      sales_calls:    acc.sales_calls    + (row.sales_calls    ?? 0),
      clients_closed: acc.clients_closed + (row.clients_closed ?? 0),
      revenue:        acc.revenue        + Number(row.revenue   ?? 0),
      content_posted: acc.content_posted + (row.content_posted ?? 0),
      hours_worked:   acc.hours_worked   + Number(row.hours_worked ?? 0),
    }),
    { ...EMPTY_METRICS }
  );
}

/** Returns true if a WeekMetrics has at least one non-zero value. */
export function hasAnyMetrics(m: WeekMetrics): boolean {
  return (
    m.leads > 0 || m.sales_calls > 0 || m.clients_closed > 0 ||
    m.revenue > 0 || m.content_posted > 0 || m.hours_worked > 0
  );
}

// ── Review CRUD ──────────────────────────────────────────────

/**
 * Fetches or creates the weekly_review for the given week.
 *
 * If the review is a DRAFT: refreshes metric fields from business_metrics on every load.
 * If the review is COMPLETED: returns the frozen record as-is.
 *
 * Returns a safe default object (with empty id) on DB failure — callers must
 * check review.id before attempting writes.
 */
export async function getOrCreateReview(
  userId: string,
  weekStart: string,
  weekEnd: string
): Promise<WeeklyReview> {
  // Try to find existing record
  const { data: existing, error: fetchErr } = await supabase
    .from('weekly_reviews')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (existing && !fetchErr) {
    // For completed reviews: don't overwrite frozen metrics
    if (existing.status === 'completed') {
      return existing as WeeklyReview;
    }

    // For draft reviews: refresh metric snapshot from business_metrics
    const metrics = await getWeekMetrics(userId, weekStart, weekEnd);
    const { data: refreshed } = await supabase
      .from('weekly_reviews')
      .update(metrics)
      .eq('id', existing.id)
      .select()
      .single();

    return (refreshed ?? existing) as WeeklyReview;
  }

  // Create a fresh review
  const metrics = await getWeekMetrics(userId, weekStart, weekEnd);

  const { data: created, error: createErr } = await supabase
    .from('weekly_reviews')
    .insert({ user_id: userId, week_start: weekStart, week_end: weekEnd, ...metrics })
    .select()
    .single();

  if (createErr || !created) {
    console.error('[weeklyReviews] getOrCreateReview create failed:', createErr?.message);
    // Return an in-memory default — id='' signals that no DB record exists yet
    return {
      id: '',
      user_id: userId,
      week_start: weekStart,
      week_end:   weekEnd,
      ...metrics,
      biggest_win:        null,
      biggest_failure:    null,
      what_worked:        null,
      what_did_not_work:  null,
      key_learning:       null,
      bottleneck:         null,
      next_week_priority: null,
      next_week_action:   null,
      notes:              null,
      status:             'draft',
      created_at:         new Date().toISOString(),
      updated_at:         new Date().toISOString(),
      completed_at:       null,
    } as WeeklyReview;
  }

  return created as WeeklyReview;
}

/** Partially updates debrief fields on a review. */
export async function saveReviewFields(
  reviewId: string,
  fields: Partial<Pick<WeeklyReview,
    'biggest_win' | 'biggest_failure' | 'what_worked' | 'what_did_not_work' |
    'key_learning' | 'bottleneck' | 'next_week_priority' | 'next_week_action' | 'notes'
  >>
): Promise<WeeklyReview | null> {
  const { data, error } = await supabase
    .from('weekly_reviews')
    .update(fields)
    .eq('id', reviewId)
    .select()
    .single();

  if (error) {
    console.error('[weeklyReviews] saveReviewFields:', error.message);
    return null;
  }
  return data as WeeklyReview;
}

/**
 * Closes the week: sets status='completed'.
 * IMPORTANT: only call this after weekEnd has passed (enforced in UI).
 */
export async function completeReview(reviewId: string): Promise<WeeklyReview | null> {
  const { data, error } = await supabase
    .from('weekly_reviews')
    .update({ status: 'completed' })
    .eq('id', reviewId)
    .select()
    .single();

  if (error) {
    console.error('[weeklyReviews] completeReview:', error.message);
    return null;
  }
  return data as WeeklyReview;
}

/** Re-opens a completed review for editing (status → 'draft'). */
export async function reopenReview(reviewId: string): Promise<WeeklyReview | null> {
  const { data, error } = await supabase
    .from('weekly_reviews')
    .update({ status: 'draft' })
    .eq('id', reviewId)
    .select()
    .single();

  if (error) {
    console.error('[weeklyReviews] reopenReview:', error.message);
    return null;
  }
  return data as WeeklyReview;
}

/** Returns up to `limit` reviews ordered by week_start DESC. */
export async function getRecentReviews(
  userId: string,
  limit = 8
): Promise<WeeklyReview[]> {
  const { data, error } = await supabase
    .from('weekly_reviews')
    .select('*')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[weeklyReviews] getRecentReviews:', error.message);
    return [];
  }
  return (data ?? []) as WeeklyReview[];
}

/** Returns the most recently completed weekly review, or null if none. */
export async function getLastCompletedReview(userId: string): Promise<WeeklyReview | null> {
  const { data, error } = await supabase
    .from('weekly_reviews')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data as WeeklyReview | null;
}
