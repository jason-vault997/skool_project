import React, { useEffect, useState } from 'react';
import { SessionCard } from '../components/SessionCard';
import { CheckInCard } from '../components/CheckInCard';
import { CockyMessageCard } from '../components/CockyMessageCard';
import { ExecutionVsLearningCard } from '../components/ExecutionVsLearningCard';
import { TodayBusinessCard } from '../components/TodayBusinessCard';
import { ProgressBar } from '../components/ProgressBar';
import { useAuth } from '../lib/auth/AuthContext';
import { getAllModulesWithProgress } from '../lib/data/modules';
import { getMetricsForToday, getAllTimeMetrics } from '../lib/data/businessMetrics';
import { getUpcomingSession } from '../lib/data/sessions';
import {
  sampleCheckInData,
  sampleCockyMessage,
  sampleSessionData,
} from '../data/sampleData';
import type { Session, ModuleWithProgress, BusinessMetric, AllTimeBusinessStats } from '../lib/supabase/types';
import type { SessionInfo } from '../data/sampleData';
import { ArrowRight } from 'lucide-react';
import './DashboardPage.css';

interface DashboardPageProps {
  onNavigateTab: (tabId: string) => void;
}

// Map Supabase Session → SessionInfo shape used by SessionCard
function mapSessionToSessionInfo(session: Session): SessionInfo {
  const start = new Date(session.start_time);
  const now = new Date();
  const diffMs = start.getTime() - now.getTime();
  const diffH = Math.floor(diffMs / 3_600_000);
  const diffM = Math.floor((diffMs % 3_600_000) / 60_000);
  const countdown = diffMs > 0 ? `${diffH}h ${diffM}m` : 'Starting soon';
  const timeDisplay = start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return {
    id: session.id,
    title: session.title,
    speaker: session.coach_name ?? 'Build100',
    time: start.toTimeString().slice(0, 5),
    timeDisplay,
    countdown,
    description: session.description ?? 'Live Build100 training session.',
    category: session.session_type === 'Sales' ? 'SALES' : session.session_type === 'Content' ? 'CONTENT' : 'OFFER',
  };
}

