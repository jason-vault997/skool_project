import React, { useEffect, useState } from 'react';
import { ProgressBar } from '../components/ProgressBar';
import { GoalsPanel } from '../components/GoalsPanel';
import { WeeklyReviewPanel } from '../components/WeeklyReviewPanel';
import { useAuth } from '../lib/auth/AuthContext';
import { getAllTimeMetrics, getMetricsHistory } from '../lib/data/businessMetrics';
import type { BusinessMetric, AllTimeBusinessStats } from '../lib/supabase/types';
import { Briefcase, CheckCircle2, Award } from 'lucide-react';
import './BusinessPage.css';

type BizTab = 'overview' | 'goals' | 'review';

export const BusinessPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<BizTab>('overview');

  const [allTime, setAllTime]     = useState<AllTimeBusinessStats | null>(null);
  const [history, setHistory]     = useState<BusinessMetric[]>([]);
  const [loadingData, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      getAllTimeMetrics(user.id),
      getMetricsHistory(user.id, 30),
    ]).then(([stats, hist]) => {
      setAllTime(stats);
      setHistory(hist);
    }).finally(() => setLoading(false));
  }, [user]);

  const totalClients  = allTime?.totalClientsClosed ?? 0;
  const totalLeads    = allTime?.totalLeads ?? 0;
  const totalCalls    = allTime?.totalSalesCalls ?? 0;
  const totalRevenue  = allTime?.totalRevenue ?? 0;
  const clientPct     = Math.min(Math.round((totalClients / 100) * 100), 100);
  const nextMilestone = totalClients < 10 ? 10 : totalClients < 25 ? 25 : totalClients < 50 ? 50 : 100;
  const nextPct       = Math.min(Math.round((totalClients / nextMilestone) * 100), 100);
  const conversion    = totalCalls > 0 ? ((totalClients / totalCalls) * 100).toFixed(1) + '%' : '—';
  const revenueFormatted = new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(totalRevenue);

  return (
    <div className="business-page">
      {/* Business Hero Banner — always visible */}
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
            <div className="progress-pct-badge">{clientPct}% ACQUIRED</div>
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

      {/* ── Tab Bar ── */}
      <div className="biz-tab-bar">
        <button
          className={`biz-tab ${activeTab === 'overview' ? 'biz-tab-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          OVERVIEW
        </button>
        <button
          className={`biz-tab ${activeTab === 'goals' ? 'biz-tab-active' : ''}`}
          onClick={() => setActiveTab('goals')}
        >
          GOALS
        </button>
        <button
          className={`biz-tab ${activeTab === 'review' ? 'biz-tab-active' : ''}`}
          onClick={() => setActiveTab('review')}
        >
          WEEKLY REVIEW
        </button>
      </div>

      {/* ── OVERVIEW tab (existing content, untouched) ── */}
      {activeTab === 'overview' && (
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
                  <p className="milestone-note">{nextMilestone - totalClients} more closes required to reach {nextMilestone}-Client proof tier.</p>
                </div>
              </div>

              {/* Acquisition Engine */}
              <div className="acquisition-card skool-card">
                <div className="acquisition-header">
                  <span className="section-label">ACQUISITION ENGINE</span>
                  <span className="channel-tag">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                    <span>INSTAGRAM</span>
                  </span>
                </div>
                <div className="channel-items-stack">
                  <div className="channel-item">
                    <div className="channel-label-group">
                      <span className="channel-title">Repost Accounts</span>
                      <span className="channel-desc">Distribution clipping army</span>
                    </div>
                    <span className="channel-status-badge">Active</span>
                  </div>
                  <div className="channel-item">
                    <div className="channel-label-group">
                      <span className="channel-title">Original Content</span>
                      <span className="channel-desc">Daily reel &amp; hook distribution</span>
                    </div>
                    <span className="channel-status-badge success">
                      <CheckCircle2 size={13} />
                      <span>Posted</span>
                    </span>
                  </div>
                  <div className="channel-item">
                    <div className="channel-label-group">
                      <span className="channel-title">Personal Brand</span>
                      <span className="channel-desc">Founder authority stories &amp; proof</span>
                    </div>
                    <span className="channel-status-badge success">
                      <CheckCircle2 size={13} />
                      <span>Active</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Backup Card */}
              <div className="backup-card skool-card">
                <div className="backup-header">
                  <div className="backup-icon-title">
                    <Briefcase size={14} className="backup-icon" />
                    <span className="backup-label">JOB APPLICATIONS (BACKUP)</span>
                  </div>
                  <span className="backup-value">Safety net only</span>
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
                      return (
                        <div key={index} className={`build-entry-row ${isWorked ? 'worked-day' : 'rest-day'}`}>
                          <div className="entry-left">
                            <span className="entry-day">{dayName}</span>
                            <span className="entry-date">{dateLabel}</span>
                          </div>
                          <div className="entry-center">
                            <span className={`entry-status ${isWorked ? 'status-worked' : 'status-rest'}`}>
                              {isWorked ? `Worked ${entry.hours_worked}h` : 'Did not work'}
                            </span>
                            {entry.notes && <span className="entry-notes">{entry.notes}</span>}
                          </div>
                          <div className="entry-right">
                            {isWorked ? (
                              <span className="entry-hour-badge">{entry.hours_worked} hrs</span>
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
      )}

      {/* ── GOALS tab ── */}
      {activeTab === 'goals' && user && (
        <div className="biz-tab-panel skool-card">
          <GoalsPanel userId={user.id} />
        </div>
      )}

      {/* ── WEEKLY REVIEW tab ── */}
      {activeTab === 'review' && user && (
        <div className="biz-tab-panel skool-card">
          <WeeklyReviewPanel userId={user.id} />
        </div>
      )}
    </div>
  );
};
