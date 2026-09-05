// ============================================================
// BUILD100 — Phase 9: Operator Config Data Access
//
// Manages operator_config: single-row config per user.
// Stores: timezone, operating period, acquisition targets,
// job application count.
//
// On first use, timezone defaults to the browser's detected
// IANA timezone. The user can change it in Calendar settings.
// ============================================================

import { supabase } from '../supabase/client';
import type { OperatorConfig, OperatorConfigUpsert } from '../supabase/types';

const TABLE = 'operator_config';

/** Get the user's timezone-aware operator config. Returns null if not yet configured. */
export async function getOperatorConfig(userId: string): Promise<OperatorConfig | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[operatorConfig] getOperatorConfig error:', error.message);
    return null;
  }

  return data as OperatorConfig | null;
}

/**
 * Upsert operator config. On first use, auto-detects timezone from browser.
 * The app calls this on Calendar page mount if no config exists.
 */
export async function upsertOperatorConfig(
  userId: string,
  updates: Partial<Omit<OperatorConfigUpsert, 'user_id'>>
): Promise<OperatorConfig | null> {
  const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const payload: OperatorConfigUpsert = {
    user_id: userId,
    timezone: detectedTz,
    operating_start_date: null,
    operating_end_date: null,
    acquisition_repost_target: null,
    acquisition_content_target: null,
    acquisition_brand_target: null,
    acquisition_wa_target: null,
    acquisition_linkedin_target: null,
    acquisition_repost_d_target: null,
    job_application_count: 0,
    ...updates,
  };

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    console.error('[operatorConfig] upsertOperatorConfig error:', error.message);
    return null;
  }

  return data as OperatorConfig;
}

/** Update just the job application count (increment or decrement, min 0). */
export async function adjustJobApplicationCount(
  userId: string,
  delta: 1 | -1,
  currentCount: number
): Promise<number> {
  const newCount = Math.max(0, currentCount + delta);

  const { error } = await supabase
    .from(TABLE)
    .update({ job_application_count: newCount, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) {
    console.error('[operatorConfig] adjustJobApplicationCount error:', error.message);
    return currentCount; // Return unchanged on error
  }

  return newCount;
}

/** Set the operating start date (Day 1). */
export async function setOperatingStartDate(
  userId: string,
  date: string // 'YYYY-MM-DD'
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ operating_start_date: date, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) {
    console.error('[operatorConfig] setOperatingStartDate error:', error.message);
  }
}

/**
 * Get or create an operator config, auto-setting timezone from browser.
 * Guaranteed to return a config (creates one if it doesn't exist).
 */
export async function getOrCreateOperatorConfig(userId: string): Promise<OperatorConfig> {
  const existing = await getOperatorConfig(userId);
  if (existing) return existing;

  const created = await upsertOperatorConfig(userId, {});
  // Fallback if upsert fails
  return created ?? {
    user_id: userId,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    operating_start_date: null,
    operating_end_date: null,
    acquisition_repost_target: null,
    acquisition_content_target: null,
    acquisition_brand_target: null,
    acquisition_wa_target: null,
    acquisition_linkedin_target: null,
    acquisition_repost_d_target: null,
    job_application_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
