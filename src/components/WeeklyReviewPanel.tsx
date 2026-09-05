import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown,
  Minus, Check, Edit2, Lock, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import type { WeeklyReview } from '../lib/supabase/types';
import {
  getWeekBounds, getPreviousWeekBounds, offsetWeekBounds,
  getWeekMetrics, getOrCreateReview, getRecentReviews,
  saveReviewFields, completeReview,
  hasAnyMetrics,
  type WeekMetrics,
} from '../lib/data/weeklyReviews';
import {
  computeOperatingSignals,
  type OperatingSignal,
} from '../lib/business/operatingSignals';
import './WeeklyReviewPanel.css';

// ── Helpers ───────────────────────────────────────────────────

const fmtINR = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n);

function formatMetricValue(key: keyof WeekMetrics, value: number): string {
  if (key === 'revenue') return fmtINR(value);
  if (key === 'hours_worked') return `${Number(value).toFixed(1)}h`;
  return String(value);
}

function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart + 'T00:00:00');
  const end   = new Date(weekEnd   + 'T00:00:00');
  const sameMonth = start.getMonth() === end.getMonth();
  const startStr  = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr    = sameMonth
    ? end.toLocaleDateString('en-US', { day: 'numeric' })
    : end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const year = end.toLocaleDateString('en-US', { year: 'numeric' });
  return `${startStr}–${endStr}, ${year}`;
}

type DeltaResult = { pct: number | null; isNew: boolean; isZero: boolean };

