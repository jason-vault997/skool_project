import { supabase } from '../supabase/client';
import type { LessonProgress, ModuleWithProgress } from '../supabase/types';

interface RawModule {
  id: string;
  track_id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  tracks: { name: string; slug: string } | null;
}

interface RawLesson {
  id: string;
  module_id: string;
}

export async function getAllModulesWithProgress(userId: string): Promise<ModuleWithProgress[]> {
  const { data: modulesRaw, error: modulesError } = await supabase
    .from('modules')
    .select('*, tracks!inner(name, slug)')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  if (modulesError) {
    console.error('[modules] fetch error:', modulesError.message);
    return [];
  }

  const modulesData = (modulesRaw ?? []) as RawModule[];
  if (modulesData.length === 0) return [];

  const moduleIds = modulesData.map(m => m.id);
  const { data: lessonsRaw } = await supabase
    .from('lessons')
    .select('id, module_id')
    .in('module_id', moduleIds)
    .eq('is_published', true);

  const lessons = (lessonsRaw ?? []) as RawLesson[];
  const lessonIds = lessons.map(l => l.id);

  let progressMap = new Map<string, LessonProgress>();
  if (lessonIds.length > 0) {
    const { data: progressRaw } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .in('lesson_id', lessonIds);

    const progressData = (progressRaw ?? []) as LessonProgress[];
    progressMap = new Map(progressData.map(p => [p.lesson_id, p]));
  }

  return modulesData.map(mod => {
    const trackData = mod.tracks ?? { name: '', slug: '' };
    const moduleLessons = lessons.filter(l => l.module_id === mod.id);
    const totalLessons = moduleLessons.length;
    const completedLessons = moduleLessons.filter(l => progressMap.get(l.id)?.completed).length;
    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      id: mod.id,
      track_id: mod.track_id,
      title: mod.title,
      slug: mod.slug,
      description: mod.description,
      thumbnail_url: mod.thumbnail_url,
      sort_order: mod.sort_order,
      is_published: mod.is_published,
      created_at: mod.created_at,
      updated_at: mod.updated_at,
      progress,
      completedLessons,
      totalLessons,
      trackName: trackData.name,
      trackSlug: trackData.slug,
    };
  });
}
