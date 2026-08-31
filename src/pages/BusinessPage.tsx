import React from 'react';
import { ProgressBar } from '../components/ProgressBar';
import { sampleBusinessData } from '../data/sampleData';
import {
  Briefcase,
  CheckCircle2,
  Award
} from 'lucide-react';
import './BusinessPage.css';

export const BusinessPage: React.FC = () => {
  const {
    title,
    subtitle,
    clientGoal,
    nextMilestone,
    metrics,
    acquisition,
    backup,
    buildLog
  } = sampleBusinessData;

  return (
    <div className="business-page">
      {/* Business Hero Banner (100 Clients Progress) */}
      <div className="business-hero-card skool-card-dark">
        <div className="hero-top-meta">
          <span className="hero-badge">BUSINESS OPERATING PROOF</span>
          <span className="hero-milestone-pill">
            <Award size={13} />
            <span>Next Milestone: 10 Clients ({nextMilestone.current}/{nextMilestone.target})</span>
          </span>
        </div>

        <div className="hero-headline-group">
          <h1 className="hero-main-title">{title}</h1>
          <p className="hero-subtitle">"{subtitle}"</p>
        </div>

        {/* 100 Clients Progress Bar */}
        <div className="client-progress-block">
          <div className="client-progress-header">
            <div className="client-stat-huge">
              <span className="current-num">{clientGoal.current}</span>
              <span className="target-num">/ {clientGoal.target} CLIENTS</span>
            </div>
            <div className="progress-pct-badge">{clientGoal.percentage}% ACQUIRED</div>
          </div>
          <ProgressBar
            value={clientGoal.percentage}
            color="var(--brand-lime)"
            trackColor="rgba(255, 255, 255, 0.15)"
            height={12}
            showPercent={false}
          />
        </div>
      </div>

      {/* Core Business Metrics Grid */}
      <div className="metrics-summary-grid">
        <div className="biz-stat-box skool-card">
          <span className="stat-card-label">LEADS</span>
          <span className="stat-card-val">{metrics.leads}</span>
          <span className="stat-card-trend">+3 this week</span>
        </div>

        <div className="biz-stat-box skool-card">
          <span className="stat-card-label">SALES CALLS</span>
          <span className="stat-card-val">{metrics.salesCalls}</span>
          <span className="stat-card-trend">11 booked</span>
        </div>

        <div className="biz-stat-box skool-card">
          <span className="stat-card-label">CLIENTS</span>
          <span className="stat-card-val highlight-client">{metrics.clients}</span>
          <span className="stat-card-trend">Active retainers</span>
        </div>

        <div className="biz-stat-box skool-card">
          <span className="stat-card-label">REVENUE</span>
          <span className="stat-card-val">{metrics.revenue}</span>
          <span className="stat-card-trend">Cash collected</span>
        </div>

        <div className="biz-stat-box skool-card">
          <span className="stat-card-label">CONVERSION</span>
          <span className="stat-card-val">{metrics.conversion}</span>
          <span className="stat-card-trend">Calls to closed</span>
        </div>
      </div>

      {/* Two Column Section: Acquisition & Next Milestone | Build Log Journal */}
      <div className="business-content-grid">
        {/* Left Column: Acquisition Channels & Next Milestone & Backup */}
        <div className="biz-left-col">
          {/* Next Milestone Card */}
          <div className="milestone-card skool-card">
            <div className="milestone-header">
              <span className="section-label">NEXT MILESTONE</span>
              <span className="badge badge-brand">IN PROGRESS</span>
            </div>
            <div className="milestone-body">
              <h3 className="milestone-title">{nextMilestone.label}</h3>
              <div className="milestone-progress-row">
                <span className="milestone-count">{nextMilestone.current} / {nextMilestone.target} Clients</span>
                <span className="milestone-pct">{nextMilestone.progress}%</span>
              </div>
              <ProgressBar
                value={nextMilestone.progress}
                color="var(--brand-green-dark)"
                height={8}
                showPercent={false}
              />
              <p className="milestone-note">4 more closes required to reach 10-Client proof tier.</p>
            </div>
          </div>

          {/* Acquisition Channels Card */}
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
                <span className="channel-status-badge">{acquisition.repostAccounts}</span>
              </div>

              <div className="channel-item">
                <div className="channel-label-group">
                  <span className="channel-title">Original Content</span>
                  <span className="channel-desc">Daily reel & hook distribution</span>
                </div>
                <span className="channel-status-badge success">
                  <CheckCircle2 size={13} />
                  <span>{acquisition.originalContentStatus}</span>
                </span>
              </div>

              <div className="channel-item">
                <div className="channel-label-group">
                  <span className="channel-title">Personal Brand</span>
                  <span className="channel-desc">Founder authority stories & proof</span>
                </div>
                <span className="channel-status-badge success">
                  <CheckCircle2 size={13} />
                  <span>{acquisition.personalBrandStatus}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Backup Job Applications Card */}
          <div className="backup-card skool-card">
            <div className="backup-header">
              <div className="backup-icon-title">
                <Briefcase size={14} className="backup-icon" />
                <span className="backup-label">JOB APPLICATIONS (BACKUP)</span>
              </div>
              <span className="backup-value">Today: {backup.jobApplicationsToday}</span>
            </div>
            <p className="backup-note">{backup.note}</p>
          </div>
        </div>

        {/* Right Column: Build Log Journal */}
        <div className="biz-right-col">
          <div className="build-log-card skool-card">
            <div className="build-log-header">
              <div>
                <span className="section-label">EXECUTION JOURNAL</span>
                <h3 className="build-log-title">BUILD LOG</h3>
              </div>
              <span className="log-badge">August 2026</span>
            </div>

            {/* Monthly Stats Summary Bar */}
            <div className="monthly-stats-summary">
              <div className="monthly-stat-item">
                <span className="monthly-stat-val">{buildLog.summary.hoursThisMonth}h</span>
                <span className="monthly-stat-lbl">Hours this month</span>
              </div>
              <div className="monthly-stat-item">
                <span className="monthly-stat-val">{buildLog.summary.workingDays}</span>
                <span className="monthly-stat-lbl">Working days</span>
              </div>
              <div className="monthly-stat-item">
                <span className="monthly-stat-val">{buildLog.summary.longestDay}h</span>
                <span className="monthly-stat-lbl">Longest day</span>
              </div>
              <div className="monthly-stat-item">
                <span className="monthly-stat-val">{buildLog.summary.weekendDaysWorked}</span>
                <span className="monthly-stat-lbl">Weekend days</span>
              </div>
            </div>

            {/* Daily Log Entries */}
            <div className="build-entries-list">
              {buildLog.entries.map((entry, index) => (
                <div
                  key={index}
                  className={`build-entry-row ${entry.isWorked ? 'worked-day' : 'rest-day'}`}
                >
                  <div className="entry-left">
                    <span className="entry-day">{entry.day}</span>
                    {entry.date && <span className="entry-date">{entry.date}</span>}
                  </div>
                  
                  <div className="entry-center">
                    <span className={`entry-status ${entry.isWorked ? 'status-worked' : 'status-rest'}`}>
                      {entry.status}
                    </span>
                    {entry.notes && <span className="entry-notes">{entry.notes}</span>}
                  </div>

                  <div className="entry-right">
                    {entry.hours > 0 ? (
                      <span className="entry-hour-badge">{entry.hours} hrs</span>
                    ) : (
                      <span className="entry-off-badge">OFF</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
