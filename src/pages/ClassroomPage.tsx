import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check, Circle, PlayCircle, Menu, X, RotateCcw } from 'lucide-react';
import { useAuth } from '../lib/auth/AuthContext';
import { YouTubePlayer } from '../components/classroom/YouTubePlayer';
import {
  CLASSROOM_DATA,
  ClassroomBlock,
  ClassroomModule,
  ClassroomLesson,
  calcBlockProgress,
  calcModuleProgress,
  findNextLesson,
} from '../data/classroomCMS';
import {
  ClassroomProgressRow,
  getLessonProgressMap,
  upsertLessonProgress,
  markLessonComplete,
  resetLessonProgress,
} from '../lib/data/classroomProgress';
import './ClassroomPage.css';

// ── Thumbnail map ──────────────────────────────────────────────
const BLOCK_THUMBS: Record<string, string> = {
  'sales':              '/thumbs/sales.jpg',
  'content-creation':   '/thumbs/content.jpg',
  'offer-creation':     '/thumbs/offer.jpg',
  'unedited-recordings':'/thumbs/unedited.jpg',
  'cold-calling':       '/thumbs/cold-calling.jpg',
};

const BLOCK_DESCRIPTIONS: Record<string, string> = {
  'sales':              'Bite-size videos from our Sales Classes',
  'content-creation':   'Bite-size videos from our Content Creation Classes',
  'offer-creation':     'Bite-size videos from our Offer Creation Classes',
  'unedited-recordings':'Unedited recordings of all the previous sessions',
  'cold-calling':       'Master the art of cold calling from first principles',
};

// ── Types ──────────────────────────────────────────────────────
interface ActiveLesson {
  lesson: ClassroomLesson;
  block:  ClassroomBlock;
  mod:    ClassroomModule;
}

