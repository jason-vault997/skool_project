import { supabase } from '../supabase/client';
import type { Profile } from '../supabase/types';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('[profiles] getProfile error:', error.message);
    return null;
  }

  return data as Profile;
}

export async function upsertProfile(profile: {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  streak_days: number;
}): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('[profiles] upsertProfile error:', error.message);
    return null;
  }

  return data as Profile;
}
