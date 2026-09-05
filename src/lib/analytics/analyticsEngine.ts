// ============================================================
// BUILD100 — Phase 7: Analytics Engine (Main Orchestrator)
//
// Single entry point: loadAnalyticsSummary(userId, range)
// Batch-fetches all data, computes all analytics modules,
// generates insights, and returns AnalyticsSummary.
//
// Correlation:
//   < 4 weeks   → insufficient_data = true, no calculation
//   4–7 weeks   → calculated, is_limited_data = true
//   8+ weeks    → normal
//   12+ weeks   → preferred
//
// Language rule: NEVER say "X caused Y". Always say
// "these metrics moved together across N weeks" or equivalent.
//
// Insight priorities (highest first):
//   1. critical — major business declines (period-over-period evidence)
//   2. warning  — goal risks, execution gaps (evidence-based thresholds)
//   3. positive — strong momentum
//   4. info     — learning/application gaps, patterns
//
// Zero-client insight rule:
//   Only surface when sales_calls >= 5 in the period AND clients = 0.
//   0 clients + 0 calls = no conversion data, no insight shown.
//
// High-hours / low-output rule:
//   Only fire when hours_worked increased period-over-period
//   AND at least one output metric (leads/calls/clients/content) declined.
//   Never use absolute hour thresholds.
// ============================================================

import { supabase } from '../supabase/client';
import { getDateRange, getPreviousPeriod, getLastNWeeks } from './dateRanges';
import { getBusinessAnalytics } from './businessAnalytics';
import { fetchLearningRawData, calculateLearningFunnel, calculateApplicationBreakdown } from './learningAnalytics';
import { calculateExecutionLearning } from './executionAnalytics';
import { getGoalAnalytics } from './goalAnalytics';
import type {
  AnalyticsDateRange,
  AnalyticsSummary,
  WeeklyDataPoint,
  DetectedPattern,
  LearningBusinessCorrelation,
  CorrelationResult,
  CorrelationStrength,
  AnalyticsInsight,
  InsightSeverity,
} from './types';

// ── Pearson correlation ───────────────────────────────────────

function pearsonR(x: number[], y: number[]): number | null {
  const n = x.length;
  if (n < 2) return null;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0, denomX = 0, denomY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num    += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  if (denom === 0) return null;
  return Math.max(-1, Math.min(1, num / denom));
}

function interpretR(r: number): CorrelationStrength {
  const a = Math.abs(r);
  if (a >= 0.7) return r > 0 ? 'strong-positive'   : 'strong-negative';
  if (a >= 0.4) return r > 0 ? 'moderate-positive'  : 'moderate-negative';
  if (a >= 0.2) return r > 0 ? 'weak-positive'      : 'weak-negative';
  return 'neutral';
}

function buildCorrelationResult(
  xLabel: string,
  yLabel: string,
  x: number[],
  y: number[],
  n: number
): CorrelationResult | null {
  const r = pearsonR(x, y);
  if (r === null) return null;
  const strength = interpretR(r);
  const isLimited = n < 8;

  const dirWord = r > 0.2 ? 'moved together' : r < -0.2 ? 'moved in opposite directions' : 'showed no clear relationship';
  const conf    = isLimited ? 'Based on limited data: ' : '';
  const description = `${conf}${xLabel} and ${yLabel} ${dirWord} across ${n} week${n !== 1 ? 's' : ''}.`;

  return { r: Math.round(r * 100) / 100, n, strength, description, is_limited_data: isLimited };
}

// ── Weekly data from business_metrics ────────────────────────


