// ============================================================
// BUILD100 — Phase 7: Date Range Helpers
//
// All date calculations are deterministic YYYY-MM-DD string
// operations. No browser timezone assumptions.
//
// Rules:
//   - ALL TIME has no previous period (returns null)
//   - Previous period = same duration immediately before current start
//   - Week boundaries: Monday = week start, Sunday = week end
// ============================================================

import type { AnalyticsDateRange, DateBounds } from './types';

const MS_PER_DAY = 86_400_000;

function toYMD(d: Date): string {
  return d.toISOString().split('T')[0];
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

/** Returns today as YYYY-MM-DD */
export function todayYMD(): string {
  return toYMD(new Date());
}

/**
 * Returns {start, end} YYYY-MM-DD bounds for the selected range.
 * ALL TIME uses '2000-01-01' as the epoch start.
 */
export function getDateRange(range: AnalyticsDateRange): DateBounds {
  const end = toYMD(new Date());
  const s = startOfDay(new Date());

  switch (range) {
    case '7d':
      s.setDate(s.getDate() - 6);
      return { start: toYMD(s), end };
    case '30d':
      s.setDate(s.getDate() - 29);
      return { start: toYMD(s), end };
    case '90d':
      s.setDate(s.getDate() - 89);
      return { start: toYMD(s), end };
    case 'year':
      s.setFullYear(s.getFullYear() - 1);
      s.setDate(s.getDate() + 1);
      return { start: toYMD(s), end };
    case 'all':
      return { start: '2000-01-01', end };
  }
}

/**
 * Returns the previous period bounds (same duration, immediately before current start).
 * Returns null for ALL TIME — there is no valid comparison period concept.
 *
 * Display rule: when previousPeriod is null, show "Not applicable" for any change indicators.
 */
export function getPreviousPeriod(
  range: AnalyticsDateRange,
  current: DateBounds
): DateBounds | null {
  if (range === 'all') return null;

  const startMs = new Date(current.start + 'T00:00:00').getTime();
  const endMs   = new Date(current.end   + 'T00:00:00').getTime();
  // Duration in days (inclusive of both endpoints)
  const durationDays = Math.round((endMs - startMs) / MS_PER_DAY) + 1;

  const prevEnd = new Date(startMs - MS_PER_DAY);
  const prevStart = new Date(prevEnd.getTime() - (durationDays - 1) * MS_PER_DAY);

  return { start: toYMD(prevStart), end: toYMD(prevEnd) };
}

// ── Week boundaries ───────────────────────────────────────────

/** Returns the Monday of the week containing the given date */
function getMondayOf(d: Date): Date {
  const r = startOfDay(new Date(d));
  const dow = r.getDay(); // 0=Sun
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  r.setDate(r.getDate() - daysFromMon);
  return r;
}

/** Returns 'YYYY-MM-DD' of the Monday for a given date string */
export function getWeekKey(dateStr: string): string {
  return toYMD(getMondayOf(new Date(dateStr + 'T00:00:00')));
}

/** Returns 'YYYY-MM' for a date string */
export function getMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7);
}

// ── Bucket resolution ─────────────────────────────────────────

export type BucketResolution = 'day' | 'week' | 'month';

export function getBucketResolution(range: AnalyticsDateRange): BucketResolution {
  switch (range) {
    case '7d':   return 'day';
    case '30d':  return 'week';
    case '90d':  return 'week';
    case 'year': return 'month';
    case 'all':  return 'month';
  }
}

/** Human-readable label for a bucket key */
export function formatBucketLabel(key: string, resolution: BucketResolution): string {
  if (resolution === 'month') {
    const [yr, mo] = key.split('-');
    return new Date(Number(yr), Number(mo) - 1, 1).toLocaleDateString('en-US', {
      month: 'short', year: 'numeric',
    });
  }
  if (resolution === 'week') {
    const mon = new Date(key + 'T00:00:00');
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const monStr = mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const sunDay = sun.getDate();
    return `${monStr}–${sunDay}`;
  }
  // day
  return new Date(key + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

// ── Generic bucketing ─────────────────────────────────────────

export interface Bucket<T> {
  key: string;    // YYYY-MM-DD (day/week) or YYYY-MM (month)
  label: string;
  records: T[];
}

/**
 * Groups records (each with a 'date: string' field) into ordered buckets.
 * Pre-populates all buckets in the range so empty periods appear as 0.
 */
export function bucketRecords<T extends { date: string }>(
  records: T[],
  resolution: BucketResolution,
  bounds: DateBounds
): Bucket<T>[] {
  const map = new Map<string, T[]>();

  const start = new Date(bounds.start + 'T00:00:00');
  const end   = new Date(bounds.end   + 'T00:00:00');

  // Pre-populate buckets
  if (resolution === 'day') {
    const cur = startOfDay(new Date(start));
    while (cur <= end) {
      map.set(toYMD(cur), []);
      cur.setDate(cur.getDate() + 1);
    }
  } else if (resolution === 'week') {
    const cur = getMondayOf(start);
    const lastMon = getMondayOf(end);
    while (cur <= lastMon) {
      map.set(toYMD(cur), []);
      cur.setDate(cur.getDate() + 7);
    }
  } else {
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cur <= endMonth) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, []);
      cur.setMonth(cur.getMonth() + 1);
    }
  }

  // Assign records
  for (const r of records) {
    const key = resolution === 'day'
      ? r.date
      : resolution === 'week'
        ? getWeekKey(r.date)
        : getMonthKey(r.date);
    const bucket = map.get(key);
    if (bucket) bucket.push(r);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, recs]) => ({ key, label: formatBucketLabel(key, resolution), records: recs }));
}

// ── Last N complete weeks ─────────────────────────────────────

/** Returns the last N complete Monday–Sunday week bounds, oldest first */
export function getLastNWeeks(n: number): { weekStart: string; weekEnd: string; label: string }[] {
  const today = startOfDay(new Date());
  const dow = today.getDay(); // 0=Sun

  // Most recently completed Sunday
  const daysToLastSunday = dow === 0 ? 7 : dow;
  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - daysToLastSunday);

  const weeks: { weekStart: string; weekEnd: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const sunday = new Date(lastSunday);
    sunday.setDate(lastSunday.getDate() - i * 7);
    const monday = new Date(sunday);
    monday.setDate(sunday.getDate() - 6);

    const monStr = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const sunDay = sunday.getDate();
    weeks.push({
      weekStart: toYMD(monday),
      weekEnd:   toYMD(sunday),
      label:     `${monStr}–${sunDay}`,
    });
  }
  return weeks;
}
