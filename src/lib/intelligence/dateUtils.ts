// ============================================================
// BUILD100 — Phase 8: Date Utilities for Intelligence Layer
//
// Single consistent local-calendar-date strategy.
// All date comparisons use YYYY-MM-DD strings derived from
// the same todayLocalYMD() function.
//
// Reuses approach established in Phase 7 dateRanges.ts:
//   - toYMD() → ISO string slice at 'T' boundary
//   - All dates parsed with explicit 'T00:00:00' suffix
//     to prevent UTC midnight offset errors.
//
// IMPORTANT: Never use new Date(dateStr) without T00:00:00
// on a YYYY-MM-DD string — this parses as UTC midnight and
// may be off by one day in IST (+05:30) or any +UTC zone.
// ============================================================

/**
 * Returns today's date as 'YYYY-MM-DD' using the local timezone.
 * Equivalent to Phase 7's todayYMD() — use this as the single
 * source of truth for "today" in all intelligence comparisons.
 */
export function todayLocalYMD(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses a YYYY-MM-DD string as local midnight.
 * Prevents UTC off-by-one in IST (+05:30) and other UTC+ zones.
 */
export function parseLocalDate(ymd: string): Date {
  return new Date(ymd + 'T00:00:00');
}

/**
 * Returns the YYYY-MM-DD of (today + offsetDays).
 * Negative offset = past days.
 */
export function offsetDate(ymd: string, offsetDays: number): string {
  const d = parseLocalDate(ymd);
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns the number of calendar days between two YYYY-MM-DD strings.
 * Positive when end > start.
 */
export function daysBetween(start: string, end: string): number {
  const s = parseLocalDate(start).getTime();
  const e = parseLocalDate(end).getTime();
  return Math.round((e - s) / 86_400_000);
}

/**
 * Returns the local day of the week (0=Sun, 1=Mon, ..., 6=Sat).
 * Used for "is it Thursday or later" weekly review logic.
 */
export function localDayOfWeek(): number {
  return new Date().getDay();
}

/**
 * Returns the Monday of the current week as YYYY-MM-DD.
 */
export function currentWeekMonday(): string {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  today.setDate(today.getDate() - daysFromMon);
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
