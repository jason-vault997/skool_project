// ============================================================
// BUILD100 — Phase 8: Intelligence Engine (Main Orchestrator)
//
// Single async entry point: loadIntelligence(userId)
//
// Fetches all required data in parallel from existing Supabase
// tables (no new tables created). Runs all Phase 8 engines and
// returns a single OperatorIntelligence object.
//
// Data sources used:
//   business_metrics   — activity and revenue metrics
//   business_goals     — active goal definitions
//   application_records — application + commitment state
//   classroom_progress — lesson completion counts
//   weekly_reviews     — last completed review
//   (profiles loaded via AuthContext, not fetched here)
//
// Canonical definitions applied throughout:
//   Applied  = status IN ('In Progress', 'Completed', 'Failed')
//   Executed = status IN ('Completed', 'Failed')   ← includes Failed
//   Successful = status = 'Completed'
//
// Date strategy: all date comparisons use todayLocalYMD() from
//   intelligence/dateUtils.ts for consistent local-calendar dates.
// ============================================================

import { supabase } from '../supabase/client';
import { computeBottleneck } from './bottleneckEngine';
import { computePriority } from './priorityEngine';
import { computeAction } from './actionEngine';
import { computeCommitmentSummary } from './commitmentEngine';
import { computeGoalRisk } from './goalRiskEngine';
import { computeApplicationBacklog } from './applicationBacklogEngine';
import { computeOperatingPlan, isWeeklyReviewDay } from './operatingPlanEngine';
import { computeOperatingSignals } from './operatingSignalsEngine';
import { computeProactiveSignals } from './proactiveSignalsEngine';
import { todayLocalYMD, offsetDate, daysBetween, currentWeekMonday } from './dateUtils';
import type {
  OperatorIntelligence,
  WeeklyOperatingSummary,
  WeeklyMetricRow,
} from './intelligenceTypes';

// ── Metric aggregation helpers ────────────────────────────────

interface MetricRow {
  date: string;
  leads: number;
  sales_calls: number;
  clients_closed: number;
  revenue: number;
  content_posted: number;
  hours_worked: number;
}

function sumMetrics(rows: MetricRow[]): WeeklyMetricRow & { days_with_data: number } {
  const result = {
    leads: 0, sales_calls: 0, clients_closed: 0,
    revenue: 0, content_posted: 0, hours_worked: 0,
    days_with_data: rows.length,
  };
  for (const r of rows) {
    result.leads          += r.leads ?? 0;
    result.sales_calls    += r.sales_calls ?? 0;
    result.clients_closed += r.clients_closed ?? 0;
    result.revenue        += Number(r.revenue ?? 0);
    result.content_posted += r.content_posted ?? 0;
    result.hours_worked   += Number(r.hours_worked ?? 0);
  }
  return result;
}

// ── Weekly summary builder ────────────────────────────────────