async function fetchWeeklyBusinessData(userId: string, n: number): Promise<WeeklyDataPoint[]> {
  const weeks = getLastNWeeks(n);
  if (weeks.length === 0) return [];

  const oldest = weeks[0].weekStart;
  const newest = weeks[weeks.length - 1].weekEnd;

  const [metricResult, appResult] = await Promise.all([
    supabase
      .from('business_metrics')
      .select('date, leads, sales_calls, clients_closed, revenue, content_posted, hours_worked')
      .eq('user_id', userId)
      .gte('date', oldest)
      .lte('date', newest)
      .order('date', { ascending: true }),
    supabase
      .from('application_records')
      .select('updated_at, status')
      .eq('user_id', userId)
      .in('status', ['In Progress', 'Completed', 'Failed']),
  ]);

  type MetricRow = {
    date: string;
    leads: number;
    sales_calls: number;
    clients_closed: number;
    revenue: number;
    content_posted: number;
    hours_worked: number;
  };

  const metricRows = (metricResult.data ?? []) as MetricRow[];
  const appRows = (appResult.data ?? []) as { updated_at: string; status: string }[];

  // Build app counts per week
  const appCountMap = new Map<string, number>();
  for (const row of appRows) {
    const dateStr = row.updated_at.split('T')[0];
    // Find which week this belongs to
    for (const w of weeks) {
      if (dateStr >= w.weekStart && dateStr <= w.weekEnd) {
        appCountMap.set(w.weekStart, (appCountMap.get(w.weekStart) ?? 0) + 1);
        break;
      }
    }
  }

  return weeks.map(w => {
    const weekMetrics = metricRows.filter(r => r.date >= w.weekStart && r.date <= w.weekEnd);
    const totals = weekMetrics.reduce(
      (acc, r) => ({
        leads:          acc.leads          + (r.leads          ?? 0),
        sales_calls:    acc.sales_calls    + (r.sales_calls    ?? 0),
        clients_closed: acc.clients_closed + (r.clients_closed ?? 0),
        revenue:        acc.revenue        + Number(r.revenue  ?? 0),
        content_posted: acc.content_posted + (r.content_posted ?? 0),
        hours_worked:   acc.hours_worked   + Number(r.hours_worked ?? 0),
      }),
      { leads: 0, sales_calls: 0, clients_closed: 0, revenue: 0, content_posted: 0, hours_worked: 0 }
    );

    return {
      week_start:          w.weekStart,
      week_end:            w.weekEnd,
      week_label:          w.label,
      ...totals,
      applications_active: appCountMap.get(w.weekStart) ?? 0,
    };
  });
}

// ── Pattern detection ─────────────────────────────────────────

function detectPatterns(weeks: WeeklyDataPoint[]): DetectedPattern[] {
  if (weeks.length < 3) return [];

  const patterns: DetectedPattern[] = [];
  const metrics: Array<{ key: keyof WeeklyDataPoint; label: string }> = [
    { key: 'leads',          label: 'Leads' },
    { key: 'sales_calls',    label: 'Sales calls' },
    { key: 'clients_closed', label: 'Clients closed' },
    { key: 'content_posted', label: 'Content posted' },
    { key: 'hours_worked',   label: 'Hours worked' },
    { key: 'revenue',        label: 'Revenue' },
  ];

  for (const { key, label } of metrics) {
    const vals = weeks.map(w => Number(w[key]) || 0);
    const last3 = vals.slice(-3);

    const allUp   = last3[0] < last3[1] && last3[1] < last3[2];
    const allDown = last3[0] > last3[1] && last3[1] > last3[2];

    if (allUp) {
      patterns.push({
        id:        `${key}-increasing`,
        metric:    key,
        direction: 'increasing',
        weeks:     3,
        message:   `${label} increased for 3 consecutive weeks.`,
      });
    } else if (allDown) {
      patterns.push({
        id:        `${key}-decreasing`,
        metric:    key,
        direction: 'decreasing',
        weeks:     3,
        message:   `${label} decreased for 3 consecutive weeks.`,
      });
    }
  }

  // Diverging: content up but leads flat/down
  if (weeks.length >= 4) {
    const recent4 = weeks.slice(-4);
    const contentTrend  = recent4.map(w => w.content_posted);
    const leadsTrend    = recent4.map(w => w.leads);
    const contentUp = contentTrend[contentTrend.length - 1] > contentTrend[0] * 1.2;
    const leadsFlat = Math.abs(leadsTrend[leadsTrend.length - 1] - leadsTrend[0]) < 1;
    if (contentUp && leadsFlat) {
      patterns.push({
        id:        'content-lead-diverge',
        metric:    'diverging',
        direction: 'diverging',
        weeks:     4,
        message:   `Content increased over the last 4 weeks while leads remained roughly flat.`,
      });
    }
  }

  return patterns;
}

// ── Correlation calculation ───────────────────────────────────

