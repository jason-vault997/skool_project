import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, Check, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Minus, Loader2,
  AlertTriangle, Edit2, Flag,
} from 'lucide-react';
import type { BusinessGoal, GoalType, GoalPriority } from '../lib/supabase/types';
import {
  getActiveGoals, getAllGoals, createGoal, updateGoal,
  completeGoal, pauseGoal, abandonGoal, reactivateGoal,
  getGoalCurrentValue,
} from '../lib/data/businessGoals';
import {
  calculateGoalProgress,
  TRACK_SIGNAL_LABELS,
  TRACK_SIGNAL_COLORS,
  type GoalProgressResult,
} from '../lib/business/goalProgress';
import { ProgressBar } from './ProgressBar';
import './GoalsPanel.css';

// ── Types ─────────────────────────────────────────────────────
interface EnrichedGoal {
  goal: BusinessGoal;
  currentValue: number;
  progress: GoalProgressResult;
}

type GoalFilter = 'active' | 'all';
type PanelView  = 'list' | 'form';

interface GoalFormState {
  title:        string;
  goal_type:    GoalType;
  target_value: string;
  unit:         string;
  description:  string;
  start_date:   string;
  target_date:  string;
  priority:     GoalPriority;
  current_value: string; // only for 'custom'
}

const DEFAULT_FORM: GoalFormState = {
  title:         '',
  goal_type:     'custom',
  target_value:  '',
  unit:          '',
  description:   '',
  start_date:    '',
  target_date:   '',
  priority:      'normal',
  current_value: '0',
};

// ── Unit suggestions ──────────────────────────────────────────
const UNIT_SUGGESTIONS: Partial<Record<GoalType, string>> = {
  revenue:     '₹',
  clients:     'clients',
  leads:       'leads',
  sales_calls: 'calls',
  content:     'pieces',
  hours:       'hours',
};

const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  revenue:     'Revenue',
  clients:     'Clients',
  leads:       'Leads',
  sales_calls: 'Sales Calls',
  content:     'Content',
  hours:       'Hours',
  custom:      'Custom',
};

const PRIORITY_LABELS: Record<GoalPriority, string> = {
  critical: 'Critical',
  high:     'High',
  normal:   'Normal',
};

// ── INR formatter ─────────────────────────────────────────────
const fmtINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

function formatValue(value: number, goalType: GoalType, unit: string | null): string {
  if (goalType === 'revenue') return fmtINR(value);
  if (goalType === 'hours') return `${value.toFixed(1)}h`;
  const u = unit ?? UNIT_SUGGESTIONS[goalType] ?? '';
  return `${value}${u ? ' ' + u : ''}`;
}

// ── GoalsPanel ────────────────────────────────────────────────
interface GoalsPanelProps {
  userId: string;
}

