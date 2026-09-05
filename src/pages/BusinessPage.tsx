// ============================================================
// BUILD100 — Business Page
//
// ORIGINAL UI RESTORED from commit 563b216 (Phase 8).
// Functional additions layered on top with minimal visual change:
//
//   + Add Client: small button in hero area → increments
//     business_metrics.clients_closed (today's row) by 1.
//     The canonical cumulative total = SUM(all clients_closed rows).
//     No second counter created.
//
//   + Milestone: corrected progression 0→1→3→5→10→25→50→100
//
//   + Acquisition Engine: existing channel items are now clickable.
//     Status badge toggles between "Active/Posted" (done) and
//     "Not done" (pending) via acquisition_log table.
//
//   + Delegated Acquisition: subtle new section below primary,
//     same visual language.
//
//   + Acquisition history: compact 7-day dot grid under acquisition.
//
//   + Job Applications: tiny +/− counter added to backup card,
//     persisted to operator_config.job_application_count.
//
//   + Build Log: enriched with per-metric tags (same card style).
//
//   Goals/Weekly Review tabs preserved in DB, removed from nav.
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import { ProgressBar } from '../components/ProgressBar';
import { useAuth } from '../lib/auth/AuthContext';
import { getAllTimeMetrics, getMetricsHistory, getMetricsForToday } from '../lib/data/businessMetrics';
import { getOrCreateOperatorConfig, adjustJobApplicationCount } from '../lib/data/operatorConfig';
import {
  toggleAcquisitionEngine,
  getAcquisitionLogForRange,
  buildAcquisitionMap,
  wasEngineExecuted,
  PRIMARY_ENGINES,
  DELEGATED_ENGINES,
} from '../lib/data/acquisitionLog';
import { localDateInTz } from '../lib/data/operatingDays';
import { supabase } from '../lib/supabase/client';
import type {
  BusinessMetric, AllTimeBusinessStats, OperatorConfig, AcquisitionEngine,
} from '../lib/supabase/types';
import { Briefcase, CheckCircle2, Award, Plus, Minus, Check } from 'lucide-react';
import './BusinessPage.css';

// ── Milestone progression (corrected) ────────────────────────
function getNextMilestone(clients: number): number {
  if (clients < 1)  return 1;
  if (clients < 3)  return 3;
  if (clients < 5)  return 5;
  if (clients < 10) return 10;
  if (clients < 25) return 25;
  if (clients < 50) return 50;
  return 100;
}

