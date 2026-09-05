// ============================================================
// BUILD100 — Phase 8: Operator Intelligence Page
//
// The complete operator cockpit. Answers:
//   WHAT MATTERS NOW?  WHY?  WHAT SHOULD I DO NEXT?
//   WHAT AM I BEHIND ON?  WHAT COMMITMENT IS DUE?
//   WHAT GOAL IS AT RISK?  DOUBLE DOWN?  STOP/FIX?
//
// All data from deterministic intelligence engines.
// No LLM. No fake data. Every signal backed by a Supabase row.
//
// Distinct from AnalyticsPage — this is a DECISION/ACTION view.
// Analytics = "What happened?" / Operator = "What do I do?"
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, RefreshCw, Activity
} from 'lucide-react';
import { useAuth } from '../lib/auth/AuthContext';
import { loadIntelligence } from '../lib/intelligence/intelligenceEngine';
import type { OperatorIntelligence, GoalRiskStatus } from '../lib/intelligence/intelligenceTypes';
import './OperatorPage.css';

// ── Helpers ───────────────────────────────────────────────────

function formatINR(n: number): string {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

const RISK_LABEL: Record<GoalRiskStatus, string> = {
  CRITICAL: 'CRITICAL',
  AT_RISK: 'AT RISK',
  WATCH: 'WATCH',
  ON_TRACK: 'ON TRACK',
  COMPLETE: 'DONE',
  NO_DATE: 'NO DATE',
};

// ── Operator Page ─────────────────────────────────────────────

interface OperatorPageProps {
  onNavigateTab?: (tab: string) => void; // reserved for future deep links
}

export const OperatorPage: React.FC<OperatorPageProps> = ({ onNavigateTab: _onNavigateTab }) => {
  const { user } = useAuth();
  const [intel, setIntel] = useState<OperatorIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await loadIntelligence(user.id);
      setIntel(data);
    } catch (e) {
      setError('Failed to load intelligence data. Please try again.');
      console.error('[OperatorPage] load error:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  // ── Loading state ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="operator-page">
        <div className="operator-loading">
          <RefreshCw size={24} className="spin" />
          <p className="operator-loading-text">Computing operator intelligence…</p>
        </div>
      </div>
    );
  }

  if (error || !intel) {
    return (
      <div className="operator-page">
        <div className="operator-empty">
          <div className="operator-empty-icon"><AlertTriangle size={28} /></div>
          <p className="operator-empty-title">Intelligence unavailable</p>
          <p className="operator-empty-desc">{error ?? 'Unknown error. Try refreshing.'}</p>
          <button className="operator-refresh-btn" onClick={load}>Retry</button>
        </div>
      </div>
    );
  }

  // ── Empty / no-data state ──────────────────────────────────
  if (intel.is_empty) {
    return (
      <div className="operator-page">
        <div className="operator-header">
          <div className="operator-header-left">
            <span className="operator-page-label">Operator Intelligence</span>
            <h1 className="operator-page-title">COMMAND CENTER</h1>
          </div>
        </div>
        <div className="operator-empty">
          <div className="operator-empty-icon"><Activity size={28} /></div>
          <p className="operator-empty-title">NOT ENOUGH DATA</p>
          <p className="operator-empty-desc">
            The intelligence engine needs real operating data to diagnose your current state.
            Start by logging your first business metrics and completing your first lesson.
          </p>
          <div className="operator-empty-steps">
            <div className="operator-empty-step">
              <span className="empty-step-num">1</span>
              <span className="empty-step-text">Go to <strong>Business</strong> → log today's leads, calls, revenue, and hours.</span>
            </div>
            <div className="operator-empty-step">
              <span className="empty-step-num">2</span>
              <span className="empty-step-text">Go to <strong>Classroom</strong> → watch a lesson and mark it complete.</span>
            </div>
            <div className="operator-empty-step">
              <span className="empty-step-num">3</span>
              <span className="empty-step-text">Set an active <strong>Business Goal</strong> with a target date so pacing can be computed.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { bottleneck, priority, action, commitments, goal_risk, backlog,
          operating_plan, operating_signals, proactive_alerts, weekly_summary } = intel;

  // ── Main render ────────────────────────────────────────────
  return (
    <div className="operator-page">

      {/* Header */}
      <div className="operator-header">
        <div className="operator-header-left">
          <span className="operator-page-label">Operator Intelligence</span>
          <h1 className="operator-page-title">COMMAND CENTER</h1>
          <p className="operator-page-subtitle">Deterministic operating intelligence — no AI, no guesswork</p>
        </div>
        <button
          className={`operator-refresh-btn ${loading ? 'loading' : ''}`}
          onClick={load}
          aria-label="Refresh intelligence"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* Proactive Alerts */}
      {proactive_alerts.length > 0 && (
        <div className="operator-alerts">
          {proactive_alerts.map((alert, i) => (
            <div key={i} className={`operator-alert ${alert.severity}`}>
              <div className="operator-alert-icon">
                {alert.severity === 'critical' ? <AlertTriangle size={15} /> :
                 alert.severity === 'warning' ? <AlertTriangle size={15} /> :
                 <Activity size={15} />}
              </div>
              <div className="operator-alert-body">
                <p className="operator-alert-title">{alert.title}</p>
                <p className="operator-alert-msg">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* WHAT MATTERS NOW masthead */}
      <div className="operator-masthead" style={{ margin: '0 var(--space-6) var(--space-4)' }}>
        <div>
          <p className="masthead-label">What Matters Now</p>
          <div className="masthead-priority">
            <span className={`priority-badge ${priority.urgency}`}>
              {priority.urgency} urgency
            </span>
            <span className="masthead-priority-name">
              {priority.priority.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="masthead-reason">{priority.reason}</p>
        </div>
        <div className="masthead-meta">
          <span className="masthead-urgency">{priority.urgency} urgency</span>
          <span className="masthead-horizon">{priority.time_horizon}</span>
        </div>
      </div>

      {/* Row 1: Bottleneck | Next Action | Commitments */}
      <div className="operator-grid-3">

        {/* Bottleneck */}
        <div className="op-card">
          <p className="op-card-label">Current Bottleneck</p>
          <p className={`op-card-title ${
            bottleneck.severity === 'critical' ? 'critical' :
            bottleneck.severity === 'warning' ? 'warning' : 'info'
          }`}>
            {bottleneck.bottleneck_type.replace(/_/g, ' ')}
          </p>
          <p className="op-card-body">{bottleneck.explanation}</p>
          {bottleneck.evidence.length > 0 && (
            <div className="op-card-evidence">
              {bottleneck.evidence.map((e, i) => (
                <span key={i} className="op-card-evidence-item">{e}</span>
              ))}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Confidence: {bottleneck.confidence}%
          </div>
        </div>

        {/* Next Action */}
        <div className="op-card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <p className="op-card-label">Next Action</p>
          <p className="op-card-title success">EXECUTE NOW</p>
          <p className="op-card-action-text">{action.action_text}</p>
          <div className="op-card-target">
            Target: {action.target_value} — {action.time_horizon}
          </div>
        </div>

        {/* Commitments */}
        <div className="op-card">
          <p className="op-card-label">Commitments</p>
          <div className="commitment-counts">
            <div className="commitment-stat">
              <span className={`commitment-stat-num ${commitments.overdue > 0 ? 'overdue' : ''}`}>
                {commitments.overdue}
              </span>
              <span className="commitment-stat-lbl">Overdue</span>
            </div>
            <div className="commitment-stat">
              <span className={`commitment-stat-num ${commitments.due_today > 0 ? 'today' : ''}`}>
                {commitments.due_today}
              </span>
              <span className="commitment-stat-lbl">Due Today</span>
            </div>
            <div className="commitment-stat">
              <span className={`commitment-stat-num ${commitments.due_3_days > 0 ? 'soon' : ''}`}>
                {commitments.due_3_days}
              </span>
              <span className="commitment-stat-lbl">Due in 3d</span>
            </div>
            <div className="commitment-stat">
              <span className="commitment-stat-num ok">{commitments.complete}</span>
              <span className="commitment-stat-lbl">Complete</span>
            </div>
          </div>
          {commitments.items.length > 0 && (
            <div style={{ marginTop: 'var(--space-2)' }}>
              {commitments.items.slice(0, 2).map((c, i) => (
                <div key={i} style={{
                  fontSize: 12, color: 'var(--text-secondary)',
                  padding: '4px 0', borderTop: i > 0 ? '1px solid var(--border-light)' : 'none'
                }}>
                  <span style={{
                    color: c.urgency === 'overdue' ? 'var(--accent-rose)' :
                           c.urgency === 'due_today' ? 'var(--accent-amber)' : 'var(--text-muted)',
                    fontWeight: 700, fontSize: 10, textTransform: 'uppercase' as const, marginRight: 6
                  }}>
                    {c.urgency.replace(/_/g, ' ')}
                  </span>
                  {c.lesson_id}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Goals at Risk | Application Backlog */}
      <div className="operator-grid-2">

        {/* Goals at Risk */}
        <div className="op-card">
          <p className="op-card-label">Goals at Risk</p>
          {goal_risk.items.length === 0 ? (
            <p className="op-card-body">No active goals. Create goals in the Business tab to enable goal risk tracking.</p>
          ) : (
            <div className="goal-risk-list">
              {goal_risk.items.map(g => (
                <div key={g.id} className={`goal-risk-item ${g.risk_status}`}>
                  <span className={`goal-risk-status ${g.risk_status}`}>
                    {RISK_LABEL[g.risk_status]}
                  </span>
                  <span className="goal-risk-name">{g.title}</span>
                  <span className="goal-risk-pct">{g.progress_pct}%</span>
                  {g.remaining_days !== null && (
                    <span className="goal-risk-days">{g.remaining_days}d left</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Application Backlog */}
        <div className="op-card">
          <p className="op-card-label">Application Backlog</p>
          <div className="backlog-summary">
            <div className="backlog-stat">
              <div className={`backlog-stat-num ${backlog.active_count > 0 ? '' : ''}`}>
                {backlog.active_count}
              </div>
              <div className="backlog-stat-lbl">Active</div>
            </div>
            <div className="backlog-stat">
              <div className={`backlog-stat-num ${backlog.overdue_count > 0 ? 'has-overdue' : ''}`}>
                {backlog.overdue_count}
              </div>
              <div className="backlog-stat-lbl">Overdue</div>
            </div>
            <div className="backlog-stat">
              <div className="backlog-stat-num">{backlog.completed_count + backlog.failed_count}</div>
              <div className="backlog-stat-lbl">Executed</div>
            </div>
          </div>
          {backlog.next_recommended ? (
            <>
              <p className="backlog-next-label">Next Recommended</p>
              <div className="backlog-next-item">
                <p className="backlog-next-title">
                  {backlog.next_recommended.lesson_title ?? backlog.next_recommended.lesson_id}
                </p>
                <p className="backlog-next-meta">
                  {backlog.next_recommended.urgency === 'overdue'
                    ? `Overdue since ${backlog.next_recommended.commitment_date}`
                    : backlog.next_recommended.urgency === 'due_today'
                    ? 'Due today'
                    : backlog.next_recommended.commitment_date
                    ? `Due ${backlog.next_recommended.commitment_date}`
                    : 'No deadline set'}
                </p>
              </div>
            </>
          ) : (
            <p className="op-card-body" style={{ color: 'var(--accent-emerald)' }}>
              ✓ Backlog clear. All experiments executed or no experiments started yet.
            </p>
          )}
        </div>
      </div>

      {/* Today's Operating Plan */}
      <div className="operator-full">
        <div className="op-card">
          <p className="op-card-label">Today's Operating Plan — {operating_plan.plan_date}</p>
          <p className="op-card-title">DAILY EXECUTION ORDER</p>
          <div className="daily-plan-list">
            {operating_plan.items.map((item) => (
              <div key={item.slot} className="plan-item">
                <div className="plan-slot-num">{item.slot}</div>
                <div className="plan-item-body">
                  <p className="plan-item-label">{item.label}</p>
                  <p className="plan-item-action">{item.action}</p>
                  <p className="plan-item-why">{item.why}</p>
                </div>
                {item.estimated_minutes && (
                  <span className="plan-item-time">~{item.estimated_minutes}m</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Operating Signals */}
      {operating_signals.length > 0 && (
        <div className="operator-full">
          <div className="op-card">
            <p className="op-card-label">Operating Signals</p>
            {operating_signals.map((signal, i) => (
              <div key={i} className={`op-signal ${signal.type}`}>
                <span className="op-signal-type">{signal.type.replace(/_/g, ' ')}</span>
                <p className="op-signal-title">{signal.title}</p>
                <p className="op-signal-msg">{signal.message}</p>
                <p className="op-signal-evidence">{signal.evidence}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Operating Summary */}
      {weekly_summary && (
        <div className="operator-full">
          <div className="op-card">
            <p className="op-card-label">Weekly Operating Summary</p>
            <p className="op-card-title">LAST WEEK + NEXT WEEK PRIORITY</p>
            <div className="weekly-summary-grid">
              <div>
                <p className="weekly-col-label">
                  Last Week ({weekly_summary.week_start} → {weekly_summary.week_end})
                </p>
                {[
                  ['Revenue', formatINR(weekly_summary.last_week_metrics.revenue)],
                  ['Leads', weekly_summary.last_week_metrics.leads.toString()],
                  ['Sales Calls', weekly_summary.last_week_metrics.sales_calls.toString()],
                  ['Clients Closed', weekly_summary.last_week_metrics.clients_closed.toString()],
                  ['Content Posted', weekly_summary.last_week_metrics.content_posted.toString()],
                  ['Hours Worked', `${weekly_summary.last_week_metrics.hours_worked.toFixed(1)}h`],
                  ['Applied Lessons', weekly_summary.applied_lessons_last_week.toString()],
                  ['Executed Lessons', weekly_summary.executed_lessons_last_week.toString()],
                ].map(([label, val]) => (
                  <div key={label} className="weekly-metric-row">
                    <span className="weekly-metric-lbl">{label}</span>
                    <span className="weekly-metric-val">{val}</span>
                  </div>
                ))}
                {weekly_summary.biggest_win && (
                  <div className="weekly-highlight">
                    <p className="weekly-highlight-label">Biggest Win</p>
                    <p className="weekly-highlight-text">{weekly_summary.biggest_win}</p>
                  </div>
                )}
                {weekly_summary.biggest_failure && (
                  <div className="weekly-highlight" style={{ marginTop: 'var(--space-2)' }}>
                    <p className="weekly-highlight-label">Biggest Failure</p>
                    <p className="weekly-highlight-text">{weekly_summary.biggest_failure}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="weekly-col-label">Next Week Focus</p>
                <div className="weekly-highlight">
                  <p className="weekly-highlight-label">Primary Priority</p>
                  <p className="weekly-highlight-text">{weekly_summary.next_week_priority}</p>
                </div>
                <div className="weekly-highlight" style={{ marginTop: 'var(--space-2)' }}>
                  <p className="weekly-highlight-label">Focus</p>
                  <p className="weekly-highlight-text">{weekly_summary.next_week_focus}</p>
                </div>
                <div className="weekly-highlight" style={{ marginTop: 'var(--space-2)' }}>
                  <p className="weekly-highlight-label">Goal Status</p>
                  <p className="weekly-highlight-text">{weekly_summary.goal_status_summary}</p>
                </div>
                <div className="weekly-highlight" style={{ marginTop: 'var(--space-2)' }}>
                  <p className="weekly-highlight-label">Application Backlog</p>
                  <p className="weekly-highlight-text">{weekly_summary.application_backlog_count} active experiments</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="operator-last-updated">
        Last computed: {formatTime(intel.loaded_at)}
      </p>
    </div>
  );
};
