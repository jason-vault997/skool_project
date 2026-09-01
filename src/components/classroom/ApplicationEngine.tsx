import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, Save, Check, AlertCircle, Loader2 } from 'lucide-react';
import {
  ApplicationRecord,
  ApplicationStatus,
  APPLICATION_STATUSES,
} from '../../lib/supabase/types';
import {
  getApplicationRecord,
  upsertApplicationRecord,
  ApplicationFields,
} from '../../lib/data/applicationRecords';
import './ApplicationEngine.css';

// ── Helpers ──────────────────────────────────────────────────

function statusPillClass(status: ApplicationStatus | undefined): string {
  switch (status) {
    case 'In Progress': return 'app-engine-status-pill app-status-pill-in-progress';
    case 'Completed':   return 'app-engine-status-pill app-status-pill-completed';
    case 'Failed':      return 'app-engine-status-pill app-status-pill-failed';
    case 'Skipped':     return 'app-engine-status-pill app-status-pill-skipped';
    default:            return 'app-engine-status-pill app-status-pill-not-started';
  }
}

function statusLabel(status: ApplicationStatus | undefined, hasRecord: boolean): string {
  if (!hasRecord) return 'Not Started';
  return status ?? 'Not Started';
}

// ── Component ─────────────────────────────────────────────────

interface ApplicationEngineProps {
  lessonId: string;
  userId:   string;
  /** Called after a successful save so parent can refresh indicator map */
  onSaved?: (record: ApplicationRecord) => void;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export const ApplicationEngine: React.FC<ApplicationEngineProps> = ({
  lessonId,
  userId,
  onSaved,
}) => {
  // ── UI state ─────────────────────────────────────────────
  const [isOpen, setIsOpen]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Record state (controlled form) ───────────────────────
  const [record,        setRecord]       = useState<ApplicationRecord | null>(null);
  const [notes,         setNotes]        = useState('');
  const [keyConcepts,   setKeyConcepts]  = useState('');
  const [importance,    setImportance]   = useState('');
  const [mission,       setMission]      = useState('');
  const [commitment,    setCommitment]   = useState('');
  const [experiment,    setExperiment]   = useState('');
  const [status,        setStatus]       = useState<ApplicationStatus>('Not Started');
  const [outcome,       setOutcome]      = useState('');
  const [reflection,    setReflection]   = useState('');
  const [reviewDate,    setReviewDate]   = useState('');

  // ── Load record on mount (or when lessonId changes) ──────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSaveState('idle');

    getApplicationRecord(userId, lessonId).then(rec => {
      if (cancelled) return;
      setRecord(rec);
      if (rec) {
        setNotes(rec.notes         ?? '');
        setKeyConcepts(rec.key_concepts ?? '');
        setImportance(rec.importance   ?? '');
        setMission(rec.mission         ?? '');
        setCommitment(rec.commitment   ?? '');
        setExperiment(rec.experiment   ?? '');
        setStatus(rec.status           ?? 'Not Started');
        setOutcome(rec.outcome         ?? '');
        setReflection(rec.reflection   ?? '');
        setReviewDate(rec.review_date  ?? '');
      } else {
        // Reset to empty
        setNotes(''); setKeyConcepts(''); setImportance('');
        setMission(''); setCommitment(''); setExperiment('');
        setStatus('Not Started'); setOutcome(''); setReflection(''); setReviewDate('');
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [lessonId, userId]);

  // ── Clear "Saved" feedback after 3 seconds ────────────────
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // ── Save ─────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaveState('saving');

    const fields: ApplicationFields = {
      notes:        notes.trim()        || undefined,
      key_concepts: keyConcepts.trim()  || undefined,
      importance:   importance.trim()   || undefined,
      mission:      mission.trim()      || undefined,
      commitment:   commitment.trim()   || undefined,
      experiment:   experiment.trim()   || undefined,
      status,
      outcome:      outcome.trim()      || undefined,
      reflection:   reflection.trim()   || undefined,
      review_date:  reviewDate          || null,
    };

    const saved = await upsertApplicationRecord(userId, lessonId, fields);

    if (saved) {
      setRecord(saved);
      setSaveState('saved');
      onSaved?.(saved);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveState('idle'), 3000);
    } else {
      setSaveState('error');
    }
  }, [
    userId, lessonId, notes, keyConcepts, importance,
    mission, commitment, experiment, status,
    outcome, reflection, reviewDate, onSaved,
  ]);

  // ── Render ───────────────────────────────────────────────
  const hasRecord  = record !== null;
  const isSaving   = saveState === 'saving';

