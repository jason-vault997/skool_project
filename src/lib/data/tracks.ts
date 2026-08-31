import { supabase } from '../supabase/client';
import type { Track, Module, TrackWithModules } from '../supabase/types';

export async function getTracks(): Promise<Track[]> {
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[tracks] getTracks error:', error.message);
    return [];
  }

  return data ?? [];
}

export async function getModulesForTrack(trackId: string): Promise<Module[]> {
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('track_id', trackId)
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[tracks] getModulesForTrack error:', error.message);
    return [];
  }

  return data ?? [];
}

export async function getTracksWithModules(): Promise<TrackWithModules[]> {
  const tracks = await getTracks();
  const result: TrackWithModules[] = [];

  for (const track of tracks) {
    const modules = await getModulesForTrack(track.id);
    result.push({ ...track, modules });
  }

  return result;
}