function calcDelta(current: number, previous: number): DeltaResult {
  if (previous === 0 && current > 0) return { pct: null, isNew: true, isZero: false };
  if (previous === 0 && current === 0) return { pct: null, isNew: false, isZero: true };
  return {
    pct: Math.round(((current - previous) / previous) * 100),
    isNew: false,
    isZero: false,
  };
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// ── Metric rows config ────────────────────────────────────────
const METRIC_ROWS: { key: keyof WeekMetrics; label: string }[] = [
  { key: 'leads',          label: 'Leads'       },
  { key: 'sales_calls',    label: 'Sales Calls' },
  { key: 'clients_closed', label: 'Clients'     },
  { key: 'revenue',        label: 'Revenue'     },
  { key: 'content_posted', label: 'Content'     },
  { key: 'hours_worked',   label: 'Hours'       },
];

// ── Debrief field config ──────────────────────────────────────
type DebriefKey = keyof Pick<WeeklyReview,
  'biggest_win' | 'biggest_failure' | 'key_learning' |
  'bottleneck' | 'next_week_priority' | 'next_week_action' | 'notes'
>;

const DEBRIEF_FIELDS: {
  key: DebriefKey;
  label: string;
  placeholder: string;
  highlight?: boolean;
}[] = [
  { key: 'biggest_win',        label: 'BIGGEST WIN',            placeholder: "What actually went well this week?" },
  { key: 'biggest_failure',    label: 'BIGGEST FAILURE',        placeholder: "What didn't work? Be specific." },
  { key: 'key_learning',       label: 'KEY LEARNING',           placeholder: "What do you know now that you didn't before?" },
  { key: 'bottleneck',         label: 'BOTTLENECK',             placeholder: "What is the one thing slowing everything down?" },
  { key: 'next_week_priority', label: "NEXT WEEK'S PRIORITY",   placeholder: "One thing. What matters most next week?", highlight: true },
  { key: 'next_week_action',   label: "NEXT WEEK'S ACTION",     placeholder: "One concrete step. What are you actually going to do?", highlight: true },
  { key: 'notes',              label: 'NOTES',                  placeholder: "Anything else worth recording." },
];

// ── WeeklyReviewPanel ─────────────────────────────────────────
interface WeeklyReviewPanelProps {
  userId: string;
}

export const WeeklyReviewPanel: React.FC<WeeklyReviewPanelProps> = ({ userId }) => {
  const thisWeekBounds = getWeekBounds();
  const today = new Date().toISOString().split('T')[0];

  // ── State ────────────────────────────────────────────────
  const [weekStart,    setWeekStart]    = useState(thisWeekBounds.weekStart);
  const [weekEnd,      setWeekEnd]      = useState(thisWeekBounds.weekEnd);
  const [review,       setReview]       = useState<WeeklyReview | null>(null);
  const [prevMetrics,  setPrevMetrics]  = useState<WeekMetrics | null>(null);
  const [signals,      setSignals]      = useState<OperatingSignal[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [saveState,    setSaveState]    = useState<SaveState>('idle');
  const [editMode,     setEditMode]     = useState(false);
  const [closing,      setClosing]      = useState(false);
  const [recentReviews, setRecentReviews] = useState<WeeklyReview[]>([]);
  const [expandedPast, setExpandedPast] = useState<string | null>(null);

  // Debrief field local state
  const [debriefState, setDebriefState] = useState<Record<DebriefKey, string>>({
    biggest_win:        '',
    biggest_failure:    '',
    key_learning:       '',
    bottleneck:         '',
    next_week_priority: '',
    next_week_action:   '',
    notes:              '',
  });

  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load week data ────────────────────────────────────────
  const loadWeek = useCallback(async (ws: string, we: string) => {
    setLoading(true);
    setSaveState('idle');
    setEditMode(false);

    const [rev, prevBounds] = [
      await getOrCreateReview(userId, ws, we),
      getPreviousWeekBounds(ws),
    ];

    const [prev, recent] = await Promise.all([
      getWeekMetrics(userId, prevBounds.weekStart, prevBounds.weekEnd),
      getRecentReviews(userId, 5),
    ]);

    setReview(rev);
    setPrevMetrics(hasAnyMetrics(prev) ? prev : null);
    setSignals(computeOperatingSignals(
      {
        leads:          rev.leads,
        sales_calls:    rev.sales_calls,
        clients_closed: rev.clients_closed,
        revenue:        rev.revenue,
        content_posted: rev.content_posted,
        hours_worked:   rev.hours_worked,
      },
      hasAnyMetrics(prev) ? prev : null
    ));
    setDebriefState({
      biggest_win:        rev.biggest_win        ?? '',
      biggest_failure:    rev.biggest_failure    ?? '',
      key_learning:       rev.key_learning       ?? '',
      bottleneck:         rev.bottleneck         ?? '',
      next_week_priority: rev.next_week_priority ?? '',
      next_week_action:   rev.next_week_action   ?? '',
      notes:              rev.notes              ?? '',
    });
    // Show past reviews (exclude the current week)
    setRecentReviews(recent.filter(r => r.week_start !== ws));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadWeek(weekStart, weekEnd);
  }, [loadWeek, weekStart, weekEnd]);

  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
  }, []);

  // ── Week navigation ───────────────────────────────────────
  function navigateWeek(direction: -1 | 1) {
    const newBounds = offsetWeekBounds(weekStart, direction);
    // Prevent navigating to a future week
    if (newBounds.weekStart > thisWeekBounds.weekStart) return;
    setWeekStart(newBounds.weekStart);
    setWeekEnd(newBounds.weekEnd);
  }

  function goToThisWeek() {
    setWeekStart(thisWeekBounds.weekStart);
    setWeekEnd(thisWeekBounds.weekEnd);
  }

  const isCurrentWeek = weekStart === thisWeekBounds.weekStart;
  const isNextWeekDisabled = isCurrentWeek;

  // ── Debrief field save (on blur) ──────────────────────────
  async function handleFieldBlur(key: DebriefKey) {
    if (!review || !review.id) return;
    const value = debriefState[key].trim() || null;
    const saved = await saveReviewFields(review.id, { [key]: value } as Parameters<typeof saveReviewFields>[1]);
    if (saved) {
      setReview(saved);
      setSaveState('saved');
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveState('idle'), 2000);
    } else {
      setSaveState('error');
    }
  }

  // ── Close week ────────────────────────────────────────────
  const canCloseWeek = weekEnd < today; // only after the week has ended

  async function handleCloseWeek() {
    if (!review || !review.id || !canCloseWeek) return;
    setClosing(true);

    // Save any pending debrief fields first
    const fields: Partial<Parameters<typeof saveReviewFields>[1]> = {};
    (Object.keys(debriefState) as DebriefKey[]).forEach(key => {
      (fields as Record<string, string | null>)[key] = debriefState[key].trim() || null;
    });
    await saveReviewFields(review.id, fields as Parameters<typeof saveReviewFields>[1]);

    const closed = await completeReview(review.id);
    if (closed) {
      setReview(closed);
      setEditMode(false);
    }
    setClosing(false);
  }

  // ── Edit completed review ─────────────────────────────────
  async function handleSaveEdit() {
    if (!review || !review.id) return;
    setSaveState('saving');
    const fields: Partial<Parameters<typeof saveReviewFields>[1]> = {};
    (Object.keys(debriefState) as DebriefKey[]).forEach(key => {
      (fields as Record<string, string | null>)[key] = debriefState[key].trim() || null;
    });
    const saved = await saveReviewFields(review.id, fields as Parameters<typeof saveReviewFields>[1]);
    if (saved) {
      setReview(saved);
      setSaveState('saved');
      setEditMode(false);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveState('idle'), 2000);
    } else {
      setSaveState('error');
    }
  }

  // ── Render: week nav header ───────────────────────────────
  const renderNav = () => (
    <div className="wr-nav-header">
      <button
        className="wr-nav-btn"
        onClick={() => navigateWeek(-1)}
        title="Previous week"
      >
        <ChevronLeft size={16} />
      </button>

      <div className="wr-nav-center">
        <span className="wr-nav-week-label">
          <Calendar size={13} />
          {formatWeekRange(weekStart, weekEnd)}
        </span>
        {!isCurrentWeek && (
          <button className="wr-this-week-btn" onClick={goToThisWeek}>
            This week
          </button>
        )}
        {isCurrentWeek && (
          <span className="wr-current-week-tag">Current week</span>
        )}
      </div>

      <button
        className="wr-nav-btn"
        onClick={() => navigateWeek(1)}
        disabled={isNextWeekDisabled}
        title={isNextWeekDisabled ? "Can't navigate to future weeks" : "Next week"}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );

  // ── Render: metrics + comparison ──────────────────────────
  const renderMetrics = () => {
    if (!review) return null;
    const hasPrev = prevMetrics !== null;

    return (
      <div className="wr-metrics-section">
        <span className="wr-section-label">WHAT HAPPENED</span>
        <div className="wr-metrics-grid">
          {METRIC_ROWS.map(({ key, label }) => {
            const current = review[key as keyof WeeklyReview] as number ?? 0;
            const prev = hasPrev ? (prevMetrics![key] as number ?? 0) : null;
            const delta = prev !== null ? calcDelta(current, prev) : null;

            return (
              <div key={key} className="wr-metric-cell">
                <span className="wr-metric-label">{label}</span>
                <span className="wr-metric-value">{formatMetricValue(key, current)}</span>
                {delta && !delta.isZero && (
                  <span className={`wr-metric-delta ${
                    delta.isNew ? 'delta-new' :
                    delta.pct! > 0 ? 'delta-up' :
                    delta.pct! < 0 ? 'delta-down' : 'delta-flat'
                  }`}>
                    {delta.isNew ? (
                      <>↑ New</>
                    ) : delta.pct! > 0 ? (
                      <><TrendingUp size={10} /> +{delta.pct}%</>
                    ) : delta.pct! < 0 ? (
                      <><TrendingDown size={10} /> {delta.pct}%</>
                    ) : (
                      <><Minus size={10} /> flat</>
                    )}
                  </span>
                )}
                {!hasPrev && <span className="wr-metric-no-prev">—</span>}
              </div>
            );
          })}
        </div>
        {!hasPrev && (
          <p className="wr-no-prev-note">No previous week data available for comparison.</p>
        )}
      </div>
    );
  };

  // ── Render: signals ───────────────────────────────────────
  const renderSignals = () => {
    if (signals.length === 0) return null;
    return (
      <div className="wr-signals-section">
        <span className="wr-section-label">OPERATING SIGNALS</span>
        <div className="wr-signals-list">
          {signals.map(sig => (
            <div key={sig.id} className={`wr-signal wr-signal-${sig.severity}`}>
              <span className="wr-signal-label">{sig.label}</span>
              <span className="wr-signal-msg">{sig.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Render: debrief (editable or read-only) ───────────────
  const renderDebrief = (readOnly: boolean) => {
    const isReadOnly = readOnly && !editMode;

    return (
      <div className="wr-debrief-section">
        <span className="wr-section-label">OPERATOR DEBRIEF</span>
        <div className="wr-debrief-fields">
          {DEBRIEF_FIELDS.map(({ key, label, placeholder, highlight }) => {
            const value = debriefState[key];
            const savedValue = (review?.[key as keyof WeeklyReview] as string | null) ?? '';

            if (isReadOnly) {
              return (
                <div key={key} className={`wr-debrief-row ${highlight ? 'wr-debrief-highlight' : ''}`}>
                  <span className="wr-debrief-label">{label}</span>
                  {savedValue ? (
                    <span className="wr-debrief-value">"{savedValue}"</span>
                  ) : (
                    <span className="wr-debrief-empty">—</span>
                  )}
                </div>
              );
            }

            return (
              <div key={key} className={`wr-debrief-row ${highlight ? 'wr-debrief-highlight' : ''}`}>
                <label className="wr-debrief-label">{label}</label>
                <textarea
                  className={`wr-debrief-textarea ${highlight ? 'wr-textarea-highlight' : ''}`}
                  placeholder={placeholder}
                  value={value}
                  rows={highlight ? 2 : 2}
                  onChange={e => setDebriefState(s => ({ ...s, [key]: e.target.value }))}
                  onBlur={() => !editMode && handleFieldBlur(key)}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Render: footer action ─────────────────────────────────
  const renderFooter = () => {
    if (!review) return null;

    if (review.status === 'completed') {
      if (editMode) {
        return (
          <div className="wr-footer">
            <div className="wr-footer-left">
              <button className="wr-close-btn" onClick={handleSaveEdit} disabled={saveState === 'saving'}>
                {saveState === 'saving' ? <Loader2 size={13} className="spin" /> : <Check size={13} />}
                {saveState === 'saving' ? 'Saving…' : 'Save changes'}
              </button>
              <button className="wr-cancel-btn" onClick={() => {
                setEditMode(false);
                setDebriefState({
                  biggest_win:        review.biggest_win        ?? '',
                  biggest_failure:    review.biggest_failure    ?? '',
                  key_learning:       review.key_learning       ?? '',
                  bottleneck:         review.bottleneck         ?? '',
                  next_week_priority: review.next_week_priority ?? '',
                  next_week_action:   review.next_week_action   ?? '',
                  notes:              review.notes              ?? '',
                });
              }}>
                Cancel
              </button>
            </div>
            {saveState === 'error' && <span className="wr-save-error">Save failed — check connection</span>}
          </div>
        );
      }

      return (
        <div className="wr-footer wr-footer-completed">
          <div className="wr-completed-badge">
            <Check size={13} />
            Week closed
            {review.completed_at && (
              <span className="wr-completed-date">
                · {new Date(review.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
          <button className="wr-edit-btn" onClick={() => setEditMode(true)}>
            <Edit2 size={12} /> Edit
          </button>
        </div>
      );
    }

    // Draft state
    return (
      <div className="wr-footer">
        <div className="wr-footer-left">
          <button
            className="wr-close-btn"
            onClick={handleCloseWeek}
            disabled={!canCloseWeek || closing}
            title={!canCloseWeek ? 'Available after Sunday when the week ends' : undefined}
          >
            {closing ? <Loader2 size={13} className="spin" /> : <Lock size={13} />}
            {closing ? 'Closing…' : 'CLOSE WEEK →'}
          </button>

          {!canCloseWeek && (
            <span className="wr-close-note">Available after {
              new Date(weekEnd + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
            }</span>
          )}
        </div>

        <div className="wr-autosave-indicator">
          {saveState === 'saving' && <span className="wr-saving"><Loader2 size={11} className="spin" /> Saving…</span>}
          {saveState === 'saved'  && <span className="wr-saved"><Check size={11} /> Saved</span>}
          {saveState === 'error'  && <span className="wr-save-error">Save failed</span>}
        </div>
      </div>
    );
  };

  // ── Render: past reviews ──────────────────────────────────
  const renderPastReviews = () => {
    const completed = recentReviews.filter(r => r.status === 'completed');
    if (completed.length === 0) return null;

    return (
      <div className="wr-past-section">
        <span className="wr-section-label">PAST REVIEWS</span>
        <div className="wr-past-list">
          {completed.map(r => {
            const isEx = expandedPast === r.id;
            return (
              <div key={r.id} className="wr-past-card">
                <button
                  className="wr-past-header"
                  onClick={() => setExpandedPast(isEx ? null : r.id)}
                >
                  <div className="wr-past-header-left">
                    <span className="wr-past-week">{formatWeekRange(r.week_start, r.week_end)}</span>
                    <div className="wr-past-quick-stats">
                      <span>{r.leads} leads</span>
                      <span>·</span>
                      <span>{r.sales_calls} calls</span>
                      <span>·</span>
                      <span>{r.clients_closed} closes</span>
                    </div>
                  </div>
                  {isEx ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {isEx && (
                  <div className="wr-past-body">
                    {r.next_week_priority && (
                      <div className="wr-past-field wr-past-priority">
                        <span className="wr-past-field-label">PRIORITY THAT WEEK</span>
                        <span className="wr-past-field-value">"{r.next_week_priority}"</span>
                      </div>
                    )}
                    {r.biggest_win && (
                      <div className="wr-past-field">
                        <span className="wr-past-field-label">WIN</span>
                        <span className="wr-past-field-value">"{r.biggest_win}"</span>
                      </div>
                    )}
                    {r.key_learning && (
                      <div className="wr-past-field">
                        <span className="wr-past-field-label">LEARNING</span>
                        <span className="wr-past-field-value">"{r.key_learning}"</span>
                      </div>
                    )}
                    {r.bottleneck && (
                      <div className="wr-past-field">
                        <span className="wr-past-field-label">BOTTLENECK</span>
                        <span className="wr-past-field-value">"{r.bottleneck}"</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Main render ───────────────────────────────────────────
  const isCompleted = review?.status === 'completed';

  return (
    <div className="weekly-review-panel">
      {renderNav()}

      {loading ? (
        <div className="wr-loading">
          <Loader2 size={16} className="spin" />
          Loading week data…
        </div>
      ) : (
        <>
          {renderMetrics()}
          {renderSignals()}
          {renderDebrief(isCompleted)}
          {renderFooter()}
          {renderPastReviews()}
        </>
      )}
    </div>
  );
};