function resolveLessonContext(lessonId: string): ActiveLesson | null {
  for (const block of CLASSROOM_DATA) {
    for (const mod of block.modules) {
      const lesson = mod.lessons.find(l => l.id === lessonId);
      if (lesson) return { lesson, block, mod };
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// CLASSROOM LANDING PAGE
// ═══════════════════════════════════════════════════════════════
interface LandingPageProps {
  progressMap: Map<string, ClassroomProgressRow>;
  onSelectBlock: (block: ClassroomBlock) => void;
}

const ClassroomLanding: React.FC<LandingPageProps> = ({ progressMap, onSelectBlock }) => {
  const pctMap = new Map(Array.from(progressMap.entries()).map(([k, v]) => [k, v.progress_pct]));

  return (
    <div className="classroom-landing">
      <div className="classroom-landing-header">
        <h1 className="classroom-landing-title">Classroom</h1>
      </div>
      <div className="classroom-cards-grid">
        {CLASSROOM_DATA.map(block => {
          const progress = calcBlockProgress(block, pctMap);
          const totalLessons = block.modules.reduce((s, m) => s + m.lessons.length, 0);

          return (
            <button
              key={block.id}
              className="classroom-card"
              onClick={() => onSelectBlock(block)}
              aria-label={`Open ${block.title} curriculum`}
            >
              {/* Thumbnail */}
              <div className="classroom-card-thumb">
                <img
                  src={BLOCK_THUMBS[block.id]}
                  alt={block.title}
                  loading="lazy"
                />
              </div>

              {/* Card body */}
              <div className="classroom-card-body">
                <div className="classroom-card-top">
                  <h2 className="classroom-card-title">{block.title}</h2>
                  <p className="classroom-card-desc">{BLOCK_DESCRIPTIONS[block.id]}</p>
                </div>

                {/* Progress bar row */}
                <div className="classroom-card-progress-row">
                  {progress > 0 ? (
                    <span className="classroom-card-pct-badge">{progress}%</span>
                  ) : (
                    <span className="classroom-card-pct-zero">{progress}%</span>
                  )}
                  <div className="classroom-card-progress-bar">
                    <div
                      className="classroom-card-progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="classroom-card-meta">
                  {totalLessons} lesson{totalLessons !== 1 ? 's' : ''}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// LEARNING INTERFACE SIDEBAR
// ═══════════════════════════════════════════════════════════════
interface SidebarProps {
  block:            ClassroomBlock;
  selectedLessonId: string | null;
  progressMap:      Map<string, ClassroomProgressRow>;
  onSelectLesson:   (lesson: ClassroomLesson, mod: ClassroomModule) => void;
}

const LearningSidebar: React.FC<SidebarProps> = ({
  block,
  selectedLessonId,
  progressMap,
  onSelectLesson,
}) => {
  const pctMap = new Map(Array.from(progressMap.entries()).map(([k, v]) => [k, v.progress_pct]));

  // All modules expanded by default — collapse individually
  const [expandedMods, setExpandedMods] = useState<Set<string>>(() =>
    new Set(block.modules.map(m => m.id))
  );

  const toggleMod = (modId: string) => {
    setExpandedMods(prev => {
      const next = new Set(prev);
      next.has(modId) ? next.delete(modId) : next.add(modId);
      return next;
    });
  };

  const blockProgress = calcBlockProgress(block, pctMap);
  const totalLessons  = block.modules.reduce((s, m) => s + m.lessons.length, 0);
  const doneLessons   = block.modules.reduce(
    (s, m) => s + m.lessons.filter(l => (progressMap.get(l.id)?.completed ?? false) || (progressMap.get(l.id)?.progress_pct ?? 0) >= 100).length,
    0
  );

  return (
    <nav className="learning-sidebar" aria-label={`${block.title} navigation`}>
      {/* Block header with progress */}
      <div className="learning-sidebar-header">
        <h2 className="learning-sidebar-block-title">{block.title}</h2>
        <div className="learning-sidebar-progress-row">
          {blockProgress > 0 && (
            <span className="learning-sidebar-pct-badge">{blockProgress}%</span>
          )}
          <div className="learning-sidebar-prog-bar">
            <div className="learning-sidebar-prog-fill" style={{ width: `${blockProgress}%` }} />
          </div>
        </div>
        <div className="learning-sidebar-count">{doneLessons} / {totalLessons} lessons</div>
      </div>

      {/* Module list */}
      <div className="learning-sidebar-modules">
        {block.modules.map(mod => {
          const modExpanded = expandedMods.has(mod.id);
          const modProgress = calcModuleProgress(mod, pctMap);
          const modDone     = mod.lessons.filter(l => (progressMap.get(l.id)?.completed ?? false) || (progressMap.get(l.id)?.progress_pct ?? 0) >= 100).length;

          return (
            <div key={mod.id} className="sidebar-mod-group">
              {/* Module header */}
              <button
                className={`sidebar-mod-header ${modExpanded ? 'is-expanded' : ''}`}
                onClick={() => toggleMod(mod.id)}
              >
                <span className="sidebar-mod-name">{mod.title}</span>
                <div className="sidebar-mod-right">
                  {modProgress > 0 && (
                    <span className="sidebar-mod-pct">{modDone}/{mod.lessons.length}</span>
                  )}
                  {modExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {/* Lessons */}
              {modExpanded && (
                <ul className="sidebar-lessons-list">
                  {mod.lessons.map(lesson => {
                    const row       = progressMap.get(lesson.id);
                    const isActive  = selectedLessonId === lesson.id;
                    const done      = row?.completed === true || (row?.progress_pct ?? 0) >= 100;
                    const inProg    = !done && (row?.progress_pct ?? 0) > 0;

                    return (
                      <li key={lesson.id}>
                        <button
                          className={`sidebar-lesson-item ${isActive ? 'is-active' : ''} ${done ? 'is-done' : ''}`}
                          onClick={() => onSelectLesson(lesson, mod)}
                          title={lesson.title}
                        >
                          <span className={`sidebar-lesson-icon ${done ? 'icon-done' : inProg ? 'icon-progress' : 'icon-empty'}`}>
                            {done ? (
                              <Check size={12} strokeWidth={2.5} />
                            ) : inProg ? (
                              <PlayCircle size={12} />
                            ) : (
                              <Circle size={12} strokeWidth={1.5} />
                            )}
                          </span>
                          <span className="sidebar-lesson-label">{lesson.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
};

// ═══════════════════════════════════════════════════════════════
// LESSON VIEW (right panel)
// ═══════════════════════════════════════════════════════════════
interface LessonPanelProps {
  active:      ActiveLesson;
  progressRow: ClassroomProgressRow | undefined;
  onProgress:  (pct: number, sec: number) => void;
  onComplete:  () => void;
  onReset:     () => void;
  onNavigate:  (id: string) => void;
}

const LessonPanel: React.FC<LessonPanelProps> = ({
  active, progressRow, onProgress, onComplete, onReset, onNavigate,
}) => {
  const { lesson, block, mod } = active;
  const nextLesson  = useMemo(() => findNextLesson(lesson.id), [lesson.id]);
  const isCompleted = progressRow?.completed === true || (progressRow?.progress_pct ?? 0) >= 100;
  const progressPct = progressRow?.progress_pct ?? 0;
  const lastPosSec  = progressRow?.last_pos_sec ?? 0;

  return (
    <div className="lesson-panel">
      {/* Lesson title row */}
      <div className="lesson-panel-header">
        <div className="lesson-panel-breadcrumb">
          <span className="lp-block-name">{block.title}</span>
          <ChevronRight size={12} className="lp-sep" />
          <span className="lp-mod-name">{mod.title}</span>
        </div>
        <div className="lesson-panel-title-row">
          <h2 className="lesson-panel-title">{lesson.title}</h2>
          {isCompleted && (
            <span className="lesson-completed-badge">
              <Check size={13} />
              Completed
            </span>
          )}
        </div>
      </div>

      {/* Video player */}
      <YouTubePlayer
        key={lesson.id}
        videoId={lesson.videoId}
        startSeconds={isCompleted ? 0 : lastPosSec}
        onProgress={onProgress}
        onComplete={onComplete}
      />

      {/* Progress bar (in-progress only) */}
      {progressPct > 0 && !isCompleted && (
        <div className="lesson-panel-progress-row">
          <div className="lesson-panel-prog-bar">
            <div className="lesson-panel-prog-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="lesson-panel-prog-label">{progressPct}%</span>
        </div>
      )}

      {/* Actions */}
      <div className="lesson-panel-actions">
        {isCompleted ? (
          <button className="lp-btn lp-btn-ghost" onClick={onReset}>
            <RotateCcw size={13} />
            Mark as Unwatched
          </button>
        ) : (
          <button className="lp-btn lp-btn-complete" onClick={onComplete}>
            <Check size={13} />
            Mark Complete
          </button>
        )}

        {nextLesson && (
          <button
            className="lp-btn lp-btn-next"
            onClick={() => onNavigate(nextLesson.id)}
          >
            Next Lesson
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// LEARNING INTERFACE (full block view: sidebar + lesson panel)
// ═══════════════════════════════════════════════════════════════
interface LearningInterfaceProps {
  block:       ClassroomBlock;
  progressMap: Map<string, ClassroomProgressRow>;
  onBack:      () => void;
  onProgress:  (lessonId: string, pct: number, sec: number) => Promise<void>;
  onComplete:  (lessonId: string) => Promise<void>;
  onReset:     (lessonId: string) => Promise<void>;
}

const LearningInterface: React.FC<LearningInterfaceProps> = ({
  block, progressMap, onBack, onProgress, onComplete, onReset,
}) => {
  const [activeLesson, setActiveLesson] = useState<ActiveLesson | null>(() => {
    const firstMod    = block.modules[0];
    const firstLesson = firstMod?.lessons[0];
    return firstLesson ? { lesson: firstLesson, block, mod: firstMod } : null;
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleSelectLesson = useCallback((lesson: ClassroomLesson, mod: ClassroomModule) => {
    setActiveLesson({ lesson, block, mod });
    setMobileSidebarOpen(false);
    document.querySelector('.learning-main')?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [block]);

  const handleNavigateById = useCallback((lessonId: string) => {
    const ctx = resolveLessonContext(lessonId);
    if (ctx) {
      setActiveLesson(ctx);
      setMobileSidebarOpen(false);
    }
  }, []);

  const progressRow = activeLesson
    ? progressMap.get(activeLesson.lesson.id)
    : undefined;

  return (
    <div className="learning-interface">
      {/* Top bar */}
      <div className="learning-topbar">
        <button className="learning-back-btn" onClick={onBack}>
          <ChevronLeft size={16} />
          All Courses
        </button>
        <div className="learning-topbar-center">
          {activeLesson?.lesson.title}
        </div>
        <button
          className="learning-mobile-toggle"
          onClick={() => setMobileSidebarOpen(o => !o)}
          aria-label="Toggle navigation"
        >
          {mobileSidebarOpen ? <X size={16} /> : <Menu size={16} />}
          Lessons
        </button>
      </div>

      {/* Main layout: sidebar + content */}
      <div className="learning-body">
        {/* Sidebar wrapper (mobile collapses) */}
        <div className={`learning-sidebar-wrapper ${mobileSidebarOpen ? 'is-open' : ''}`}>
          <LearningSidebar
            block={block}
            selectedLessonId={activeLesson?.lesson.id ?? null}
            progressMap={progressMap}
            onSelectLesson={handleSelectLesson}
          />
        </div>

        {/* Lesson area */}
        <div className="learning-main">
          {activeLesson ? (
            <LessonPanel
              active={activeLesson}
              progressRow={progressRow}
              onProgress={(pct, sec) => onProgress(activeLesson.lesson.id, pct, sec)}
              onComplete={() => onComplete(activeLesson.lesson.id)}
              onReset={() => onReset(activeLesson.lesson.id)}
              onNavigate={handleNavigateById}
            />
          ) : (
            <div className="learning-empty">Select a lesson to begin.</div>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// ROOT CLASSROOM PAGE (manages landing ↔ learning interface)
// ═══════════════════════════════════════════════════════════════
export const ClassroomPage: React.FC = () => {
  const { user } = useAuth();

  const [selectedBlock, setSelectedBlock] = useState<ClassroomBlock | null>(null);
  const [progressMap, setProgressMap]     = useState<Map<string, ClassroomProgressRow>>(new Map());
  const [progressLoading, setProgressLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setProgressLoading(true);
    getLessonProgressMap(user.id)
      .then(map => setProgressMap(map))
      .finally(() => setProgressLoading(false));
  }, [user]);

  const handleProgress = useCallback(async (lessonId: string, pct: number, sec: number) => {
    if (!user) return;
    const completed = pct >= 100;
    setProgressMap(prev => {
      const next = new Map(prev);
      next.set(lessonId, { lesson_id: lessonId, progress_pct: pct, completed, last_pos_sec: sec, completed_at: completed ? new Date().toISOString() : null });
      return next;
    });
    await upsertLessonProgress(user.id, lessonId, pct, sec, completed);
  }, [user]);

  const handleComplete = useCallback(async (lessonId: string) => {
    if (!user) return;
    setProgressMap(prev => {
      const next = new Map(prev);
      next.set(lessonId, { lesson_id: lessonId, progress_pct: 100, completed: true, last_pos_sec: 0, completed_at: new Date().toISOString() });
      return next;
    });
    await markLessonComplete(user.id, lessonId);
  }, [user]);

  const handleReset = useCallback(async (lessonId: string) => {
    if (!user) return;
    setProgressMap(prev => {
      const next = new Map(prev);
      next.set(lessonId, { lesson_id: lessonId, progress_pct: 0, completed: false, last_pos_sec: 0, completed_at: null });
      return next;
    });
    await resetLessonProgress(user.id, lessonId);
  }, [user]);

  if (progressLoading) {
    return (
      <div className="classroom-skeleton">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="classroom-skeleton-card">
            <div className="skeleton-thumb" />
            <div className="skeleton-body">
              <div className="skeleton-line w60" />
              <div className="skeleton-line w40" />
              <div className="skeleton-line w80 thin" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (selectedBlock) {
    return (
      <LearningInterface
        block={selectedBlock}
        progressMap={progressMap}
        onBack={() => setSelectedBlock(null)}
        onProgress={handleProgress}
        onComplete={handleComplete}
        onReset={handleReset}
      />
    );
  }

  return (
    <ClassroomLanding
      progressMap={progressMap}
      onSelectBlock={block => setSelectedBlock(block)}
    />
  );
};
