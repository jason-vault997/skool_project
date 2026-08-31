import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Check, Circle, PlayCircle } from 'lucide-react';
import {
  CLASSROOM_DATA,
  ClassroomBlock,
  ClassroomModule,
  ClassroomLesson,
  calcBlockProgress,
  calcModuleProgress,
} from '../../data/classroomCMS';
import { ClassroomProgressRow } from '../../lib/data/classroomProgress';
import './ClassroomSidebar.css';

interface ClassroomSidebarProps {
  selectedLessonId: string | null;
  progressMap: Map<string, ClassroomProgressRow>;
  onSelectLesson: (lesson: ClassroomLesson, block: ClassroomBlock, mod: ClassroomModule) => void;
}

function getProgressPct(lessonId: string, progressMap: Map<string, ClassroomProgressRow>): number {
  return progressMap.get(lessonId)?.progress_pct ?? 0;
}

function isCompleted(lessonId: string, progressMap: Map<string, ClassroomProgressRow>): boolean {
  const row = progressMap.get(lessonId);
  return row?.completed === true || (row?.progress_pct ?? 0) >= 100;
}

function isInProgress(lessonId: string, progressMap: Map<string, ClassroomProgressRow>): boolean {
  const pct = progressMap.get(lessonId)?.progress_pct ?? 0;
  return pct > 0 && pct < 100;
}

export const ClassroomSidebar: React.FC<ClassroomSidebarProps> = ({
  selectedLessonId,
  progressMap,
  onSelectLesson,
}) => {
  // Build pct map for helpers
  const pctMap = new Map(
    Array.from(progressMap.entries()).map(([k, v]) => [k, v.progress_pct])
  );

  const [expandedBlocks, setExpandedBlocks]   = useState<Set<string>>(() => {
    // Auto-expand the block that contains the selected lesson
    const initial = new Set<string>();
    if (!selectedLessonId) { initial.add('sales'); return initial; }
    for (const block of CLASSROOM_DATA) {
      if (block.modules.some(m => m.lessons.some(l => l.id === selectedLessonId))) {
        initial.add(block.id);
      }
    }
    if (initial.size === 0) initial.add('sales');
    return initial;
  });

  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (!selectedLessonId) return initial;
    for (const block of CLASSROOM_DATA) {
      for (const mod of block.modules) {
        if (mod.lessons.some(l => l.id === selectedLessonId)) {
          initial.add(mod.id);
        }
      }
    }
    return initial;
  });

  const toggleBlock = (blockId: string) => {
    setExpandedBlocks(prev => {
      const next = new Set(prev);
      next.has(blockId) ? next.delete(blockId) : next.add(blockId);
      return next;
    });
  };

  const toggleModule = (modId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(modId) ? next.delete(modId) : next.add(modId);
      return next;
    });
  };

  return (
    <nav className="classroom-sidebar" aria-label="Classroom navigation">
      <div className="sidebar-header">
        <span className="sidebar-header-label">CURRICULUM</span>
      </div>

      {CLASSROOM_DATA.map(block => {
        const blockExpanded = expandedBlocks.has(block.id);
        const blockProgress = calcBlockProgress(block, pctMap);
        const totalLessons  = block.modules.reduce((s, m) => s + m.lessons.length, 0);
        const doneLessons   = block.modules.reduce(
          (s, m) => s + m.lessons.filter(l => isCompleted(l.id, progressMap)).length, 0
        );

        return (
          <div key={block.id} className={`sidebar-block ${blockExpanded ? 'is-expanded' : ''}`}>
            {/* Block header */}
            <button
              className="sidebar-block-btn"
              onClick={() => toggleBlock(block.id)}
              aria-expanded={blockExpanded}
            >
              <span className="sidebar-block-chevron">
                {blockExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </span>
              <span className="sidebar-block-title">{block.title}</span>
              <span className="sidebar-block-meta">
                {blockProgress > 0 && (
                  <span className="sidebar-block-pct">{blockProgress}%</span>
                )}
                <span className="sidebar-block-count">{doneLessons}/{totalLessons}</span>
              </span>
            </button>

            {/* Block content */}
            {blockExpanded && (
              <div className="sidebar-block-content">
                {block.modules.map(mod => {
                  const modExpanded = expandedModules.has(mod.id);
                  const modProgress = calcModuleProgress(mod, pctMap);

                  return (
                    <div key={mod.id} className="sidebar-module">
                      {/* Module header */}
                      <button
                        className="sidebar-module-btn"
                        onClick={() => toggleModule(mod.id)}
                        aria-expanded={modExpanded}
                      >
                        <span className="sidebar-module-chevron">
                          {modExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                        </span>
                        <span className="sidebar-module-title">{mod.title}</span>
                        {modProgress > 0 && (
                          <span className="sidebar-module-pct">{modProgress}%</span>
                        )}
                      </button>

                      {/* Lessons */}
                      {modExpanded && (
                        <ul className="sidebar-lessons-list">
                          {mod.lessons.map(lesson => {
                            const isActive    = selectedLessonId === lesson.id;
                            const done        = isCompleted(lesson.id, progressMap);
                            const inProg      = isInProgress(lesson.id, progressMap);
                            const pct         = getProgressPct(lesson.id, progressMap);

                            return (
                              <li key={lesson.id}>
                                <button
                                  className={`sidebar-lesson-btn ${isActive ? 'is-active' : ''} ${done ? 'is-done' : ''}`}
                                  onClick={() => onSelectLesson(lesson, block, mod)}
                                  title={lesson.title}
                                >
                                  <span className="sidebar-lesson-icon">
                                    {done ? (
                                      <Check size={11} strokeWidth={2.5} />
                                    ) : inProg ? (
                                      <PlayCircle size={11} strokeWidth={2} />
                                    ) : (
                                      <Circle size={11} strokeWidth={1.5} />
                                    )}
                                  </span>
                                  <span className="sidebar-lesson-title">{lesson.title}</span>
                                  {inProg && !done && (
                                    <span className="sidebar-lesson-pct">{pct}%</span>
                                  )}
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
            )}
          </div>
        );
      })}
    </nav>
  );
};
