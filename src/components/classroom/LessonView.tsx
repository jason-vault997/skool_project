import React, { useCallback, useMemo } from 'react';
import { Check, ChevronRight, Clock, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { YouTubePlayer } from './YouTubePlayer';
import { ClassroomLesson, ClassroomBlock, ClassroomModule, findNextLesson } from '../../data/classroomCMS';
import { ClassroomProgressRow } from '../../lib/data/classroomProgress';
import './LessonView.css';

interface LessonViewProps {
  lesson: ClassroomLesson;
  block: ClassroomBlock;
  mod: ClassroomModule;
  progressRow: ClassroomProgressRow | undefined;
  onProgress: (pct: number, posSec: number) => void;
  onComplete: () => void;
  onReset: () => void;
  onNavigate: (lessonId: string) => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const LessonView: React.FC<LessonViewProps> = ({
  lesson,
  block,
  mod,
  progressRow,
  onProgress,
  onComplete,
  onReset,
  onNavigate,
}) => {
  const [transcriptOpen, setTranscriptOpen] = React.useState(false);
  const nextLesson = useMemo(() => findNextLesson(lesson.id), [lesson.id]);

  const isCompleted   = progressRow?.completed === true || (progressRow?.progress_pct ?? 0) >= 100;
  const progressPct   = progressRow?.progress_pct ?? 0;
  const lastPosSec    = progressRow?.last_pos_sec ?? 0;

  const handleProgress = useCallback((pct: number, sec: number) => {
    onProgress(pct, sec);
  }, [onProgress]);

  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  return (
    <div className="lesson-view">
      {/* Breadcrumb */}
      <div className="lesson-breadcrumb">
        <span className="breadcrumb-block">{block.title}</span>
        <ChevronRight size={12} className="breadcrumb-sep" />
        <span className="breadcrumb-module">{mod.title}</span>
      </div>

      {/* Video player */}
      <YouTubePlayer
        key={lesson.id}
        videoId={lesson.videoId}
        startSeconds={isCompleted ? 0 : lastPosSec}
        onProgress={handleProgress}
        onComplete={handleComplete}
      />

      {/* Lesson info row */}
      <div className="lesson-info-row">
        <div className="lesson-title-group">
          <h2 className="lesson-title">{lesson.title}</h2>
          <div className="lesson-meta-chips">
            {lesson.durationSeconds != null && (
              <span className="lesson-chip">
                <Clock size={11} />
                {formatDuration(lesson.durationSeconds)}
              </span>
            )}
            {isCompleted ? (
              <span className="lesson-chip chip-done">
                <Check size={11} />
                Completed
              </span>
            ) : progressPct > 0 ? (
              <span className="lesson-chip chip-progress">
                {progressPct}% watched
              </span>
            ) : null}
          </div>
        </div>

        {/* Actions */}
        <div className="lesson-actions">
          {isCompleted ? (
            <button className="btn btn-outline btn-sm lesson-action-btn" onClick={onReset}>
              <RotateCcw size={13} />
              Mark as Unwatched
            </button>
          ) : (
            <button className="btn btn-primary btn-sm lesson-action-btn" onClick={onComplete}>
              <Check size={13} />
              Mark Complete
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {progressPct > 0 && !isCompleted && (
        <div className="lesson-progress-bar-wrap">
          <div className="lesson-progress-bar">
            <div className="lesson-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="lesson-progress-label">{progressPct}% watched</span>
        </div>
      )}

      {/* Next lesson */}
      {nextLesson && (
        <button
          className="lesson-next-btn"
          onClick={() => onNavigate(nextLesson.id)}
        >
          <span className="lesson-next-label">Next Lesson</span>
          <span className="lesson-next-title">{nextLesson.title}</span>
          <ChevronRight size={16} className="lesson-next-icon" />
        </button>
      )}

      {/* Transcript */}
      {lesson.transcript && (
        <div className="lesson-transcript">
          <button
            className="transcript-toggle"
            onClick={() => setTranscriptOpen(o => !o)}
            aria-expanded={transcriptOpen}
          >
            <span>Transcript</span>
            {transcriptOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {transcriptOpen && (
            <div className="transcript-body">
              <p>{lesson.transcript}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
