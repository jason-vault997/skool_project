// ============================================================
// BUILD100 — Phase 6: Operating Signal Engine
//
// Deterministic rule-based signals derived from weekly metrics.
// No AI. No probabilistic inference. No invented numbers.
//
// Minimum sample sizes are enforced to prevent misleading signals
// from small datasets (e.g., 1 lead triggering a pipeline signal).
//
// All signals are:
//   - Named with a clear human-readable label
//   - Backed by a specific quantitative rule
//   - Easily extendable (just add a new rule block)
// ============================================================

export interface WeekMetrics {
  leads:          number;
  sales_calls:    number;
  clients_closed: number;
  revenue:        number;
  content_posted: number;
  hours_worked:   number;
}

export type SignalSeverity = 'info' | 'warning' | 'alert';

export interface OperatingSignal {
  id:       string;
  label:    string;
  message:  string;
  severity: SignalSeverity;
}

/**
 * Computes deterministic operating signals from weekly metrics.
 *
 * Rules are evaluated in order. Multiple signals can fire simultaneously.
 * The `previous` param is reserved for future WoW-based rules; currently unused.
 *
 * Minimum sample thresholds:
 *   Pipeline Gap:    leads >= 5 (meaningful pipeline, not 1-2 random leads)
 *   Conversion Btl: sales_calls >= 5 (enough calls to measure conversion rate)
 *   Lead Gen Btl:   clients_closed >= 1 (actually closing to confirm closing works)
 *   Execution Gap:  hours_worked >= 20 (significant time investment showing low output)
 *   Content Gap:    content_posted >= 5 (consistent content with low lead conversion)
 *   Strong Week:    clients_closed > 0 + leads >= 5 + sales_calls >= 3
 */
export function computeOperatingSignals(
  current: WeekMetrics,
  _previous: WeekMetrics | null
): OperatingSignal[] {
  const signals: OperatingSignal[] = [];
  const { leads, sales_calls, clients_closed, content_posted, hours_worked } = current;

  // ── PIPELINE GAP ──────────────────────────────────────────
  // You have a meaningful pipeline but aren't following up.
  // Threshold: 5+ leads, follow-up rate < 30%
  if (leads >= 5 && sales_calls / leads < 0.3) {
    signals.push({
      id:       'pipeline-gap',
      label:    'PIPELINE GAP',
      message:  `You have ${leads} leads but only made ${sales_calls} calls. Your pipeline is growing faster than your follow-up.`,
      severity: 'warning',
    });
  }

  // ── CONVERSION BOTTLENECK ────────────────────────────────
  // Calling frequently but not closing — pitch or offer problem.
  // Threshold: 5+ calls, close rate < 10%
  if (sales_calls >= 5 && (clients_closed / sales_calls) < 0.1) {
    signals.push({
      id:       'conversion-bottleneck',
      label:    'CONVERSION BOTTLENECK',
      message:  `${sales_calls} calls, ${clients_closed} closes. Activity isn't the problem — the pitch or offer is.`,
      severity: 'warning',
    });
  }

  // ── LEAD GEN BOTTLENECK ───────────────────────────────────
  // Actually closing deals but not enough leads coming in.
  // Threshold: at least 1 close (confirms closing works), leads < 3
  if (clients_closed >= 1 && leads < 3) {
    signals.push({
      id:       'lead-gen-bottleneck',
      label:    'LEAD GEN BOTTLENECK',
      message:  `You closed ${clients_closed} client${clients_closed > 1 ? 's' : ''} this week but only generated ${leads} lead${leads !== 1 ? 's' : ''}. Closing isn't the problem — pipeline volume is.`,
      severity: 'info',
    });
  }

  // ── EXECUTION GAP ─────────────────────────────────────────
  // Significant hours worked but business output numbers are very low.
  // Threshold: 20+ hours, total visible output (leads + calls + content) < 5
  if (hours_worked >= 20 && (leads + sales_calls + content_posted) < 5) {
    signals.push({
      id:       'execution-gap',
      label:    'EXECUTION GAP',
      message:  `${hours_worked} hours worked, but leads, calls, and content posted total only ${leads + sales_calls + content_posted}. Effort isn't the problem — direction is.`,
      severity: 'alert',
    });
  }

  // ── CONTENT / LEAD GAP ────────────────────────────────────
  // Posting consistently but content isn't converting to pipeline.
  // Threshold: 5+ pieces of content, leads < 3
  if (content_posted >= 5 && leads < 3) {
    signals.push({
      id:       'content-lead-gap',
      label:    'CONTENT / LEAD GAP',
      message:  `${content_posted} pieces of content this week but only ${leads} lead${leads !== 1 ? 's' : ''}. Check your CTA and DM follow-up strategy.`,
      severity: 'info',
    });
  }

  // ── STRONG WEEK ───────────────────────────────────────────
  // All key signals positive — engine is running.
  // Threshold: closed at least 1, 5+ leads, 3+ calls
  // Note: suppress if any warning/alert signals fired (they take priority)
  const hasProblems = signals.some(s => s.severity === 'warning' || s.severity === 'alert');
  if (!hasProblems && clients_closed > 0 && leads >= 5 && sales_calls >= 3) {
    signals.push({
      id:       'strong-week',
      label:    'ENGINE RUNNING',
      message:  `${leads} leads, ${sales_calls} calls, ${clients_closed} close${clients_closed > 1 ? 's' : ''}. Clean week. Keep this exact pattern.`,
      severity: 'info',
    });
  }

  return signals;
}
