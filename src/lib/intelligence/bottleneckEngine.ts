// ============================================================
// BUILD100 — Phase 8: Bottleneck Engine
//
// Deterministic rule-based identification of the #1 operational
// constraint. Returns a single BottleneckResult.
//
// Rules are evaluated in strict priority order and short-circuit:
// once one fires, no lower-priority rule is evaluated.
//
// Application definitions (canonical, unchanged from Phase 4/7):
//   Applied  = In Progress | Completed | Failed
//   Executed = Completed | Failed          ← includes Failed
//   Successful = Completed only
//
// A failed real-world experiment IS executed data.
// ============================================================

import type { BottleneckResult, GoalRiskSummary } from './intelligenceTypes';

export interface BottleneckInputs {
  /** 7-day aggregated business metrics */
  metrics7d: {
    leads: number;
    sales_calls: number;
    clients_closed: number;
    revenue: number;
    content_posted: number;
    hours_worked: number;
    days_with_data: number;
  };
  /** 30-day aggregated business metrics */
  metrics30d: {
    leads: number;
    sales_calls: number;
    clients_closed: number;
    revenue: number;
    content_posted: number;
    hours_worked: number;
    days_with_data: number;
  };
  /** Lesson completion and application counts (all-time) */
  learning: {
    total_completed: number;
    total_applied: number;   // In Progress + Completed + Failed
    total_executed: number;  // Completed + Failed
    total_successful: number; // Completed only
  };
  /** Active goal risk (from goalRiskEngine) */
  goal_risk: GoalRiskSummary;
  /** Active revenue goal required daily pace. null if no revenue goal. */
  revenue_goal_daily_pace: number | null;
  /** Active leads goal required daily pace. null if no leads goal. */
  leads_goal_daily_pace: number | null;
  /** Active content goal required daily pace. null if no content goal. */
  content_goal_daily_pace: number | null;
  /** Active hours goal required daily pace. null if no hours goal. */
  hours_goal_daily_pace: number | null;
  /** Active In Progress application records count */
  active_in_progress_count: number;
  /** Has any business_metrics data at all */
  has_any_data: boolean;
}

/**
 * Compute confidence score based on data availability.
 * More data rows = higher confidence.
 */
function dataConfidence(daysWithData: number, minExpected: number): number {
  if (daysWithData === 0) return 0;
  return Math.min(100, Math.round((daysWithData / minExpected) * 100));
}

/**
 * Computes the primary bottleneck deterministically.
 *
 * Rules (in strict priority order — first match wins):
 *   1. NO_DATA       — no business data AND no completed lessons
 *   2. OVERLOAD      — active experiments >= 5 AND recent execution actions < 3
 *   3. REVENUE_GAP   — active revenue goal, pace < 50% of required
 *   4. LOW_LEADS     — 7d leads pace < 60% of goal-required pace
 *   5. LOW_SALES_CALLS — 7d leads >= 3 but call ratio < 40%
 *   6. LOW_CLOSE_RATE  — 7d calls >= 5, close rate < 10%
 *   7. LOW_CONTENT   — active content goal, pace < 50%
 *   8. LOW_APPLICATION — completed >= 10, applied rate < 20%
 *   9. LOW_EXECUTION — applied >= 5, executed rate < 20% (Completed+Failed)
 *  10. LOW_HOURS     — active hours goal, pace < 50%
 *  11. ENGINE_RUNNING — no constraint detected
 */
