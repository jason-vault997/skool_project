// ============================================================
// BUILD100 — Phase 9: Acquisition Log Data Access
//
// Manages acquisition_log table.
// Daily one-click execution tracking per acquisition engine.
//
// Engine IDs:
//   Primary:   'repost' | 'content' | 'brand'
//   Delegated: 'wa_dms' | 'linkedin' | 'repost_d'
// ============================================================

import { supabase } from '../supabase/client';
import type { AcquisitionLog, AcquisitionLogInsert, AcquisitionEngine } from '../supabase/types';

const TABLE = 'acquisition_log';

/** Get all acquisition log entries for a specific date. */
export async function getAcquisitionLogForDate(
  userId: string,
  date: string  // 'YYYY-MM-DD'
): Promise<AcquisitionLog[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('date', date);

  if (error) {
    console.error('[acquisitionLog] getAcquisitionLogForDate error:', error.message);
    return [];
  }

  return (data ?? []) as AcquisitionLog[];
}

/** Get acquisition log entries for a date range (for history grid). */
export async function getAcquisitionLogForRange(
  userId: string,
  fromDate: string,  // 'YYYY-MM-DD'
  toDate: string     // 'YYYY-MM-DD'
): Promise<AcquisitionLog[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: true });

  if (error) {
    console.error('[acquisitionLog] getAcquisitionLogForRange error:', error.message);
    return [];
  }

  return (data ?? []) as AcquisitionLog[];
}

/**
 * Toggle an acquisition engine for today.
 * If a log entry exists → delete it (mark as not executed).
 * If no entry exists → insert it (mark as executed).
 * Returns the new state (true = executed, false = not executed).
 */
export async function toggleAcquisitionEngine(
  userId: string,
  date: string,
  engine: AcquisitionEngine
): Promise<boolean> {
  // Check if entry exists
  const { data: existing } = await supabase
    .from(TABLE)
    .select('id')
    .eq('user_id', userId)
    .eq('date', date)
    .eq('engine', engine)
    .maybeSingle();

  if (existing) {
    // Delete → not executed
    await supabase.from(TABLE).delete().eq('id', (existing as { id: string }).id);
    return false;
  } else {
    // Insert → executed
    const payload: AcquisitionLogInsert = {
      user_id: userId,
      date,
      engine,
      executed: true,
    };
    await supabase.from(TABLE).insert(payload);
    return true;
  }
}

/**
 * Build a map of { [date]: Set<engine> } for quick lookup in history grid.
 * Used by the 7-day acquisition history display.
 */
export function buildAcquisitionMap(
  logs: AcquisitionLog[]
): Map<string, Set<AcquisitionEngine>> {
  const map = new Map<string, Set<AcquisitionEngine>>();
  for (const log of logs) {
    if (!log.executed) continue;
    if (!map.has(log.date)) map.set(log.date, new Set());
    map.get(log.date)!.add(log.engine);
  }
  return map;
}

/** Check if a specific engine was executed on a given date. */
export function wasEngineExecuted(
  map: Map<string, Set<AcquisitionEngine>>,
  date: string,
  engine: AcquisitionEngine
): boolean {
  return map.get(date)?.has(engine) ?? false;
}

// Display labels for each engine
export const ENGINE_LABELS: Record<AcquisitionEngine, string> = {
  repost:   'Repost Accounts',
  content:  'Original Content',
  brand:    'Personal Brand',
  wa_dms:   'WhatsApp DMs',
  linkedin: 'LinkedIn Outreach',
  repost_d: 'Repost Content',
};

export const PRIMARY_ENGINES: AcquisitionEngine[] = ['repost', 'content', 'brand'];
export const DELEGATED_ENGINES: AcquisitionEngine[] = ['wa_dms', 'linkedin', 'repost_d'];