function addDays(base: string, n: number): string {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// Engine display config matching original visual labels
const ENGINE_META: Record<AcquisitionEngine, { title: string; desc: string; doneLabel: string }> = {
  repost:   { title: 'Repost Accounts',  desc: 'Distribution clipping army',          doneLabel: 'Active' },
  content:  { title: 'Original Content', desc: 'Daily reel & hook distribution',      doneLabel: 'Posted' },
  brand:    { title: 'Personal Brand',   desc: 'Founder authority stories & proof',   doneLabel: 'Active' },
  wa_dms:   { title: 'WhatsApp DMs',     desc: 'Direct message outreach',             doneLabel: 'Done'   },
  linkedin: { title: 'LinkedIn Outreach',desc: 'Professional network outreach',       doneLabel: 'Done'   },
  repost_d: { title: 'Repost Content',   desc: 'Delegated content distribution',      doneLabel: 'Done'   },
};

// ── Component ─────────────────────────────────────────────────

export const BusinessPage: React.FC = () => {
  const { user } = useAuth();

  const [allTime, setAllTime]         = useState<AllTimeBusinessStats | null>(null);
  const [history, setHistory]         = useState<BusinessMetric[]>([]);
  const [todayMetric, setTodayMetric] = useState<BusinessMetric | null>(null);
  const [config, setConfig]           = useState<OperatorConfig | null>(null);
  const [loadingData, setLoading]     = useState(true);

  // Acquisition
  const [todayExec, setTodayExec]     = useState<Set<AcquisitionEngine>>(new Set());
  const [acqMap, setAcqMap]           = useState<ReturnType<typeof buildAcquisitionMap>>(new Map());
  const [acqDates, setAcqDates]       = useState<string[]>([]);
  const [acqToggling, setAcqToggling] = useState<AcquisitionEngine | null>(null);

  // Add Client
  const [addingClient, setAddingClient] = useState(false);
  const [clientFlash, setClientFlash]   = useState(false);

  // Job applications
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

    // Acquisition — last 7 days
    const currentTz = cfg.timezone;
    const now = localDateInTz(currentTz);
    const fromDate = addDays(now, -6);
    const logs = await getAcquisitionLogForRange(user.id, fromDate, now);
    const map = buildAcquisitionMap(logs);
    setAcqMap(map);
    setAcqDates(Array.from({ length: 7 }, (_, i) => addDays(fromDate, i)));
    setTodayExec(map.get(now) ?? new Set());
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // ── Actions ───────────────────────────────────────────────

  /**
   * Add Client: increments today's clients_closed by 1.
   * canonical total = SUM of all clients_closed across all metric rows.
   * This upserts today's row, adding 1 to whatever is already there.
   */
  const handleAddClient = async () => {
    if (!user || addingClient) return;
    setAddingClient(true);
    const currentClosed = todayMetric?.clients_closed ?? 0;
    await supabase.from('business_metrics').upsert(
      {
        user_id: user.id,
        date: todayLocal,
        clients_closed: currentClosed + 1,
        leads:          todayMetric?.leads          ?? 0,
        sales_calls:    todayMetric?.sales_calls    ?? 0,
        revenue:        todayMetric?.revenue        ?? 0,
        content_posted: todayMetric?.content_posted ?? 0,
        hours_worked:   todayMetric?.hours_worked   ?? 0,
      },
      { onConflict: 'user_id,date' }
    );
    const [stats, today] = await Promise.all([
      getAllTimeMetrics(user.id),
      getMetricsForToday(user.id),
    ]);
    setAllTime(stats);
    setTodayMetric(today);
    setClientFlash(true);
    setAddingClient(false);
    setTimeout(() => setClientFlash(false), 1500);
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

  const totalClients  = allTime?.totalClientsClosed ?? 0;
  const totalLeads    = allTime?.totalLeads ?? 0;
  const totalCalls    = allTime?.totalSalesCalls ?? 0;
  const totalRevenue  = allTime?.totalRevenue ?? 0;
  const clientPct     = Math.min(Math.round((totalClients / 100) * 100), 100);
  const nextMilestone = getNextMilestone(totalClients);
  const nextPct       = Math.min(Math.round((totalClients / nextMilestone) * 100), 100);
  const conversion    = totalCalls > 0 ? ((totalClients / totalCalls) * 100).toFixed(1) + '%' : '—';
  const revenueFormatted = new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(totalRevenue);

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="business-page">

      {/* ── Business Hero Banner ── */}
      <div className="business-hero-card skool-card-dark">
        <div className="hero-top-meta">
          <span className="hero-badge">BUSINESS OPERATING PROOF</span>
          <span className="hero-milestone-pill">
            <Award size={13} />
            <span>Next Milestone: {nextMilestone} Clients ({totalClients}/{nextMilestone})</span>
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
            <div className="hero-right-actions">
              <div className="progress-pct-badge">{clientPct}% ACQUIRED</div>
              {/* + Add Client: minimal button in hero */}
              <button
                className={`add-client-hero-btn ${clientFlash ? 'add-client-flash' : ''}`}
                onClick={handleAddClient}
                disabled={addingClient}
                title="Record 1 new client closed"
              >
                {clientFlash ? <Check size={12} /> : <Plus size={12} />}
                <span>Add Client</span>
              </button>
            </div>
          </div>
          <ProgressBar
            value={clientPct}
            color="var(--brand-lime)"
            trackColor="rgba(255,255,255,0.15)"
            height={12}
            showPercent={false}
          />
        </div>
      </div>

      {/* ── Overview tab content ── */}
      <>
        {/* Core Metrics Grid */}
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
            <span className="stat-card-trend">Active retainers</span>
          </div>
          <div className="biz-stat-box skool-card">
            <span className="stat-card-label">REVENUE</span>
            <span className="stat-card-val">{loadingData ? '—' : revenueFormatted}</span>
            <span className="stat-card-trend">Cash collected</span>
          </div>
          <div className="biz-stat-box skool-card">
            <span className="stat-card-label">CONVERSION</span>
            <span className="stat-card-val">{loadingData ? '—' : conversion}</span>
            <span className="stat-card-trend">Calls to closed</span>
          </div>
        </div>

        {/* Two Column Section */}
        <div className="business-content-grid">
          {/* Left Column */}
          <div className="biz-left-col">

            {/* Next Milestone */}
            <div className="milestone-card skool-card">
              <div className="milestone-header">
                <span className="section-label">NEXT MILESTONE</span>
                <span className="badge badge-brand">IN PROGRESS</span>
              </div>
              <div className="milestone-body">
                <h3 className="milestone-title">{nextMilestone} CLIENTS</h3>
                <div className="milestone-progress-row">
                  <span className="milestone-count">{totalClients} / {nextMilestone} Clients</span>
                  <span className="milestone-pct">{nextPct}%</span>
                </div>
                <ProgressBar value={nextPct} color="var(--brand-green-dark)" height={8} showPercent={false} />
                <p className="milestone-note">{nextMilestone - totalClients} more close{nextMilestone - totalClients !== 1 ? 's' : ''} required to reach {nextMilestone}-Client proof tier.</p>
              </div>
            </div>

            {/* Acquisition Engine — original design, now interactive */}
            <div className="acquisition-card skool-card">
              <div className="acquisition-header">
                <span className="section-label">ACQUISITION ENGINE</span>
                <span className="channel-tag">
                  {/* Original Instagram icon */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                  </svg>
                  <span>INSTAGRAM</span>
                </span>
              </div>

              <div className="channel-items-stack">
                {PRIMARY_ENGINES.map(engine => {
                  const done = todayExec.has(engine);
                  const meta = ENGINE_META[engine];
                  return (
                    <div
                      key={engine}
                      className="channel-item channel-item-clickable"
                      onClick={() => !acqToggling && handleToggleEngine(engine)}
                      role="button"
                      tabIndex={0}
                      title={done ? 'Click to mark not done' : 'Click to mark done'}
                    >
                      <div className="channel-label-group">
                        <span className="channel-title">{meta.title}</span>
                        <span className="channel-desc">{meta.desc}</span>
                      </div>
                      {done ? (
                        <span className="channel-status-badge success">
                          <CheckCircle2 size={13} />
                          <span>{meta.doneLabel}</span>
                        </span>
                      ) : (
                        <span className="channel-status-badge pending">
                          <span>Not done</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 7-day compact history — subtle dots */}
              <div className="acq-hist-strip">
                <span className="acq-hist-strip-label">7 DAYS</span>
                <div className="acq-hist-dots">
                  {acqDates.map(date => (
                    <div key={date} className="acq-hist-col">
                      <span className="acq-hist-dow">
                        {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'narrow' })}
                      </span>
                      {PRIMARY_ENGINES.map(e => (
                        <span
                          key={e}
                          className={`acq-dot ${wasEngineExecuted(acqMap, date, e) ? 'acq-dot-on' : 'acq-dot-off'}`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Delegated Acquisition — subtle secondary section */}
              <div className="delegated-section">
                <span className="delegated-label">DELEGATED</span>
                <div className="channel-items-stack">
                  {DELEGATED_ENGINES.map(engine => {
                    const done = todayExec.has(engine);
                    const meta = ENGINE_META[engine];
                    return (
                      <div
                        key={engine}
                        className="channel-item channel-item-clickable channel-item-delegated"
                        onClick={() => !acqToggling && handleToggleEngine(engine)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="channel-label-group">
                          <span className="channel-title">{meta.title}</span>
                        </div>
                        {done ? (
                          <span className="channel-status-badge success">
                            <CheckCircle2 size={12} />
                            <span>{meta.doneLabel}</span>
                          </span>
                        ) : (
                          <span className="channel-status-badge pending">
                            <span>Pending</span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Backup Card — original + tiny job counter */}
            <div className="backup-card skool-card">
              <div className="backup-header">
                <div className="backup-icon-title">
                  <Briefcase size={14} className="backup-icon" />
                  <span className="backup-label">JOB APPLICATIONS (BACKUP)</span>
                </div>
                <div className="backup-counter">
                  <button
                    className="job-btn"
                    onClick={() => handleJobCount(-1)}
                    disabled={jobSaving || jobCount === 0}
                  >
                    <Minus size={10} />
                  </button>
                  <span className="backup-value">{jobCount}</span>
                  <button
                    className="job-btn"
                    onClick={() => handleJobCount(1)}
                    disabled={jobSaving}
                  >
                    <Plus size={10} />
                  </button>
                </div>
              </div>
              <p className="backup-note">Backup pipeline safety tracking only. Primary focus: closing clients.</p>
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

              {loadingData && (
                <div className="data-loading-state">Loading build log…</div>
              )}

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
                    const dayName  = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                    const dateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const isWorked = entry.hours_worked > 0;
                    const hasActivity = entry.leads > 0 || entry.sales_calls > 0 ||
                      entry.clients_closed > 0 || entry.content_posted > 0;

                    return (
                      <div key={index} className={`build-entry-row ${isWorked || hasActivity ? 'worked-day' : 'rest-day'}`}>
                        <div className="entry-left">
                          <span className="entry-day">{dayName}</span>
                          <span className="entry-date">{dateLabel}</span>
                        </div>
                        <div className="entry-center">
                          {isWorked && (
                            <span className="entry-status status-worked">
                              Worked {entry.hours_worked.toFixed(1)}h
                            </span>
                          )}
                          {/* Enriched tags — same style */}
                          <div className="entry-tags">
                            {entry.clients_closed > 0 && (
                              <span className="entry-tag tag-client">+{entry.clients_closed} client{entry.clients_closed > 1 ? 's' : ''}</span>
                            )}
                            {entry.leads > 0 && (
                              <span className="entry-tag">{entry.leads} leads</span>
                            )}
                            {entry.sales_calls > 0 && (
                              <span className="entry-tag">{entry.sales_calls} calls</span>
                            )}
                            {entry.content_posted > 0 && (
                              <span className="entry-tag">{entry.content_posted} content</span>
                            )}
                          </div>
                          {!isWorked && !hasActivity && (
                            <span className="entry-status status-rest">Did not work</span>
                          )}
                          {entry.notes && <span className="entry-notes">{entry.notes}</span>}
                        </div>
                        <div className="entry-right">
                          {isWorked ? (
                            <span className="entry-hour-badge">{entry.hours_worked.toFixed(1)} hrs</span>
                          ) : (
                            <span className="entry-off-badge">OFF</span>
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
      </>

    </div>
  );
};