async function buildWeeklySummary(
  userId: string,
  goalRiskSummary: Awaited<ReturnType<typeof computeGoalRisk>>,
  appBacklog: Awaited<ReturnType<typeof computeApplicationBacklog>>
): Promise<WeeklyOperatingSummary | null> {
  const weekStart = currentWeekMonday();

  const lastWeekStart = offsetDate(weekStart, -7);
  const lastWeekEnd = offsetDate(weekStart, -1);

  // Fetch last week's metrics
  const { data: lastWeekData } = await supabase
    .from('business_metrics')
    .select('leads, sales_calls, clients_closed, revenue, content_posted, hours_worked')
    .eq('user_id', userId)
    .gte('date', lastWeekStart)
    .lte('date', lastWeekEnd);

  const lastWeekRows = (lastWeekData ?? []) as MetricRow[];
  const lastWeekMetrics = sumMetrics(lastWeekRows);

  if (lastWeekMetrics.days_with_data === 0) {
    // No last-week data — can't build a meaningful summary
    return null;
  }

  // Last week's application records updated within the week
  const { data: lastWeekAppData } = await supabase
    .from('application_records')
    .select('status, updated_at')
    .eq('user_id', userId)
    .gte('updated_at', lastWeekStart + 'T00:00:00')
    .lte('updated_at', lastWeekEnd + 'T23:59:59');

  const lastWeekApps = (lastWeekAppData ?? []) as { status: string; updated_at: string }[];
  const completed_lessons_last_week = 0; // Not tracked per-week in classroom_progress
  const applied_last_week = lastWeekApps.filter(
    a => a.status === 'In Progress' || a.status === 'Completed' || a.status === 'Failed'
  ).length;
  const executed_last_week = lastWeekApps.filter(
    a => a.status === 'Completed' || a.status === 'Failed'
  ).length;

  // Last week's completed review
  const { data: reviewData } = await supabase
    .from('weekly_reviews')
    .select('biggest_win, biggest_failure, bottleneck')
    .eq('user_id', userId)
    .eq('week_start', lastWeekStart)
    .eq('status', 'completed')
    .maybeSingle();

  const review = reviewData as { biggest_win: string | null; biggest_failure: string | null; bottleneck: string | null } | null;

  // Goal status summary
  const onTrack = goalRiskSummary.on_track_count;
  const atRisk = goalRiskSummary.at_risk_count + goalRiskSummary.critical_count;
  const goalStatusSummary = goalRiskSummary.items.length === 0
    ? 'No active goals'
    : `${onTrack} on track, ${atRisk} at risk, ${goalRiskSummary.complete_count} complete`;

  // Current week priority (derived from top goal or biggest gap)
  const topRiskGoal = goalRiskSummary.items.find(
    g => g.risk_status === 'CRITICAL' || g.risk_status === 'AT_RISK'
  );
  const next_week_priority = topRiskGoal
    ? `Recover "${topRiskGoal.title}" — currently at ${topRiskGoal.progress_pct}%`
    : 'Maintain current execution patterns';
  const next_week_focus = topRiskGoal
    ? `Requires ${topRiskGoal.required_daily_pace?.toFixed(1) ?? '?'} ${topRiskGoal.unit ?? 'units'}/day to get back on track`
    : 'No critical goals at risk — review pacing weekly';

  // Check if this week's review is done (used for has_completed_review field)
  const hasCompletedThisWeek = await supabase
    .from('weekly_reviews')
    .select('status')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .eq('status', 'completed')
    .maybeSingle()
    .then(r => !!r.data);

  return {
    week_start: lastWeekStart,
    week_end: lastWeekEnd,
    last_week_metrics: {
      leads: lastWeekMetrics.leads,
      sales_calls: lastWeekMetrics.sales_calls,
      clients_closed: lastWeekMetrics.clients_closed,
      revenue: lastWeekMetrics.revenue,
      content_posted: lastWeekMetrics.content_posted,
      hours_worked: lastWeekMetrics.hours_worked,
    },
    completed_lessons_last_week,
    applied_lessons_last_week: applied_last_week,
    executed_lessons_last_week: executed_last_week,
    biggest_bottleneck: review?.bottleneck ?? 'Not recorded',
    biggest_win: review?.biggest_win ?? null,
    biggest_failure: review?.biggest_failure ?? null,
    goal_status_summary: goalStatusSummary,
    application_backlog_count: appBacklog.active_count,
    next_week_priority,
    next_week_focus,
    has_completed_review: hasCompletedThisWeek,
  };
}

// ── Main orchestrator ─────────────────────────────────────────

