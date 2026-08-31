import { supabase } from '../supabase/client';
import type { BusinessMetric, AllTimeBusinessStats } from '../supabase/types';

interface MetricRow {
  leads: number;
  sales_calls: number;
  clients_closed: number;
  revenue: number;
  content_posted: number;
  hours_worked: number;
}

export async function getMetricsForToday(userId: string): Promise<BusinessMetric | null> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('business_metrics')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('[businessMetrics] getMetricsForToday error:', error.message);
    return null;
  }

  return data as BusinessMetric;
}

export async function getMetricsHistory(userId: string, limitDays = 30): Promise<BusinessMetric[]> {
  const { data, error } = await supabase
    .from('business_metrics')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limitDays);

  if (error) {
    console.error('[businessMetrics] getMetricsHistory error:', error.message);
    return [];
  }

  return (data ?? []) as BusinessMetric[];
}

export async function getAllTimeMetrics(userId: string): Promise<AllTimeBusinessStats> {
  const empty: AllTimeBusinessStats = {
    totalLeads: 0,
    totalSalesCalls: 0,
    totalClientsClosed: 0,
    totalRevenue: 0,
    totalContentPosted: 0,
    totalHoursWorked: 0,
  };

  const { data, error } = await supabase
    .from('business_metrics')
    .select('leads, sales_calls, clients_closed, revenue, content_posted, hours_worked')
    .eq('user_id', userId);

  if (error) {
    console.error('[businessMetrics] getAllTimeMetrics error:', error.message);
    return empty;
  }

  if (!data || data.length === 0) return empty;

  const rows = data as MetricRow[];

  return rows.reduce(
    (acc, row) => ({
      totalLeads:          acc.totalLeads + (row.leads ?? 0),
      totalSalesCalls:     acc.totalSalesCalls + (row.sales_calls ?? 0),
      totalClientsClosed:  acc.totalClientsClosed + (row.clients_closed ?? 0),
      totalRevenue:        acc.totalRevenue + Number(row.revenue ?? 0),
      totalContentPosted:  acc.totalContentPosted + (row.content_posted ?? 0),
      totalHoursWorked:    acc.totalHoursWorked + Number(row.hours_worked ?? 0),
    }),
    empty
  );
}
