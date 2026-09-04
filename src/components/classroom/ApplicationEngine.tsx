import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown, Check, AlertCircle, Loader2,
  Zap, BookOpen, Edit2, Lock,
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

// ─────────────────── Types ────────────────────────────────────
/**
 * AppMode drives the entire UI state machine:
 *   loading   → spinner
 *   decide    → stage 1: the decision
 *   execute   → stage 2: mission + I DID IT
 *   reflect   → stage 3: result + reflection
 *   completed → read-only closed loop record
 *   skipped   → read-only compact skipped record
 *   edit      → unlocks all 3 stages from completed/skipped
 */
type AppMode     = 'loading' | 'decide' | 'execute' | 'reflect' | 'completed' | 'skipped' | 'edit';
type EditStage   = 'decide' | 'execute' | 'reflect';
type ApplyChoice = 'apply' | 'test' | 'skip' | null;
type SaveState   = 'idle' | 'saving' | 'saved' | 'error';
type ExecStep    = 'cta' | 'result'; // cta = big action buttons, result = outcome textarea
type DeadlineChip = 'today' | 'tomorrow' | 'this-week' | 'pick' | null;
type ReviewChip   = 'none' | '3-days' | '1-week' | '1-month' | 'pick' | null;

// ─────────────────── Helpers ──────────────────────────────────
function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatDeadlineDisplay(s: string | null | undefined): string {
  if (!s) return '—';
  if (s === 'Today' || s === 'Tomorrow' || s === 'This Week') return s;
  try {
    const d = new Date(s + 'T00:00:00');
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  } catch { /* ignore */ }
  return s;
}

function deriveMode(rec: ApplicationRecord | null): AppMode {
  if (!rec || rec.status === 'Not Started') return 'decide';
  if (rec.status === 'Skipped') return 'skipped';
  if (rec.status === 'In Progress') return 'execute';
  // Completed or Failed
  if (rec.reflection) return 'completed';
  return 'reflect';
}

function deriveApplyChoice(rec: ApplicationRecord | null): ApplyChoice {
  if (!rec) return null;
  if (rec.status === 'Skipped') return 'skip';
  if (rec.experiment) return 'test';
  if (rec.mission || rec.status === 'In Progress' || rec.status === 'Completed' || rec.status === 'Failed') return 'apply';
  return null;
}

/**
 * Commitment field stores the deadline label:
 * "Today" | "Tomorrow" | "This Week" | "YYYY-MM-DD"
 */
function deriveDeadlineChip(commitment: string | null | undefined): DeadlineChip {
  if (!commitment) return null;
  if (commitment === 'Today') return 'today';
  if (commitment === 'Tomorrow') return 'tomorrow';
  if (commitment === 'This Week') return 'this-week';
  if (/^\d{4}-\d{2}-\d{2}$/.test(commitment)) return 'pick';
  return null; // old freetext — don't match any chip
}

function deriveReviewChip(dateStr: string | null | undefined): ReviewChip {
  if (!dateStr) return 'none';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff <= 0) return 'none';
  if (diff <= 3) return '3-days';
  if (diff <= 7) return '1-week';
  if (diff <= 31) return '1-month';
  return 'pick';
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

// ─────────────────── Component ────────────────────────────────
interface ApplicationEngineProps {
  lessonId: string;
  userId:   string;
  onSaved?: (record: ApplicationRecord) => void;
}