function computeTrackProgress(modules: ModuleWithProgress[]): { name: string; progress: number; color: string }[] {
  const TRACKS = [
    { name: 'SALES',   slug: 'sales',   color: 'var(--brand-green-dark)' },
    { name: 'CONTENT', slug: 'content', color: 'var(--brand-lime-text)' },
    { name: 'OFFER',   slug: 'offer',   color: 'var(--accent-blue)' },
  ];
  return TRACKS.map(({ name, slug, color }) => {
    const trackMods = modules.filter(m => m.trackSlug === slug);
    const progress = trackMods.length > 0
      ? Math.round(trackMods.reduce((sum, m) => sum + m.progress, 0) / trackMods.length)
      : 0;
    return { name, progress, color };
  });
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateTab }) => {
  const { user, profile } = useAuth();

  const [modules, setModules]         = useState<ModuleWithProgress[]>([]);
  const [todayMetrics, setTodayMetrics]       = useState<BusinessMetric | null>(null);
  const [allTimeStats, setAllTimeStats]       = useState<AllTimeBusinessStats | null>(null);
  const [upcomingSession, setUpcomingSession] = useState<Session | null>(null);
  const [dataLoading, setDataLoading]         = useState(true);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    Promise.all([
      getAllModulesWithProgress(user.id),
      getMetricsForToday(user.id),
      getAllTimeMetrics(user.id),
      getUpcomingSession(),
    ]).then(([mods, today, allTime, upcoming]) => {
      setModules(mods);
      setTodayMetrics(today);
      setAllTimeStats(allTime);
      setUpcomingSession(upcoming);
    }).finally(() => setDataLoading(false));
  }, [user]);

  const trackProgress = computeTrackProgress(modules);
  const sessionToShow: SessionInfo = upcomingSession ? mapSessionToSessionInfo(upcomingSession) : sampleSessionData;

  // Real profile data or safe defaults
  const level       = profile?.level ?? 1;
  const xp          = profile?.xp ?? 0;
  const streakDays  = profile?.streak_days ?? 0;
  const displayName = profile?.full_name?.split(' ')[0] ?? 'Jason';

  // Business stats
  const totalClients  = allTimeStats?.totalClientsClosed ?? 0;
  const todayLeads    = todayMetrics?.leads ?? 0;
  const todayCalls    = todayMetrics?.sales_calls ?? 0;
  const todayClosed   = todayMetrics?.clients_closed ?? 0;
  const todayContent  = todayMetrics?.content_posted ?? 0;
  const todayHours    = todayMetrics?.hours_worked ?? 0;

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="dashboard-page layout-2col">
      {/* Left / Main Execution Stream */}
      <div className="dashboard-main">
        {/* Top Operating Header */}
        <div className="operator-hero-card skool-card">
          <div className="operator-top-row">
            <div className="operator-greeting-group">
              <span className="system-badge">BUILD100 OS</span>
              <h1 className="operator-greeting">{greeting}, {displayName}.</h1>
              {streakDays > 0 && <div className="operator-day-tag">Day {streakDays}.</div>}
            </div>

            <div className="current-priority-badge">
              <span className="priority-label">CURRENT PRIORITY</span>
              <span className="priority-val">SALES</span>
            </div>
          </div>

          <div className="operator-goal-banner">
            <p className="operator-goal-text">
              You are not here to finish courses. You are here to build 100 clients.
            </p>
          </div>

          {/* Compact Operating Principles */}
          <div className="operating-principles-row">
            <div className="principle-box primary">
              <span className="principle-sub">OPERATING PRINCIPLE</span>
              <span className="principle-text">WHO'S GOT MY MONEY?</span>
            </div>
            <div className="principle-box secondary">
              <span className="principle-sub">DISCIPLINE RULE</span>
              <span className="principle-text">WRITE IT DOWN. EXECUTE IT.</span>
            </div>
          </div>
        </div>

        {/* Today's Session Card */}
        <SessionCard session={sessionToShow} />

        {/* Daily Check-in Card */}
        <CheckInCard checkIn={sampleCheckInData} />

        {/* Cocky Status Message Callout */}
        <CockyMessageCard
          headline={sampleCockyMessage.headline}
          stats={sampleCockyMessage.stats}
          callout={sampleCockyMessage.callout}
        />

        {/* Curriculum Progress */}
        <div className="curriculum-progress-card skool-card">
          <div className="progress-card-header">
            <div className="header-left-title">
              <span className="section-label">CURRICULUM PROGRESS</span>
              <h3 className="sub-title">Skill Mastery Tracks</h3>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => onNavigateTab('classroom')}>
              <span>Open Classroom</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="progress-bars-stack">
            {dataLoading ? (
              <>
                <div className="skeleton-line" style={{ width: '100%' }} />
                <div className="skeleton-line" style={{ width: '80%' }} />
                <div className="skeleton-line" style={{ width: '60%' }} />
              </>
            ) : trackProgress.map((cat) => (
              <div key={cat.name} className="track-progress-row">
                <div className="track-info">
                  <span className="track-name">{cat.name}</span>
                  <span className="track-percentage">{cat.progress}%</span>
                </div>
                <ProgressBar
                  value={cat.progress}
                  color={cat.color}
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
        {/* Brand Summary Card */}
        <div className="brand-summary-card skool-card">
          <div className="brand-banner-img-wrap">
            <img src="/assets/saad-banner.png" alt="Build100 - Saad Mohamed" className="brand-banner-img" />
          </div>
          <div className="brand-summary-body">
            <h3 className="brand-title">Build100</h3>
            <p className="brand-url">build100.system/jason</p>
            <p className="brand-desc">
              We help you get 100 paying clients by fixing content, offer, and sales. Live training 6 days a week.
            </p>

            <div className="sidebar-stats-row">
              <div className="sidebar-stat">
                <span className="stat-num">{totalClients} / 100</span>
                <span className="stat-lbl">Clients</span>
              </div>
              <div className="sidebar-stat">
                <span className="stat-num">Level {level}</span>
                <span className="stat-lbl">XP: {xp.toLocaleString()}</span>
              </div>
              <div className="sidebar-stat">
                <span className="stat-num">{streakDays}</span>
                <span className="stat-lbl">Day Streak</span>
              </div>
            </div>

            <button className="btn btn-outline btn-sm sidebar-action-btn" onClick={() => onNavigateTab('about')}>
              PROGRAM OVERVIEW
            </button>
          </div>
        </div>

        {/* Execution vs Learning */}
        <ExecutionVsLearningCard
          learningPercent={trackProgress[0]?.progress ?? 0}
          applicationPercent={0}
          currentClients={totalClients}
          targetClients={100}
        />

        {/* Today's Business Metrics */}
        <TodayBusinessCard
          leadsToday={todayLeads}
          salesCalls={todayCalls}
          closed={todayClosed}
          contentPosted={{ current: todayContent, target: 8 }}
          workedHours={todayHours}
        />
      </aside>
    </div>
  );
};
