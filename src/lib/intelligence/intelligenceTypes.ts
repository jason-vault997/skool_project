// ============================================================
// BUILD100 — Phase 8: Intelligence Layer Types
//
// All types for the Decision Intelligence engine.
// No Supabase imports — pure data contracts only.
//
// Canonical application status definitions (unchanged from Phase 4/7):
//   Applied  = status IN ('In Progress', 'Completed', 'Failed')
//   Executed = status IN ('Completed', 'Failed')
//   Successful = status = 'Completed'
//
// A Failed experiment IS executed data. Treated equally to Completed
// for the purpose of execution counting.
// ============================================================

// ── Bottleneck Engine ─────────────────────────────────────────

export type BottleneckType =
  | 'NO_DATA'
  | 'OVERLOAD'
  | 'REVENUE_GAP'
  | 'LOW_LEADS'
  | 'LOW_SALES_CALLS'
  | 'LOW_CLOSE_RATE'
  | 'LOW_CONTENT'
  | 'LOW_APPLICATION'
  | 'LOW_EXECUTION'
  | 'LOW_HOURS'
  | 'ENGINE_RUNNING';

export type BottleneckSeverity = 'info' | 'warning' | 'critical';

export interface BottleneckResult {
  bottleneck_type: BottleneckType;
  severity: BottleneckSeverity;
  /** 0–100. Higher = more data points supporting this diagnosis. */
  confidence: number;
  /** Human-readable explanation of the diagnosed constraint. */
  explanation: string;
  /** Specific metric strings backing the diagnosis. */
  evidence: string[];
  /** Concrete recommended response action. */
  recommended_response: string;
}

// ── Priority Engine ───────────────────────────────────────────

export type OperatorPriority =
  | 'COMMITMENT_RECOVERY'
  | 'GOAL_RECOVERY'
  | 'LEAD_GENERATION'
  | 'SALES_CALLS'
  | 'CLOSING'
  | 'APPLICATION'
  | 'EXECUTION'
  | 'CONTENT'
  | 'SALES'
  | 'REVIEW'
  | 'NO_PRIORITY';

export type PriorityUrgency = 'high' | 'medium' | 'low';

export interface PriorityResult {
  priority: OperatorPriority;
  reason: string;
  supporting_metrics: string[];
  urgency: PriorityUrgency;
  time_horizon: string; // e.g. "Today", "This week", "This month"
}

// ── Action Engine ─────────────────────────────────────────────

export interface ActionResult {
  action_text: string;
  target_metric: string;
  target_value: string;
  time_horizon: string;
  linked_goal_id?: string | null;
}

// ── Commitment Engine ─────────────────────────────────────────

export type CommitmentUrgency =
  | 'overdue'
  | 'due_today'
  | 'due_3_days'
  | 'upcoming'
  | 'complete'
  | 'failed';

export interface CommitmentItem {
  lesson_id: string;
  mission: string | null;
  experiment: string | null;
  commitment_date: string; // YYYY-MM-DD
  urgency: CommitmentUrgency;
  status: string;
}

export interface CommitmentSummary {
  overdue: number;
  due_today: number;
  due_3_days: number;
  upcoming: number;
  complete: number;
  failed: number;
  total_active: number; // In Progress with a commitment date
  items: CommitmentItem[]; // sorted: overdue → due_today → due_3_days → upcoming
}

// ── Goal Risk Engine ──────────────────────────────────────────

export type GoalRiskStatus = 'ON_TRACK' | 'WATCH' | 'AT_RISK' | 'CRITICAL' | 'COMPLETE' | 'NO_DATE';

export interface GoalRiskItem {
  id: string;
  title: string;
  goal_type: string;
  target_value: number;
  current_value: number;
  unit: string | null;
  start_date: string | null;
  target_date: string | null;
  priority: string;
  risk_status: GoalRiskStatus;
  progress_pct: number;
  remaining: number;
  remaining_days: number | null;
  /** Units/day needed from today to reach target. null if no deadline. */
  required_daily_pace: number | null;
  /** Units/day based on current progress / elapsed days. null if elapsed = 0. */
  current_daily_pace: number | null;
  /** current_daily_pace × total_days. null if insufficient data. */
  projected_final_value: number | null;
  gap: number; // target - projected (positive = behind)
}

