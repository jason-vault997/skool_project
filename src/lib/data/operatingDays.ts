// ============================================================
// BUILD100 — Phase 9: Operating Days Data Access
//
// Manages operating_days table.
// One row per local operating date per user.
// Source of truth for: day state, streak calculation, day numbers.
//
// Streak rules:
//   A day contributes to streak only when:
//     operating_date >= operating_start_date
//     AND operating_date <= today (local)
//     AND status IN ('started', 'completed')
//   Dates before operating_start_date are ignored.
//   Future dates are ignored.
// ============================================================

import { supabase } from '../supabase/client';
import type { OperatingDay, OperatingDayInsert, OperatingDayStatus } from '../supabase/types';

const TABLE = 'operating_days';

// ── Timezone Utilities ────────────────────────────────────────

/** Get today's local date string in the given IANA timezone. */
export function localDateInTz(tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { // en-CA gives YYYY-MM-DD
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Parse 'YYYY-MM-DD' as local midnight (no timezone shift). */
export function parseLocalDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

/** Format a Date to 'YYYY-MM-DD' in the given IANA timezone. */
export function formatDateInTz(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

// ── Data Access ───────────────────────────────────────────────

/** Get a single operating day record by local date. */
export async function getOperatingDay(
  userId: string,
  date: string // 'YYYY-MM-DD'
): Promise<OperatingDay | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  if (error) {
    console.error('[operatingDays] getOperatingDay error:', error.message);
    return null;
  }

  return data as OperatingDay | null;
}

/** Get operating days for a date range, ordered ascending. */
export async function getOperatingDaysInRange(
  userId: string,
  fromDate: string,  // 'YYYY-MM-DD'
  toDate: string     // 'YYYY-MM-DD'
): Promise<OperatingDay[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: true });

  if (error) {
    console.error('[operatingDays] getOperatingDaysInRange error:', error.message);
    return [];
  }

  return (data ?? []) as OperatingDay[];
}

/** Get the most recent N operating days. */
export async function getRecentOperatingDays(
  userId: string,
  limit = 35
): Promise<OperatingDay[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[operatingDays] getRecentOperatingDays error:', error.message);
    return [];
  }

  return (data ?? []) as OperatingDay[];
}

/** Upsert an operating day. */
export async function upsertOperatingDay(
  payload: OperatingDayInsert
): Promise<OperatingDay | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      { ...payload, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single();

  if (error) {
    console.error('[operatingDays] upsertOperatingDay error:', error.message);
    return null;
  }

  return data as OperatingDay;
}

/** Mark a day as started (on first check-in of the day). */
export async function markDayStarted(
  userId: string,
  date: string  // 'YYYY-MM-DD'
): Promise<OperatingDay | null> {
  return upsertOperatingDay({
    user_id: userId,
    date,
    status: 'started',
    total_work_minutes: 0,
    notes: null,
  });
}

/** Update the total_work_minutes for a day after a session is closed. */
export async function updateDayWorkMinutes(
  userId: string,
  date: string,
  totalWorkMinutes: number,
  status: OperatingDayStatus = 'completed'
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({
      total_work_minutes: totalWorkMinutes,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('date', date);

  if (error) {
    console.error('[operatingDays] updateDayWorkMinutes error:', error.message);
  }
}

// ── Streak Calculation ────────────────────────────────────────

export interface StreakResult {
  currentStreak: number;
  bestStreak: number;
  totalOperatingDays: number;
  missedDays: number;
}

/**
 * Calculate streak from operating_days data.
 * Rules:
 *   - Only days >= operating_start_date are considered.
 *   - Only days <= today (local) are considered.
 *   - A day contributes if status IN ('started', 'completed').
 *   - A day with status = 'not_started' or 'missed' AFTER operating_start_date
 *     and before today breaks the current streak.
 *   - Future dates are ignored.
 */
export function calculateStreakFromDays(
  days: OperatingDay[],
  todayLocal: string,        // 'YYYY-MM-DD'
  operatingStartDate: string // 'YYYY-MM-DD'
): StreakResult {
  // Only consider days in the operating period, up to today
  const relevant = days
    .filter(d => d.date >= operatingStartDate && d.date <= todayLocal)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Build a map for quick lookup
  const dayMap = new Map(relevant.map(d => [d.date, d.status]));

  // Build all dates from start to today
  const allDates: string[] = [];
  const start = parseLocalDate(operatingStartDate);
  const end = parseLocalDate(todayLocal);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const ds = d.toISOString().split('T')[0];
    allDates.push(ds);
  }

  // Calculate current streak (from today backwards, stop at first non-active day)
  let currentStreak = 0;
  for (let i = allDates.length - 1; i >= 0; i--) {
    const ds = allDates[i];
    const status = dayMap.get(ds) ?? 'not_started';
    if (status === 'started' || status === 'completed') {
      currentStreak++;
    } else {
      break; // Streak broken
    }
  }

  // Calculate best streak
  let bestStreak = 0;
  let run = 0;
  for (const ds of allDates) {
    const status = dayMap.get(ds) ?? 'not_started';
    if (status === 'started' || status === 'completed') {
      run++;
      if (run > bestStreak) bestStreak = run;
    } else {
      run = 0;
    }
  }

  const totalOperatingDays = relevant.filter(
    d => d.status === 'started' || d.status === 'completed'
  ).length;

  const missedDays = allDates.filter(ds => {
    const status = dayMap.get(ds) ?? 'not_started';
    return status === 'missed' || status === 'not_started';
  }).length;

  return { currentStreak, bestStreak, totalOperatingDays, missedDays };
}

/** Sync profiles.streak_days from calculated streak (keeps Dashboard/Leaderboard compatible). */
export async function syncStreakToProfile(
  userId: string,
  streakDays: number
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ streak_days: streakDays, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('[operatingDays] syncStreakToProfile error:', error.message);
  }
}
