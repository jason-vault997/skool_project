// ============================================================
// BUILD100 — Phase 9: Work Sessions Data Access
//
// Manages work_sessions and work_breaks tables.
//
// Architecture:
//   work_sessions: one row per check-in/check-out interval
//   work_breaks: one row per break within a session
//
// Canonical work time formula:
//   actual_work_minutes =
//     floor((session.ended_at - session.started_at in minutes)
//     - SUM(break.ended_at - break.started_at in minutes for CLOSED breaks))
//
// work_sessions.break_minutes = denormalized cache only.
// Source of truth = work_breaks table.
//
// Active session recovery:
//   On CalendarPage mount, query for sessions where ended_at IS NULL.
//   On break recovery, query for breaks where ended_at IS NULL.
// ============================================================

import { supabase } from '../supabase/client';
import type { WorkSession, WorkSessionInsert, WorkBreak, WorkBreakInsert } from '../supabase/types';
import { localDateInTz } from './operatingDays';

// ── Work Sessions ─────────────────────────────────────────────

/** Get any active (not checked out) session for the user today. */
export async function getActiveWorkSession(
  userId: string
): Promise<WorkSession | null> {
  const { data, error } = await supabase
    .from('work_sessions')
    .select('*')
    .eq('user_id', userId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[workSessions] getActiveWorkSession error:', error.message);
    return null;
  }

  return data as WorkSession | null;
}

