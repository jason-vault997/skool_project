import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth/AuthContext';
import { getXpBreakdown } from '../lib/data/xpEvents';
import { ProgressBar } from '../components/ProgressBar';
import type { XpBreakdown, LevelInfo as LevelInfoType } from '../lib/supabase/types';
import { sampleLeaderboardData } from '../data/sampleData';
import { Lock, Zap, Target, Award } from 'lucide-react';
import './LeaderboardPage.css';

// Level ladder — static config, not DB-driven in Phase 2
const LEVELS: LevelInfoType[] = [
  { level: 1, title: 'Novice',      xpRequired: 0,     perks: 'Initial onboarding & curriculum unlock' },
  { level: 2, title: 'Apprentice',  xpRequired: 300,   perks: 'First 10 cold calls completed' },
  { level: 3, title: 'Practitioner',xpRequired: 750,   perks: 'First live sales call completed' },
  { level: 4, title: 'Builder',     xpRequired: 1400,  perks: 'First paying client closed' },
  { level: 5, title: 'Closer',      xpRequired: 2200,  perks: '3 clients closed & recurring engine' },
  { level: 6, title: 'Rainmaker',   xpRequired: 3100,  perks: '5 clients closed & revenue milestone' },
  { level: 7, title: 'Operator',    xpRequired: 4200,  perks: 'Active tier: Consistent daily execution' },
  { level: 8, title: 'Centurion',   xpRequired: 6000,  perks: 'Scale milestone: 25+ verified clients' },
  { level: 9, title: 'Titan (100 Clients)', xpRequired: 10000, perks: 'Mastery milestone: 100 clients closed' },
];

function getLevelStatus(levelNum: number, currentLevel: number): 'completed' | 'current' | 'locked' {
  if (levelNum < currentLevel) return 'completed';
  if (levelNum === currentLevel) return 'current';
  return 'locked';
}