  return (
    <div className="app-engine">
      {/* ── Header (collapse toggle) ── */}
      <button
        className={`app-engine-header ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen(o => !o)}
        aria-expanded={isOpen}
      >
        <div className="app-engine-header-left">
          <span className="app-engine-title">Application</span>
          <span className={statusPillClass(hasRecord ? status : undefined)}>
            {statusLabel(status, hasRecord)}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`app-engine-chevron ${isOpen ? 'is-open' : ''}`}
        />
      </button>

      {/* ── Expanded body ── */}
      {isOpen && (
        <div className="app-engine-body">
          {loading ? (
            <div className="app-save-status saving">
              <Loader2 size={14} className="spin" /> Loading…
            </div>
          ) : (
            <>
              {/* ══ LEARN ══ */}
              <div className="app-section">
                <span className="app-section-label">Learn</span>

                <div className="app-field">
                  <label className="app-field-label">Notes</label>
                  <span className="app-field-hint">What did I learn from this lesson?</span>
                  <textarea
                    className="app-textarea"
                    placeholder="Write your raw notes here…"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="app-field">
                  <label className="app-field-label">Key Concepts</label>
                  <span className="app-field-hint">What are the 2–3 things that actually matter?</span>
                  <textarea
                    className="app-textarea app-textarea-sm"
                    placeholder="e.g. Clarity beats convincing. Gate 1 is budget…"
                    value={keyConcepts}
                    onChange={e => setKeyConcepts(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="app-field">
                  <label className="app-field-label">Importance</label>
                  <span className="app-field-hint">Why does this matter to my business right now?</span>
                  <textarea
                    className="app-textarea app-textarea-sm"
                    placeholder="Why is this relevant to where I am today?"
                    value={importance}
                    onChange={e => setImportance(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              {/* ══ APPLY ══ */}
              <div className="app-section">
                <span className="app-section-label">Apply</span>

                <div className="app-field">
                  <label className="app-field-label">Application Mission</label>
                  <span className="app-field-hint">What am I actually going to do with this?</span>
                  <textarea
                    className="app-textarea"
                    placeholder="Be specific. What action am I taking?"
                    value={mission}
                    onChange={e => setMission(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="app-field">
                  <label className="app-field-label">Commitment</label>
                  <span className="app-field-hint">What specifically am I committing to and by when?</span>
                  <textarea
                    className="app-textarea app-textarea-sm"
                    placeholder="I commit to doing X by [date / call number]…"
                    value={commitment}
                    onChange={e => setCommitment(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="app-field">
                  <label className="app-field-label">Experiment <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
                  <span className="app-field-hint">If testing something — what's the hypothesis?</span>
                  <textarea
                    className="app-textarea app-textarea-sm"
                    placeholder="If I do X, I expect Y to happen because Z…"
                    value={experiment}
                    onChange={e => setExperiment(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              {/* ══ RESULT ══ */}
              <div className="app-section">
                <span className="app-section-label">Result</span>

                <div className="app-field">
                  <label className="app-field-label">Status</label>
                  <div className="app-status-select-wrapper">
                    <select
                      className="app-status-select"
                      value={status}
                      data-status={status}
                      onChange={e => setStatus(e.target.value as ApplicationStatus)}
                    >
                      {APPLICATION_STATUSES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="app-field">
                  <label className="app-field-label">Outcome</label>
                  <span className="app-field-hint">What happened when I applied it?</span>
                  <textarea
                    className="app-textarea"
                    placeholder="Describe what actually happened. Don't sugarcoat it."
                    value={outcome}
                    onChange={e => setOutcome(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              {/* ══ REFLECT ══ */}
              <div className="app-section">
                <span className="app-section-label">Reflect</span>

                <div className="app-field">
                  <label className="app-field-label">Reflection</label>
                  <span className="app-field-hint">What did I learn from the result? What changes next?</span>
                  <textarea
                    className="app-textarea"
                    placeholder="What worked? What failed? What would I do differently?"
                    value={reflection}
                    onChange={e => setReflection(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="app-field">
                  <label className="app-field-label">Review Date</label>
                  <span className="app-field-hint">When should I revisit this lesson and result?</span>
                  <input
                    type="date"
                    className="app-date-input"
                    value={reviewDate}
                    onChange={e => setReviewDate(e.target.value)}
                  />
                </div>
              </div>

              {/* ══ SAVE ROW ══ */}
              <div className="app-save-row">
                <button
                  className="app-save-btn"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 size={13} className="spin" />
                  ) : (
                    <Save size={13} />
                  )}
                  {isSaving ? 'Saving…' : 'Save Application'}
                </button>

                {saveState === 'saved' && (
                  <span className="app-save-status saved">
                    <Check size={13} /> Saved
                  </span>
                )}
                {saveState === 'error' && (
                  <span className="app-save-status error">
                    <AlertCircle size={13} /> Failed to save — check connection
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
