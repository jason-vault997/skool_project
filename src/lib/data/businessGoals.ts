// ============================================================
// BUILD100 — Phase 6: Business Goals Data Access Layer
// All Supabase reads/writes for business_goals.
//
// KEY RULE: For connected goal types (revenue, clients, leads,
// sales_calls, content, hours), NEVER use current_value from
// the DB row. Always call calcConnectedCurrentValue() instead.
// Only 'custom' goals use the stored current_value field.
// ============================================================

import { supabase } from '../supabase/client';
import type { BusinessGoal, GoalType, GoalStatus } from '../supabase/types';

const TABLE = 'business_goals';
const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, normal: 2 };

// ── Column map for connected goal types ──────────────────────
const CONNECTED_COLUMN: Partial<Record<GoalType, string>> = {
  revenue:     'revenue',
  clients:     'clients_closed',
  leads:       'leads',
  sales_calls: 'sales_calls',
  content:     'content_posted',
  hours:       'hours_worked',
};

// ── Read operations ──────────────────────────────────────────

export async function getActiveGoals(userId: string): Promise<BusinessGoal[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[businessGoals] getActiveGoals:', error.message);
    return [];
  }
  return (data ?? []) as BusinessGoal[];
}

export async function getAllGoals(userId: string): Promise<BusinessGoal[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[businessGoals] getAllGoals:', error.message);
    return [];
  }
  return (data ?? []) as BusinessGoal[];
}

/**
 * Returns the single highest-priority active goal.
 * Priority order: critical → high → normal.
 * Within the same priority, earliest target_date wins.
 * Goals without target_date come after goals with target_date.
 */
export async function getTopGoal(userId: string): Promise<BusinessGoal | null> {
  const goals = await getActiveGoals(userId);
  if (goals.length === 0) return null;

  return [...goals].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 2;
    const pb = PRIORITY_ORDER[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;
    if (a.target_date && b.target_date) return a.target_date.localeCompare(b.target_date);
    if (a.target_date) return -1;
    if (b.target_date) return 1;
    return 0;
  })[0];
}

// ── Dynamic current-value calculation ────────────────────────

/**
 * For connected goal types, aggregate the relevant business_metrics
 * column over the goal's date range.
 *
 * Date range logic:
 *   - If start_date is set: aggregate from start_date onwards
 *   - Cap at min(target_date, today) — never count future metrics
 *   - If start_date is null: no lower bound (all-time)
 *
 * Returns 0 for 'custom' goal type (caller should use current_value directly).
 */
export async function calcConnectedCurrentValue(
  userId: string,
  goalType: GoalType,
  startDate: string | null,
  targetDate: string | null
): Promise<number> {
  if (goalType === 'custom') return 0;

  const col = CONNECTED_COLUMN[goalType];
  if (!col) return 0;

  const today = new Date().toISOString().split('T')[0];
  // Cap: if target_date is in the past, stop counting there; otherwise use today
  const capDate = targetDate && targetDate < today ? targetDate : today;

  let query = supabase
    .from('business_metrics')
    .select(col)
    .eq('user_id', userId)
    .lte('date', capDate);

  if (startDate) {
    query = query.gte('date', startDate);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[businessGoals] calcConnectedCurrentValue:', error.message);
    return 0;
  }

  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  return rows.reduce(
    (sum: number, row: Record<string, unknown>) => sum + (Number(row[col]) || 0),
    0
  );
}

/**
 * Enrich a goal with its computed current value.
 * For 'custom' goals uses the stored current_value.
 * For connected types, queries business_metrics.
 */
export async function getGoalCurrentValue(
  userId: string,
  goal: BusinessGoal
): Promise<number> {
  if (goal.goal_type === 'custom') return goal.current_value;
  return calcConnectedCurrentValue(userId, goal.goal_type, goal.start_date, goal.target_date);
}

// ── Write operations ─────────────────────────────────────────

export async function createGoal(
  userId: string,
  data: {
    title: string;
    goal_type: GoalType;
    target_value: number;
    unit?: string;
    description?: string;
    start_date?: string | null;
    target_date?: string | null;
    priority?: 'critical' | 'high' | 'normal';
  }
): Promise<BusinessGoal | null> {
  const { data: created, error } = await supabase
    .from(TABLE)
    .insert({
      user_id:       userId,
      title:         data.title,
      goal_type:     data.goal_type,
      target_value:  data.target_value,
      current_value: 0,
      unit:          data.unit ?? null,
      description:   data.description ?? null,
      start_date:    data.start_date ?? null,
      target_date:   data.target_date ?? null,
      priority:      data.priority ?? 'normal',
      status:        'active',
    })
    .select()
    .single();

  if (error) {
    console.error('[businessGoals] createGoal:', error.message);
    return null;
  }
  return created as BusinessGoal;
}

export async function updateGoal(
  goalId: string,
  data: Partial<Pick<BusinessGoal,
    'title' | 'description' | 'goal_type' | 'target_value' | 'current_value' |
    'unit' | 'start_date' | 'target_date' | 'status' | 'priority'
  >>
): Promise<BusinessGoal | null> {
  const { data: updated, error } = await supabase
    .from(TABLE)
    .update(data)
    .eq('id', goalId)
    .select()
    .single();

  if (error) {
    console.error('[businessGoals] updateGoal:', error.message);
    return null;
  }
  return updated as BusinessGoal;
}

/** Mark goal as completed. Does NOT auto-complete — must be called explicitly by the user. */
export async function completeGoal(goalId: string): Promise<BusinessGoal | null> {
  return updateGoal(goalId, { status: 'completed' as GoalStatus });
}

export async function pauseGoal(goalId: string): Promise<BusinessGoal | null> {
  return updateGoal(goalId, { status: 'paused' as GoalStatus });
}

export async function abandonGoal(goalId: string): Promise<BusinessGoal | null> {
  return updateGoal(goalId, { status: 'abandoned' as GoalStatus });
}

export async function reactivateGoal(goalId: string): Promise<BusinessGoal | null> {
  return updateGoal(goalId, { status: 'active' as GoalStatus });
}

/** For custom goals only — update the manually-tracked current_value. */
export async function updateCustomCurrentValue(
  goalId: string,
  value: number
): Promise<BusinessGoal | null> {
  return updateGoal(goalId, { current_value: Math.max(0, value) });
}