function buildCorrelation(weeks: WeeklyDataPoint[]): LearningBusinessCorrelation {
  const n = weeks.length;

  if (n < 4) {
    return {
      applications_vs_revenue:            null,
      applications_vs_clients:            null,
      lessons_vs_activity:                null,
      insufficient_data:                  true,
      weeks_available:                    n,
    };
  }

  const appX     = weeks.map(w => w.applications_active);
  const revenueY = weeks.map(w => w.revenue);
  const clientsY = weeks.map(w => w.clients_closed);

  // lessons_vs_activity: we don't have per-week lesson data here so skip that pair
  // (it would require extra queries; we'll return null for that metric)

  return {
    applications_vs_revenue: buildCorrelationResult(
      'Application activity', 'revenue', appX, revenueY, n
    ),
    applications_vs_clients: buildCorrelationResult(
      'Application activity', 'clients closed', appX, clientsY, n
    ),
    lessons_vs_activity: null, // per-week lesson completion data not available without extra query
    insufficient_data:   false,
    weeks_available:     n,
  };
}

// ── Insight engine ────────────────────────────────────────────

function makeInsight(
  id: string,
  category: AnalyticsInsight['category'],
  severity: InsightSeverity,
  title: string,
  message: string
): AnalyticsInsight {
  return { id, category, severity, title, message };
}

const SEVERITY_ORDER: Record<InsightSeverity, number> = {
  critical: 0,
  warning:  1,
  positive: 2,
  info:     3,
};

function generateInsights(
  summary: Omit<AnalyticsSummary, 'insights'>
): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = [];
  const bm = summary.businessMetrics;
  const lf = summary.learningFunnel;
  const ex = summary.executionLearning;
  const ga = summary.goalAnalytics;
  const hasPrev = summary.previousPeriod !== null;

  // ── Critical ─────────────────────────────────────────────

  // Revenue down >20% (only with prior data)
  if (hasPrev && bm.revenue.changePct !== null && bm.revenue.changePct <= -20) {
    insights.push(makeInsight(
      'revenue-down',
      'business',
      'critical',
      'REVENUE IS DOWN SIGNIFICANTLY',
      `Revenue is down ${Math.abs(bm.revenue.changePct)}% versus the previous period.`
    ));
  }

  // Zero clients with meaningful call activity (>= 5 calls)
  if (bm.clients_closed.current === 0 && bm.sales_calls.current >= 5) {
    insights.push(makeInsight(
      'zero-conversion',
      'business',
      'critical',
      'NO CLIENTS CLOSED',
      `${bm.sales_calls.current} sales calls were made but 0 clients were closed. Conversion is a current bottleneck.`
    ));
  }

  // ── Warnings ──────────────────────────────────────────────

  // Goals behind schedule (critical/high priority)
  const atRiskGoals = ga.active.filter(
    g => g.progress.trackSignal === 'behind' &&
         (g.priority === 'critical' || g.priority === 'high')
  );
  if (atRiskGoals.length > 0) {
    const names = atRiskGoals.map(g => g.title).join(', ');
    insights.push(makeInsight(
      'goal-at-risk',
      'goal',
      'warning',
      'GOAL AT RISK',
      `${atRiskGoals.length === 1 ? 'A high-priority goal is' : `${atRiskGoals.length} high-priority goals are`} behind schedule: ${names}.`
    ));
  }

  // High hours + declining output (period-over-period only)
  if (
    hasPrev &&
    bm.hours_worked.changePct !== null && bm.hours_worked.changePct > 0 &&
    bm.hours_worked.previous !== null && bm.hours_worked.previous > 0
  ) {
    const outputDeclined =
      (bm.leads.changePct !== null && bm.leads.changePct < 0) ||
      (bm.sales_calls.changePct !== null && bm.sales_calls.changePct < 0) ||
      (bm.clients_closed.changePct !== null && bm.clients_closed.changePct < 0) ||
      (bm.content_posted.changePct !== null && bm.content_posted.changePct < 0);

    if (outputDeclined) {
      insights.push(makeInsight(
        'hours-output-gap',
        'execution',
        'warning',
        'HOURS UP, OUTPUT DOWN',
        `Hours worked increased ${bm.hours_worked.changePct}% while some output metrics declined versus the previous period. Activity may not be translating to execution.`
      ));
    }
  }

  // Application rate very low (< 30%, must have at least 10 completed lessons)
  if (
    lf.completed >= 10 &&
    lf.completed_to_applied_pct !== null &&
    lf.completed_to_applied_pct < 30
  ) {
    insights.push(makeInsight(
      'low-application-rate',
      'learning',
      'warning',
      'LOW APPLICATION RATE',
      `Only ${lf.completed_to_applied_pct}% of completed lessons have been applied. Lessons are being learned but not acted on.`
    ));
  }

  // ── Positive ──────────────────────────────────────────────

  // Revenue up >20%
  if (hasPrev && bm.revenue.changePct !== null && bm.revenue.changePct >= 20) {
    insights.push(makeInsight(
      'revenue-up',
      'business',
      'positive',
      'REVENUE IS TRENDING UP',
      `Revenue increased ${bm.revenue.changePct}% over the previous period.`
    ));
  }

  // Multiple metrics improving
  const upMetrics = [bm.leads, bm.sales_calls, bm.clients_closed, bm.content_posted]
    .filter(m => m.changePct !== null && m.changePct > 0).length;
  if (hasPrev && upMetrics >= 3) {
    insights.push(makeInsight(
      'broad-momentum',
      'business',
      'positive',
      'BROAD BUSINESS MOMENTUM',
      `${upMetrics} out of 4 tracked activity metrics improved versus the previous period.`
    ));
  }

  // Goal ahead of schedule
  const aheadGoals = ga.active.filter(g => g.progress.trackSignal === 'ahead');
  if (aheadGoals.length > 0) {
    insights.push(makeInsight(
      'goal-ahead',
      'goal',
      'positive',
      'GOAL AHEAD OF SCHEDULE',
      `"${aheadGoals[0].title}" is tracking ahead of schedule.`
    ));
  }

  // ── Info ──────────────────────────────────────────────────

  // Execution/learning ratio very low (lots of learning, little execution)
  if (ex.execution_learning_ratio !== null && ex.execution_learning_ratio < 0.5 && ex.all_time_completed_lessons >= 5) {
    insights.push(makeInsight(
      'learning-heavy',
      'execution',
      'info',
      'LEARNING-HEAVY PERIOD',
      `Execution/Learning ratio is ${ex.execution_learning_ratio}x. ${ex.execution_actions} execution actions versus ${ex.all_time_completed_lessons} completed lessons.`
    ));
  }

  // Consistent application pattern from patterns
  const appPattern = summary.patterns.find(p => p.metric === 'applications_active' && p.direction === 'increasing');
  if (appPattern) {
    insights.push(makeInsight(
      'app-momentum',
      'learning',
      'positive',
      'APPLICATION ACTIVITY INCREASING',
      appPattern.message
    ));
  }

  // Sort by severity (critical first) and cap at 5
  return insights
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .slice(0, 5);
}

