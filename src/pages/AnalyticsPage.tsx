// ============================================================
// BUILD100 — Phase 7: Analytics Page
//
// Operator-grade analytics dashboard.
// All numbers derived from real Supabase data.
// No fake metrics. No manufactured insights.
//
// Sections:
//   1. Header + Date Range Selector
//   2. Business Performance (metric cards)
//   3. Revenue Trend (SVG line chart)
//   4. Business Activity Trend (metric switcher + SVG chart)
//   5. Sales Funnel
//   6. Execution (Learning funnel + App breakdown + Exec/Learning ratio)
//   7. Goals
//   8. Weekly Consistency (intensity grid + numerical table)
//   9. Operating Signals (reuses Phase 6 engine)
//  10. Learning → Business Correlation (hidden if < 4 weeks)
//  11. Key Insights (max 5)
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../lib/auth/AuthContext';
import { loadAnalyticsSummary } from '../lib/analytics/analyticsEngine';
import { ProgressBar } from '../components/ProgressBar';
import { TrendingUp, TrendingDown, BarChart2, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type {
  AnalyticsDateRange,
  AnalyticsSummary,
  TrendPoint,
  PeriodValue,
  BusinessFunnel,
  LearningFunnel,
  WeeklyDataPoint,
  AnalyticsInsight,
  InsightSeverity,
  GoalAnalyticsItem,
} from '../lib/analytics/types';
import './AnalyticsPage.css';

// ── Date range config ─────────────────────────────────────────

const DATE_RANGES: { id: AnalyticsDateRange; label: string }[] = [
  { id: '7d',   label: '7 DAYS' },
  { id: '30d',  label: '30 DAYS' },
  { id: '90d',  label: '90 DAYS' },
  { id: 'year', label: 'THIS YEAR' },
  { id: 'all',  label: 'ALL TIME' },
];

// ── Formatting helpers ────────────────────────────────────────

function fmtINR(value: number): string {
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  if (value >= 1_000)   return `₹${(value / 1_000).toFixed(1)}K`;
  return `₹${value.toLocaleString('en-IN')}`;
}

function fmtNum(n: number): string {
  return n.toLocaleString();
}

function fmtHours(h: number): string {
  return `${h.toFixed(1)}h`;
}

function fmtRate(r: number | null): string {
  return r !== null ? `${r}%` : '—';
}


// ── Change indicator ──────────────────────────────────────────

function ChangeChip({ pv }: { pv: PeriodValue }) {
  if (pv.previous === null) {
    return <span className="change-chip change-na">ALL TIME</span>;
  }
  if (pv.changePct === null) {
    return <span className="change-chip change-na">No prev data</span>;
  }
  const up = pv.changePct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  const cls = up ? 'change-chip change-up' : 'change-chip change-down';
  const label = `${up ? '+' : ''}${pv.changePct}%`;
  return (
    <span className={cls}>
      <Icon size={10} />
      {label}
    </span>
  );
}

// ── SVG Line Chart ────────────────────────────────────────────

function LineChart({
  data,
  color = 'var(--brand-lime)',
  formatVal,
  emptyMsg = 'No data for this period',
}: {
  data: TrendPoint[];
  color?: string;
  formatVal: (v: number) => string;
  emptyMsg?: string;
}) {
  const nonEmpty = data.filter(d => d.value > 0);
  if (data.length === 0 || (nonEmpty.length === 0)) {
    return <div className="chart-empty">{emptyMsg}</div>;
  }
  if (data.length === 1) {
    return (
      <div className="chart-single-point">
        <span className="chart-sp-val">{formatVal(data[0].value)}</span>
        <span className="chart-sp-lbl">{data[0].label}</span>
      </div>
    );
  }

  const W = 800, H = 160;
  const PAD = { top: 16, right: 24, bottom: 36, left: 16 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  const vals = data.map(d => d.value);
  const maxV = Math.max(...vals, 1);
  const minV = 0; // always start y-axis at 0 for clarity

  const pts = data.map((d, i) => ({
    x: PAD.left + (i / Math.max(data.length - 1, 1)) * cw,
    y: PAD.top  + ch - ((d.value - minV) / (maxV - minV)) * ch,
    ...d,
  }));

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Filled area
  const areaD = `${pathD} L${pts[pts.length - 1].x.toFixed(1)},${(PAD.top + ch).toFixed(1)} L${PAD.left},${(PAD.top + ch).toFixed(1)} Z`;

  // X-axis labels (max ~7)
  const step = Math.max(1, Math.floor(pts.length / 7));
  const labelPts = pts.filter((_, i) => i % step === 0 || i === pts.length - 1);

  return (
    <div className="line-chart-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="line-chart-svg"
        aria-label="Trend chart"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => {
          const y = PAD.top + ch * (1 - frac);
          return (
            <line
              key={frac}
              x1={PAD.left} y1={y} x2={PAD.left + cw} y2={y}
              stroke="var(--border-light)" strokeWidth="1"
            />
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill={color} fillOpacity="0.08" />

        {/* Main line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data points */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill={color} stroke="var(--bg-card)" strokeWidth="1.5" />
            <title>{`${p.label}: ${formatVal(p.value)}`}</title>
          </g>
        ))}

        {/* X-axis labels */}
        {labelPts.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={H - 6}
            textAnchor="middle"
            fontSize="10"
            fill="var(--text-muted)"
            fontFamily="var(--font-family)"
          >
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ── Sales Funnel ──────────────────────────────────────────────

function FunnelChart({ funnel }: { funnel: BusinessFunnel }) {
  const maxVal = Math.max(funnel.leads, 1);
  const rows: { label: string; value: number; rate: number | null }[] = [
    { label: 'LEADS',        value: funnel.leads,          rate: null },
    { label: 'SALES CALLS',  value: funnel.sales_calls,    rate: funnel.lead_to_call_rate },
    { label: 'CLIENTS CLOSED', value: funnel.clients_closed, rate: funnel.call_to_client_rate },
  ];

  if (funnel.leads === 0 && funnel.sales_calls === 0 && funnel.clients_closed === 0) {
    return <div className="chart-empty">No activity data for this period.</div>;
  }

  return (
    <div className="funnel-chart">
      {rows.map((row, i) => (
        <div key={i} className="funnel-row-group">
          {i > 0 && row.rate !== null && (
            <div className="funnel-rate">
              <span className="funnel-arrow">↓</span>
              <span className="funnel-rate-val">{row.rate}%</span>
            </div>
          )}
          {i > 0 && row.rate === null && (
            <div className="funnel-rate">
              <span className="funnel-arrow">↓</span>
              <span className="funnel-rate-na">—</span>
            </div>
          )}
          <div className="funnel-bar-row">
            <div
              className="funnel-bar"
              style={{ width: `${(row.value / maxVal) * 100}%` }}
            />
            <span className="funnel-label">{row.label}</span>
            <span className="funnel-value">{fmtNum(row.value)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Learning Funnel ───────────────────────────────────────────

function LearningFunnelChart({ lf }: { lf: LearningFunnel }) {
  const rows = [
    { label: 'STARTED',   value: lf.started,   rate: null,                          color: 'var(--accent-blue)' },
    { label: 'COMPLETED', value: lf.completed,  rate: lf.started_to_completed_pct,   color: 'var(--accent-emerald)' },
    { label: 'APPLIED',   value: lf.applied,    rate: lf.completed_to_applied_pct,   color: 'var(--brand-lime)' },
    { label: 'EXECUTED',  value: lf.executed,   rate: lf.applied_to_executed_pct,    color: 'var(--accent-amber)' },
  ];

  const maxVal = Math.max(lf.started, 1);

  if (lf.started === 0) {
    return <div className="chart-empty">No lesson progress recorded yet.</div>;
  }

  return (
    <div className="learning-funnel">
      {rows.map((row, i) => (
        <div key={i} className="lf-row-group">
          {i > 0 && (
            <div className="lf-rate">
              <span className="lf-arrow">↓</span>
              <span className="lf-rate-val">{row.rate !== null ? `${row.rate}%` : '—'}</span>
            </div>
          )}
          <div className="lf-bar-row">
            <div className="lf-label">{row.label}</div>
            <div className="lf-bar-track">
              <div
                className="lf-bar-fill"
                style={{
                  width: `${(row.value / maxVal) * 100}%`,
                  backgroundColor: row.color,
                }}
              />
            </div>
            <div className="lf-value">{row.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Weekly consistency grid ───────────────────────────────────

type WeeklyMetricKey = 'leads' | 'sales_calls' | 'clients_closed' | 'revenue' | 'content_posted' | 'hours_worked';

const WEEKLY_METRIC_OPTIONS: { key: WeeklyMetricKey; label: string }[] = [
  { key: 'leads',          label: 'Leads' },
  { key: 'sales_calls',    label: 'Calls' },
  { key: 'clients_closed', label: 'Clients' },
  { key: 'revenue',        label: 'Revenue' },
  { key: 'content_posted', label: 'Content' },
  { key: 'hours_worked',   label: 'Hours' },
];

function WeeklyGrid({ weeks, metricKey }: { weeks: WeeklyDataPoint[]; metricKey: WeeklyMetricKey }) {
  if (weeks.length === 0) return <div className="chart-empty">No weekly data available.</div>;

  const vals = weeks.map(w => Number(w[metricKey]) || 0);
  const maxVal = Math.max(...vals, 1);

  function intensityClass(v: number): string {
    if (v === 0)             return 'wi-0';
    const pct = v / maxVal;
    if (pct < 0.25)          return 'wi-1';
    if (pct < 0.5)           return 'wi-2';
    if (pct < 0.75)          return 'wi-3';
    return 'wi-4';
  }

  const isRevenue = metricKey === 'revenue';
  const isHours   = metricKey === 'hours_worked';

  function fmt(v: number): string {
    if (isRevenue) return fmtINR(v);
    if (isHours)   return fmtHours(v);
    return String(v);
  }

  return (
    <div className="weekly-consistency">
      {/* GitHub-style grid */}
      <div className="weekly-grid">
        {weeks.map((w, i) => (
          <div key={i} className={`grid-cell ${intensityClass(vals[i])}`} title={`${w.week_label}: ${fmt(vals[i])}`}>
            <span className="grid-cell-label">{w.week_start.slice(5)}</span>
          </div>
        ))}
      </div>

      {/* Readable numerical table */}
      <div className="weekly-table-wrap">
        <table className="weekly-table">
          <thead>
            <tr>
              <th>WEEK</th>
              <th>LEADS</th>
              <th>CALLS</th>
              <th>CLIENTS</th>
              <th>REVENUE</th>
              <th>CONTENT</th>
              <th>HOURS</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w, i) => (
              <tr key={i}>
                <td className="week-label-cell">{w.week_label}</td>
                <td>{w.leads}</td>
                <td>{w.sales_calls}</td>
                <td>{w.clients_closed}</td>
                <td>{fmtINR(w.revenue)}</td>
                <td>{w.content_posted}</td>
                <td>{fmtHours(w.hours_worked)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Insight card ──────────────────────────────────────────────

function InsightCard({ insight }: { insight: AnalyticsInsight }) {
  const icons: Record<InsightSeverity, React.ReactNode> = {
    critical: <AlertTriangle size={14} />,
    warning:  <AlertTriangle size={14} />,
    positive: <CheckCircle  size={14} />,
    info:     <Info         size={14} />,
  };
  return (
    <div className={`insight-card insight-${insight.severity}`}>
      <div className="insight-icon">{icons[insight.severity]}</div>
      <div className="insight-body">
        <span className="insight-title">{insight.title}</span>
        <p className="insight-msg">{insight.message}</p>
      </div>
    </div>
  );
}

// ── Goal row ──────────────────────────────────────────────────

function GoalRow({ goal }: { goal: GoalAnalyticsItem }) {
  const signalColors: Record<string, string> = {
    ahead:    'var(--accent-emerald)',
    'on-track': 'var(--accent-blue)',
    behind:   'var(--accent-rose)',
    'no-data':'var(--text-muted)',
  };
  const signalLabels: Record<string, string> = {
    ahead: 'Ahead', 'on-track': 'On track', behind: 'Behind', 'no-data': '—',
  };

  const fmt = goal.goal_type === 'revenue' ? fmtINR : fmtNum;
  const unit = goal.unit ? ` ${goal.unit}` : '';

  return (
    <div className="goal-analytics-row">
      <div className="goal-ar-top">
        <span className="goal-ar-title">{goal.title}</span>
        <span
          className="goal-ar-signal"
          style={{ color: signalColors[goal.progress.trackSignal] }}
        >
          {signalLabels[goal.progress.trackSignal]}
        </span>
      </div>
      <ProgressBar
        value={goal.progress.progressPct}
        showPercent={false}
        height={5}
        color={signalColors[goal.progress.trackSignal]}
      />
      <div className="goal-ar-meta">
        <span>{fmt(goal.current_value)}{unit} / {fmt(goal.target_value)}{unit}</span>
        <span>{goal.progress.progressPct}%</span>
        {goal.progress.remainingDays !== null && (
          <span>{goal.progress.remainingDays}d left</span>
        )}
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="analytics-section">
      <h2 className="analytics-section-title">{title}</h2>
      {children}
    </section>
  );
}

// ── Main page ─────────────────────────────────────────────────

export const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [range, setRange] = useState<AnalyticsDateRange>('30d');
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityMetric, setActivityMetric] = useState<'leads' | 'sales_calls' | 'clients_closed' | 'content_posted' | 'hours_worked'>('leads');
  const [weeklyMetric, setWeeklyMetric] = useState<WeeklyMetricKey>('leads');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    loadAnalyticsSummary(user.id, range)
      .then(summary => setData(summary))
      .catch(() => setError('Failed to load analytics data.'))
      .finally(() => setLoading(false));
  }, [user, range]);

  const hasPrev = data?.previousPeriod !== null;
  void hasPrev; // referenced by ChangeChip indirectly; suppress unused-var

  // Metric cards config
  const metricCards = useMemo(() => {
    if (!data) return [];
    const bm = data.businessMetrics;
    return [
      { label: 'LEADS',        pv: bm.leads,          value: fmtNum(bm.leads.current),          icon: '📋' },
      { label: 'SALES CALLS',  pv: bm.sales_calls,    value: fmtNum(bm.sales_calls.current),    icon: '📞' },
      { label: 'CLIENTS',      pv: bm.clients_closed, value: fmtNum(bm.clients_closed.current), icon: '🤝' },
      { label: 'REVENUE',      pv: bm.revenue,        value: fmtINR(bm.revenue.current),        icon: '₹' },
      { label: 'CONTENT',      pv: bm.content_posted, value: fmtNum(bm.content_posted.current), icon: '📝' },
      { label: 'HOURS',        pv: bm.hours_worked,   value: fmtHours(bm.hours_worked.current), icon: '⏱' },
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="analytics-loading">
          <BarChart2 size={24} className="analytics-loading-icon" />
          <p>Loading analytics…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="analytics-page">
        <div className="analytics-error">{error ?? 'No data available.'}</div>
      </div>
    );
  }

  const activityTrendData = data.activityTrend[activityMetric];
  const activityFmtFn = activityMetric === ('revenue' as string)   ? fmtINR
                       : activityMetric === 'hours_worked' ? fmtHours
                       : fmtNum;

  return (
    <div className="analytics-page">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="analytics-hero">
        <div className="analytics-hero-inner">
          <div className="analytics-hero-text">
            <h1 className="analytics-title">ANALYTICS</h1>
            <p className="analytics-subtitle">See what the system is actually producing.</p>
          </div>
          {/* Date range selector */}
          <div className="analytics-range-bar">
            {DATE_RANGES.map(dr => (
              <button
                key={dr.id}
                className={`range-btn ${range === dr.id ? 'range-btn-active' : ''}`}
                onClick={() => setRange(dr.id)}
              >
                {dr.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Business Performance ───────────────────────── */}
      <Section title="BUSINESS PERFORMANCE">
        <p className="section-period">
          {data.currentPeriod.start} → {data.currentPeriod.end}
          {data.previousPeriod && (
            <span className="section-prev"> vs {data.previousPeriod.start} → {data.previousPeriod.end}</span>
          )}
          {!data.previousPeriod && <span className="section-prev"> — All time, no comparison period</span>}
        </p>
        <div className="metric-grid">
          {metricCards.map(card => (
            <div key={card.label} className="metric-card skool-card">
              <span className="metric-card-label">{card.label}</span>
              <span className="metric-card-value">{card.value}</span>
              <ChangeChip pv={card.pv} />
            </div>
          ))}
        </div>
        {data.businessMetrics.revenue_per_client !== null && (
          <div className="avg-revenue-chip">
            <span>AVG REVENUE / CLIENT</span>
            <strong>{fmtINR(data.businessMetrics.revenue_per_client)}</strong>
          </div>
        )}
      </Section>

      {/* ── Revenue Trend ──────────────────────────────── */}
      <Section title="REVENUE TREND">
        <LineChart
          data={data.revenueTrend}
          color="var(--brand-lime)"
          formatVal={fmtINR}
          emptyMsg="No revenue data for this period."
        />
      </Section>

      {/* ── Business Activity Trend ────────────────────── */}
      <Section title="BUSINESS ACTIVITY">
        <div className="activity-metric-bar">
          {(['leads', 'sales_calls', 'clients_closed', 'content_posted', 'hours_worked'] as const).map(key => (
            <button
              key={key}
              className={`activity-btn ${activityMetric === key ? 'activity-btn-active' : ''}`}
              onClick={() => setActivityMetric(key)}
            >
              {key === 'leads' ? 'Leads' : key === 'sales_calls' ? 'Calls' : key === 'clients_closed' ? 'Clients' : key === 'content_posted' ? 'Content' : 'Hours'}
            </button>
          ))}
        </div>
        <LineChart
          data={activityTrendData}
          color="var(--accent-blue)"
          formatVal={activityFmtFn}
          emptyMsg="No activity data for this period."
        />
      </Section>

      {/* ── Sales Funnel ───────────────────────────────── */}
      <Section title="SALES FUNNEL">
        <div className="two-col-layout">
          <div className="funnel-wrap">
            <FunnelChart funnel={data.funnel} />
          </div>
          <div className="funnel-stats-col">
            <div className="funnel-stat-item">
              <span className="fsi-label">LEAD → CALL RATE</span>
              <span className="fsi-value">{fmtRate(data.funnel.lead_to_call_rate)}</span>
            </div>
            <div className="funnel-stat-item">
              <span className="fsi-label">CALL → CLIENT RATE</span>
              <span className="fsi-value">{fmtRate(data.funnel.call_to_client_rate)}</span>
            </div>
            <div className="funnel-stat-item">
              <span className="fsi-label">LEAD → CLIENT RATE</span>
              <span className="fsi-value">{fmtRate(data.funnel.lead_to_client_rate)}</span>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Execution ──────────────────────────────────── */}
      <Section title="EXECUTION">
        <div className="execution-layout">

          {/* Learning Funnel */}
          <div className="exec-block skool-card">
            <span className="exec-block-title">LEARNING FUNNEL</span>
            <LearningFunnelChart lf={data.learningFunnel} />
            <div className="lf-extra-stats">
              <div className="lf-stat"><span>Failed Apps</span><strong>{data.learningFunnel.failed_apps}</strong></div>
              <div className="lf-stat"><span>Skipped</span><strong>{data.learningFunnel.skipped_apps}</strong></div>
            </div>
          </div>

          {/* Application breakdown */}
          <div className="exec-block skool-card">
            <span className="exec-block-title">APPLICATION OUTCOMES</span>
            {data.applicationBreakdown.total_records === 0 ? (
              <p className="exec-empty">No application records yet.</p>
            ) : (
              <>
                <div className="app-outcome-row"><span>Not Started</span><strong>{data.applicationBreakdown.not_started}</strong></div>
                <div className="app-outcome-row"><span>In Progress</span><strong>{data.applicationBreakdown.in_progress}</strong></div>
                <div className="app-outcome-row outcome-green"><span>Completed</span><strong>{data.applicationBreakdown.completed}</strong></div>
                <div className="app-outcome-row outcome-red"><span>Failed</span><strong>{data.applicationBreakdown.failed}</strong></div>
                <div className="app-outcome-row"><span>Skipped</span><strong>{data.applicationBreakdown.skipped}</strong></div>
                <div className="app-rate-chip">
                  <span>APPLICATION RATE</span>
                  <strong>
                    {data.applicationBreakdown.application_rate !== null
                      ? `${data.applicationBreakdown.application_rate}%`
                      : 'No completed lessons yet'}
                  </strong>
                </div>
                <p className="app-rate-note">
                  Applied lessons / completed lessons
                </p>
              </>
            )}
          </div>

          {/* Exec / Learning Ratio */}
          <div className="exec-block skool-card">
            <span className="exec-block-title">EXECUTION / LEARNING RATIO</span>
            <div className="ratio-big">
              {data.executionLearning.execution_learning_ratio !== null
                ? <><span className="ratio-num">{data.executionLearning.execution_learning_ratio}</span><span className="ratio-unit">x</span></>
                : <span className="ratio-empty">No completed lessons yet</span>
              }
            </div>
            <div className="ratio-breakdown">
              <div className="ratio-row">
                <span>Execution actions</span>
                <strong>{data.executionLearning.execution_actions}</strong>
              </div>
              <div className="ratio-row">
                <span>Completed lessons (all-time)</span>
                <strong>{data.executionLearning.all_time_completed_lessons}</strong>
              </div>
              <div className="ratio-row">
                <span>Hours worked (period)</span>
                <strong>{fmtHours(data.executionLearning.hours_worked)}</strong>
              </div>
            </div>
            <p className="ratio-note">
              Execution actions = leads + calls + clients + content.
              Hours tracked separately. This is a directional activity ratio, not a productivity score.
            </p>
          </div>

        </div>
      </Section>

      {/* ── Goals ──────────────────────────────────────── */}
      <Section title="GOALS">
        <div className="goals-summary-chips">
          <span className="goals-chip"><strong>{data.goalAnalytics.active_count}</strong> Active</span>
          <span className="goals-chip"><strong>{data.goalAnalytics.completed_count}</strong> Completed</span>
          <span className="goals-chip"><strong>{data.goalAnalytics.paused_count}</strong> Paused</span>
          <span className="goals-chip"><strong>{data.goalAnalytics.abandoned_count}</strong> Abandoned</span>
        </div>

        {data.goalAnalytics.active.length === 0 ? (
          <div className="chart-empty">No active goals. Set goals in the Business page.</div>
        ) : (
          <div className="goal-analytics-list">
            {data.goalAnalytics.active.map(g => <GoalRow key={g.id} goal={g} />)}
          </div>
        )}
      </Section>

      {/* ── Weekly Consistency ─────────────────────────── */}
      <Section title="WEEKLY CONSISTENCY">
        <p className="section-subtitle-sm">Last {data.weeklyData.length} complete weeks.</p>
        {/* Metric selector */}
        <div className="weekly-metric-bar">
          {WEEKLY_METRIC_OPTIONS.map(opt => (
            <button
              key={opt.key}
              className={`weekly-metric-btn ${weeklyMetric === opt.key ? 'wmb-active' : ''}`}
              onClick={() => setWeeklyMetric(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <WeeklyGrid weeks={data.weeklyData} metricKey={weeklyMetric} />
      </Section>

      {/* ── Learning → Business Correlation ───────────── */}
      {!data.correlation.insufficient_data ? (
        <Section title="LEARNING → BUSINESS">
          <p className="section-subtitle-sm">
            Do periods with more application activity correspond with stronger business outcomes?
            Based on {data.correlation.weeks_available} week{data.correlation.weeks_available !== 1 ? 's' : ''} of data.
            {data.correlation.applications_vs_revenue?.is_limited_data && (
              <span className="corr-limited"> (Limited data — 4–7 weeks)</span>
            )}
          </p>

          <div className="correlation-grid">
            {data.correlation.applications_vs_revenue && (
              <div className="corr-card skool-card">
                <span className="corr-pair">Application activity vs Revenue</span>
                <span className={`corr-strength corr-${data.correlation.applications_vs_revenue.strength}`}>
                  {data.correlation.applications_vs_revenue.strength.replace('-', ' ')}
                </span>
                <span className="corr-r">r = {data.correlation.applications_vs_revenue.r}</span>
                <p className="corr-desc">{data.correlation.applications_vs_revenue.description}</p>
              </div>
            )}
            {data.correlation.applications_vs_clients && (
              <div className="corr-card skool-card">
                <span className="corr-pair">Application activity vs Clients</span>
                <span className={`corr-strength corr-${data.correlation.applications_vs_clients.strength}`}>
                  {data.correlation.applications_vs_clients.strength.replace('-', ' ')}
                </span>
                <span className="corr-r">r = {data.correlation.applications_vs_clients.r}</span>
                <p className="corr-desc">{data.correlation.applications_vs_clients.description}</p>
              </div>
            )}
          </div>

          <p className="corr-disclaimer">
            Correlation is not causation. These observations describe patterns in the data, not causal relationships.
          </p>
        </Section>
      ) : (
        <Section title="LEARNING → BUSINESS">
          <div className="chart-empty">
            Not enough historical data for correlation analysis. ({data.correlation.weeks_available} week{data.correlation.weeks_available !== 1 ? 's' : ''} available, minimum 4 required.)
          </div>
        </Section>
      )}

      {/* ── Key Insights ───────────────────────────────── */}
      {data.insights.length > 0 && (
        <Section title="KEY INSIGHTS">
          <div className="insights-list">
            {data.insights.map(i => <InsightCard key={i.id} insight={i} />)}
          </div>
        </Section>
      )}

      {data.insights.length === 0 && (
        <Section title="KEY INSIGHTS">
          <div className="chart-empty">
            No significant patterns detected yet. Keep entering business data to unlock insights.
          </div>
        </Section>
      )}

    </div>
  );
};