export const ApplicationEngine: React.FC<ApplicationEngineProps> = ({
  lessonId, userId, onSaved,
}) => {
  // ── UI state ─────────────────────────────────────────────
  const [isOpen,          setIsOpen]          = useState(false);
  const [mode,            setMode]            = useState<AppMode>('loading');
  const [editStage,       setEditStage]       = useState<EditStage>('decide');
  const [saveState,       setSaveState]       = useState<SaveState>('idle');
  const [applyChoice,     setApplyChoice]     = useState<ApplyChoice>(null);
  const [execStep,        setExecStep]        = useState<ExecStep>('cta');
  const [deadlineChip,    setDeadlineChip]    = useState<DeadlineChip>(null);
  const [reviewChip,      setReviewChip]      = useState<ReviewChip>('none');
  const [justCompleted,   setJustCompleted]   = useState(false);
  const [record,          setRecord]          = useState<ApplicationRecord | null>(null);
  const savedTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Form state ───────────────────────────────────────────
  // commitment stores deadline label: "Today" / "Tomorrow" / "This Week" / "YYYY-MM-DD"
  // review_date stores reflection review date: "YYYY-MM-DD" (separate concept)
  const [keyConcepts,  setKeyConcepts]  = useState('');
  const [mission,      setMission]      = useState('');
  const [experiment,   setExperiment]   = useState('');
  const [commitment,   setCommitment]   = useState('');   // execution deadline label
  const [deadlinePick, setDeadlinePick] = useState('');   // YYYY-MM-DD when chip=pick
  const [outcome,      setOutcome]      = useState('');
  const [status,       setStatus]       = useState<ApplicationStatus>('Not Started');
  const [reflection,   setReflection]   = useState('');
  const [reviewDate,   setReviewDate]   = useState<string | null>(null); // reflection review
  const [reviewPick,   setReviewPick]   = useState('');   // YYYY-MM-DD when chip=pick
  const [notes,        setNotes]        = useState('');
  const [importance,   setImportance]   = useState('');

  // ── Load record ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setMode('loading');
    setSaveState('idle');
    setJustCompleted(false);

    getApplicationRecord(userId, lessonId).then(rec => {
      if (cancelled) return;
      setRecord(rec);

      if (rec) {
        setKeyConcepts(rec.key_concepts ?? '');
        setMission(rec.mission          ?? '');
        setExperiment(rec.experiment    ?? '');
        setCommitment(rec.commitment    ?? '');
        const isDatePick = rec.commitment && /^\d{4}-\d{2}-\d{2}$/.test(rec.commitment);
        setDeadlinePick(isDatePick ? (rec.commitment as string) : '');
        setOutcome(rec.outcome          ?? '');
        setStatus(rec.status            ?? 'Not Started');
        setReflection(rec.reflection    ?? '');
        setReviewDate(rec.review_date   ?? null);
        setReviewPick(rec.review_date   ?? '');
        setNotes(rec.notes              ?? '');
        setImportance(rec.importance    ?? '');
        setApplyChoice(deriveApplyChoice(rec));
        setDeadlineChip(deriveDeadlineChip(rec.commitment));
        setReviewChip(deriveReviewChip(rec.review_date));
        setExecStep(rec.outcome ? 'result' : 'cta');
      } else {
        setKeyConcepts(''); setMission(''); setExperiment('');
        setCommitment(''); setDeadlinePick('');
        setOutcome(''); setStatus('Not Started'); setReflection('');
        setReviewDate(null); setReviewPick('');
        setNotes(''); setImportance('');
        setApplyChoice(null); setDeadlineChip(null); setReviewChip('none');
        setExecStep('cta');
      }

      setMode(deriveMode(rec));
    });

    return () => { cancelled = true; };
  }, [lessonId, userId]);

  useEffect(() => () => {
    if (savedTimer.current)     clearTimeout(savedTimer.current);
    if (completedTimer.current) clearTimeout(completedTimer.current);
  }, []);

  // ── Core save ─────────────────────────────────────────────
  async function doSave(explicitStatus: ApplicationStatus, advanceMode?: AppMode) {
    setSaveState('saving');
    const saved = await upsertApplicationRecord(userId, lessonId, {
      key_concepts: keyConcepts.trim() || undefined,
      mission:      mission.trim()     || undefined,
      experiment:   experiment.trim()  || undefined,
      commitment:   commitment.trim()  || undefined, // deadline label — separate from review_date
      status:       explicitStatus,
      outcome:      outcome.trim()     || undefined,
      reflection:   reflection.trim()  || undefined,
      review_date:  reviewDate         || null,       // reflection review date only
      notes:        notes.trim()       || undefined,
      importance:   importance.trim()  || undefined,
    });

    if (saved) {
      setRecord(saved);
      setSaveState('saved');
      onSaved?.(saved);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveState('idle'), 2000);

      if (advanceMode === 'completed') {
        setJustCompleted(true);
        setMode('completed');
        if (completedTimer.current) clearTimeout(completedTimer.current);
        completedTimer.current = setTimeout(() => setJustCompleted(false), 3500);
      } else if (advanceMode) {
        setMode(advanceMode);
      }
    } else {
      setSaveState('error');
    }
  }

  // ── Deadline chip handlers ────────────────────────────────
  function handleDeadlineChip(chip: DeadlineChip) {
    setDeadlineChip(chip);
    if (chip === 'today')      setCommitment('Today');
    else if (chip === 'tomorrow')   setCommitment('Tomorrow');
    else if (chip === 'this-week')  setCommitment('This Week');
    else if (chip === 'pick')       setCommitment(deadlinePick);
  }

  function handleDeadlineDatePick(v: string) {
    setDeadlinePick(v);
    setCommitment(v);
  }

  // ── Review chip handlers ──────────────────────────────────
  function handleReviewChip(chip: ReviewChip) {
    setReviewChip(chip);
    if (chip === 'none')      setReviewDate(null);
    else if (chip === '3-days')    setReviewDate(addDays(3));
    else if (chip === '1-week')    setReviewDate(addDays(7));
    else if (chip === '1-month')   setReviewDate(addDays(30));
    else if (chip === 'pick')      setReviewDate(reviewPick || null);
  }

  function handleReviewDatePick(v: string) {
    setReviewPick(v);
    setReviewDate(v);
  }

  // ── Stage access control ──────────────────────────────────
  /**
   * In edit mode: all stages accessible.
   * In normal mode:
   *   decide  → always accessible
   *   execute → only if In Progress / Completed / Failed
   *   reflect → only if Completed / Failed
   * Future stages are LOCKED (not clickable).
   */
  function isStageAccessible(stage: EditStage): boolean {
    if (mode === 'edit') return true;
    if (stage === 'decide') return true;
    if (stage === 'execute') return status === 'In Progress' || status === 'Completed' || status === 'Failed';
    if (stage === 'reflect') return status === 'Completed' || status === 'Failed';
    return false;
  }

  type StageState = 'done' | 'current' | 'locked';

  function getStageState(stage: EditStage): StageState {
    const currentMode = mode === 'edit' ? editStage : mode;
    if (!isStageAccessible(stage)) return 'locked';
    if (currentMode === stage) return 'current';
    return 'done';
  }

  function handleStageClick(stage: EditStage) {
    if (!isStageAccessible(stage)) return;
    if (mode === 'edit') setEditStage(stage);
    else setMode(stage as AppMode);
  }

  // ── DECIDE stage handlers ─────────────────────────────────
  async function handleSkip() {
    setStatus('Skipped');
    await doSave('Skipped', 'skipped');
  }

  async function handleCommit() {
    setStatus('In Progress');
    await doSave('In Progress', 'execute');
  }

  // ── EXECUTE stage handlers ────────────────────────────────
  async function handleDidntExecute() {
    setStatus('Failed');
    // Save what we have, advance to reflect with "didn't execute" context
    await doSave('Failed', 'reflect');
  }

  async function handleResultWorked() {
    setStatus('Completed');
    await doSave('Completed', 'reflect');
  }

  async function handleResultFailed() {
    setStatus('Failed');
    await doSave('Failed', 'reflect');
  }

  // ── REFLECT stage handler ─────────────────────────────────
  async function handleCloseLoop() {
    // Status stays whatever it was from execute (Completed or Failed)
    await doSave(status, 'completed');
  }

  // ── EDIT mode ─────────────────────────────────────────────
  function handleEnterEdit() {
    setEditStage('decide');
    setMode('edit');
    setSaveState('idle');
  }

  async function handleEditSave() {
    setSaveState('saving');
    const saved = await upsertApplicationRecord(userId, lessonId, {
      key_concepts: keyConcepts.trim() || undefined,
      mission:      mission.trim()     || undefined,
      experiment:   experiment.trim()  || undefined,
      commitment:   commitment.trim()  || undefined,
      status,
      outcome:      outcome.trim()     || undefined,
      reflection:   reflection.trim()  || undefined,
      review_date:  reviewDate         || null,
      notes:        notes.trim()       || undefined,
      importance:   importance.trim()  || undefined,
    });
    if (saved) {
      setRecord(saved);
      setSaveState('saved');
      onSaved?.(saved);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => {
        setMode(deriveMode(saved));
        setSaveState('idle');
      }, 1200);
    } else {
      setSaveState('error');
    }
  }

  // ── Computed ──────────────────────────────────────────────
  const isSaving = saveState === 'saving';
  const displayStatus: ApplicationStatus = record ? (record.status as ApplicationStatus) : 'Not Started';

  // Which stage tab is active
  const activeStageTab: EditStage | null =
    mode === 'decide' ? 'decide' :
    mode === 'execute' ? 'execute' :
    mode === 'reflect' ? 'reflect' :
    mode === 'edit' ? editStage :
    null;

  // ─────────────────── Render ───────────────────────────────

  // Stage progress bar — used in all 3 interactive stages + edit mode
  const StageBar = () => {
    const stages: { key: EditStage; label: string; num: string }[] = [
      { key: 'decide',  label: 'Decide',  num: '01' },
      { key: 'execute', label: 'Execute', num: '02' },
      { key: 'reflect', label: 'Reflect', num: '03' },
    ];

    return (
      <div className="app-stage-bar" role="tablist">
        {stages.map((s, i) => {
          const state  = getStageState(s.key);
          const active = activeStageTab === s.key;
          return (
            <React.Fragment key={s.key}>
              {i > 0 && <div className={`app-stage-connector ${getStageState(stages[i-1].key) === 'done' ? 'connector-done' : ''}`} />}
              <button
                role="tab"
                aria-selected={active}
                className={`app-stage-step stage-${state} ${active ? 'stage-active' : ''}`}
                onClick={() => handleStageClick(s.key)}
                disabled={state === 'locked'}
                title={state === 'locked' ? 'Complete the previous stage first' : s.label}
              >
                <span className="stage-step-indicator">
                  {state === 'done' ? <Check size={10} strokeWidth={3} /> :
                   state === 'locked' ? <Lock size={9} /> :
                   <span className="stage-step-num">{s.num}</span>}
                </span>
                <span className="stage-step-label">{s.label}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // Save feedback row — reused across stages
  const SaveFeedback = () => (
    <div className="app-save-feedback" aria-live="polite">
      {saveState === 'saved' && <span className="app-saved-msg"><Check size={12} /> Saved</span>}
      {saveState === 'error' && <span className="app-error-msg"><AlertCircle size={12} /> Failed — check connection</span>}
    </div>
  );

  // ── Loading ───────────────────────────────────────────────
  if (mode === 'loading') {
    return (
      <div className="app-engine">
        <div className="app-engine-header-static">
          <span className="app-engine-title">Application</span>
          <Loader2 size={14} className="spin" />
        </div>
      </div>
    );
  }

  // ── Completed read-only record ────────────────────────────
  if (mode === 'completed') {
    return (
      <div className="app-engine app-engine-completed">
        <div className="app-completed-header">
          <div className="app-completed-title-row">
            <div className="app-completed-left">
              <span className="app-engine-title">Application</span>
              <span className={pillClass(displayStatus)}>{displayStatus}</span>
            </div>
            <button className="app-edit-btn" onClick={handleEnterEdit}>
              <Edit2 size={12} /> Edit
            </button>
          </div>
          <div className="app-completed-stages">
            <span className="completed-stage-tag"><Check size={10} />Decide</span>
            <span className="completed-stage-sep">·</span>
            <span className="completed-stage-tag"><Check size={10} />Execute</span>
            <span className="completed-stage-sep">·</span>
            <span className="completed-stage-tag"><Check size={10} />Reflect</span>
          </div>
        </div>

        {justCompleted && (
          <div className="app-loop-closed-flash">
            <Check size={14} strokeWidth={3} />
            LOOP CLOSED. You didn't just watch it.
          </div>
        )}

        <div className="app-record-body">
          {keyConcepts && (
            <div className="app-record-row">
              <span className="app-record-label">THE TAKEAWAY</span>
              <span className="app-record-value">"{keyConcepts}"</span>
            </div>
          )}
          {mission && (
            <div className="app-record-row">
              <span className="app-record-label">THE ACTION</span>
              <span className="app-record-value">"{mission}"</span>
            </div>
          )}
          {outcome && (
            <div className={`app-record-row ${displayStatus === 'Failed' ? 'record-row-failed' : 'record-row-done'}`}>
              <span className="app-record-label">RESULT · {displayStatus}</span>
              <span className="app-record-value">"{outcome}"</span>
              {displayStatus === 'Failed' && (
                <span className="app-record-subtext">Didn't work. Now we know.</span>
              )}
            </div>
          )}
          {reflection && (
            <div className="app-record-row">
              <span className="app-record-label">WHAT I LEARNED</span>
              <span className="app-record-value">"{reflection}"</span>
            </div>
          )}
          {reviewDate && (
            <div className="app-record-row app-record-review">
              <span className="app-record-label">REVIEW</span>
              <span className="app-record-value">
                {new Date(reviewDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Skipped read-only ─────────────────────────────────────
  if (mode === 'skipped') {
    return (
      <div className="app-engine app-engine-skipped">
        <div className="app-completed-header">
          <div className="app-completed-title-row">
            <div className="app-completed-left">
              <span className="app-engine-title">Application</span>
              <span className="app-pill app-pill-skipped">Skipped</span>
            </div>
            <button className="app-edit-btn" onClick={handleEnterEdit}>
              <Edit2 size={12} /> Edit
            </button>
          </div>
        </div>
        <div className="app-skipped-body">
          <span className="app-skipped-text">Deliberately skipped. Not relevant right now.</span>
          {keyConcepts && <span className="app-skipped-note">"{keyConcepts}"</span>}
        </div>
      </div>
    );
  }

  // ── Interactive stages (decide / execute / reflect / edit) ─
  const showStageBar = mode === 'decide' || mode === 'execute' || mode === 'reflect' || mode === 'edit';
  const currentStageKey: EditStage = mode === 'edit' ? editStage : (mode as EditStage);

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
          {mode === 'edit' && <span className="app-editing-badge">editing</span>}
        </div>
        <ChevronDown size={16} className={`app-engine-chevron ${isOpen ? 'is-open' : ''}`} />
      </button>

      {isOpen && (
        <div className="app-engine-body">
          {showStageBar && <StageBar />}

          {/* ═══════════ DECIDE STAGE ═══════════ */}
          {currentStageKey === 'decide' && (
            <div className="app-stage-content">
              {/* Callout header */}
              <div className="app-decide-callout">
                <span>You watched it.</span>
                <strong>Now do something with it.</strong>
              </div>

              {/* THE ONE THING */}
              <div className="app-q-block">
                <label className="app-q-label-major">THE ONE THING</label>
                <span className="app-q-hint">What are you taking from this lesson?</span>
                <input
                  type="text"
                  className="app-single-input app-single-input-prominent"
                  placeholder="Make it concrete."
                  value={keyConcepts}
                  onChange={e => setKeyConcepts(e.target.value)}
                  autoComplete="off"
                />
              </div>

              {/* DECISION CARDS */}
              <div className="app-q-block">
                <label className="app-q-label-major">WHAT ARE YOU DOING WITH IT?</label>
                <div className="app-choice-cards">
                  <button
                    className={`app-choice-card ${applyChoice === 'apply' ? 'card-selected' : ''}`}
                    onClick={() => setApplyChoice('apply')}
                  >
                    <div className="card-icon-wrap card-icon-apply"><Zap size={15} /></div>
                    <div className="card-text">
                      <span className="card-title">YES. I'M USING THIS.</span>
                      <span className="card-sub">Putting it into practice.</span>
                    </div>
                    {applyChoice === 'apply' && <Check size={14} className="card-check" />}
                  </button>

                  <button
                    className={`app-choice-card ${applyChoice === 'test' ? 'card-selected' : ''}`}
                    onClick={() => setApplyChoice('test')}
                  >
                    <div className="card-icon-wrap card-icon-test"><BookOpen size={15} /></div>
                    <div className="card-text">
                      <span className="card-title">I'M TESTING IT.</span>
                      <span className="card-sub">Let's see if it actually works.</span>
                    </div>
                    {applyChoice === 'test' && <Check size={14} className="card-check" />}
                  </button>

                  <button
                    className={`app-choice-card card-skip ${applyChoice === 'skip' ? 'card-selected card-skip-selected' : ''}`}
                    onClick={() => setApplyChoice('skip')}
                  >
                    <div className="card-text">
                      <span className="card-title">NOT NOW.</span>
                      <span className="card-sub">Not relevant today.</span>
                    </div>
                    {applyChoice === 'skip' && <Check size={14} className="card-check" />}
                  </button>
                </div>
              </div>

              {/* APPLY / TEST flow */}
              {(applyChoice === 'apply' || applyChoice === 'test') && (
                <>
                  <div className="app-q-block">
                    <label className="app-q-label">WHAT ARE YOU ACTUALLY DOING?</label>
                    <textarea
                      className="app-textarea app-textarea-sm"
                      placeholder="Make it concrete. What action, exactly?"
                      value={mission}
                      onChange={e => setMission(e.target.value)}
                      rows={2}
                    />
                  </div>

                  {applyChoice === 'test' && (
                    <div className="app-q-block">
                      <label className="app-q-label">HYPOTHESIS</label>
                      <textarea
                        className="app-textarea app-textarea-sm"
                        placeholder="If I do X, I expect Y because Z…"
                        value={experiment}
                        onChange={e => setExperiment(e.target.value)}
                        rows={2}
                      />
                    </div>
                  )}

                  {/* WHEN chips — stores in commitment field */}
                  <div className="app-q-block">
                    <label className="app-q-label">WHEN ARE YOU PUTTING THIS INTO PLAY?</label>
                    <div className="app-chips">
                      {(['today','tomorrow','this-week','pick'] as DeadlineChip[]).map(chip => (
                        <button
                          key={chip as string}
                          className={`app-chip ${deadlineChip === chip ? 'chip-active' : ''}`}
                          onClick={() => handleDeadlineChip(chip)}
                        >
                          {chip === 'today'     ? 'Today' :
                           chip === 'tomorrow'  ? 'Tomorrow' :
                           chip === 'this-week' ? 'This Week' : 'Pick Date'}
                        </button>
                      ))}
                    </div>
                    {deadlineChip === 'pick' && (
                      <input
                        type="date"
                        className="app-date-input"
                        value={deadlinePick}
                        onChange={e => handleDeadlineDatePick(e.target.value)}
                      />
                    )}
                  </div>

                  <div className="app-action-row">
                    <button
                      className="app-primary-btn"
                      onClick={handleCommit}
                      disabled={isSaving}
                    >
                      {isSaving ? <Loader2 size={13} className="spin" /> : <Lock size={13} />}
                      {isSaving ? 'Saving…' : 'LOCK IT IN →'}
                    </button>
                    <SaveFeedback />
                  </div>
                </>
              )}

              {/* SKIP flow */}
              {applyChoice === 'skip' && (
                <div className="app-skip-flow">
                  <p className="app-skip-label">Skipping this one. Noted.</p>
                  <div className="app-action-row">
                    <button
                      className="app-secondary-btn"
                      onClick={handleSkip}
                      disabled={isSaving}
                    >
                      {isSaving ? <Loader2 size={13} className="spin" /> : null}
                      {isSaving ? 'Saving…' : 'SKIP →'}
                    </button>
                    <SaveFeedback />
                  </div>
                </div>
              )}

              {/* Edit-mode save */}
              {mode === 'edit' && applyChoice !== 'skip' && applyChoice !== null && (
                <div className="app-action-row app-edit-save-row">
                  <button className="app-secondary-btn" onClick={handleEditSave} disabled={isSaving}>
                    {isSaving ? <Loader2 size={13} className="spin" /> : <Check size={13} />}
                    {isSaving ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Save changes'}
                  </button>
                  <SaveFeedback />
                </div>
              )}
            </div>
          )}

          {/* ═══════════ EXECUTE STAGE ═══════════ */}
          {currentStageKey === 'execute' && (
            <div className="app-stage-content">
              {/* Mission display */}
              {(mission || commitment) && (
                <div className="app-mission-display">
                  {mission && (
                    <div className="app-mission-block">
                      <span className="app-mission-label">YOUR MISSION</span>
                      <span className="app-mission-text">"{mission}"</span>
                    </div>
                  )}
                  {commitment && (
                    <div className="app-deadline-block">
                      <span className="app-mission-label">DEADLINE</span>
                      <span className="app-deadline-value">{formatDeadlineDisplay(commitment)}</span>
                    </div>
                  )}
                </div>
              )}

              {execStep === 'cta' && (
                <div className="app-execute-cta">
                  <button
                    className="app-execute-btn app-execute-did-it"
                    onClick={() => setExecStep('result')}
                  >
                    <Check size={16} strokeWidth={2.5} />
                    I DID IT
                  </button>
                  <button
                    className="app-execute-btn app-execute-didnt"
                    onClick={handleDidntExecute}
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 size={14} className="spin" /> : null}
                    DIDN'T EXECUTE
                  </button>
                </div>
              )}

              {execStep === 'result' && (
                <>
                  <div className="app-q-block">
                    <label className="app-q-label-major">WHAT ACTUALLY HAPPENED?</label>
                    <textarea
                      className="app-textarea"
                      placeholder="Tell me what happened. No filter."
                      value={outcome}
                      onChange={e => setOutcome(e.target.value)}
                      rows={3}
                      autoFocus
                    />
                  </div>

                  <div className="app-result-btns">
                    <button
                      className="app-result-btn app-result-worked"
                      onClick={handleResultWorked}
                      disabled={isSaving}
                    >
                      {isSaving ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                      WORKED
                    </button>
                    <button
                      className="app-result-btn app-result-failed"
                      onClick={handleResultFailed}
                      disabled={isSaving}
                    >
                      DIDN'T WORK
                    </button>
                  </div>
                  <SaveFeedback />
                </>
              )}

              {/* Edit-mode save in execute */}
              {mode === 'edit' && (
                <div className="app-action-row app-edit-save-row">
                  <button className="app-secondary-btn" onClick={handleEditSave} disabled={isSaving}>
                    {isSaving ? <Loader2 size={13} className="spin" /> : <Check size={13} />}
                    {isSaving ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Save changes'}
                  </button>
                  <SaveFeedback />
                </div>
              )}
            </div>
          )}

          {/* ═══════════ REFLECT STAGE ═══════════ */}
          {currentStageKey === 'reflect' && (
            <div className="app-stage-content">
              {/* Result summary */}
              {outcome && (
                <div className={`app-result-summary ${status === 'Failed' ? 'result-summary-failed' : 'result-summary-done'}`}>
                  <div className="result-summary-row">
                    <span className="app-mission-label">RESULT · {status}</span>
                    {status === 'Failed' && <span className="result-summary-note">Didn't work. Good. Now we know.</span>}
                  </div>
                  <span className="result-summary-text">"{outcome}"</span>
                </div>
              )}

              <div className="app-q-block">
                <label className="app-q-label-major">
                  {status === 'Failed' ? 'WHAT WENT WRONG? WHAT CHANGES NEXT?' : 'WHAT DID THE RESULT TEACH YOU?'}
                </label>
                <textarea
                  className="app-textarea"
                  placeholder={status === 'Failed'
                    ? 'What failed? Why? What do you try next?'
                    : 'What worked? What would you do differently?'}
                  value={reflection}
                  onChange={e => setReflection(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Review date chips — uses review_date field (NOT commitment/deadline) */}
              <div className="app-q-block">
                <label className="app-q-label">REVISIT THIS?</label>
                <div className="app-chips">
                  {(['none','3-days','1-week','1-month','pick'] as ReviewChip[]).map(chip => (
                    <button
                      key={chip as string}
                      className={`app-chip ${reviewChip === chip ? 'chip-active' : ''}`}
                      onClick={() => handleReviewChip(chip)}
                    >
                      {chip === 'none'    ? 'No review' :
                       chip === '3-days' ? '3 days' :
                       chip === '1-week' ? '1 week' :
                       chip === '1-month'? '1 month' : 'Pick date'}
                    </button>
                  ))}
                </div>
                {reviewChip === 'pick' && (
                  <input
                    type="date"
                    className="app-date-input"
                    value={reviewPick}
                    onChange={e => handleReviewDatePick(e.target.value)}
                  />
                )}
              </div>

              {mode !== 'edit' ? (
                <div className="app-action-row">
                  <button
                    className="app-primary-btn app-close-loop-btn"
                    onClick={handleCloseLoop}
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 size={13} className="spin" /> : <Check size={13} strokeWidth={2.5} />}
                    {isSaving ? 'Saving…' : 'CLOSE THE LOOP →'}
                  </button>
                  <SaveFeedback />
                </div>
              ) : (
                <div className="app-action-row app-edit-save-row">
                  <button className="app-secondary-btn" onClick={handleEditSave} disabled={isSaving}>
                    {isSaving ? <Loader2 size={13} className="spin" /> : <Check size={13} />}
                    {isSaving ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Save changes'}
                  </button>
                  <SaveFeedback />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
