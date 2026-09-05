// ============================================================
// BUILD100 — Phase 11: Operator Page (Simplified)
//
// Philosophy: ONE priority. ONE action. Max TWO warnings.
// Read in 10 seconds.
//
// Sections (all hidden when empty):
//   1. WHAT MATTERS NOW — one dominant statement
//   2. DO THIS NOW — one primary action
//   3. TODAY AT A GLANCE — work hours, streak, acquisition, clients
//   4. WATCH — max 2 warnings (hidden entirely if nothing needs attention)
//
// Engine running: shows "ENGINE RUNNING" with a maintenance action.
// Empty sections collapse completely.
// No weekly summary. No goal cards. No backlog cards.
// No commitment cards unless overdue.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../lib/auth/AuthContext';
import { loadIntelligence } from '../lib/intelligence/intelligenceEngine';
import type { OperatorIntelligence } from '../lib/intelligence/intelligenceTypes';
import { getOrCreateOperatorConfig } from '../lib/data/operatorConfig';
import { localDateInTz, getOperatingDaysInRange, calculateStreakFromDays } from '../lib/data/operatingDays';
import { getAcquisitionLogForDate, PRIMARY_ENGINES } from '../lib/data/acquisitionLog';
import { getAllTimeMetrics } from '../lib/data/businessMetrics';
import './OperatorPage.css';

interface OperatorPageProps {
  onNavigateTab?: (tab: string) => void;
}

// ── Watch signals (max 2, highest priority first) ────────────

interface WatchSignal {
  label: string;
  message: string;
  severity: 'critical' | 'warning';
}

function buildWatchSignals(intel: OperatorIntelligence): WatchSignal[] {
  const signals: WatchSignal[] = [];

  // 1. Overdue commitment (critical)
  if (intel.commitments.overdue > 0) {
    signals.push({
      label: 'COMMITMENT',
      message: `${intel.commitments.overdue} overdue commitment${intel.commitments.overdue > 1 ? 's' : ''} — mark executed or log a failure.`,
      severity: 'critical',
    });
  }

  // 2. Goal at critical/at-risk
  if (intel.goal_risk.critical_count > 0) {
    signals.push({
      label: 'GOAL',
      message: `${intel.goal_risk.critical_count} goal${intel.goal_risk.critical_count > 1 ? 's are' : ' is'} critical — pace is significantly behind.`,
      severity: 'critical',
    });
  } else if (intel.goal_risk.at_risk_count > 0) {
    signals.push({
      label: 'GOAL',
      message: `${intel.goal_risk.at_risk_count} goal${intel.goal_risk.at_risk_count > 1 ? 's are' : ' is'} at risk — review pacing.`,
      severity: 'warning',
    });
  }

  // 3. Overdue backlog
  if (signals.length < 2 && intel.backlog.overdue_count > 0) {
    signals.push({
      label: 'BACKLOG',
      message: `${intel.backlog.overdue_count} application commitment${intel.backlog.overdue_count > 1 ? 's are' : ' is'} overdue.`,
      severity: 'warning',
    });
  }

  // 4. Operating signal (double down / stop fix) — only when meaningful
  if (signals.length < 2 && intel.operating_signals.length > 0) {
    const sig = intel.operating_signals[0];
    signals.push({
      label: sig.type === 'STOP_FIX' ? 'STOP / FIX' : 'DOUBLE DOWN',
      message: sig.message,
      severity: sig.type === 'STOP_FIX' ? 'warning' : 'warning',
    });
  }

  return signals.slice(0, 2); // Max 2
}

// ── Component ─────────────────────────────────────────────────