export function computeBottleneck(inputs: BottleneckInputs): BottleneckResult {
  const {
    metrics7d,
    metrics30d,
    learning,
    goal_risk,
    revenue_goal_daily_pace,
    leads_goal_daily_pace,
    content_goal_daily_pace,
    hours_goal_daily_pace,
    active_in_progress_count,
    has_any_data,
  } = inputs;

  // ── 1. NO_DATA ───────────────────────────────────────────────
  if (!has_any_data && learning.total_completed === 0) {
    return {
      bottleneck_type: 'NO_DATA',
      severity: 'info',
      confidence: 0,
      explanation: 'No business data or lesson progress recorded yet.',
      evidence: [],
      recommended_response: 'Log your first business metrics in the Business tab. Mark your first lesson complete in the Classroom.',
    };
  }

  const executionActions7d =
    metrics7d.leads + metrics7d.sales_calls + metrics7d.clients_closed + metrics7d.content_posted;

  // ── 2. OVERLOAD ──────────────────────────────────────────────
  if (active_in_progress_count >= 5 && executionActions7d < 3) {
    return {
      bottleneck_type: 'OVERLOAD',
      severity: 'warning',
      confidence: dataConfidence(metrics7d.days_with_data, 7),
      explanation: `You have ${active_in_progress_count} active experiments but only ${executionActions7d} real-world execution actions in the last 7 days. The backlog is growing faster than execution.`,
      evidence: [
        `Active In Progress experiments: ${active_in_progress_count}`,
        `7-day execution actions (leads + calls + clients + content): ${executionActions7d}`,
      ],
      recommended_response: 'Pick 1 experiment. Execute it. Mark the rest completed or failed. Clear the queue — having 5+ open experiments is not a strategy.',
    };
  }

  // ── 3. REVENUE_GAP ──────────────────────────────────────────
  if (revenue_goal_daily_pace !== null && revenue_goal_daily_pace > 0) {
    const actualDailyRevenue = metrics7d.days_with_data > 0
      ? metrics7d.revenue / 7
      : 0;
    const revenuePaceRatio = actualDailyRevenue / revenue_goal_daily_pace;

    if (revenuePaceRatio < 0.5 && goal_risk.critical_count > 0) {
      const criticalGoal = goal_risk.items.find(g =>
        g.risk_status === 'CRITICAL' && g.goal_type === 'revenue'
      );
      return {
        bottleneck_type: 'REVENUE_GAP',
        severity: 'critical',
        confidence: dataConfidence(metrics7d.days_with_data, 7),
        explanation: `Revenue pace is running at ${Math.round(revenuePaceRatio * 100)}% of the required rate${criticalGoal ? ` for "${criticalGoal.title}"` : ''}.`,
        evidence: [
          `7-day revenue: ₹${metrics7d.revenue.toLocaleString('en-IN')}`,
          `Required daily pace: ₹${revenue_goal_daily_pace.toLocaleString('en-IN')}/day`,
          `Current daily pace: ₹${Math.round(actualDailyRevenue).toLocaleString('en-IN')}/day`,
        ],
        recommended_response: criticalGoal
          ? `"${criticalGoal.title}" needs ₹${criticalGoal.required_daily_pace?.toLocaleString('en-IN') ?? '?'}/day for the remaining ${criticalGoal.remaining_days ?? '?'} days. Identify the highest-revenue activity and prioritize it today.`
          : 'Revenue pace is critically below target. Identify and prioritize the highest-leverage revenue activity.',
      };
    }
  }

  // ── 4. LOW_LEADS ────────────────────────────────────────────
  if (leads_goal_daily_pace !== null && leads_goal_daily_pace > 0) {
    const actualDailyLeads = metrics7d.leads / 7;
    const leadPaceRatio = actualDailyLeads / leads_goal_daily_pace;

    if (leadPaceRatio < 0.6) {
      return {
        bottleneck_type: 'LOW_LEADS',
        severity: 'warning',
        confidence: dataConfidence(metrics7d.days_with_data, 7),
        explanation: `Lead volume is running at ${Math.round(leadPaceRatio * 100)}% of the required pace. The pipeline is starved.`,
        evidence: [
          `7-day leads: ${metrics7d.leads}`,
          `Required daily pace: ${leads_goal_daily_pace.toFixed(1)} leads/day`,
          `Current daily pace: ${actualDailyLeads.toFixed(1)} leads/day`,
        ],
        recommended_response: 'Prioritize outbound prospecting. Every other metric (calls, closes) is blocked by lead volume.',
      };
    }
  } else if (metrics7d.leads === 0 && metrics7d.days_with_data >= 3) {
    // No goal but still no leads for 3+ tracked days
    return {
      bottleneck_type: 'LOW_LEADS',
      severity: 'warning',
      confidence: dataConfidence(metrics7d.days_with_data, 7),
      explanation: `Zero leads generated in the last 7 days with ${metrics7d.days_with_data} tracked days. Pipeline is empty.`,
      evidence: [
        `7-day leads: 0`,
        `Tracked days: ${metrics7d.days_with_data}`,
      ],
      recommended_response: 'Prioritize outbound prospecting. An empty pipeline will produce zero clients regardless of close rate or content.',
    };
  }

  // ── 5. LOW_SALES_CALLS ──────────────────────────────────────
  if (metrics7d.leads >= 3) {
    const callRatio = metrics7d.sales_calls / metrics7d.leads;
    if (callRatio < 0.4) {
      return {
        bottleneck_type: 'LOW_SALES_CALLS',
        severity: 'warning',
        confidence: dataConfidence(metrics7d.days_with_data, 7),
        explanation: `You have ${metrics7d.leads} leads but only made ${metrics7d.sales_calls} sales calls — a ${Math.round(callRatio * 100)}% follow-up rate. Leads are sitting idle.`,
        evidence: [
          `7-day leads: ${metrics7d.leads}`,
          `7-day sales calls: ${metrics7d.sales_calls}`,
          `Follow-up rate: ${Math.round(callRatio * 100)}%`,
        ],
        recommended_response: 'The pipeline has leads. The bottleneck is follow-up. Book or follow up on at least 3 leads today.',
      };
    }
  }

  // ── 6. LOW_CLOSE_RATE ───────────────────────────────────────
  if (metrics7d.sales_calls >= 5) {
    const closeRate = metrics7d.clients_closed / metrics7d.sales_calls;
    if (closeRate < 0.10) {
      return {
        bottleneck_type: 'LOW_CLOSE_RATE',
        severity: 'warning',
        confidence: dataConfidence(metrics7d.days_with_data, 7),
        explanation: `${metrics7d.sales_calls} sales calls resulted in ${metrics7d.clients_closed} closes — a ${(closeRate * 100).toFixed(1)}% close rate. Activity is not the problem. The pitch or offer is.`,
        evidence: [
          `7-day sales calls: ${metrics7d.sales_calls}`,
          `7-day clients closed: ${metrics7d.clients_closed}`,
          `Close rate: ${(closeRate * 100).toFixed(1)}%`,
        ],
        recommended_response: 'Review your last 3 calls. Identify the most common objection point. Apply a targeted experiment from the Sales Pitch or Objections lessons.',
      };
    }
  }

  // ── 7. LOW_CONTENT ──────────────────────────────────────────
  if (content_goal_daily_pace !== null && content_goal_daily_pace > 0) {
    const actualDailyContent = metrics7d.content_posted / 7;
    const contentPaceRatio = actualDailyContent / content_goal_daily_pace;

    if (contentPaceRatio < 0.5) {
      return {
        bottleneck_type: 'LOW_CONTENT',
        severity: 'warning',
        confidence: dataConfidence(metrics7d.days_with_data, 7),
        explanation: `Content output is at ${Math.round(contentPaceRatio * 100)}% of required pace. The top-of-funnel is being starved.`,
        evidence: [
          `7-day content posted: ${metrics7d.content_posted}`,
          `Required pace: ${content_goal_daily_pace.toFixed(1)} pieces/day`,
        ],
        recommended_response: 'Block time today to create and post content. Consistent content volume is required to maintain inbound lead flow.',
      };
    }
  }

  // ── 8. LOW_APPLICATION ──────────────────────────────────────
  if (learning.total_completed >= 10) {
    const appRate = learning.total_applied / learning.total_completed;
    if (appRate < 0.20) {
      return {
        bottleneck_type: 'LOW_APPLICATION',
        severity: 'info',
        confidence: 80,
        explanation: `${learning.total_completed} lessons completed but only ${learning.total_applied} applied (${Math.round(appRate * 100)}%). Knowledge is not being converted to action.`,
        evidence: [
          `Lessons completed: ${learning.total_completed}`,
          `Lessons applied (In Progress + Completed + Failed): ${learning.total_applied}`,
          `Application rate: ${Math.round(appRate * 100)}%`,
        ],
        recommended_response: 'Open the Application Engine. Pick the most relevant unstarted lesson and create a mission + experiment. Applied knowledge, not completed lessons, produces business results.',
      };
    }
  }

  // ── 9. LOW_EXECUTION ────────────────────────────────────────
  // Executed = Completed + Failed (a failed experiment IS execution)
  if (learning.total_applied >= 5) {
    const execRate = learning.total_executed / learning.total_applied;
    if (execRate < 0.20) {
      return {
        bottleneck_type: 'LOW_EXECUTION',
        severity: 'info',
        confidence: 80,
        explanation: `${learning.total_applied} lessons are applied but only ${learning.total_executed} have reached execution (Completed or Failed). ${learning.total_applied - learning.total_executed} experiments are still In Progress with no outcome.`,
        evidence: [
          `Applied (In Progress + Completed + Failed): ${learning.total_applied}`,
          `Executed (Completed + Failed): ${learning.total_executed}`,
          `Execution rate: ${Math.round(execRate * 100)}%`,
        ],
        recommended_response: 'Pick the oldest In Progress experiment. Execute it today. Record the outcome — a real-world failure still counts as executed, and still generates learning data.',
      };
    }
  }

  // ── 10. LOW_HOURS ───────────────────────────────────────────
  if (hours_goal_daily_pace !== null && hours_goal_daily_pace > 0) {
    const actualDailyHours = metrics7d.hours_worked / 7;
    const hoursPaceRatio = actualDailyHours / hours_goal_daily_pace;

    if (hoursPaceRatio < 0.5) {
      return {
        bottleneck_type: 'LOW_HOURS',
        severity: 'info',
        confidence: dataConfidence(metrics7d.days_with_data, 7),
        explanation: `Hours worked (${metrics7d.hours_worked.toFixed(1)}h in 7 days) are at ${Math.round(hoursPaceRatio * 100)}% of the required effort pace.`,
        evidence: [
          `7-day hours worked: ${metrics7d.hours_worked.toFixed(1)}h`,
          `Required daily pace: ${hours_goal_daily_pace.toFixed(1)}h/day`,
        ],
        recommended_response: 'Scheduled working hours are below target. Identify the highest-leverage work activity and block dedicated time today.',
      };
    }
  }

  // ── 11. ENGINE_RUNNING ──────────────────────────────────────
  const has30dData = metrics30d.days_with_data >= 14;
  return {
    bottleneck_type: 'ENGINE_RUNNING',
    severity: 'info',
    confidence: dataConfidence(metrics7d.days_with_data, 7),
    explanation: has30dData
      ? `No primary constraint detected. Leads, calls, close rate, content, application, and execution are all within acceptable ranges.`
      : `No critical constraint detected based on available data. Continue logging daily metrics for sharper diagnosis.`,
    evidence: metrics7d.days_with_data > 0
      ? [
          `7-day leads: ${metrics7d.leads}`,
          `7-day sales calls: ${metrics7d.sales_calls}`,
          `7-day closes: ${metrics7d.clients_closed}`,
        ]
      : [],
    recommended_response: 'Maintain current execution patterns. Review goal pacing to confirm you are on track.',
  };
}