export interface GoalRiskSummary {
  items: GoalRiskItem[];
  critical_count: number;
  at_risk_count: number;
  watch_count: number;
  on_track_count: number;
  complete_count: number;
  has_any_risk: boolean;
}

// ── Application Backlog Engine ────────────────────────────────

export interface BacklogItem {
  lesson_id: string;
  lesson_title: string | null; // resolved from CMS if available
  mission: string | null;
  experiment: string | null;
  status: string;
  commitment_date: string | null;
  created_at: string;
  urgency: 'overdue' | 'due_today' | 'due_3_days' | 'upcoming' | 'no_deadline';
  rank_score: number;
}

export interface ApplicationBacklog {
  active_count: number;   // In Progress or Not Started with content
  overdue_count: number;
  due_today_count: number;
  due_week_count: number;
  upcoming_count: number;
  completed_count: number;
  failed_count: number;
  sorted_backlog: BacklogItem[];
  next_recommended: BacklogItem | null;
}

// ── Operating Plan Engine ─────────────────────────────────────

export interface PlanItem {
  slot: 1 | 2 | 3 | 4;
  label: string;
  action: string;
  why: string;
  estimated_minutes?: number;
}

export interface DailyOperatingPlan {
  items: PlanItem[];
  generated_at: string; // ISO timestamp
  plan_date: string; // YYYY-MM-DD (today)
}

// ── Operating Signals (Stop / Double Down) ───────────────────

export type OperatingSignalType = 'DOUBLE_DOWN' | 'STOP_FIX';

export interface OperatingSignal {
  type: OperatingSignalType;
  title: string;
  message: string;
  evidence: string;
}

// ── Proactive Alerts ──────────────────────────────────────────

export type ProactiveAlertType =
  | 'OVERDUE_COMMITMENT'
  | 'COMMITMENT_DUE_TODAY'
  | 'GOAL_AT_RISK'
  | 'REVIEW_DUE'
  | 'BACKLOG_GROWING'
  | 'NO_RECENT_ACTIVITY'
  | 'METRIC_DROP';

export type ProactiveAlertSeverity = 'critical' | 'warning' | 'info';

export interface ProactiveAlert {
  type: ProactiveAlertType;
  severity: ProactiveAlertSeverity;
  title: string;
  message: string;
  action_label?: string;
}

// ── Weekly Operating Summary ──────────────────────────────────

export interface WeeklyMetricRow {
  leads: number;
  sales_calls: number;
  clients_closed: number;
  revenue: number;
  content_posted: number;
  hours_worked: number;
}

export interface WeeklyOperatingSummary {
  week_start: string;
  week_end: string;
  last_week_metrics: WeeklyMetricRow;
  completed_lessons_last_week: number;
  applied_lessons_last_week: number;
  executed_lessons_last_week: number;
  biggest_bottleneck: string;
  biggest_win: string | null;      // from weekly_reviews.biggest_win
  biggest_failure: string | null;  // from weekly_reviews.biggest_failure
  goal_status_summary: string;
  application_backlog_count: number;
  next_week_priority: string;
  next_week_focus: string;
  has_completed_review: boolean;
}

// ── Main Intelligence State ───────────────────────────────────

export interface OperatorIntelligence {
  /** Raw metric aggregates used for engine decisions */
  metrics_7d: {
    leads: number;
    sales_calls: number;
    clients_closed: number;
    revenue: number;
    content_posted: number;
    hours_worked: number;
    days_with_data: number;
  };
  /** All-time lesson and application counts */
  learning_stats: {
    total_completed: number;
    total_applied: number;
    total_executed: number;
    total_successful: number;
  };
  bottleneck: BottleneckResult;
  priority: PriorityResult;
  action: ActionResult;
  commitments: CommitmentSummary;
  goal_risk: GoalRiskSummary;
  backlog: ApplicationBacklog;
  operating_plan: DailyOperatingPlan;
  operating_signals: OperatingSignal[];
  proactive_alerts: ProactiveAlert[];
  weekly_summary: WeeklyOperatingSummary | null;
  /** True if there is insufficient data to make any diagnosis. */
  is_empty: boolean;
  loaded_at: string; // ISO timestamp
}
