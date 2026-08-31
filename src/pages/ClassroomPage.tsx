import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Menu, X, BookOpen } from 'lucide-react';
import { useAuth } from '../lib/auth/AuthContext';
import { ClassroomSidebar } from '../components/classroom/ClassroomSidebar';
import { LessonView } from '../components/classroom/LessonView';
import {
  CLASSROOM_DATA,
  ClassroomBlock,
  ClassroomModule,
  ClassroomLesson,
} from '../data/classroomCMS';
import {
  ClassroomProgressRow,
  getLessonProgressMap,
  upsertLessonProgress,
  markLessonComplete,
  resetLessonProgress,
} from '../lib/data/classroomProgress';
import './ClassroomPage.css';

interface ActiveLesson {
  lesson: ClassroomLesson;
  block: ClassroomBlock;
  mod: ClassroomModule;
}

// Resolve a lesson ID back to its full context
function resolveLessonContext(lessonId: string): ActiveLesson | null {
  for (const block of CLASSROOM_DATA) {
    for (const mod of block.modules) {
      const lesson = mod.lessons.find(l => l.id === lessonId);
      if (lesson) return { lesson, block, mod };
    }
  }
  return null;
}

// First lesson in the curriculum
function getFirstLesson(): ActiveLesson {
  const block = CLASSROOM_DATA[0];
  const mod   = block.modules[0];
  const lesson = mod.lessons[0];
  return { lesson, block, mod };
}

export const ClassroomPage: React.FC = () => {
  const { user } = useAuth();

  const [activeLesson, setActiveLesson]     = useState<ActiveLesson | null>(null);
  const [progressMap, setProgressMap]       = useState<Map<string, ClassroomProgressRow>>(new Map());
  const [mobileNavOpen, setMobileNavOpen]   = useState(false);
  const [progressLoading, setProgressLoading] = useState(true);

  // Load progress from Supabase
  useEffect(() => {
    if (!user) return;
    setProgressLoading(true);
    getLessonProgressMap(user.id)
      .then(map => setProgressMap(map))
      .finally(() => setProgressLoading(false));
  }, [user]);

  // Default to first lesson on load
  useEffect(() => {
    if (!activeLesson) {
      setActiveLesson(getFirstLesson());
    }
  }, [activeLesson]);

  const handleSelectLesson = useCallback((
    lesson: ClassroomLesson,
    block: ClassroomBlock,
    mod: ClassroomModule
  ) => {
    setActiveLesson({ lesson, block, mod });
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNavigateById = useCallback((lessonId: string) => {
    const ctx = resolveLessonContext(lessonId);
    if (ctx) {
      setActiveLesson(ctx);
      setMobileNavOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleProgress = useCallback(async (pct: number, posSec: number) => {
    if (!user || !activeLesson) return;
    const lid = activeLesson.lesson.id;
    const completed = pct >= 100;
    // Optimistic update
    setProgressMap(prev => {
      const next = new Map(prev);
      next.set(lid, {
        lesson_id: lid,
        progress_pct: pct,
        completed,
        last_pos_sec: posSec,
        completed_at: completed ? new Date().toISOString() : null,
      });
      return next;
    });
    await upsertLessonProgress(user.id, lid, pct, posSec, completed);
  }, [user, activeLesson]);

  const handleComplete = useCallback(async () => {
    if (!user || !activeLesson) return;
    const lid = activeLesson.lesson.id;
    setProgressMap(prev => {
      const next = new Map(prev);
      next.set(lid, {
        lesson_id: lid,
        progress_pct: 100,
        completed: true,
        last_pos_sec: 0,
        completed_at: new Date().toISOString(),
      });
      return next;
    });
    await markLessonComplete(user.id, lid);
  }, [user, activeLesson]);

  const handleReset = useCallback(async () => {
    if (!user || !activeLesson) return;
    const lid = activeLesson.lesson.id;
    setProgressMap(prev => {
      const next = new Map(prev);
      next.set(lid, {
        lesson_id: lid,
        progress_pct: 0,
        completed: false,
        last_pos_sec: 0,
        completed_at: null,
      });
      return next;
    });
    await resetLessonProgress(user.id, lid);
  }, [user, activeLesson]);

  const progressRow = useMemo(
    () => activeLesson ? progressMap.get(activeLesson.lesson.id) : undefined,
    [activeLesson, progressMap]
  );

  return (
    <div className="classroom-page-v3">
      {/* Mobile top bar */}
      <div className="classroom-mobile-topbar">
        <div className="classroom-mobile-lesson-name">
          {activeLesson?.lesson.title ?? 'Select a lesson'}
        </div>
        <button
          className="classroom-mobile-nav-toggle btn btn-outline btn-sm"
          onClick={() => setMobileNavOpen(o => !o)}
          aria-label="Toggle lesson navigation"
        >
          {mobileNavOpen ? <X size={16} /> : <Menu size={16} />}
          {mobileNavOpen ? 'Close' : 'Lessons'}
        </button>
      </div>

      {/* Main layout */}
      <div className="classroom-layout">
        {/* Sidebar */}
        <div className={`classroom-sidebar-wrapper ${mobileNavOpen ? 'is-mobile-open' : ''}`}>
          <ClassroomSidebar
            selectedLessonId={activeLesson?.lesson.id ?? null}
            progressMap={progressMap}
            onSelectLesson={handleSelectLesson}
          />
        </div>

        {/* Main content area */}
        <div className="classroom-main">
          {progressLoading ? (
            <div className="classroom-loading">
              <div className="skeleton-block" style={{ height: '56%', borderRadius: 10 }} />
              <div className="skeleton-block" style={{ height: 28, width: '60%', marginTop: 16 }} />
              <div className="skeleton-block" style={{ height: 18, width: '40%', marginTop: 8 }} />
            </div>
          ) : activeLesson ? (
            <LessonView
              lesson={activeLesson.lesson}
              block={activeLesson.block}
              mod={activeLesson.mod}
              progressRow={progressRow}
              onProgress={handleProgress}
              onComplete={handleComplete}
              onReset={handleReset}
              onNavigate={handleNavigateById}
            />
          ) : (
            <div className="classroom-empty-state">
              <BookOpen size={48} strokeWidth={1} />
              <p>Select a lesson from the sidebar to begin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
