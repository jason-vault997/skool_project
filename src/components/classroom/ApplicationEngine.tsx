import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown, Check, AlertCircle, Loader2,
  BookOpen, Zap, RotateCcw,
} from 'lucide-react';
import {
  ApplicationRecord,
  ApplicationStatus,
} from '../../lib/supabase/types';
import {
  getApplicationRecord,
  upsertApplicationRecord,
} from '../../lib/data/applicationRecords';
import './ApplicationEngine.css';

// ── Types ─────────────────────────────────────────────────────
type Stage      = 'decide' | 'execute' | 'reflect';
type ApplyChoice = 'apply' | 'test' | 'skip' | null;
type SaveState  = 'idle' | 'saving' | 'saved' | 'error';

// ── Helpers ───────────────────────────────────────────────────
function deriveStage(rec: ApplicationRecord | null): Stage {
  if (!rec || rec.status === 'Not Started' || rec.status === 'Skipped') return 'decide';
  if (rec.status === 'In Progress') return 'execute';
  return 'reflect'; // Completed, Failed
}

function deriveApplyChoice(rec: ApplicationRecord | null): ApplyChoice {
  if (!rec) return null;
  if (rec.status === 'Skipped') return 'skip';
  if (rec.experiment) return 'test';
  if (rec.mission || rec.status === 'In Progress' || rec.status === 'Completed' || rec.status === 'Failed') return 'apply';
  return null;
}

function pillClass(s: ApplicationStatus): string {
  switch (s) {
    case 'In Progress': return 'app-pill app-pill-progress';
    case 'Completed':   return 'app-pill app-pill-done';
    case 'Failed':      return 'app-pill app-pill-failed';
    case 'Skipped':     return 'app-pill app-pill-skipped';
    default:            return 'app-pill app-pill-none';
  }
}

// ── Component ─────────────────────────────────────────────────
interface ApplicationEngineProps {
  lessonId: string;
  userId:   string;
  onSaved?: (record: ApplicationRecord) => void;
}