export async function loadIntelligence(userId: string): Promise<OperatorIntelligence> {
  const today = todayLocalYMD();
  const sevenDaysAgo = offsetDate(today, -6);
  const thirtyDaysAgo = offsetDate(today, -29);
  const prevPeriodStart = offsetDate(today, -59);
  const prevPeriodEnd = offsetDate(today, -30);
  const weekStart = currentWeekMonday();

  // Batch-fetch all data in parallel
  const [
    metrics30dResult,
    prev30dResult,
    allAppRecordsResult,
    classroomProgressResult,
    completedReviewResult,
    todayMetricResult,
  ] = await Promise.all([
    supabase
      .from('business_metrics')
      .select('date, leads, sales_calls, clients_closed, revenue, content_posted, hours_worked')
      .eq('user_id', userId)
      .gte('date', thirtyDaysAgo)
      .lte('date', today)
      .order('date', { ascending: true }),
    supabase
      .from('business_metrics')
      .select('date, leads, sales_calls, clients_closed, revenue, content_posted, hours_worked')
      .eq('user_id', userId)
      .gte('date', prevPeriodStart)
      .lte('date', prevPeriodEnd)
      .order('date', { ascending: true }),
    supabase
      .from('application_records')
      .select('status, commitment, updated_at, created_at')
      .eq('user_id', userId),
    supabase
      .from('classroom_progress')
      .select('completed')
      .eq('user_id', userId)
      .eq('completed', true),
    supabase
      .from('weekly_reviews')
      .select('status')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .eq('status', 'completed')
      .maybeSingle(),
    supabase
      .from('business_metrics')
      .select('date')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle(),
  ]);

  const allMetrics30d = (metrics30dResult.data ?? []) as MetricRow[];
  const allMetricsPrev = (prev30dResult.data ?? []) as MetricRow[];
  const allAppRows = (allAppRecordsResult.data ?? []) as {
    status: string; commitment: string | null; updated_at: string; created_at: string;
  }[];
  const progressRows = (classroomProgressResult.data ?? []) as { completed: boolean }[];
  const hasCompletedReviewThisWeek = !!completedReviewResult.data;
  const hasMetricsToday = !!todayMetricResult.data;

  // ── Compute metric aggregates ──────────────────────────────

  const metrics30dAgg = sumMetrics(allMetrics30d);
  const prev30dAgg = allMetricsPrev.length > 0 ? sumMetrics(allMetricsPrev) : null;

  // 7d subset
  const metrics7dRows = allMetrics30d.filter(r => r.date >= sevenDaysAgo);
  const metrics7d = sumMetrics(metrics7dRows);

  // ── Learning stats (canonical definitions) ─────────────────
  // Completed lessons from classroom_progress
  const total_completed = progressRows.filter(r => r.completed === true).length;

  // Application counts from application_records
  // Applied  = In Progress + Completed + Failed
  // Executed = Completed + Failed  ← includes Failed per canonical definition
  // Successful = Completed only
  let total_applied = 0, total_executed = 0, total_successful = 0;
  let active_in_progress_count = 0;

  for (const row of allAppRows) {
    if (row.status === 'In Progress' || row.status === 'Completed' || row.status === 'Failed') {
      total_applied++;
    }
    if (row.status === 'Completed' || row.status === 'Failed') {
      total_executed++; // BOTH count as executed
    }
    if (row.status === 'Completed') {
      total_successful++;
    }
    if (row.status === 'In Progress') {
      active_in_progress_count++;
    }
  }

  const learningStats = { total_completed, total_applied, total_executed, total_successful };

  // ── Data freshness ─────────────────────────────────────────
  const has_any_data = allMetrics30d.length > 0 || total_completed > 0;
  const is_empty = !has_any_data;

  // Days since last metric
  let daysSinceLastMetric: number | null = null;
  if (allMetrics30d.length > 0) {
    const lastDate = allMetrics30d[allMetrics30d.length - 1].date;
    daysSinceLastMetric = daysBetween(lastDate, today);
  } else {
    // Check if there's any historical data at all
    const { data: anyData } = await supabase
      .from('business_metrics')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (anyData) {
      daysSinceLastMetric = daysBetween((anyData as { date: string }).date, today);
    }
  }

  // ── Run engines in dependency order ────────────────────────

  // 1. Goal risk (needed by bottleneck and priority)
  const goalRisk = await computeGoalRisk(userId);

  // Get required paces from critical/active goals for bottleneck
  const revenueGoal = goalRisk.items.find(g => g.goal_type === 'revenue');
  const leadsGoal = goalRisk.items.find(g => g.goal_type === 'leads');
  const contentGoal = goalRisk.items.find(g => g.goal_type === 'content');
  const hoursGoal = goalRisk.items.find(g => g.goal_type === 'hours');

  // 2. Commitments
  const commitments = await computeCommitmentSummary(userId);

  // 3. Backlog
  const backlog = await computeApplicationBacklog(userId);

  // 4. Bottleneck
  const bottleneck = computeBottleneck({
    metrics7d,
    metrics30d: metrics30dAgg,
    learning: learningStats,
    goal_risk: goalRisk,
    revenue_goal_daily_pace: revenueGoal?.required_daily_pace ?? null,
    leads_goal_daily_pace: leadsGoal?.required_daily_pace ?? null,
    content_goal_daily_pace: contentGoal?.required_daily_pace ?? null,
    hours_goal_daily_pace: hoursGoal?.required_daily_pace ?? null,
    active_in_progress_count,
    has_any_data,
  });

  // 5. Priority
  const reviewDay = isWeeklyReviewDay();
  const priority = computePriority(bottleneck, commitments, goalRisk, hasCompletedReviewThisWeek);

  // 6. Action
  const criticalGoal = goalRisk.items.find(g => g.risk_status === 'CRITICAL') ?? null;
  const action = computeAction(priority, bottleneck, criticalGoal, backlog.next_recommended);

  // 7. Operating plan
  const operatingPlan = computeOperatingPlan({
    action,
    commitments,
    backlog,
    hasMetricsToday,
    hasCompletedReviewThisWeek,
    isWeeklyReviewDay: reviewDay,
  });

  // 8. Stop/Double-down signals
  const leads30dWeeklyAvg = metrics30dAgg.days_with_data > 0
    ? metrics30dAgg.leads / (metrics30dAgg.days_with_data / 7)
    : null;

  const operatingSignals = computeOperatingSignals({
    metrics7d,
    metrics30d: metrics30dAgg,
    prev30d: prev30dAgg,
  });

  // 9. Proactive alerts
  const proactiveAlerts = computeProactiveSignals({
    commitments,
    goalRisk,
    backlog,
    daysSinceLastMetric,
    leads7d: metrics7d.leads,
    leads30dWeeklyAvg,
    hasCompletedReviewThisWeek,
    isWeeklyReviewDay: reviewDay,
  });

  // 10. Weekly summary
  const weeklySummary = await buildWeeklySummary(userId, goalRisk, backlog);

  return {
    metrics_7d: metrics7d,
    learning_stats: learningStats,
    bottleneck,
    priority,
    action,
    commitments,
    goal_risk: goalRisk,
    backlog,
    operating_plan: operatingPlan,
    operating_signals: operatingSignals,
    proactive_alerts: proactiveAlerts,
    weekly_summary: weeklySummary,
    is_empty,
    loaded_at: new Date().toISOString(),
  };
}
