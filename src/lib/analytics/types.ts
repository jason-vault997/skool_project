// ============================================================
// BUILD100 — Phase 7: Analytics Type Definitions
// Pure types — no imports from Supabase schema or Phase 6 to
// prevent circular dependencies. Goal progress types mirror
// GoalProgressResult from Phase 6 but are defined independently.
// ============================================================

export type AnalyticsDateRange = '7d' | '30d' | '90d' | 'year' | 'all';

export interface DateBounds {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

// ── Period comparison ─────────────────────────────────────────

/**
 * Represents a single metric with its current value, previous period value,
 * and derived change stats.
 *
 * previous = null  →  ALL TIME (no previous period concept)
 * changePct = null →  previous = 0 (division by zero prevented) or ALL TIME
 */
export interface PeriodValue {
  current: number;
  previous: number | null;
  change: number | null;
  changePct: number | null;
}

// ── Business metrics ──────────────────────────────────────────

export interface BusinessMetricTotals {
  leads: PeriodValue;
  sales_calls: PeriodValue;
  clients_closed: PeriodValue;
  revenue: PeriodValue;
  content_posted: PeriodValue;
  hours_worked: PeriodValue;
  /** null when clients_closed = 0 — no division by zero */
  revenue_per_client: number | null;
}

export interface TrendPoint {
  label: string;  // display label (e.g. "Aug 26", "Sep W1", "Aug 2026")
  date: string;   // YYYY-MM-DD bucket start key
  value: number;
}

// ── Sales funnel ──────────────────────────────────────────────

export interface BusinessFunnel {
  leads: number;
  sales_calls: number;
  clients_closed: number;
  /** null when leads = 0 */
  lead_to_call_rate: number | null;
  /** null when sales_calls = 0 */
  call_to_client_rate: number | null;
  /** null when leads = 0 */
  lead_to_client_rate: number | null;
}

// ── Learning funnel ───────────────────────────────────────────
//
// Definitions (Phase 7 corrections applied):
//   started   = classroom_progress where progress_pct > 0 OR last_pos_sec > 0 OR completed = true
//   completed = classroom_progress.completed = true
//   applied   = application_records.status IN ['In Progress', 'Completed', 'Failed']
//   executed  = application_records.status IN ['Completed', 'Failed']
//   successful= application_records.status = 'Completed'
//   failed    = application_records.status = 'Failed'
//   skipped   = application_records.status = 'Skipped'
//
export interface LearningFunnel {
  started: number;
  completed: number;
  applied: number;
  executed: number;
  successful: number;
  failed_apps: number;
  skipped_apps: number;
  /** null when started = 0 */
  started_to_completed_pct: number | null;
  /** null when completed = 0 */
  completed_to_applied_pct: number | null;
  /** null when applied = 0 */
  applied_to_executed_pct: number | null;
}

// ── Application breakdown ─────────────────────────────────────

export interface ApplicationBreakdown {
  not_started: number;
  in_progress: number;
  completed: number;
  failed: number;
  skipped: number;
  total_records: number;
  /**
   * Application rate = applied / completed_lessons
   * applied = in_progress + completed + failed
   * null when completed_lessons = 0
   */
  application_rate: number | null;
}

// ── Execution / Learning Ratio ────────────────────────────────
//
// Formula (Phase 7 corrected spec):
//   execution_actions = leads + sales_calls + clients_closed + content_posted
//   (hours_worked is NOT included — different dimensional unit; tracked separately)
//
//   execution_learning_ratio = execution_actions / all_time_completed_lessons
//
// This is a DIRECTIONAL ACTIVITY RATIO, not a productivity measurement.
//   > 1.0  →  more execution actions per lesson completed (execution-heavy period)
//   < 1.0  →  more lessons completed than execution actions (learning-heavy period)
//   = null →  all_time_completed_lessons = 0 (never divide by zero)
//
// Numerator scope: the selected date range period.
// Denominator scope: all-time (stable baseline; avoids division by 0 for short periods).
//
export interface ExecutionLearningData {
  /** leads + sales_calls + clients_closed + content_posted for the period */
  execution_actions: number;
  /** Count of all lessons ever completed (all-time stable denominator) */
  all_time_completed_lessons: number;
  /** null when all_time_completed_lessons = 0 */
  execution_learning_ratio: number | null;
  /** Hours worked tracked separately — NOT in ratio numerator */
  hours_worked: number;
}

// ── Weekly data ───────────────────────────────────────────────

export interface WeeklyDataPoint {
  week_start: string;    // YYYY-MM-DD (Monday)
  week_end: string;      // YYYY-MM-DD (Sunday)
  week_label: string;    // e.g. "Aug 26 – Sep 1"
  leads: number;
  sales_calls: number;
  clients_closed: number;
  revenue: number;
  content_posted: number;
  hours_worked: number;
  /** Application records updated in this week (proxy for application activity) */
  applications_active: number;
}

// ── Pattern detection ─────────────────────────────────────────

export type PatternDirection = 'increasing' | 'decreasing' | 'flat' | 'diverging';

export interface DetectedPattern {
  id: string;
  metric: string;
  direction: PatternDirection;
  /** Number of consecutive weeks showing this pattern */
  weeks: number;
  /** Fact-only language — no causal conclusions */
  message: string;
}

// ── Correlation ───────────────────────────────────────────────
//
// Data thresholds:
//   < 4 weeks  → insufficient_data = true, no calculation
//   4–7 weeks  → calculated, is_limited_data = true (label: "Limited data")
//   8+ weeks   → normal historical comparison
//   12+ weeks  → preferred
//
// Language rule: use "moved together" / "moved in opposite directions"
// NEVER say "X caused Y" or "X increased Y"
//
export type CorrelationStrength =
  | 'strong-positive'
  | 'moderate-positive'
  | 'weak-positive'
  | 'neutral'
  | 'weak-negative'
  | 'moderate-negative'
  | 'strong-negative';

export interface CorrelationResult {
  /** Pearson r, clamped –1 to 1 */
  r: number;
  /** Number of paired weekly observations used */
  n: number;
  strength: CorrelationStrength;
  /** Fact-only description, e.g. "moved together across N weeks" */
  description: string;
  /** true when 4–7 weeks (technically sufficient but limited) */
  is_limited_data: boolean;
}

export interface LearningBusinessCorrelation {
  /** Application activity (applied/executed count per week) vs weekly revenue */
  applications_vs_revenue: CorrelationResult | null;
  /** Application activity vs weekly clients closed */
  applications_vs_clients: CorrelationResult | null;
  /** Lessons completed per week vs weekly business action count */
  lessons_vs_activity: CorrelationResult | null;
  /** true when < 4 paired weekly observations are available */
  insufficient_data: boolean;
  weeks_available: number;
}

// ── Goal analytics ────────────────────────────────────────────
//
// GoalProgressDisplay mirrors GoalProgressResult from Phase 6 goalProgress.ts
// but is defined here independently to avoid circular imports.
// goalAnalytics.ts maps Phase 6 results onto this type.
//
export interface GoalProgressDisplay {
  progressPct: number;
  remaining: number;
  requiredPace: number | null;
  isOnTrack: boolean | null;
  trackSignal: 'ahead' | 'on-track' | 'behind' | 'no-data';
  elapsedDays: number | null;
  remainingDays: number | null;
  totalDays: number | null;
}

export interface GoalAnalyticsItem {
  id: string;
  title: string;
  goal_type: string;
  target_value: number;
  /** Computed dynamically — for connected types comes from business_metrics */
  current_value: number;
  unit: string | null;
  start_date: string | null;
  target_date: string | null;
  status: string;
  priority: string;
  progress: GoalProgressDisplay;
}

export interface GoalAnalytics {
  active: GoalAnalyticsItem[];
  active_count: number;
  completed_count: number;
  paused_count: number;
  abandoned_count: number;
}

// ── Insights ──────────────────────────────────────────────────
//
// Priority (highest first):
//   1. critical — major business problems
//   2. warning  — goal risks, execution gaps, conversion issues
//   3. positive — strong momentum
//   4. info     — learning/application gaps, patterns
//
// Max 5 insights rendered. Never show trivial info when critical exists.
//

export type InsightCategory = 'business' | 'learning' | 'execution' | 'goal' | 'consistency';
export type InsightSeverity = 'info' | 'positive' | 'warning' | 'critical';

export interface AnalyticsInsight {
  id: string;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  message: string;
}

// ── Full analytics summary ────────────────────────────────────

export interface AnalyticsSummary {
  dateRange: AnalyticsDateRange;
  currentPeriod: DateBounds;
  /** null for ALL TIME — no previous period comparison */
  previousPeriod: DateBounds | null;
  businessMetrics: BusinessMetricTotals;
  revenueTrend: TrendPoint[];
  activityTrend: {
    leads: TrendPoint[];
    sales_calls: TrendPoint[];
    clients_closed: TrendPoint[];
    content_posted: TrendPoint[];
    hours_worked: TrendPoint[];
  };
  funnel: BusinessFunnel;
  learningFunnel: LearningFunnel;
  applicationBreakdown: ApplicationBreakdown;
  executionLearning: ExecutionLearningData;
  goalAnalytics: GoalAnalytics;
  /** Last 8–12 complete weeks, ordered oldest first */
  weeklyData: WeeklyDataPoint[];
  patterns: DetectedPattern[];
  correlation: LearningBusinessCorrelation;
  /** Max 5, priority-sorted (critical first) */
  insights: AnalyticsInsight[];
}

// ── Dashboard momentum (lightweight summary for dashboard card) ──

export interface MomentumSummary {
  revenue_current: number;
  revenue_previous: number;
  revenue_change_pct: number | null;
  clients_current: number;
  clients_previous: number;
  clients_change: number;
  total_applied: number;
  has_data: boolean;
}
