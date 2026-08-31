import React from 'react';
import { SessionCard } from '../components/SessionCard';
import { CheckInCard } from '../components/CheckInCard';
import { CockyMessageCard } from '../components/CockyMessageCard';
import { ExecutionVsLearningCard } from '../components/ExecutionVsLearningCard';
import { TodayBusinessCard } from '../components/TodayBusinessCard';
import { ProgressBar } from '../components/ProgressBar';
import {
  sampleUserData,
  sampleSessionData,
  sampleCheckInData,
  sampleProgressData,
  sampleCockyMessage
} from '../data/sampleData';
import { ArrowRight } from 'lucide-react';
import './DashboardPage.css';

interface DashboardPageProps {
  onNavigateTab: (tabId: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateTab }) => {
  return (
    <div className="dashboard-page layout-2col">
      {/* Left / Main Execution Stream */}
      <div className="dashboard-main">
        {/* Top Operating Header */}
        <div className="operator-hero-card skool-card">
          <div className="operator-top-row">
            <div className="operator-greeting-group">
              <span className="system-badge">BUILD100 OS</span>
              <h1 className="operator-greeting">Good evening, {sampleUserData.name}.</h1>
              <div className="operator-day-tag">Day {sampleUserData.dayCount}.</div>
            </div>
            
            <div className="current-priority-badge">
              <span className="priority-label">CURRENT PRIORITY</span>
              <span className="priority-val">{sampleUserData.priority}</span>
            </div>
          </div>

          <div className="operator-goal-banner">
            <p className="operator-goal-text">
              {sampleUserData.goalStatement}
            </p>
          </div>

          {/* Compact Operating Principles */}
          <div className="operating-principles-row">
            <div className="principle-box primary">
              <span className="principle-sub">OPERATING PRINCIPLE</span>
              <span className="principle-text">{sampleUserData.operatingPrinciples.primary}</span>
            </div>
            <div className="principle-box secondary">
              <span className="principle-sub">DISCIPLINE RULE</span>
              <span className="principle-text">{sampleUserData.operatingPrinciples.secondary}</span>
            </div>
          </div>
        </div>

        {/* Today's Session Card */}
        <SessionCard session={sampleSessionData} />

        {/* Daily Check-in Card */}
        <CheckInCard checkIn={sampleCheckInData} />

        {/* Cocky Status Message Callout */}
        <CockyMessageCard
          headline={sampleCockyMessage.headline}
          stats={sampleCockyMessage.stats}
          callout={sampleCockyMessage.callout}
        />

        {/* Compact Progress Area */}
        <div className="curriculum-progress-card skool-card">
          <div className="progress-card-header">
            <div className="header-left-title">
              <span className="section-label">CURRICULUM PROGRESS</span>
              <h3 className="sub-title">Skill Mastery Tracks</h3>
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => onNavigateTab('classroom')}
            >
              <span>Open Classroom</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="progress-bars-stack">
            {sampleProgressData.categories.map((cat) => (
              <div key={cat.name} className="track-progress-row">
                <div className="track-info">
                  <span className="track-name">{cat.name}</span>
                  <span className="track-percentage">{cat.progress}%</span>
                </div>
                <ProgressBar
                  value={cat.progress}
                  color={cat.name === 'SALES' ? 'var(--brand-green-dark)' : cat.name === 'CONTENT' ? 'var(--brand-lime-text)' : 'var(--accent-blue)'}
                  height={8}
                  showPercent={false}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right / Sidebar Column */}
      <aside className="dashboard-sidebar">
        {/* Brand Hero Summary Card (matching Skool About/Community sidebar) */}
        <div className="brand-summary-card skool-card">
          <div className="brand-banner-img-wrap">
            <img
              src="/assets/saad-banner.png"
              alt="Build100 - Saad Mohamed"
              className="brand-banner-img"
            />
          </div>
          <div className="brand-summary-body">
            <h3 className="brand-title">Build100</h3>
            <p className="brand-url">build100.system/jason</p>
            <p className="brand-desc">
              We help you get 100 paying clients by fixing content, offer, and sales. Live training 6 days a week.
            </p>
            
            <div className="sidebar-stats-row">
              <div className="sidebar-stat">
                <span className="stat-num">6 / 100</span>
                <span className="stat-lbl">Clients</span>
              </div>
              <div className="sidebar-stat">
                <span className="stat-num">Level 7</span>
                <span className="stat-lbl">Operator</span>
              </div>
              <div className="sidebar-stat">
                <span className="stat-num">17</span>
                <span className="stat-lbl">Day Streak</span>
              </div>
            </div>

            <button
              className="btn btn-outline btn-sm sidebar-action-btn"
              onClick={() => onNavigateTab('about')}
            >
              PROGRAM OVERVIEW
            </button>
          </div>
        </div>

        {/* Execution vs Learning Comparison */}
        <ExecutionVsLearningCard
          learningPercent={sampleProgressData.executionVsLearning.learning}
          applicationPercent={sampleProgressData.executionVsLearning.application}
          currentClients={sampleProgressData.executionVsLearning.business.current}
          targetClients={sampleProgressData.executionVsLearning.business.target}
        />

        {/* Today's Business Metrics */}
        <TodayBusinessCard
          leadsToday={sampleProgressData.todayBusiness.leadsToday}
          salesCalls={sampleProgressData.todayBusiness.salesCalls}
          closed={sampleProgressData.todayBusiness.closedToday}
          contentPosted={sampleProgressData.todayBusiness.contentPosted}
          workedHours={sampleProgressData.todayBusiness.workedHours}
        />
      </aside>
    </div>
  );
};