export const GoalsPanel: React.FC<GoalsPanelProps> = ({ userId }) => {
  const [filter,        setFilter]        = useState<GoalFilter>('active');
  const [view,          setView]          = useState<PanelView>('list');
  const [editingGoal,   setEditingGoal]   = useState<BusinessGoal | null>(null);
  const [enriched,      setEnriched]      = useState<EnrichedGoal[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [formError,     setFormError]     = useState('');
  const [form,          setForm]          = useState<GoalFormState>(DEFAULT_FORM);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  // ── Load + enrich goals ──────────────────────────────────
  const loadGoals = useCallback(async () => {
    setLoading(true);
    const goals = filter === 'active'
      ? await getActiveGoals(userId)
      : await getAllGoals(userId);

    // Enrich with computed current values (connected types query business_metrics)
    const enrichedGoals = await Promise.all(
      goals.map(async (goal) => {
        const currentValue = await getGoalCurrentValue(userId, goal);
        const progress     = calculateGoalProgress(goal, currentValue);
        return { goal, currentValue, progress };
      })
    );

    setEnriched(enrichedGoals);
    setLoading(false);
  }, [userId, filter]);

  useEffect(() => { loadGoals(); }, [loadGoals]);

  // ── Form helpers ─────────────────────────────────────────
  function openCreate() {
    setEditingGoal(null);
    setForm({ ...DEFAULT_FORM });
    setFormError('');
    setView('form');
  }

  function openEdit(eg: EnrichedGoal) {
    const g = eg.goal;
    setEditingGoal(g);
    setForm({
      title:         g.title,
      goal_type:     g.goal_type,
      target_value:  String(g.target_value),
      unit:          g.unit ?? '',
      description:   g.description ?? '',
      start_date:    g.start_date ?? '',
      target_date:   g.target_date ?? '',
      priority:      g.priority,
      current_value: String(g.current_value),
    });
    setFormError('');
    setView('form');
  }

  function closeForm() {
    setView('list');
    setEditingGoal(null);
    setFormError('');
  }

  function handleTypeChange(type: GoalType) {
    setForm(f => ({
      ...f,
      goal_type: type,
      unit: UNIT_SUGGESTIONS[type] ?? f.unit,
    }));
  }

  function validateForm(): string {
    if (!form.title.trim()) return 'Title is required.';
    const tv = parseFloat(form.target_value);
    if (isNaN(tv) || tv <= 0) return 'Target must be a number greater than 0.';
    if (form.start_date && form.target_date && form.target_date < form.start_date) {
      return 'Target date must be on or after start date.';
    }
    return '';
  }

  async function handleSave() {
    const err = validateForm();
    if (err) { setFormError(err); return; }
    setFormError('');
    setSaving(true);

    const tv = parseFloat(form.target_value);

    if (editingGoal) {
      const updates: Parameters<typeof updateGoal>[1] = {
        title:        form.title.trim(),
        goal_type:    form.goal_type,
        target_value: tv,
        unit:         form.unit.trim() || null,
        description:  form.description.trim() || null,
        start_date:   form.start_date || null,
        target_date:  form.target_date || null,
        priority:     form.priority,
      };
      if (form.goal_type === 'custom') {
        updates.current_value = Math.max(0, parseFloat(form.current_value) || 0);
      }
      await updateGoal(editingGoal.id, updates);
    } else {
      await createGoal(userId, {
        title:        form.title.trim(),
        goal_type:    form.goal_type,
        target_value: tv,
        unit:         form.unit.trim() || undefined,
        description:  form.description.trim() || undefined,
        start_date:   form.start_date || undefined,
        target_date:  form.target_date || undefined,
        priority:     form.priority,
      });
    }

    setSaving(false);
    closeForm();
    loadGoals();
  }

  // ── Goal actions ─────────────────────────────────────────
  async function handleAction(
    goalId: string,
    action: 'complete' | 'pause' | 'abandon' | 'reactivate'
  ) {
    const fn = {
      complete:   () => completeGoal(goalId),
      pause:      () => pauseGoal(goalId),
      abandon:    () => abandonGoal(goalId),
      reactivate: () => reactivateGoal(goalId),
    }[action];
    await fn();
    loadGoals();
  }

  // ── Render helpers ────────────────────────────────────────
  const signalColor = (signal: EnrichedGoal['progress']['trackSignal']) =>
    TRACK_SIGNAL_COLORS[signal];

  const statusBadge = (status: BusinessGoal['status']) => {
    const map: Record<string, { label: string; cls: string }> = {
      active:    { label: 'Active',    cls: 'goal-badge-active'    },
      completed: { label: 'Completed', cls: 'goal-badge-completed' },
      paused:    { label: 'Paused',    cls: 'goal-badge-paused'    },
      abandoned: { label: 'Abandoned', cls: 'goal-badge-abandoned' },
    };
    const b = map[status];
    return <span className={`goal-status-badge ${b.cls}`}>{b.label}</span>;
  };

  const priorityBadge = (priority: GoalPriority) => {
    if (priority === 'normal') return null;
    return (
      <span className={`goal-priority-badge goal-priority-${priority}`}>
        <Flag size={9} strokeWidth={2.5} />
        {PRIORITY_LABELS[priority]}
      </span>
    );
  };

  // ── Render: form ─────────────────────────────────────────
  if (view === 'form') {
    const isConnected = form.goal_type !== 'custom';
    return (
      <div className="goals-panel">
        <div className="goals-panel-header">
          <span className="goals-panel-title">{editingGoal ? 'EDIT GOAL' : 'NEW GOAL'}</span>
          <button className="goals-close-btn" onClick={closeForm}>
            <X size={16} />
          </button>
        </div>

        <div className="goal-form">
          {/* Title */}
          <div className="goal-form-row">
            <label className="goal-form-label">GOAL TITLE *</label>
            <input
              type="text"
              className="goal-form-input"
              placeholder="e.g. Close 10 clients by October"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              autoFocus
            />
          </div>

          {/* Goal type + Target */}
          <div className="goal-form-row-2col">
            <div className="goal-form-row">
              <label className="goal-form-label">TYPE *</label>
              <select
                className="goal-form-select"
                value={form.goal_type}
                onChange={e => handleTypeChange(e.target.value as GoalType)}
              >
                {Object.entries(GOAL_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="goal-form-row">
              <label className="goal-form-label">TARGET *</label>
              <input
                type="number"
                className="goal-form-input"
                placeholder="e.g. 10"
                value={form.target_value}
                min="0.01"
                step="any"
                onChange={e => setForm(f => ({ ...f, target_value: e.target.value }))}
              />
            </div>
          </div>

          {/* Unit (hidden for revenue/hours which have fixed formatting) */}
          {!['revenue', 'hours'].includes(form.goal_type) && (
            <div className="goal-form-row">
              <label className="goal-form-label">UNIT</label>
              <input
                type="text"
                className="goal-form-input"
                placeholder={UNIT_SUGGESTIONS[form.goal_type] ?? 'e.g. clients'}
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
              />
            </div>
          )}

          {/* For custom goals: manual current value */}
          {!isConnected && (
            <div className="goal-form-row">
              <label className="goal-form-label">CURRENT VALUE</label>
              <input
                type="number"
                className="goal-form-input"
                placeholder="0"
                value={form.current_value}
                min="0"
                step="any"
                onChange={e => setForm(f => ({ ...f, current_value: e.target.value }))}
              />
            </div>
          )}

          {/* Connected goal note */}
          {isConnected && (
            <div className="goal-form-connected-note">
              Current value is automatically calculated from your business data. No manual entry needed.
            </div>
          )}

          {/* Dates */}
          <div className="goal-form-row-2col">
            <div className="goal-form-row">
              <label className="goal-form-label">START DATE</label>
              <input
                type="date"
                className="goal-form-input"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div className="goal-form-row">
              <label className="goal-form-label">TARGET DATE</label>
              <input
                type="date"
                className="goal-form-input"
                value={form.target_date}
                onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
              />
            </div>
          </div>

          {/* Priority */}
          <div className="goal-form-row">
            <label className="goal-form-label">PRIORITY</label>
            <div className="goal-priority-chips">
              {(['normal', 'high', 'critical'] as GoalPriority[]).map(p => (
                <button
                  key={p}
                  className={`goal-priority-chip goal-priority-chip-${p} ${form.priority === p ? 'chip-active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, priority: p }))}
                  type="button"
                >
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="goal-form-row">
            <label className="goal-form-label">DESCRIPTION <span className="goal-form-optional">(optional)</span></label>
            <textarea
              className="goal-form-textarea"
              placeholder="What does hitting this goal mean?"
              value={form.description}
              rows={2}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          {formError && (
            <div className="goal-form-error">
              <AlertTriangle size={13} /> {formError}
            </div>
          )}

          <div className="goal-form-actions">
            <button
              className="goal-save-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 size={13} className="spin" /> : <Check size={13} />}
              {saving ? 'Saving…' : editingGoal ? 'Save changes' : 'Create goal'}
            </button>
            <button className="goal-cancel-btn" onClick={closeForm} disabled={saving}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: list ─────────────────────────────────────────
  return (
    <div className="goals-panel">
      <div className="goals-panel-header">
        <div className="goals-panel-header-left">
          <span className="goals-panel-title">GOALS</span>
          <div className="goals-filter-tabs">
            <button
              className={`goals-filter-tab ${filter === 'active' ? 'tab-active' : ''}`}
              onClick={() => setFilter('active')}
            >Active</button>
            <button
              className={`goals-filter-tab ${filter === 'all' ? 'tab-active' : ''}`}
              onClick={() => setFilter('all')}
            >All</button>
          </div>
        </div>
        <button className="goals-new-btn" onClick={openCreate}>
          <Plus size={14} />
          New goal
        </button>
      </div>

      {loading && (
        <div className="goals-loading">
          <Loader2 size={16} className="spin" />
          Loading goals…
        </div>
      )}

      {!loading && enriched.length === 0 && (
        <div className="goals-empty">
          <p className="goals-empty-title">No {filter === 'active' ? 'active ' : ''}goals.</p>
          <p className="goals-empty-sub">Set one. It doesn't count if it's only in your head.</p>
          <button className="goals-new-btn goals-new-btn-inline" onClick={openCreate}>
            <Plus size={13} />
            Set a goal
          </button>
        </div>
      )}

      {!loading && enriched.length > 0 && (
        <div className="goals-list">
          {enriched.map(eg => {
            const { goal, currentValue, progress } = eg;
            const isExpanded = expandedGoalId === goal.id;
            const isCompleted = goal.status === 'completed';
            const barColor = goal.status !== 'active' ? 'var(--border-dark)' :
              progress.trackSignal === 'behind' ? 'var(--accent-rose)' :
              progress.trackSignal === 'ahead'  ? 'var(--accent-emerald)' : 'var(--brand-green-dark)';

            return (
              <div key={goal.id} className={`goal-card ${goal.status !== 'active' ? 'goal-card-inactive' : ''}`}>
                {/* Card header */}
                <div className="goal-card-header">
                  <div className="goal-card-meta">
                    {priorityBadge(goal.priority)}
                    <span className="goal-type-tag">{GOAL_TYPE_LABELS[goal.goal_type]}</span>
                    {statusBadge(goal.status)}
                  </div>
                  <button
                    className="goal-expand-btn"
                    onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}
                    title={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                <h4 className="goal-card-title">{goal.title}</h4>

                {/* Progress bar (shown for all goals) */}
                <div className="goal-progress-row">
                  <ProgressBar
                    value={progress.progressPct}
                    color={barColor}
                    height={6}
                    showPercent={false}
                  />
                  <div className="goal-progress-labels">
                    <span className="goal-current-label">
                      {formatValue(currentValue, goal.goal_type, goal.unit)}
                      {' / '}
                      {formatValue(goal.target_value, goal.goal_type, goal.unit)}
                    </span>
                    <span className="goal-pct-label">{progress.progressPct}%</span>
                  </div>
                </div>

                {/* Track signal */}
                {goal.status === 'active' && progress.trackSignal !== 'no-data' && (
                  <div
                    className={`goal-track-signal signal-${progress.trackSignal}`}
                    style={{ color: signalColor(progress.trackSignal) }}
                  >
                    {progress.trackSignal === 'ahead'    ? <TrendingUp  size={12} /> :
                     progress.trackSignal === 'behind'   ? <TrendingDown size={12} /> :
                     <Minus size={12} />}
                    {TRACK_SIGNAL_LABELS[progress.trackSignal]}
                    {progress.remainingDays !== null && progress.remainingDays > 0 && (
                      <span className="goal-days-left"> · {progress.remainingDays}d left</span>
                    )}
                    {progress.requiredPace !== null && (
                      <span className="goal-pace">
                        {' · '}{formatValue(progress.requiredPace, goal.goal_type, goal.unit)}/week needed
                      </span>
                    )}
                  </div>
                )}

                {/* Goal reached but not completed */}
                {goal.status === 'active' && progress.progressPct >= 100 && (
                  <div className="goal-reached-banner">
                    🎯 Goal reached — mark it complete when you're ready.
                  </div>
                )}

                {/* Expanded actions */}
                {isExpanded && (
                  <div className="goal-actions">
                    {goal.target_date && (
                      <span className="goal-target-date">
                        Target: {new Date(goal.target_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}

                    <div className="goal-action-btns">
                      <button className="goal-action-btn btn-edit" onClick={() => openEdit(eg)}>
                        <Edit2 size={12} /> Edit
                      </button>

                      {goal.status === 'active' && (
                        <>
                          <button className="goal-action-btn btn-complete" onClick={() => handleAction(goal.id, 'complete')}>
                            <Check size={12} /> Complete
                          </button>
                          <button className="goal-action-btn btn-pause" onClick={() => handleAction(goal.id, 'pause')}>
                            Pause
                          </button>
                          <button className="goal-action-btn btn-abandon" onClick={() => handleAction(goal.id, 'abandon')}>
                            Abandon
                          </button>
                        </>
                      )}

                      {(goal.status === 'paused' || goal.status === 'abandoned') && (
                        <button className="goal-action-btn btn-reactivate" onClick={() => handleAction(goal.id, 'reactivate')}>
                          Reactivate
                        </button>
                      )}

                      {isCompleted && (
                        <span className="goal-completed-note">
                          Completed {goal.completed_at
                            ? new Date(goal.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : ''}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