/** Get all work sessions for a given operating date. */
export async function getWorkSessionsForDate(
  userId: string,
  operatingDate: string // 'YYYY-MM-DD'
): Promise<WorkSession[]> {
  const { data, error } = await supabase
    .from('work_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('operating_date', operatingDate)
    .order('started_at', { ascending: true });

  if (error) {
    console.error('[workSessions] getWorkSessionsForDate error:', error.message);
    return [];
  }

  return (data ?? []) as WorkSession[];
}

/** Get work sessions for a range of operating dates. */
export async function getWorkSessionsForRange(
  userId: string,
  fromDate: string,
  toDate: string
): Promise<WorkSession[]> {
  const { data, error } = await supabase
    .from('work_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('operating_date', fromDate)
    .lte('operating_date', toDate)
    .order('started_at', { ascending: true });

  if (error) {
    console.error('[workSessions] getWorkSessionsForRange error:', error.message);
    return [];
  }

  return (data ?? []) as WorkSession[];
}

/** Check in — creates a new work session attributed to the local operating date. */
export async function checkIn(userId: string, timezone: string): Promise<WorkSession | null> {
  const now = new Date();
  const operatingDate = localDateInTz(timezone); // The local date at the moment of check-in

  const payload: WorkSessionInsert = {
    user_id: userId,
    operating_date: operatingDate,
    started_at: now.toISOString(),
    ended_at: null,
    break_minutes: 0,
    work_minutes: null,
  };

  const { data, error } = await supabase
    .from('work_sessions')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('[workSessions] checkIn error:', error.message);
    return null;
  }

  return data as WorkSession;
}

/**
 * Check out — closes the active session.
 * Calculates work_minutes from actual timestamps and closed breaks.
 * Returns the total work minutes for this session.
 */
export async function checkOut(
  _userId: string,
  session: WorkSession,
  closedBreaks: WorkBreak[]
): Promise<{ session: WorkSession; workMinutes: number } | null> {
  const endedAt = new Date();

  // Calculate total break duration from CLOSED breaks only
  const totalBreakMinutes = closedBreaks
    .filter(b => b.work_session_id === session.id && b.ended_at !== null)
    .reduce((sum, b) => {
      const breakMs = new Date(b.ended_at!).getTime() - new Date(b.started_at).getTime();
      return sum + Math.floor(breakMs / 60_000);
    }, 0);

  // Calculate actual work duration
  const elapsedMs = endedAt.getTime() - new Date(session.started_at).getTime();
  const elapsedMinutes = Math.floor(elapsedMs / 60_000);
  const workMinutes = Math.max(0, elapsedMinutes - totalBreakMinutes);

  const { data, error } = await supabase
    .from('work_sessions')
    .update({
      ended_at: endedAt.toISOString(),
      break_minutes: totalBreakMinutes,
      work_minutes: workMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id)
    .select()
    .single();

  if (error) {
    console.error('[workSessions] checkOut error:', error.message);
    return null;
  }

  return { session: data as WorkSession, workMinutes };
}

/**
 * Compute total work minutes for a given operating date from all its closed sessions.
 * Used to update operating_days.total_work_minutes after check-out.
 */
export async function computeTotalWorkMinutesForDate(
  userId: string,
  operatingDate: string
): Promise<number> {
  const sessions = await getWorkSessionsForDate(userId, operatingDate);
  return sessions
    .filter(s => s.work_minutes !== null)
    .reduce((sum, s) => sum + (s.work_minutes ?? 0), 0);
}

/** Format minutes as 'Xh Ym' display string. */
export function formatWorkDuration(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Calculate live elapsed minutes since session started (for active sessions). */
export function calcLiveElapsedMinutes(
  session: WorkSession,
  activeBreakStartedAt: string | null
): { totalElapsed: number; workMinutes: number; breakMinutes: number } {
  const now = Date.now();
  const totalElapsed = Math.floor((now - new Date(session.started_at).getTime()) / 60_000);

  // If currently on break, add current break progress to break_minutes
  let currentBreakMins = 0;
  if (activeBreakStartedAt) {
    currentBreakMins = Math.floor((now - new Date(activeBreakStartedAt).getTime()) / 60_000);
  }

  const totalBreakMins = session.break_minutes + currentBreakMins;
  const workMinutes = Math.max(0, totalElapsed - totalBreakMins);

  return { totalElapsed, workMinutes, breakMinutes: totalBreakMins };
}

// ── Work Breaks ───────────────────────────────────────────────

/** Get all breaks for a work session (closed and active). */
export async function getBreaksForSession(
  sessionId: string,
  userId: string
): Promise<WorkBreak[]> {
  const { data, error } = await supabase
    .from('work_breaks')
    .select('*')
    .eq('work_session_id', sessionId)
    .eq('user_id', userId)
    .order('started_at', { ascending: true });

  if (error) {
    console.error('[workSessions] getBreaksForSession error:', error.message);
    return [];
  }

  return (data ?? []) as WorkBreak[];
}

/** Get the active (not yet ended) break for a session. */
export async function getActiveBreak(
  sessionId: string,
  userId: string
): Promise<WorkBreak | null> {
  const { data, error } = await supabase
    .from('work_breaks')
    .select('*')
    .eq('work_session_id', sessionId)
    .eq('user_id', userId)
    .is('ended_at', null)
    .maybeSingle();

  if (error) {
    console.error('[workSessions] getActiveBreak error:', error.message);
    return null;
  }

  return data as WorkBreak | null;
}

/** Start a break — inserts a work_break with ended_at = null. */
export async function startBreak(
  userId: string,
  sessionId: string
): Promise<WorkBreak | null> {
  const payload: WorkBreakInsert = {
    work_session_id: sessionId,
    user_id: userId,
    started_at: new Date().toISOString(),
    ended_at: null,
  };

  const { data, error } = await supabase
    .from('work_breaks')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('[workSessions] startBreak error:', error.message);
    return null;
  }

  return data as WorkBreak;
}

/**
 * End a break — closes the active break and updates work_session.break_minutes cache.
 * Returns the closed break.
 */
export async function endBreak(
  _userId: string,
  breakRecord: WorkBreak,
  session: WorkSession
): Promise<WorkBreak | null> {
  const endedAt = new Date().toISOString();

  // Close the break record
  const { data, error } = await supabase
    .from('work_breaks')
    .update({ ended_at: endedAt })
    .eq('id', breakRecord.id)
    .select()
    .single();

  if (error) {
    console.error('[workSessions] endBreak error:', error.message);
    return null;
  }

  const closedBreak = data as WorkBreak;

  // Update the denormalized break_minutes cache on the session
  const breakDurationMins = Math.floor(
    (new Date(endedAt).getTime() - new Date(breakRecord.started_at).getTime()) / 60_000
  );
  const newBreakMinutes = session.break_minutes + breakDurationMins;

  await supabase
    .from('work_sessions')
    .update({ break_minutes: newBreakMinutes, updated_at: new Date().toISOString() })
    .eq('id', session.id);

  return closedBreak;
}
