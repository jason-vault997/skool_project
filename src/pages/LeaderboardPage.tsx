import React from 'react';
import { sampleLeaderboardData } from '../data/sampleData';
import { ProgressBar } from '../components/ProgressBar';
import {
  Lock,
  Zap,
  Target,
  Award
} from 'lucide-react';
import './LeaderboardPage.css';

export const LeaderboardPage: React.FC = () => {
  const { operator, xpBreakdown, levels, personalRecords } = sampleLeaderboardData;

  return (
    <div className="leaderboard-page">
      {/* Top Hero Operator Card (matching Skool Leaderboard reference) */}
      <div className="operator-profile-card skool-card">
        <div className="operator-avatar-section">
          <div className="avatar-huge-wrap">
            <img
              src={operator.avatar}
              alt={operator.name}
              className="avatar-huge-img"
            />
            <div className="level-huge-badge">
              <span>{operator.level}</span>
            </div>
          </div>

          <div className="operator-meta">
            <h2 className="operator-name">{operator.name}</h2>
            <div className="operator-level-rank">
              <span className="rank-tier">Level {operator.level} • {operator.title}</span>
            </div>
            <div className="level-up-progress-wrapper">
              <div className="level-up-meta">
                <span>Progress to Level {operator.nextLevel} ({operator.nextTitle})</span>
                <span className="points-needed">{operator.pointsToLevelUp} XP needed</span>
              </div>
              <ProgressBar
                value={operator.progressPercentage}
                color="var(--brand-lime)"
                trackColor="#e5e7eb"
                height={8}
                showPercent={false}
              />
            </div>
          </div>
        </div>

        {/* Levels 1-9 Grid (matching Skool's exact level roadmap) */}
        <div className="levels-roadmap-grid">
          {levels.map((lvl) => {
            const isCompleted = lvl.status === 'completed';
            const isCurrent = lvl.status === 'current';
            const isLocked = lvl.status === 'locked';

            return (
              <div
                key={lvl.level}
                className={`level-grid-item ${isCurrent ? 'current-level' : ''} ${isCompleted ? 'completed-level' : ''} ${isLocked ? 'locked-level' : ''}`}
                title={lvl.perks}
              >
                <div className={`level-number-icon ${isCurrent ? 'icon-current' : isCompleted ? 'icon-done' : 'icon-locked'}`}>
                  {isLocked ? (
                    <Lock size={13} />
                  ) : (
                    <span>{lvl.level}</span>
                  )}
                </div>
                <div className="level-item-info">
                  <span className="lvl-item-title">Level {lvl.level}</span>
                  <span className="lvl-item-subtitle">{lvl.title}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Operator XP Breakdown Grid */}
      <div className="xp-breakdown-section">
        <div className="section-title-row">
          <div>
            <span className="section-label">OPERATOR CAPABILITY SCORE</span>
            <h2 className="section-heading">JASON VS JASON</h2>
          </div>
          <span className="total-xp-badge">
            <Zap size={14} fill="currentColor" />
            <span>TOTAL: {xpBreakdown.total.toLocaleString()} XP</span>
          </span>
        </div>

        <div className="xp-cards-grid">
          {/* Execution XP */}
          <div className="xp-card skool-card">
            <div className="xp-card-header">
              <div className="xp-icon-wrap execution">
                <Zap size={18} />
              </div>
              <span className="xp-tag">EXECUTION</span>
            </div>
            <div className="xp-val">{xpBreakdown.execution.toLocaleString()} <span className="xp-unit">XP</span></div>
            <p className="xp-desc">Daily work volume, live cold calls completed, and time logged.</p>
            <ProgressBar
              value={(xpBreakdown.execution / 3000) * 100}
              color="var(--accent-emerald)"
              height={6}
              showPercent={false}
            />
          </div>

          {/* Application XP */}
          <div className="xp-card skool-card">
            <div className="xp-card-header">
              <div className="xp-icon-wrap application">
                <Target size={18} />
              </div>
              <span className="xp-tag">APPLICATION</span>
            </div>
            <div className="xp-val">{xpBreakdown.application.toLocaleString()} <span className="xp-unit">XP</span></div>
            <p className="xp-desc">Direct market implementation of studied frameworks and objection drills.</p>
            <ProgressBar
              value={(xpBreakdown.application / 2000) * 100}
              color="var(--brand-lime)"
              height={6}
              showPercent={false}
            />
          </div>

          {/* Business XP */}
          <div className="xp-card skool-card">
            <div className="xp-card-header">
              <div className="xp-icon-wrap business">
                <Award size={18} />
              </div>
              <span className="xp-tag">BUSINESS</span>
            </div>
            <div className="xp-val">{xpBreakdown.business.toLocaleString()} <span className="xp-unit">XP</span></div>
            <p className="xp-desc">Real revenue collected, paying retainer contracts closed, and client proof.</p>
            <ProgressBar
              value={(xpBreakdown.business / 1000) * 100}
              color="var(--brand-green-dark)"
              height={6}
              showPercent={false}
            />
          </div>
        </div>
      </div>

      {/* Personal Best Records Section */}
      <div className="personal-records-section skool-card">
        <div className="records-header">
          <div>
            <span className="section-label">HISTORICAL BENCHMARKS</span>
            <h3 className="records-title">Personal Records</h3>
          </div>
          <span className="records-sub">Only standard that matters</span>
        </div>

        <div className="records-grid">
          {personalRecords.map((rec, index) => (
            <div key={index} className="record-item-card">
              <span className="rec-metric-name">{rec.metric}</span>
              <span className="rec-value">{rec.record}</span>
              <span className="rec-achieved">{rec.achieved}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
