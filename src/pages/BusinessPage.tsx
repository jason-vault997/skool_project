// ============================================================
// BUILD100 — Phase 10: Business Page (Reworked)
//
// Single Overview page. No tabs.
// Removed: Goals tab, Weekly Review tab (data preserved in DB).
//
// Sections:
//   Hero banner (client count, milestone, progress)
//   + ADD CLIENT quick action
//   Core metrics grid
//   Acquisition Engine (primary, one-click daily)
//   Delegated Acquisition (secondary, one-click daily)
//   Acquisition history (7-day compact grid)
//   Job Applications backup counter
//   Execution Journal / Build Log
//
// Canonical source: clients_closed from business_metrics.
// All client counts (Business, Analytics, Operator) derive from this.
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import { ProgressBar } from '../components/ProgressBar';
import { useAuth } from '../lib/auth/AuthContext';
import { getAllTimeMetrics, getMetricsHistory, getMetricsForToday } from '../lib/data/businessMetrics';
import { getOrCreateOperatorConfig, adjustJobApplicationCount } from '../lib/data/operatorConfig';
import {
  toggleAcquisitionEngine, getAcquisitionLogForRange,
  buildAcquisitionMap, wasEngineExecuted,
  PRIMARY_ENGINES, DELEGATED_ENGINES, ENGINE_LABELS,
} from '../lib/data/acquisitionLog';
import { localDateInTz } from '../lib/data/operatingDays';
import { supabase } from '../lib/supabase/client';
import type {
  AllTimeBusinessStats, BusinessMetric, OperatorConfig, AcquisitionEngine
} from '../lib/supabase/types';
import { Briefcase, Award, Plus, Minus, Check } from 'lucide-react';
import './BusinessPage.css';

// ── Milestone progression ─────────────────────────────────────
// 0→1→3→5→10→25→50→100

function getNextMilestone(clients: number): number {
  if (clients < 1)  return 1;
  if (clients < 3)  return 3;
  if (clients < 5)  return 5;
  if (clients < 10) return 10;
  if (clients < 25) return 25;
  if (clients < 50) return 50;
  return 100;
}

function getMilestoneMessage(clients: number, next: number): string {
  const remaining = next - clients;
  if (remaining === 0) return `${next}-client proof milestone reached!`;
  if (next === 1) return `${remaining} close required to reach first-client proof.`;
  if (next <= 5)  return `${remaining} more close${remaining > 1 ? 's' : ''} required to reach ${next}-client proof.`;
  return `${remaining} more client${remaining > 1 ? 's' : ''} required to reach ${next}-client tier.`;
}

