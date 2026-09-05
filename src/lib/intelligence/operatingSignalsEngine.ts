// ============================================================
// BUILD100 — Phase 8: Stop/Double-Down Signals Engine
//
// Generates operating signals from 30-day historical metrics.
// Signals are observations, not causal assertions.
// Language: "moved together", "did not increase" — not "caused".
//
// Double-down: an activity is consistently producing positive outcomes
//   AND increasing it is operationally feasible.
// Stop/Fix: an activity consumes meaningful effort
//   AND is repeatedly producing weak or declining outcomes.
//
// Returns at most 2 signals: one per type (strongest evidence first).
// Returns empty array if insufficient data (< 14 days).
// ============================================================

import type { OperatingSignal } from './intelligenceTypes';

interface SignalInputs {
  /** 7-day aggregated metrics */
  metrics7d: {
    leads: number;
    sales_calls: number;
    clients_closed: number;
    revenue: number;
    content_posted: number;
    hours_worked: number;
    days_with_data: number;
  };
  /** 30-day aggregated metrics */
  metrics30d: {
    leads: number;
    sales_calls: number;
    clients_closed: number;
    revenue: number;
    content_posted: number;
    hours_worked: number;
    days_with_data: number;
  };
  /** Previous 30-day period metrics (for WoW/MoM comparison) */
  prev30d: {
    leads: number;
    sales_calls: number;
    clients_closed: number;
    revenue: number;
    content_posted: number;
    hours_worked: number;
    days_with_data: number;
  } | null;
}

function pct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function computeOperatingSignals(inputs: SignalInputs): OperatingSignal[] {
  const { metrics7d, metrics30d, prev30d } = inputs;
  const signals: OperatingSignal[] = [];

  // Need at least 14 days of data for meaningful signals
  if (metrics30d.days_with_data < 14) return signals;

  const hasComparison = prev30d !== null && prev30d.days_with_data >= 14;

  // ── DOUBLE DOWN candidates ────────────────────────────────

  // 1. Strong close rate in the last 7 days with call volume
  if (metrics7d.sales_calls >= 3 && metrics7d.clients_closed > 0) {
    const closeRate7d = metrics7d.clients_closed / metrics7d.sales_calls;
    if (closeRate7d >= 0.20) {
      signals.push({
        type: 'DOUBLE_DOWN',
        title: 'DOUBLE DOWN — SALES CALLS',
        message: `Sales calls are converting at ${(closeRate7d * 100).toFixed(0)}% in the last 7 days (${metrics7d.clients_closed} closes from ${metrics7d.sales_calls} calls).`,
        evidence: `Current call volume supports more conversations. Increase prospecting to book additional calls at this close rate.`,
      });
    }
  }

  // 2. Revenue trending up MoM with improving close rate
  if (hasComparison && prev30d) {
    const revChange = pct(metrics30d.revenue, prev30d.revenue);
    const closeChange30d =
      prev30d.sales_calls > 0 && metrics30d.sales_calls > 0
        ? (metrics30d.clients_closed / metrics30d.sales_calls) - (prev30d.clients_closed / prev30d.sales_calls)
        : null;

    if (revChange !== null && revChange >= 20 && closeChange30d !== null && closeChange30d > 0) {
      if (!signals.some(s => s.type === 'DOUBLE_DOWN')) {
        signals.push({
          type: 'DOUBLE_DOWN',
          title: 'DOUBLE DOWN — CURRENT SALES APPROACH',
          message: `Revenue increased ${revChange}% and close rate improved over the last 30 days versus the prior period.`,
          evidence: `Revenue: ₹${metrics30d.revenue.toLocaleString('en-IN')} (was ₹${prev30d.revenue.toLocaleString('en-IN')}). These metrics moved together — maintain current approach.`,
        });
      }
    }
  }

  // ── STOP / FIX candidates ─────────────────────────────────

  // 1. High content volume but leads are not increasing
  if (metrics30d.content_posted >= 15 && metrics30d.leads < 5) {
    signals.push({
      type: 'STOP_FIX',
      title: 'STOP / FIX — CONTENT STRATEGY',
      message: `${metrics30d.content_posted} pieces of content posted in 30 days but only ${metrics30d.leads} leads generated.`,
      evidence: `Content volume and lead generation did not move together over this period. Review your CTA strategy, target audience, and DM follow-up process.`,
    });
  }

  // 2. High call volume but zero closes over 30 days (meaningful sample)
  if (metrics30d.sales_calls >= 15 && metrics30d.clients_closed === 0) {
    if (!signals.some(s => s.type === 'STOP_FIX')) {
      signals.push({
        type: 'STOP_FIX',
        title: 'STOP / FIX — PITCH OR OFFER',
        message: `${metrics30d.sales_calls} sales calls in 30 days with 0 closes. Call volume is not the constraint.`,
        evidence: `Activity volume is present. The pitch, offer, or qualification criteria needs review. Apply a specific experiment from the Sales Pitch or Objections modules.`,
      });
    }
  }

  // 3. Hours up but revenue flat or down (WoW comparison)
  if (hasComparison && prev30d) {
    const hoursChange = pct(metrics30d.hours_worked, prev30d.hours_worked);
    const revenueChange = pct(metrics30d.revenue, prev30d.revenue);

    if (
      hoursChange !== null && hoursChange >= 20 &&
      revenueChange !== null && revenueChange <= 0 &&
      !signals.some(s => s.type === 'STOP_FIX')
    ) {
      signals.push({
        type: 'STOP_FIX',
        title: 'STOP / FIX — EFFORT ALLOCATION',
        message: `Hours worked increased ${hoursChange}% while revenue was flat or declined over the same period.`,
        evidence: `Effort and output did not move together. Review which activities are consuming the most time and whether they are revenue-generating.`,
      });
    }
  }

  // Cap at 2 signals (1 per type) — strongest evidence first
  const doubleDown = signals.filter(s => s.type === 'DOUBLE_DOWN').slice(0, 1);
  const stopFix = signals.filter(s => s.type === 'STOP_FIX').slice(0, 1);
  return [...doubleDown, ...stopFix];
}
