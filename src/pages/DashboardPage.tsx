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
import { getApplicationStats, ApplicationStats } from '../lib/data/applicationRecords';
import { getTopGoal, getGoalCurrentValue } from '../lib/data/businessGoals';
import { getLastCompletedReview } from '../lib/data/weeklyReviews';
import { calculateGoalProgress, TRACK_SIGNAL_LABELS } from '../lib/business/goalProgress';
import { getMomentumSummary } from '../lib/analytics/businessAnalytics';
import {
  sampleCheckInData,
  sampleCockyMessage,
  sampleSessionData,
} from '../data/sampleData';
import type { Session, ModuleWithProgress, BusinessMetric, AllTimeBusinessStats, BusinessGoal, WeeklyReview } from '../lib/supabase/types';
import type { GoalProgressResult } from '../lib/business/goalProgress';
import type { SessionInfo } from '../data/sampleData';
import { ArrowRight, TrendingUp, TrendingDown, Minus, BarChart2 } from 'lucide-react';
import type { MomentumSummary } from '../lib/analytics/types';
import { loadIntelligence } from '../lib/intelligence/intelligenceEngine';
import type { OperatorIntelligence } from '../lib/intelligence/intelligenceTypes';
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

  const [modules, setModules]                 = useState<ModuleWithProgress[]>([]);
  const [todayMetrics, setTodayMetrics]       = useState<BusinessMetric | null>(null);
  const [allTimeStats, setAllTimeStats]       = useState<AllTimeBusinessStats | null>(null);
  const [upcomingSession, setUpcomingSession] = useState<Session | null>(null);
  const [appStats, setAppStats]               = useState<ApplicationStats | null>(null);
  const [dataLoading, setDataLoading]         = useState(true);
  // Phase 6: top goal + last weekly review
  const [topGoal, setTopGoal]                 = useState<BusinessGoal | null>(null);
  const [topGoalProgress, setTopGoalProgress] = useState<GoalProgressResult | null>(null);
  const [lastReview, setLastReview]           = useState<WeeklyReview | null>(null);
  // Phase 7: 30-day momentum for sidebar card
  const [momentum, setMomentum]               = useState<MomentumSummary | null>(null);
  // Phase 8: operator intelligence strip (non-blocking, loads independently)
  const [intel, setIntel]                     = useState<OperatorIntelligence | null>(null);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    Promise.all([
      getAllModulesWithProgress(user.id),
      getMetricsForToday(user.id),
      getAllTimeMetrics(user.id),
      getUpcomingSession(),
      getApplicationStats(user.id),
      getTopGoal(user.id),
      getLastCompletedReview(user.id),
    ]).then(async ([mods, today, allTime, upcoming, apps, goal, review]) => {
      setModules(mods);
      setTodayMetrics(today);
      setAllTimeStats(allTime);
      setUpcomingSession(upcoming);
      setAppStats(apps);
      setLastReview(review);
      if (goal) {
        setTopGoal(goal);
        const cv = await getGoalCurrentValue(user.id, goal);
        setTopGoalProgress(calculateGoalProgress(goal, cv));
      }
    }).finally(() => setDataLoading(false));

    // Load momentum summary independently (lightweight, separate from main data)
    getMomentumSummary(user.id).then(setMomentum).catch(() => {/* ignore */});

    // Load intelligence strip independently — non-blocking, does not affect main render
    loadIntelligence(user.id).then(setIntel).catch(() => {/* ignore — strip simply won't show */});
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
              <span className="priority-val">
                {topGoal ? topGoal.title : 'SALES'}
              </span>
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

        {/* Execution vs Learning — now with real application % */}
        <ExecutionVsLearningCard
          learningPercent={trackProgress[0]?.progress ?? 0}
          applicationPercent={appStats?.applicationPercent ?? 0}
          currentClients={totalClients}
          targetClients={100}
        />

        {/* Phase 6: Top Active Goal card */}
        {!dataLoading && topGoal && topGoalProgress && (
          <div className="dash-goal-card skool-card">
            <span className="dash-goal-header">TOP GOAL</span>
            <p className="dash-goal-title">{topGoal.title}</p>
            <div className="dash-goal-progress-row">
              <ProgressBar
                value={topGoalProgress.progressPct}
                color={topGoalProgress.trackSignal === 'behind' ? 'var(--accent-rose)' :
                       topGoalProgress.trackSignal === 'ahead'  ? 'var(--accent-emerald)' :
                       'var(--brand-green-dark)'}
                height={5}
                showPercent={false}
              />
              <div className="dash-goal-meta">
                <span className="dash-goal-pct">{topGoalProgress.progressPct}%</span>
                {topGoalProgress.trackSignal !== 'no-data' && (
                  <span className={`dash-goal-signal signal-${topGoalProgress.trackSignal}`}>
                    {topGoalProgress.trackSignal === 'ahead'    ? <TrendingUp  size={10} /> :
                     topGoalProgress.trackSignal === 'behind'   ? <TrendingDown size={10} /> :
                     <Minus size={10} />}
                    {TRACK_SIGNAL_LABELS[topGoalProgress.trackSignal]}
                  </span>
                )}
              </div>
            </div>
            {topGoal.target_date && (
              <span className="dash-goal-date">
                Target: {new Date(topGoal.target_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>
        )}

        {/* Phase 6: This week's priority from last completed review */}
        {!dataLoading && lastReview?.next_week_priority && (
          <div className="dash-priority-card skool-card">
            <span className="dash-priority-header">THIS WEEK'S PRIORITY</span>
            <p className="dash-priority-text">"{lastReview.next_week_priority}"</p>
            <span className="dash-priority-source">↑ From weekly review</span>
          </div>
        )}

        {/* Execution Pulse — application behavior stats */}
        {!dataLoading && appStats && (appStats.totalApplied > 0 || appStats.dueForReview > 0) && (
          <div className="execution-pulse-card skool-card">
            <span className="ep-header">EXECUTION PULSE</span>
            <div className="ep-stats">
              <div className="ep-stat">
                <span className="ep-num">{appStats.totalApplied}</span>
                <span className="ep-lbl">Applied</span>
              </div>
              <div className="ep-stat">
                <span className="ep-num">{appStats.totalCompleted}</span>
                <span className="ep-lbl">Completed</span>
              </div>
              <div className="ep-stat">
                <span className="ep-num">{appStats.totalResults}</span>
                <span className="ep-lbl">Results</span>
              </div>
              {appStats.dueForReview > 0 && (
                <div className="ep-stat ep-stat-alert">
                  <span className="ep-num">{appStats.dueForReview}</span>
                  <span className="ep-lbl">Due Review</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Phase 7: 30-day business momentum card */}
        {momentum && momentum.has_data && (
          <div className="dash-momentum-card skool-card">
            <div className="dm-header">
              <BarChart2 size={12} />
              <span className="dm-title">30-DAY MOMENTUM</span>
            </div>
            <div className="dm-stats">
              <div className="dm-stat">
                <span className="dm-lbl">Revenue</span>
                <div className="dm-val-row">
                  <span className="dm-val">
                    {momentum.revenue_current >= 100_000
                      ? `₹${(momentum.revenue_current / 100_000).toFixed(1)}L`
                      : momentum.revenue_current >= 1_000
                        ? `₹${(momentum.revenue_current / 1_000).toFixed(1)}K`
                        : `₹${momentum.revenue_current}`}
                  </span>
                  {momentum.revenue_change_pct !== null && (
                    <span className={`dm-chg ${momentum.revenue_change_pct >= 0 ? 'dm-chg-up' : 'dm-chg-dn'}`}>
                      {momentum.revenue_change_pct >= 0
                        ? <TrendingUp size={9} />
                        : <TrendingDown size={9} />}
                      {momentum.revenue_change_pct > 0 ? '+' : ''}{momentum.revenue_change_pct}%
                    </span>
                  )}
                </div>
              </div>
              <div className="dm-stat">
                <span className="dm-lbl">Clients</span>
                <div className="dm-val-row">
                  <span className="dm-val">{momentum.clients_current}</span>
                  {momentum.clients_change !== 0 && (
                    <span className={`dm-chg ${momentum.clients_change > 0 ? 'dm-chg-up' : 'dm-chg-dn'}`}>
                      {momentum.clients_change > 0
                        ? <TrendingUp size={9} />
                        : <TrendingDown size={9} />}
                      {momentum.clients_change > 0 ? '+' : ''}{momentum.clients_change}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              className="dm-link"
              onClick={() => onNavigateTab('analytics')}
            >
              Full Analytics
              <ArrowRight size={11} />
            </button>
          </div>
        )}

        {/* Phase 8: Intelligence Strip — additive widget linking to Operator tab */}
        {intel && !intel.is_empty && (
          <div className="dash-intel-strip skool-card">
            <div className="dis-header">
              <span className="dis-label">OPERATOR INTELLIGENCE</span>
              <button className="dis-link" onClick={() => onNavigateTab('operator')}>
                Open Operator <ArrowRight size={11} />
              </button>
            </div>
            <div className="dis-priority">
              <span className={`dis-badge dis-badge-${intel.priority.urgency}`}>
                {intel.priority.urgency.toUpperCase()}
              </span>
              <span className="dis-priority-name">{intel.priority.priority.replace(/_/g, ' ')}</span>
            </div>
            <p className="dis-bottleneck">
              <span className="dis-bottleneck-label">Bottleneck: </span>
              {intel.bottleneck.bottleneck_type.replace(/_/g, ' ')}
            </p>
            <p className="dis-action">{intel.action.action_text.slice(0, 120)}{intel.action.action_text.length > 120 ? '…' : ''}</p>
            {intel.commitments.overdue > 0 && (
              <div className="dis-overdue">
                <span className="dis-overdue-badge">{intel.commitments.overdue} OVERDUE</span>
                <span className="dis-overdue-msg">commitment{intel.commitments.overdue > 1 ? 's' : ''} need action</span>
              </div>
            )}
          </div>
        )}

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