function formatINR(n: number): string {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function addDays(baseDate: string, n: number): string {
  const d = new Date(baseDate + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// ── Component ─────────────────────────────────────────────────

export const BusinessPage: React.FC = () => {
  const { user } = useAuth();

  const [allTime, setAllTime]         = useState<AllTimeBusinessStats | null>(null);
  const [history, setHistory]         = useState<BusinessMetric[]>([]);
  const [todayMetric, setTodayMetric] = useState<BusinessMetric | null>(null);
  const [config, setConfig]           = useState<OperatorConfig | null>(null);
  const [loadingData, setLoading]     = useState(true);

  // Acquisition state
  const [todayExec, setTodayExec]     = useState<Set<AcquisitionEngine>>(new Set());
  const [acqMap, setAcqMap]           = useState<ReturnType<typeof buildAcquisitionMap>>(new Map());
  const [acqDates, setAcqDates]       = useState<string[]>([]);
  const [acqToggling, setAcqToggling] = useState<AcquisitionEngine | null>(null);

  // Add client quick action
  const [addingClient, setAddingClient] = useState(false);
  const [clientAdded, setClientAdded]   = useState(false);

  // Job application count
  const [jobCount, setJobCount]       = useState(0);
  const [jobSaving, setJobSaving]     = useState(false);

  const tz = config?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const todayLocal = localDateInTz(tz);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [stats, hist, today, cfg] = await Promise.all([
      getAllTimeMetrics(user.id),
      getMetricsHistory(user.id, 30),
      getMetricsForToday(user.id),
      getOrCreateOperatorConfig(user.id),
    ]);

    setAllTime(stats);
    setHistory(hist);
    setTodayMetric(today);
    setConfig(cfg);
    setJobCount(cfg.job_application_count);

    // Load acquisition data for last 7 days
    const currentTz = cfg.timezone ?? tz;
    const today2 = localDateInTz(currentTz);
    const fromDate = addDays(today2, -6);
    const logs = await getAcquisitionLogForRange(user.id, fromDate, today2);
    const map = buildAcquisitionMap(logs);
    setAcqMap(map);
    setAcqDates(
      Array.from({ length: 7 }, (_, i) => addDays(fromDate, i))
    );
    setTodayExec(map.get(today2) ?? new Set());

    setLoading(false);
  }, [user, tz]);

  useEffect(() => { load(); }, [load]);

  // ── Actions ───────────────────────────────────────────────

  const handleAddClient = async () => {
    if (!user || addingClient) return;
    setAddingClient(true);

    // Increment clients_closed in today's business_metrics (canonical source)
    const currentClosed = todayMetric?.clients_closed ?? 0;
    await supabase.from('business_metrics').upsert(
      {
        user_id: user.id,
        date: todayLocal,
        clients_closed: currentClosed + 1,
        leads: todayMetric?.leads ?? 0,
        sales_calls: todayMetric?.sales_calls ?? 0,
        revenue: todayMetric?.revenue ?? 0,
        content_posted: todayMetric?.content_posted ?? 0,
        hours_worked: todayMetric?.hours_worked ?? 0,
      },
      { onConflict: 'user_id,date' }
    );

    // Refresh
    const [stats, today] = await Promise.all([
      getAllTimeMetrics(user.id),
      getMetricsForToday(user.id),
    ]);
    setAllTime(stats);
    setTodayMetric(today);
    setClientAdded(true);
    setAddingClient(false);
    setTimeout(() => setClientAdded(false), 2000);
  };

  const handleToggleEngine = async (engine: AcquisitionEngine) => {
    if (!user || acqToggling) return;
    setAcqToggling(engine);
    const newState = await toggleAcquisitionEngine(user.id, todayLocal, engine);
    setTodayExec(prev => {
      const next = new Set(prev);
      if (newState) next.add(engine); else next.delete(engine);
      return next;
    });
    // Update history map
    const fromDate = addDays(todayLocal, -6);
    const logs = await getAcquisitionLogForRange(user.id, fromDate, todayLocal);
    setAcqMap(buildAcquisitionMap(logs));
    setAcqToggling(null);
  };

  const handleJobCount = async (delta: 1 | -1) => {
    if (!user || jobSaving) return;
    setJobSaving(true);
    const newCount = await adjustJobApplicationCount(user.id, delta, jobCount);
    setJobCount(newCount);
    setJobSaving(false);
  };

  // ── Derived values ────────────────────────────────────────

  const totalClients   = allTime?.totalClientsClosed ?? 0;
  const totalLeads     = allTime?.totalLeads ?? 0;
  const totalCalls     = allTime?.totalSalesCalls ?? 0;
  const totalRevenue   = allTime?.totalRevenue ?? 0;
  const nextMilestone  = getNextMilestone(totalClients);
  const nextPct        = Math.min(Math.round((totalClients / nextMilestone) * 100), 100);
  const conversion     = totalCalls > 0 ? ((totalClients / totalCalls) * 100).toFixed(1) + '%' : '—';

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="business-page">

      {/* ── Hero Banner ── */}
      <div className="business-hero-card skool-card-dark">
        <div className="hero-top-meta">
          <span className="hero-badge">BUSINESS EXECUTION</span>
          <span className="hero-milestone-pill">
            <Award size={13} />
            <span>Next: {nextMilestone} {nextMilestone === 1 ? 'Client' : 'Clients'}</span>
          </span>
        </div>

        <div className="hero-headline-group">
          <h1 className="hero-main-title">BUILD 100</h1>
          <p className="hero-subtitle">"The classroom teaches you. The business proves whether you learned."</p>
        </div>

        <div className="client-progress-block">
          <div className="client-progress-header">
            <div className="client-stat-huge">
              <span className="current-num">{totalClients}</span>
              <span className="target-num">/ 100 CLIENTS</span>
            </div>
            <button
              className={`add-client-btn ${clientAdded ? 'add-client-success' : ''}`}
              onClick={handleAddClient}
              disabled={addingClient}
              title="Record new client closed today"
            >
              {clientAdded ? <Check size={14} /> : <Plus size={14} />}
              <span>{clientAdded ? 'Logged!' : 'Add Client'}</span>
            </button>
          </div>
          <ProgressBar
            value={nextPct}
            color="var(--brand-lime)"
            trackColor="rgba(255,255,255,0.15)"
            height={10}
            showPercent={false}
          />
          <p className="milestone-sub">{getMilestoneMessage(totalClients, nextMilestone)}</p>
        </div>
      </div>

      {/* ── Core Metrics ── */}
      <div className="metrics-summary-grid">
        <div className="biz-stat-box skool-card">
          <span className="stat-card-label">LEADS</span>
          <span className="stat-card-val">{loadingData ? '—' : totalLeads}</span>
          <span className="stat-card-trend">All time</span>
        </div>
        <div className="biz-stat-box skool-card">
          <span className="stat-card-label">SALES CALLS</span>
          <span className="stat-card-val">{loadingData ? '—' : totalCalls}</span>
          <span className="stat-card-trend">All time</span>
        </div>
        <div className="biz-stat-box skool-card">
          <span className="stat-card-label">CLIENTS</span>
          <span className="stat-card-val highlight-client">{loadingData ? '—' : totalClients}</span>
          <span className="stat-card-trend">Closed total</span>
        </div>
        <div className="biz-stat-box skool-card">
          <span className="stat-card-label">REVENUE</span>
          <span className="stat-card-val">{loadingData ? '—' : formatINR(totalRevenue)}</span>
          <span className="stat-card-trend">Cash collected</span>
        </div>
        <div className="biz-stat-box skool-card">
          <span className="stat-card-label">CONVERSION</span>
          <span className="stat-card-val">{loadingData ? '—' : conversion}</span>
          <span className="stat-card-trend">Calls to closed</span>
        </div>
      </div>

      {/* ── Two-column layout: left = acquisition, right = journal ── */}
      <div className="business-content-grid">

        {/* Left Column */}
        <div className="biz-left-col">

          {/* Primary Acquisition Engine */}
          <div className="acquisition-card skool-card">
            <div className="acquisition-header">
              <span className="section-label">ACQUISITION ENGINE</span>
              <span className="acq-today-label">TODAY</span>
            </div>

            <div className="channel-items-stack">
              {PRIMARY_ENGINES.map(engine => {
                const done = todayExec.has(engine);
                return (
                  <button
                    key={engine}
                    className={`channel-item channel-item-btn ${done ? 'channel-done' : ''}`}
                    onClick={() => handleToggleEngine(engine)}
                    disabled={acqToggling === engine}
                  >
                    <div className="channel-label-group">
                      <span className="channel-title">{ENGINE_LABELS[engine]}</span>
                    </div>
                    <span className={`channel-exec-badge ${done ? 'exec-done' : 'exec-pending'}`}>
                      {done ? <Check size={12} /> : null}
                      <span>{done ? 'Done' : 'Mark Done'}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 7-day Acquisition History Grid */}
            <div className="acq-history">
              <span className="acq-history-label">7-DAY HISTORY</span>
              <div className="acq-history-grid">
                <div className="acq-history-engines">
                  {PRIMARY_ENGINES.map(e => (
                    <span key={e} className="acq-engine-abbr">{ENGINE_LABELS[e].split(' ')[0]}</span>
                  ))}
                </div>
                {acqDates.map(date => (
                  <div key={date} className="acq-history-col">
                    <span className="acq-hist-date">
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'narrow' })}
                    </span>
                    {PRIMARY_ENGINES.map(e => (
                      <span
                        key={e}
                        className={`acq-hist-dot ${wasEngineExecuted(acqMap, date, e) ? 'acq-dot-done' : 'acq-dot-miss'}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Delegated Acquisition */}
          <div className="acquisition-card acq-delegated skool-card">
            <div className="acquisition-header">
              <span className="section-label">DELEGATED ACQUISITION</span>
              <span className="acq-today-label">TODAY</span>
            </div>
            <div className="channel-items-stack">
              {DELEGATED_ENGINES.map(engine => {
                const done = todayExec.has(engine);
                return (
                  <button
                    key={engine}
                    className={`channel-item channel-item-btn ${done ? 'channel-done' : ''}`}
                    onClick={() => handleToggleEngine(engine)}
                    disabled={acqToggling === engine}
                  >
                    <div className="channel-label-group">
                      <span className="channel-title">{ENGINE_LABELS[engine]}</span>
                      {/* Show target if configured */}
                      {engine === 'wa_dms' && config?.acquisition_wa_target && (
                        <span className="channel-desc">{config.acquisition_wa_target}/day target</span>
                      )}
                      {engine === 'linkedin' && config?.acquisition_linkedin_target && (
                        <span className="channel-desc">{config.acquisition_linkedin_target}/day target</span>
                      )}
                    </div>
                    <span className={`channel-exec-badge ${done ? 'exec-done' : 'exec-pending'}`}>
                      {done ? <Check size={12} /> : null}
                      <span>{done ? 'Done' : 'Mark Done'}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {/* 7-day delegated history */}
            <div className="acq-history">
              <div className="acq-history-grid">
                <div className="acq-history-engines">
                  {DELEGATED_ENGINES.map(e => (
                    <span key={e} className="acq-engine-abbr">{ENGINE_LABELS[e].split(' ')[0]}</span>
                  ))}
                </div>
                {acqDates.map(date => (
                  <div key={date} className="acq-history-col">
                    <span className="acq-hist-date">
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'narrow' })}
                    </span>
                    {DELEGATED_ENGINES.map(e => (
                      <span
                        key={e}
                        className={`acq-hist-dot ${wasEngineExecuted(acqMap, date, e) ? 'acq-dot-done' : 'acq-dot-miss'}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Job Applications Backup */}
          <div className="backup-card skool-card">
            <div className="backup-header">
              <div className="backup-icon-title">
                <Briefcase size={14} className="backup-icon" />
                <span className="backup-label">JOB APPLICATIONS (BACKUP)</span>
              </div>
              <span className="backup-value">Safety net only</span>
            </div>
            <div className="job-counter-row">
              <button
                className="job-counter-btn"
                onClick={() => handleJobCount(-1)}
                disabled={jobSaving || jobCount === 0}
              >
                <Minus size={13} />
              </button>
              <span className="job-counter-val">{jobCount}</span>
              <button
                className="job-counter-btn"
                onClick={() => handleJobCount(1)}
                disabled={jobSaving}
              >
                <Plus size={13} />
              </button>
              <span className="job-counter-label">applied</span>
            </div>
          </div>
        </div>

        {/* Right Column: Build Log */}
        <div className="biz-right-col">
          <div className="build-log-card skool-card">
            <div className="build-log-header">
              <div>
                <span className="section-label">EXECUTION JOURNAL</span>
                <h3 className="build-log-title">BUILD LOG</h3>
              </div>
              <span className="log-badge">Last 30 Days</span>
            </div>

            {loadingData && <div className="data-loading-state">Loading…</div>}

            {!loadingData && history.length === 0 && (
              <div className="data-empty-state">
                <strong>No entries yet</strong>
                Log your daily business activity to build your execution journal.
              </div>
            )}

            {!loadingData && history.length > 0 && (
              <div className="build-entries-list">
                {history.map((entry, index) => {
                  const dateObj = new Date(entry.date + 'T00:00:00');
                  const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                  const dateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  const hasWork = entry.hours_worked > 0;
                  const hasActivity = entry.leads > 0 || entry.sales_calls > 0 ||
                    entry.clients_closed > 0 || entry.content_posted > 0;

                  return (
                    <div key={index} className={`build-entry-row ${hasWork || hasActivity ? 'worked-day' : 'rest-day'}`}>
                      <div className="entry-left">
                        <span className="entry-day">{dayLabel}</span>
                        <span className="entry-date">{dateLabel}</span>
                      </div>
                      <div className="entry-center">
                        {hasWork && (
                          <span className="entry-metric">
                            {Math.floor(entry.hours_worked)}h {Math.round((entry.hours_worked % 1) * 60)}m
                          </span>
                        )}
                        {entry.clients_closed > 0 && (
                          <span className="entry-metric entry-metric-client">
                            +{entry.clients_closed} client{entry.clients_closed > 1 ? 's' : ''}
                          </span>
                        )}
                        {entry.leads > 0 && (
                          <span className="entry-metric">{entry.leads} leads</span>
                        )}
                        {entry.sales_calls > 0 && (
                          <span className="entry-metric">{entry.sales_calls} calls</span>
                        )}
                        {entry.content_posted > 0 && (
                          <span className="entry-metric">{entry.content_posted} content</span>
                        )}
                        {!hasWork && !hasActivity && (
                          <span className="entry-metric entry-metric-off">No activity</span>
                        )}
                      </div>
                      <div className="entry-right">
                        {hasWork ? (
                          <span className="entry-hour-badge">
                            {entry.hours_worked.toFixed(1)}h
                          </span>
                        ) : hasActivity ? (
                          <span className="entry-hour-badge entry-hour-badge-partial">
                            active
                          </span>
                        ) : (
                          <span className="entry-off-badge">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
