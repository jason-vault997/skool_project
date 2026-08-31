import { supabase } from '../supabase/client';
import type { Session } from '../supabase/types';

export async function getSessionsForMonth(year: number, month: number): Promise<Session[]> {
  // Month is 1-indexed. Build start/end timestamps for the full calendar month.
  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .gte('start_time', startDate)
    .lte('start_time', endDate)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('[sessions] getSessionsForMonth error:', error.message);
    return [];
  }

  return data ?? [];
}

export async function getUpcomingSession(): Promise<Session | null> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .gte('start_time', now)
    .order('start_time', { ascending: true })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No upcoming session
    console.error('[sessions] getUpcomingSession error:', error.message);
    return null;
  }

  return data;
}