export const ApplicationEngine: React.FC<ApplicationEngineProps> = ({
  lessonId, userId, onSaved,
}) => {
  // ── UI state
  const [isOpen,        setIsOpen]        = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [saveState,     setSaveState]     = useState<SaveState>('idle');
  const [currentStage,  setCurrentStage]  = useState<Stage>('decide');
  const [applyChoice,   setApplyChoice]   = useState<ApplyChoice>(null);
  const [showDepth,     setShowDepth]     = useState(false);
  const [record,        setRecord]        = useState<ApplicationRecord | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Form state (shared across stages)
  const [keyConcepts, setKeyConcepts] = useState('');
  const [mission,     setMission]     = useState('');
  const [reviewDate,  setReviewDate]  = useState('');
  const [experiment,  setExperiment]  = useState('');
  const [outcome,     setOutcome]     = useState('');
  const [status,      setStatus]      = useState<ApplicationStatus>('Not Started');
  const [reflection,  setReflection]  = useState('');
  const [notes,       setNotes]       = useState('');
  const [importance,  setImportance]  = useState('');
  const [commitment,  setCommitment]  = useState('');

  // ── Load record when lesson changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSaveState('idle');
    setShowDepth(false);

    getApplicationRecord(userId, lessonId).then(rec => {
      if (cancelled) return;
      setRecord(rec);
      if (rec) {
        setKeyConcepts(rec.key_concepts ?? '');
        setMission(rec.mission          ?? '');
        setReviewDate(rec.review_date   ?? '');
        setExperiment(rec.experiment    ?? '');
        setOutcome(rec.outcome          ?? '');
        setStatus(rec.status            ?? 'Not Started');
        setReflection(rec.reflection    ?? '');
        setNotes(rec.notes              ?? '');
        setImportance(rec.importance    ?? '');
        setCommitment(rec.commitment    ?? '');
        setApplyChoice(deriveApplyChoice(rec));
      } else {
        setKeyConcepts(''); setMission(''); setReviewDate(''); setExperiment('');
        setOutcome(''); setStatus('Not Started'); setReflection('');
        setNotes(''); setImportance(''); setCommitment('');
        setApplyChoice(null);
      }
      setCurrentStage(deriveStage(rec));
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [lessonId, userId]);

  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current); }, []);

  // ── Core save helper — sends ALL current field values
  async function doSave(explicitStatus: ApplicationStatus, advance?: Stage) {
    setSaveState('saving');
    const saved = await upsertApplicationRecord(userId, lessonId, {
      key_concepts: keyConcepts.trim() || undefined,
      mission:      mission.trim()     || undefined,
      experiment:   experiment.trim()  || undefined,
      review_date:  reviewDate         || null,
      status:       explicitStatus,
      outcome:      outcome.trim()     || undefined,
      reflection:   reflection.trim()  || undefined,
      notes:        notes.trim()       || undefined,
      importance:   importance.trim()  || undefined,
      commitment:   commitment.trim()  || undefined,
    });

    if (saved) {
      setRecord(saved);
      setSaveState('saved');
      onSaved?.(saved);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveState('idle'), 2500);
      if (advance) setCurrentStage(advance);
    } else {
      setSaveState('error');
    }
  }

  // ── Stage: DECIDE handlers
  async function handleChoiceSelect(choice: ApplyChoice) {
    setApplyChoice(choice);
    if (choice === 'skip') {
      setStatus('Skipped');
      await doSave('Skipped');
    }
  }

  async function handleDecideSave() {
    const next: ApplicationStatus = applyChoice === 'skip' ? 'Skipped' : 'In Progress';
    setStatus(next);
    await doSave(next, next === 'In Progress' ? 'execute' : undefined);
  }

  // ── Stage: EXECUTE handler
  async function handleExecuteSave() {
    const advance = (status === 'Completed' || status === 'Failed') ? 'reflect' : undefined;
    await doSave(status, advance);
  }

  // ── Stage: REFLECT handler
  async function handleReflectSave() {
    await doSave(status);
  }

  // ── Render ────────────────────────────────────────────────
  const isSaving   = saveState === 'saving';
  const hasRecord  = record !== null;
  const displayStatus: ApplicationStatus = hasRecord ? status : 'Not Started';

  const STAGES: { key: Stage; label: string }[] = [
    { key: 'decide',  label: 'Decide' },
    { key: 'execute', label: 'Execute' },
    { key: 'reflect', label: 'Reflect' },
  ];

  return (
    <div className="app-engine">
      {/* ── Collapse header ── */}
      <button
        className={`app-engine-header ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen(o => !o)}
        aria-expanded={isOpen}
      >
        <div className="app-engine-header-left">
          <span className="app-engine-title">Application</span>
          <span className={pillClass(displayStatus)}>{displayStatus}</span>
        </div>
        <ChevronDown size={16} className={`app-engine-chevron ${isOpen ? 'is-open' : ''}`} />
      </button>

      {/* ── Expanded body ── */}
      {isOpen && (
        <div className="app-engine-body">
          {loading ? (
            <div className="app-loading"><Loader2 size={15} className="spin" /> Loading…</div>
          ) : (
            <>
              {/* Stage tabs */}
              <div className="app-stage-tabs">
                {STAGES.map(s => (
                  <button
                    key={s.key}
                    className={`app-stage-tab ${currentStage === s.key ? 'is-active' : ''}`}
                    onClick={() => setCurrentStage(s.key)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* ═══ DECIDE ═══ */}
              {currentStage === 'decide' && (
                <div className="app-stage-content">

                  <div className="app-q-block">
                    <label className="app-q-label">
                      What's the one thing that matters from this lesson?
                    </label>
                    <input
                      type="text"
                      className="app-single-input"
                      placeholder="e.g. Clarity closes every sale."
                      value={keyConcepts}
                      onChange={e => setKeyConcepts(e.target.value)}
                    />
                  </div>

                  <div className="app-q-block">
                    <label className="app-q-label">Are you applying this?</label>
                    <div className="app-choice-btns">
                      <button
                        className={`app-choice-btn ${applyChoice === 'apply' ? 'is-selected' : ''}`}
                        onClick={() => handleChoiceSelect('apply')}
                      >
                        <Zap size={13} />
                        Applying it
                      </button>
                      <button
                        className={`app-choice-btn ${applyChoice === 'test' ? 'is-selected' : ''}`}
                        onClick={() => handleChoiceSelect('test')}
                      >
                        <BookOpen size={13} />
                        Testing it
                      </button>
                      <button
                        className={`app-choice-btn choice-skip ${applyChoice === 'skip' ? 'is-selected' : ''}`}
                        onClick={() => handleChoiceSelect('skip')}
                      >
                        Not relevant
                      </button>
                    </div>
                  </div>

                  {applyChoice === 'skip' && (
                    <div className="app-skip-confirm">
                      <Check size={13} />
                      Marked as not relevant. You can change this anytime.
                    </div>
                  )}

                  {(applyChoice === 'apply' || applyChoice === 'test') && (
                    <>
                      <div className="app-q-block">
                        <label className="app-q-label">What are you doing?</label>
                        <textarea
                          className="app-textarea app-textarea-sm"
                          placeholder="Be specific. One concrete action."
                          value={mission}
                          onChange={e => setMission(e.target.value)}
                          rows={2}
                        />
                      </div>

                      {applyChoice === 'test' && (
                        <div className="app-q-block">
                          <label className="app-q-label">What's the hypothesis?</label>
                          <textarea
                            className="app-textarea app-textarea-sm"
                            placeholder="If I do X, I expect Y because Z…"
                            value={experiment}
                            onChange={e => setExperiment(e.target.value)}
                            rows={2}
                          />
                        </div>
                      )}

                      <div className="app-q-block">
                        <label className="app-q-label">By when?</label>
                        <input
                          type="date"
                          className="app-date-input"
                          value={reviewDate}
                          onChange={e => setReviewDate(e.target.value)}
                        />
                      </div>

                      <div className="app-save-row">
                        <button
                          className="app-save-btn"
                          onClick={handleDecideSave}
                          disabled={isSaving}
                        >
                          {isSaving
                            ? <Loader2 size={13} className="spin" />
                            : <Zap size={13} />}
                          {isSaving ? 'Saving…' : "Commit →"}
                        </button>
                        {saveState === 'saved' && <span className="app-saved-msg"><Check size={12} /> Saved</span>}
                        {saveState === 'error' && <span className="app-error-msg"><AlertCircle size={12} /> Failed — check connection</span>}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ═══ EXECUTE ═══ */}
              {currentStage === 'execute' && (
                <div className="app-stage-content">
                  {mission && (
                    <div className="app-mission-reminder">
                      <span className="app-reminder-label">Your mission</span>
                      <span className="app-reminder-text">"{mission}"</span>
                    </div>
                  )}

                  <div className="app-q-block">
                    <label className="app-q-label">What happened?</label>
                    <textarea
                      className="app-textarea"
                      placeholder="Describe what actually happened. Don't sugarcoat it."
                      value={outcome}
                      onChange={e => setOutcome(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="app-q-block">
                    <label className="app-q-label">Status</label>
                    <div className="app-status-select-wrapper">
                      <select
                        className="app-status-select"
                        value={status}
                        data-status={status}
                        onChange={e => setStatus(e.target.value as ApplicationStatus)}
                      >
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Failed">Failed</option>
                        <option value="Skipped">Skipped</option>
                      </select>
                    </div>
                  </div>

                  <div className="app-save-row">
                    <button
                      className="app-save-btn"
                      onClick={handleExecuteSave}
                      disabled={isSaving}
                    >
                      {isSaving ? <Loader2 size={13} className="spin" /> : <Check size={13} />}
                      {isSaving ? 'Saving…' : 'Save Result'}
                    </button>
                    {saveState === 'saved' && <span className="app-saved-msg"><Check size={12} /> Saved</span>}
                    {saveState === 'error' && <span className="app-error-msg"><AlertCircle size={12} /> Failed — check connection</span>}
                  </div>
                </div>
              )}

              {/* ═══ REFLECT ═══ */}
              {currentStage === 'reflect' && (
                <div className="app-stage-content">
                  {outcome && (
                    <div className={`app-outcome-reminder ${status === 'Failed' ? 'outcome-failed' : 'outcome-done'}`}>
                      <span className="app-reminder-label">Result — {status}</span>
                      <span className="app-reminder-text">"{outcome}"</span>
                    </div>
                  )}

                  <div className="app-q-block">
                    <label className="app-q-label">
                      {status === 'Failed'
                        ? 'What went wrong? What changes next?'
                        : 'What did this teach you?'}
                    </label>
                    <textarea
                      className="app-textarea"
                      placeholder={status === 'Failed'
                        ? 'What failed? Why? What do you test next?'
                        : 'What worked? What would you do differently?'}
                      value={reflection}
                      onChange={e => setReflection(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="app-q-block">
                    <label className="app-q-label">Review date</label>
                    <input
                      type="date"
                      className="app-date-input"
                      value={reviewDate}
                      onChange={e => setReviewDate(e.target.value)}
                    />
                  </div>

                  {/* Depth toggle */}
                  <button
                    className="app-depth-toggle"
                    onClick={() => setShowDepth(d => !d)}
                  >
                    {showDepth ? '− Less' : '+ Deeper notes'}
                  </button>

                  {showDepth && (
                    <div className="app-depth-fields">
                      <div className="app-q-block">
                        <label className="app-q-label">Why did it matter?</label>
                        <textarea className="app-textarea app-textarea-sm" value={importance} onChange={e => setImportance(e.target.value)} rows={2} placeholder="Importance / context…" />
                      </div>
                      <div className="app-q-block">
                        <label className="app-q-label">Raw notes</label>
                        <textarea className="app-textarea app-textarea-sm" value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Anything else worth keeping…" />
                      </div>
                      <div className="app-q-block">
                        <label className="app-q-label">Next commitment</label>
                        <textarea className="app-textarea app-textarea-sm" value={commitment} onChange={e => setCommitment(e.target.value)} rows={2} placeholder="What's the next specific action?" />
                      </div>
                    </div>
                  )}

                  <div className="app-save-row">
                    <button
                      className="app-save-btn"
                      onClick={handleReflectSave}
                      disabled={isSaving}
                    >
                      {isSaving ? <Loader2 size={13} className="spin" /> : <RotateCcw size={13} />}
                      {isSaving ? 'Saving…' : 'Save Reflection'}
                    </button>
                    {saveState === 'saved' && <span className="app-saved-msg"><Check size={12} /> Saved</span>}
                    {saveState === 'error' && <span className="app-error-msg"><AlertCircle size={12} /> Failed — check connection</span>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