// ── Main export ───────────────────────────────────────────────

export async function loadAnalyticsSummary(
  userId: string,
  range: AnalyticsDateRange
): Promise<AnalyticsSummary> {
  const currentPeriod  = getDateRange(range);
  const previousPeriod = getPreviousPeriod(range, currentPeriod);

  // Batch fetch all data in parallel
  const [
    businessResult,
    learningData,
    goalData,
    weeklyData,
  ] = await Promise.all([
    getBusinessAnalytics(userId, range, currentPeriod, previousPeriod),
    fetchLearningRawData(userId),
    getGoalAnalytics(userId),
    fetchWeeklyBusinessData(userId, 12),
  ]);

  const { progressRows, appRows } = learningData;
  const allTimeCompleted = progressRows.filter(r => r.completed === true).length;

  const learningFunnel       = calculateLearningFunnel(progressRows, appRows);
  const applicationBreakdown = calculateApplicationBreakdown(appRows, allTimeCompleted);
  const executionLearning    = calculateExecutionLearning(
    businessResult.metrics.leads.current,
    businessResult.metrics.sales_calls.current,
    businessResult.metrics.clients_closed.current,
    businessResult.metrics.content_posted.current,
    businessResult.metrics.hours_worked.current,
    allTimeCompleted
  );

  const patterns    = detectPatterns(weeklyData);
  const correlation = buildCorrelation(weeklyData);

  const summaryWithoutInsights: Omit<AnalyticsSummary, 'insights'> = {
    dateRange:            range,
    currentPeriod,
    previousPeriod,
    businessMetrics:      businessResult.metrics,
    revenueTrend:         businessResult.revenueTrend,
    activityTrend:        businessResult.activityTrend,
    funnel:               businessResult.funnel,
    learningFunnel,
    applicationBreakdown,
    executionLearning,
    goalAnalytics:        goalData,
    weeklyData,
    patterns,
    correlation,
  };

  const insights = generateInsights(summaryWithoutInsights);

  return { ...summaryWithoutInsights, insights };
}