export const LeaderboardPage: React.FC = () => {
  const { profile } = useAuth();
  const [xpBreakdown, setXpBreakdown] = useState<XpBreakdown>({ execution: 0, application: 0, business: 0, total: 0 });
  const [loadingData, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    getXpBreakdown(profile.id)
      .then(setXpBreakdown)
      .finally(() => setLoading(false));
  }, [profile]);

  const level         = profile?.level ?? 1;
  const xp            = profile?.xp ?? 0;
  const displayName   = profile?.full_name ?? 'Jason Harris';
  const avatarUrl     = profile?.avatar_url ?? '/assets/jason-avatar.png';

  // Compute level-up progress
  const currentLevelDef  = LEVELS.find(l => l.level === level) ?? LEVELS[0];
  const nextLevelDef     = LEVELS.find(l => l.level === level + 1);
  const xpToNext         = nextLevelDef ? nextLevelDef.xpRequired - xp : 0;
  const xpInThisLevel    = xp - currentLevelDef.xpRequired;
  const xpSpanThisLevel  = nextLevelDef ? nextLevelDef.xpRequired - currentLevelDef.xpRequired : 1;
  const levelPct         = nextLevelDef ? Math.min(Math.round((xpInThisLevel / xpSpanThisLevel) * 100), 100) : 100;

  // Use DB XP if available, fall back to 0 (never fake data from sample)
  const useBreakdown = loadingData ? { execution: 0, application: 0, business: 0, total: 0 } : xpBreakdown;

  return (
    <div className="leaderboard-page">
      {/* Operator Profile Card */}
      <div className="operator-profile-card skool-card">
        <div className="operator-avatar-section">
          <div className="avatar-huge-wrap">
            <img src={avatarUrl} alt={displayName} className="avatar-huge-img" />
            <div className="level-huge-badge"><span>{level}</span></div>
          </div>

          <div className="operator-meta">
            <h2 className="operator-name">{displayName}</h2>
            <div className="operator-level-rank">
              <span className="rank-tier">Level {level} • {currentLevelDef.title}</span>
            </div>
            <div className="level-up-progress-wrapper">
              <div className="level-up-meta">
                <span>Progress to Level {level + 1}{nextLevelDef ? ` (${nextLevelDef.title})` : ''}</span>
                <span className="points-needed">{xpToNext > 0 ? `${xpToNext} XP needed` : 'Max level reached'}</span>
              </div>
              <ProgressBar value={levelPct} color="var(--brand-lime)" trackColor="#e5e7eb" height={8} showPercent={false} />
            </div>
          </div>
        </div>

        {/* Level Roadmap Grid */}
        <div className="levels-roadmap-grid">
          {LEVELS.map(lvl => {
            const status    = getLevelStatus(lvl.level, level);
            const isLocked  = status === 'locked';
            const isCurrent = status === 'current';
            const isDone    = status === 'completed';
            return (
              <div key={lvl.level} className={`level-grid-item ${isCurrent ? 'current-level' : ''} ${isDone ? 'completed-level' : ''} ${isLocked ? 'locked-level' : ''}`} title={lvl.perks}>
                <div className={`level-number-icon ${isCurrent ? 'icon-current' : isDone ? 'icon-done' : 'icon-locked'}`}>
                  {isLocked ? <Lock size={13} /> : <span>{lvl.level}</span>}
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

      {/* XP Breakdown */}
      <div className="xp-breakdown-section">
        <div className="section-title-row">
          <div>
            <span className="section-label">OPERATOR CAPABILITY SCORE</span>
            <h2 className="section-heading">JASON VS JASON</h2>
          </div>
          <span className="total-xp-badge">
            <Zap size={14} fill="currentColor" />
            <span>TOTAL: {useBreakdown.total.toLocaleString()} XP</span>
          </span>
        </div>

        <div className="xp-cards-grid">
          <div className="xp-card skool-card">
            <div className="xp-card-header">
              <div className="xp-icon-wrap execution"><Zap size={18} /></div>
              <span className="xp-tag">EXECUTION</span>
            </div>
            <div className="xp-val">{useBreakdown.execution.toLocaleString()} <span className="xp-unit">XP</span></div>
            <p className="xp-desc">Daily work volume, live cold calls completed, and time logged.</p>
            <ProgressBar value={useBreakdown.total > 0 ? (useBreakdown.execution / useBreakdown.total) * 100 : 0} color="var(--accent-emerald)" height={6} showPercent={false} />
          </div>

          <div className="xp-card skool-card">
            <div className="xp-card-header">
              <div className="xp-icon-wrap application"><Target size={18} /></div>
              <span className="xp-tag">APPLICATION</span>
            </div>
            <div className="xp-val">{useBreakdown.application.toLocaleString()} <span className="xp-unit">XP</span></div>
            <p className="xp-desc">Direct market implementation of studied frameworks and objection drills.</p>
            <ProgressBar value={useBreakdown.total > 0 ? (useBreakdown.application / useBreakdown.total) * 100 : 0} color="var(--brand-lime)" height={6} showPercent={false} />
          </div>

          <div className="xp-card skool-card">
            <div className="xp-card-header">
              <div className="xp-icon-wrap business"><Award size={18} /></div>
              <span className="xp-tag">BUSINESS</span>
            </div>
            <div className="xp-val">{useBreakdown.business.toLocaleString()} <span className="xp-unit">XP</span></div>
            <p className="xp-desc">Real revenue collected, paying retainer contracts closed, and client proof.</p>
            <ProgressBar value={useBreakdown.total > 0 ? (useBreakdown.business / useBreakdown.total) * 100 : 0} color="var(--brand-green-dark)" height={6} showPercent={false} />
          </div>
        </div>
      </div>

      {/* Personal Records — static config for now */}
      <div className="personal-records-section skool-card">
        <div className="records-header">
          <div>
            <span className="section-label">HISTORICAL BENCHMARKS</span>
            <h3 className="records-title">Personal Records</h3>
          </div>
          <span className="records-sub">Only standard that matters</span>
        </div>
        <div className="records-grid">
          {sampleLeaderboardData.personalRecords.map((rec, index) => (
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
