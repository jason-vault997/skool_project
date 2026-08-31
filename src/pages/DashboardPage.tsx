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

  // Business stats
  const totalClients  = allTimeStats?.totalClientsClosed ?? 0;
  const todayLeads    = todayMetrics?.leads ?? 0;
  const todayCalls    = todayMetrics?.sales_calls ?? 0;
  const todayClosed   = todayMetrics?.clients_closed ?? 0;
  const todayContent  = todayMetrics?.content_posted ?? 0;
  const todayHours    = todayMetrics?.hours_worked ?? 0;

  // Cocky randomized greeting pool — changes every dashboard load
  const greeting = (() => {
    const month = new Date().getMonth() + 1; // 1-12

    const general = [
      'Jason, enough excuses.', 'Jason, clock\'s ticking.', 'Jason, no bullshit.',
      'Jason, move.', 'Jason, lock in.', 'Jason, execute.', 'Jason, build.',
      'Jason, prove it.', 'Jason, fix this.', 'Jason, back to work.',
      'Jason, we\'re building.', 'Jason, get serious.', 'Jason, stop negotiating.',
      'Jason, make it count.', 'Jason, go earn it.', 'Jason, no mercy.',
      'Jason, stay dangerous.', 'Jason, quit stalling.', 'Jason, make them nervous.',
      'Jason, let\'s cause problems.', 'Jason, ship something.', 'Jason, enough planning.',
      'Jason, we\'re not done.', 'Jason, time\'s expensive.', 'Jason, don\'t waste this.',
      'Jason, use it.', 'Jason, don\'t blink.', 'Jason, turn it around.',
      'Jason, make the comeback.', 'Jason, you\'ve got one job.', 'Jason, finish strong.',
      'Jason, clean it up.', 'Jason, now we work.', 'Jason, let\'s clean house.',
      'Jason, make today useful.', 'Jason, we\'re cooking.', 'Jason, make today hurt.',
      'Jason, execution time.', 'Jason, your future\'s watching.', 'Jason, the clock noticed.',
      'Jason, stop dreaming.', 'Jason, earn it.', 'Jason, close something.',
      'Jason, dial.', 'Jason, pitch.', 'Jason, collect.', 'Jason, you know the drill.',
      'Jason, time to collect.', 'Jason, don\'t fold.', 'Jason, stay sharp.',
      'Jason, stop waiting.', 'Jason, we built this.', 'Jason, keep building.',
      'Jason, no soft days.', 'Jason, make the call.', 'Jason, close the gap.',
      'Jason, we\'re on the clock.', 'Jason, be relentless.', 'Jason, show up.',
      'Jason, do the work.', 'Jason, run it.', 'Jason, stack the wins.',
    ];

    const monthly: Record<number, string[]> = {
      9: [
        'Jason, four months.', 'Jason, September\'s yours.', 'Jason, start the comeback.',
        'Jason, September isn\'t waiting.', 'Jason, don\'t waste September.',
        'Jason, four months. Move.', 'Jason, four months. That\'s enough.',
        'Jason, make the next four count.', 'Jason, we\'ve got September.',
        'Jason, September. Lock in.', 'Jason, four months left. Use them.',
      ],
      10: [
        'Jason, three months.', 'Jason, October won\'t wait.', 'Jason, clock\'s getting loud.',
        'Jason, three months. Execute.', 'Jason, October means business.',
        'Jason, don\'t waste October.', 'Jason, three months to prove it.',
        'Jason, October. No mercy.', 'Jason, Q4. Lock in.',
      ],
      11: [
        'Jason, two months.', 'Jason, November means business.', 'Jason, we\'re running out.',
        'Jason, two months. Close.', 'Jason, don\'t waste November.',
        'Jason, November. No excuses.', 'Jason, two months to finish this.',
        'Jason, November. Final sprint.', 'Jason, the year is almost done.',
      ],
      12: [
        'Jason, last lap.', 'Jason, finish the job.', 'Jason, don\'t waste December.',
        'Jason, one month. Final push.', 'Jason, close out the year.',
        'Jason, December. Make it count.', 'Jason, last chance this year.',
        'Jason, end strong.', 'Jason, December. No regrets.', 'Jason, finish what you started.',
      ],
    };

    const pool = [...general, ...(monthly[month] ?? [])];
    const lastKey = 'build100_last_greeting';
    const last = sessionStorage.getItem(lastKey) ?? '';
    const available = pool.filter(g => g !== last);
    const chosen = available[Math.floor(Math.random() * available.length)];
    sessionStorage.setItem(lastKey, chosen);
    return chosen;
  })();

  return (
    <div className="dashboard-page layout-2col">
      {/* Left / Main Execution Stream */}
      <div className="dashboard-main">
        {/* Top Operating Header */}
        <div className="operator-hero-card skool-card">
          <div className="operator-top-row">
            <div className="operator-greeting-group">
              <span className="system-badge">BUILD100 OS</span>
              <h1 className="operator-greeting">{greeting}</h1>
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