export const OperatorPage: React.FC<OperatorPageProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [intel, setIntel] = useState<OperatorIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // "Today at a Glance" data
  const [todayWorkMins, setTodayWorkMins] = useState<number>(0);
  const [streakDays, setStreakDays] = useState<number>(0);
  const [acqActive, setAcqActive] = useState<number>(0);
  const [totalClients, setTotalClients] = useState<number>(0);

  const loadGlance = useCallback(async () => {
    if (!user?.id) return;
    const cfg = await getOrCreateOperatorConfig(user.id);
    const tz = cfg.timezone;
    const today = localDateInTz(tz);
    const startDate = cfg.operating_start_date ?? today;

    // Streak from operating_days
    const days = await getOperatingDaysInRange(user.id, startDate, today);
    const { currentStreak } = calculateStreakFromDays(days, today, startDate);
    setStreakDays(currentStreak);

    // Today's work minutes
    const todayDay = days.find(d => d.date === today);
    setTodayWorkMins(todayDay?.total_work_minutes ?? 0);

    // Acquisition (primary engines done today)
    const todayAcq = await getAcquisitionLogForDate(user.id, today);
    const executed = todayAcq.filter(a => a.executed && PRIMARY_ENGINES.includes(a.engine as 'repost' | 'content' | 'brand'));
    setAcqActive(executed.length);

    // Total clients (canonical: sum of business_metrics.clients_closed)
    const stats = await getAllTimeMetrics(user.id);
    setTotalClients(stats.totalClientsClosed);
  }, [user?.id]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadIntelligence(user.id).then(setIntel),
        loadGlance(),
      ]);
    } catch (e) {
      setError('Failed to load intelligence data.');
      console.error('[OperatorPage] load error:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, loadGlance]);

  useEffect(() => { load(); }, [load]);

  // ── Format helpers ─────────────────────────────────────────

  function fmtWork(mins: number): string {
    if (mins <= 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  // ── Loading ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="op2-page">
        <div className="op2-loading">
          <RefreshCw size={20} className="spin" />
          <span>Analysing…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="op2-page">
        <div className="op2-error">{error}</div>
        <button className="btn btn-outline btn-sm" onClick={load}>Retry</button>
      </div>
    );
  }

  // ── No data state ──────────────────────────────────────────

  if (!intel || intel.is_empty) {
    return (
      <div className="op2-page">
        <div className="op2-header-row">
          <h2 className="op2-title">OPERATOR</h2>
        </div>
        <div className="op2-empty skool-card">
          <p className="op2-empty-headline">Start logging to activate intelligence.</p>
          <p className="op2-empty-body">
            The Operator analyses your business metrics, application records, and goals.
            Log a few days of activity to see your first diagnosis.
          </p>
          <div className="op2-empty-steps">
            <span>1. Check in via Calendar</span>
            <span>2. Log business metrics</span>
            <span>3. Apply lessons in Classroom</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Compute signals ────────────────────────────────────────

  const watchSignals = buildWatchSignals(intel);
  const isEngineRunning = intel.bottleneck.bottleneck_type === 'ENGINE_RUNNING';
  const priority = intel.priority;
  const action = intel.action;
  const bottleneck = intel.bottleneck;

  const priorityLabel = isEngineRunning
    ? 'ENGINE RUNNING'
    : bottleneck.bottleneck_type.replace(/_/g, ' ');

  const priorityExplanation = isEngineRunning
    ? bottleneck.explanation
    : bottleneck.explanation;

  const actionText = isEngineRunning
    ? 'Log today\'s metrics and keep the acquisition engine running.'
    : action.action_text;

  const actionTarget = isEngineRunning ? null : {
    metric: action.target_metric,
    value: action.target_value,
    horizon: action.time_horizon,
  };

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="op2-page">

      {/* Header */}
      <div className="op2-header-row">
        <h2 className="op2-title">OPERATOR</h2>
        <button className="op2-refresh-btn" onClick={load} title="Refresh">
          <RefreshCw size={13} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 1. WHAT MATTERS NOW */}
      <div className={`op2-card op2-priority-card skool-card ${isEngineRunning ? 'op2-engine-running' : `op2-urgency-${priority.urgency}`}`}>
        <span className="op2-section-label">WHAT MATTERS NOW</span>
        <h3 className="op2-priority-headline">{priorityLabel}</h3>
        <p className="op2-priority-body">{priorityExplanation}</p>
        {bottleneck.evidence.length > 0 && !isEngineRunning && (
          <div className="op2-evidence">
            {bottleneck.evidence.slice(0, 2).map((e, i) => (
              <span key={i} className="op2-evidence-item">{e}</span>
            ))}
          </div>
        )}
      </div>

      {/* 2. DO THIS NOW */}
      <div className="op2-card op2-action-card skool-card">
        <span className="op2-section-label">{isEngineRunning ? 'MAINTENANCE' : 'DO THIS NOW'}</span>
        <p className="op2-action-text">{actionText}</p>
        {actionTarget && (
          <div className="op2-action-meta">
            <span className="op2-action-target">Target: {actionTarget.value}</span>
            <span className="op2-action-horizon">{actionTarget.horizon}</span>
          </div>
        )}
        {onNavigateTab && !isEngineRunning && (
          <button
            className="op2-action-link"
            onClick={() => onNavigateTab('business')}
          >
            Open Business →
          </button>
        )}
      </div>

      {/* 3. TODAY AT A GLANCE */}
      <div className="op2-card op2-glance-card skool-card">
        <span className="op2-section-label">TODAY</span>
        <div className="op2-glance-grid">
          <div className="op2-glance-item">
            <span className="op2-glance-val">{fmtWork(todayWorkMins)}</span>
            <span className="op2-glance-key">Work</span>
          </div>
          <div className="op2-glance-item">
            <span className="op2-glance-val">{streakDays}</span>
            <span className="op2-glance-key">Day Streak</span>
          </div>
          <div className="op2-glance-item">
            <span className={`op2-glance-val ${acqActive === 3 ? 'op2-glance-green' : acqActive === 0 ? 'op2-glance-red' : ''}`}>
              {acqActive} / 3
            </span>
            <span className="op2-glance-key">Acquisition</span>
          </div>
          <div className="op2-glance-item">
            <span className="op2-glance-val">{totalClients}</span>
            <span className="op2-glance-key">Clients</span>
          </div>
        </div>
      </div>

      {/* 4. WATCH — only shown if there are signals */}
      {watchSignals.length > 0 && (
        <div className="op2-card op2-watch-card skool-card">
          <span className="op2-section-label">WATCH</span>
          <div className="op2-watch-signals">
            {watchSignals.map((sig, i) => (
              <div key={i} className={`op2-watch-signal op2-watch-${sig.severity}`}>
                <span className="op2-watch-label">{sig.label}</span>
                <span className="op2-watch-msg">{sig.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
