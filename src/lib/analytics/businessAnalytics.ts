// ============================================================
// BUILD100 — Phase 7: Business Analytics
//
// Fetches business_metrics data for a date range + previous period
// and computes: metric totals, period comparisons, trend data,
// sales funnel, and dashboard momentum summary.
//
// No division by zero anywhere — all rates guard for 0 denominators.
// ALL TIME: previousBounds = null → all PeriodValues have previous = null.
// ============================================================

import { supabase } from '../supabase/client';
import type {
  BusinessMetricTotals,
  PeriodValue,
  TrendPoint,
  BusinessFunnel,
  MomentumSummary,
  DateBounds,
  AnalyticsDateRange,
} from './types';
import { bucketRecords, getBucketResolution } from './dateRanges';

// ── Raw row type ──────────────────────────────────────────────

interface RawMetricRow {
  date: string;
  leads: number;
  sales_calls: number;
  clients_closed: number;
  revenue: number;
  content_posted: number;
  hours_worked: number;
}

// ── Fetching ──────────────────────────────────────────────────

export async function fetchMetricRows(
  userId: string,
  bounds: DateBounds
): Promise<RawMetricRow[]> {
  const { data, error } = await supabase
    .from('business_metrics')
    .select('date, leads, sales_calls, clients_closed, revenue, content_posted, hours_worked')
    .eq('user_id', userId)
    .gte('date', bounds.start)
    .lte('date', bounds.end)
    .order('date', { ascending: true });

  if (error) {
    console.error('[businessAnalytics] fetchMetricRows:', error.message);
    return [];
  }
  return (data ?? []) as RawMetricRow[];
}

// ── Aggregation ───────────────────────────────────────────────

function sumRows(rows: RawMetricRow[]): Omit<RawMetricRow, 'date'> {
  return rows.reduce(
    (acc, r) => ({
      leads:          acc.leads          + (r.leads          ?? 0),
      sales_calls:    acc.sales_calls    + (r.sales_calls    ?? 0),
      clients_closed: acc.clients_closed + (r.clients_closed ?? 0),
      revenue:        acc.revenue        + Number(r.revenue        ?? 0),
      content_posted: acc.content_posted + (r.content_posted ?? 0),
      hours_worked:   acc.hours_worked   + Number(r.hours_worked   ?? 0),
    }),
    { leads: 0, sales_calls: 0, clients_closed: 0, revenue: 0, content_posted: 0, hours_worked: 0 }
  );
}

function makePeriodValue(current: number, previous: number | null): PeriodValue {
  if (previous === null) {
    return { current, previous: null, change: null, changePct: null };
  }
  const change = current - previous;
  const changePct = previous === 0 ? null : Math.round((change / previous) * 100);
  return { current, previous, change, changePct };
}

// ── Main export ───────────────────────────────────────────────

export interface BusinessAnalyticsResult {
  metrics: BusinessMetricTotals;
  revenueTrend: TrendPoint[];
  activityTrend: {
    leads: TrendPoint[];
    sales_calls: TrendPoint[];
    clients_closed: TrendPoint[];
    content_posted: TrendPoint[];
    hours_worked: TrendPoint[];
  };
  funnel: BusinessFunnel;
}

export async function getBusinessAnalytics(
  userId: string,
  range: AnalyticsDateRange,
  currentBounds: DateBounds,
  previousBounds: DateBounds | null
): Promise<BusinessAnalyticsResult> {
  const [currentRows, previousRows] = await Promise.all([
    fetchMetricRows(userId, currentBounds),
    previousBounds ? fetchMetricRows(userId, previousBounds) : Promise.resolve<RawMetricRow[]>([]),
  ]);

  const cur  = sumRows(currentRows);
  const prev = previousBounds ? sumRows(previousRows) : null;

  const metrics: BusinessMetricTotals = {
    leads:          makePeriodValue(cur.leads,          prev ? prev.leads          : null),
    sales_calls:    makePeriodValue(cur.sales_calls,    prev ? prev.sales_calls    : null),
    clients_closed: makePeriodValue(cur.clients_closed, prev ? prev.clients_closed : null),
    revenue:        makePeriodValue(cur.revenue,        prev ? prev.revenue        : null),
    content_posted: makePeriodValue(cur.content_posted, prev ? prev.content_posted : null),
    hours_worked:   makePeriodValue(cur.hours_worked,   prev ? prev.hours_worked   : null),
    revenue_per_client: cur.clients_closed > 0
      ? Math.round(cur.revenue / cur.clients_closed)
      : null,
  };

  // Build trend data
  const resolution = getBucketResolution(range);
  const buckets = bucketRecords(currentRows, resolution, currentBounds);

  function buildTrend(key: keyof Omit<RawMetricRow, 'date'>): TrendPoint[] {
    return buckets.map(b => ({
      label: b.label,
      date:  b.key,
      value: b.records.reduce((s, r) => s + (Number(r[key]) || 0), 0),
    }));
  }

  // Sales funnel
  const funnel: BusinessFunnel = {
    leads:           cur.leads,
    sales_calls:     cur.sales_calls,
    clients_closed:  cur.clients_closed,
    lead_to_call_rate:   cur.leads > 0
      ? Math.round((cur.sales_calls    / cur.leads)       * 1000) / 10
      : null,
    call_to_client_rate: cur.sales_calls > 0
      ? Math.round((cur.clients_closed / cur.sales_calls) * 1000) / 10
      : null,
    lead_to_client_rate: cur.leads > 0
      ? Math.round((cur.clients_closed / cur.leads)       * 1000) / 10
      : null,
  };

  return {
    metrics,
    revenueTrend: buildTrend('revenue'),
    activityTrend: {
      leads:          buildTrend('leads'),
      sales_calls:    buildTrend('sales_calls'),
      clients_closed: buildTrend('clients_closed'),
      content_posted: buildTrend('content_posted'),
      hours_worked:   buildTrend('hours_worked'),
    },
    funnel,
  };
}

// ── Dashboard momentum (30d vs prior 30d) ────────────────────

export async function getMomentumSummary(userId: string): Promise<MomentumSummary> {
  const end = new Date();
  const endStr = end.toISOString().split('T')[0];

  const curStart = new Date(end);
  curStart.setDate(curStart.getDate() - 29);
  const curStartStr = curStart.toISOString().split('T')[0];

  const prevEnd = new Date(curStart);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevEndStr = prevEnd.toISOString().split('T')[0];

  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - 29);
  const prevStartStr = prevStart.toISOString().split('T')[0];

  const [curRows, prevRows] = await Promise.all([
    fetchMetricRows(userId, { start: curStartStr,  end: endStr }),
    fetchMetricRows(userId, { start: prevStartStr, end: prevEndStr }),
  ]);

  const cur  = sumRows(curRows);
  const prev = sumRows(prevRows);

  const revenueChangePct = prev.revenue > 0
    ? Math.round(((cur.revenue - prev.revenue) / prev.revenue) * 100)
    : null;

  return {
    revenue_current:    cur.revenue,
    revenue_previous:   prev.revenue,
    revenue_change_pct: revenueChangePct,
    clients_current:    cur.clients_closed,
    clients_previous:   prev.clients_closed,
    clients_change:     cur.clients_closed - prev.clients_closed,
    total_applied:      0, // filled in by analyticsEngine after app records loaded
    has_data:           curRows.length > 0,
  };
}
