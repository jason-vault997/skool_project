// ============================================================
// BUILD100 — Phase 9: Calendar Page (Complete Rewrite)
//
// Purpose: Personal daily operating system.
//   - Check in / take break / resume / check out
//   - Multiple sessions per day
//   - Overnight session support (attributed to local start date)
//   - Operating day number from configured start date
//   - Streak display (from operating_days data)
//   - This-week compact day list
//   - Daily execution items (up to 3)
//   - Month summary
//   - Configure operating start date
//
// NOT a training session viewer (sessions table removed from here).
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, Check } from 'lucide-react';
import { useAuth } from '../lib/auth/AuthContext';
import { getOrCreateOperatorConfig, setOperatingStartDate } from '../lib/data/operatorConfig';
import {
  localDateInTz, formatDateInTz, parseLocalDate,
  getOperatingDaysInRange, markDayStarted, updateDayWorkMinutes,
  calculateStreakFromDays, syncStreakToProfile,
} from '../lib/data/operatingDays';
import {
  getActiveWorkSession,
  getBreaksForSession, getActiveBreak,
  checkIn, checkOut, startBreak, endBreak,
  formatWorkDuration, calcLiveElapsedMinutes,
  computeTotalWorkMinutesForDate,
} from '../lib/data/workSessions';
import { supabase } from '../lib/supabase/client';
import type { OperatorConfig, OperatingDay, WorkSession, WorkBreak } from '../lib/supabase/types';
import './CalendarPage.css';

// ── Helpers ───────────────────────────────────────────────────


function computeOperatingDayNumber(date: string, startDate: string): number {
  const d1 = parseLocalDate(startDate).getTime();
  const d2 = parseLocalDate(date).getTime();
  return Math.floor((d2 - d1) / 86_400_000) + 1;
}

function getWeekDates(todayLocal: string): string[] {
  const d = parseLocalDate(todayLocal);
  const dow = d.getDay(); // 0=Sun
  const monday = new Date(d);
  monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd.toISOString().split('T')[0];
  });
}


function getMonthRange(tz: string): { fromDate: string; toDate: string } {
  const now = new Date();
  const year = parseInt(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: tz }).format(now));
  const month = parseInt(new Intl.DateTimeFormat('en', { month: 'numeric', timeZone: tz }).format(now)) - 1;
  const lastDay = new Date(year, month + 1, 0);
  return {
    fromDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
    toDate: formatDateInTz(lastDay, tz),
  };
}

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ── Component ─────────────────────────────────────────────────

export const CalendarPage: React.FC = () => {
  const { user } = useAuth();

  // Config + timezone state
  const [config, setConfig] = useState<OperatorConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [startDateInput, setStartDateInput] = useState('');

  // Today
  const tz = config?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const todayLocal = config ? localDateInTz(tz) : new Date().toISOString().split('T')[0];

  // Work session state
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [activeBreakRec, setActiveBreakRec] = useState<WorkBreak | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [liveWorkMinutes, setLiveWorkMinutes] = useState(0);
  const [liveBreakMinutes, setLiveBreakMinutes] = useState(0);

  // Operating days
  const [todayDay, setTodayDay] = useState<OperatingDay | null>(null);
  const [weekDays, setWeekDays] = useState<OperatingDay[]>([]);
  const [streakCurrent, setStreakCurrent] = useState(0);
  const [streakBest, setStreakBest] = useState(0);

  // Monthly summary
  const [monthTotalMins, setMonthTotalMins] = useState(0);
  const [monthOpDays, setMonthOpDays] = useState(0);
  const [monthMissed, setMonthMissed] = useState(0);

  // Daily execution items (up to 3)
  const [execItems, setExecItems] = useState<{ slot: 1 | 2 | 3; text: string; completed: boolean }[]>([
    { slot: 1, text: '', completed: false },
    { slot: 2, text: '', completed: false },
    { slot: 3, text: '', completed: false },
  ]);
  // execSaving: reserved for future use (no visible loading state needed for exec items)

  // Live timer
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Data Loading ───────────────────────────────────────────

  const loadConfig = useCallback(async () => {
    if (!user) return;
    setConfigLoading(true);
    const cfg = await getOrCreateOperatorConfig(user.id);
    setConfig(cfg);
    setConfigLoading(false);
  }, [user]);

  const loadSessionState = useCallback(async () => {
    if (!user) return;
    setSessionLoading(true);
    const session = await getActiveWorkSession(user.id);
    setActiveSession(session);
    if (session) {
      const activeBreak = await getActiveBreak(session.id, user.id);
      setActiveBreakRec(activeBreak);
    } else {
      setActiveBreakRec(null);
    }
    setSessionLoading(false);
  }, [user]);

  const loadOperatingDays = useCallback(async () => {
    if (!user || !config) return;
    const currentTz = config.timezone;
    const today = localDateInTz(currentTz);
    const weekDates = getWeekDates(today);
    const weekFrom = weekDates[0];

    const startDate = config.operating_start_date ?? today;
    const effectiveFrom = startDate < weekFrom ? startDate : weekFrom;

    const { fromDate: monthFrom, toDate: monthTo } = getMonthRange(currentTz);
    const rangeFrom = effectiveFrom < monthFrom ? effectiveFrom : monthFrom;

    const allDays = await getOperatingDaysInRange(user.id, rangeFrom, today);
    const dayMap = new Map(allDays.map(d => [d.date, d]));

    setTodayDay(dayMap.get(today) ?? null);
    setWeekDays(weekDates.map(d => dayMap.get(d) ?? {
      id: '', user_id: user.id, date: d, status: 'not_started',
      total_work_minutes: 0, notes: null, created_at: '', updated_at: '',
    }));

    // Streak
    const { currentStreak, bestStreak, totalOperatingDays, missedDays: missed } =
      calculateStreakFromDays(allDays, today, startDate);
    setStreakCurrent(currentStreak);
    setStreakBest(bestStreak);

    // Month summary
    const monthDays = allDays.filter(d => d.date >= monthFrom && d.date <= monthTo);
    const mTotal = monthDays.reduce((s, d) => s + d.total_work_minutes, 0);
    setMonthTotalMins(mTotal);
    setMonthOpDays(totalOperatingDays);
    setMonthMissed(missed);
  }, [user, config]);

  const loadExecItems = useCallback(async () => {
    if (!user) return;
    const currentTz = config?.timezone ?? tz;
    const today = localDateInTz(currentTz);
    const { data } = await supabase
      .from('daily_execution_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .order('slot');

    const rows = (data ?? []) as { slot: number; text: string; completed: boolean }[];
    const items: { slot: 1 | 2 | 3; text: string; completed: boolean }[] = [
      { slot: 1, text: '', completed: false },
      { slot: 2, text: '', completed: false },
      { slot: 3, text: '', completed: false },
    ];
    for (const row of rows) {
      const idx = row.slot - 1;
      if (idx >= 0 && idx < 3) {
        items[idx] = { slot: row.slot as 1 | 2 | 3, text: row.text, completed: row.completed };
      }
    }
    setExecItems(items);
  }, [user, config, tz]);

  useEffect(() => { loadConfig(); }, [loadConfig]);
  useEffect(() => { if (config) loadSessionState(); }, [config, loadSessionState]);
  useEffect(() => { if (config) loadOperatingDays(); }, [config, loadOperatingDays]);
  useEffect(() => { if (config) loadExecItems(); }, [config, loadExecItems]);

  // ── Live Timer ─────────────────────────────────────────────

  useEffect(() => {
    if (activeSession && !activeSession.ended_at) {
      timerRef.current = setInterval(() => {
        const { workMinutes, breakMinutes } = calcLiveElapsedMinutes(
          activeSession,
          activeBreakRec?.started_at ?? null
        );
        setLiveWorkMinutes(workMinutes);
        setLiveBreakMinutes(breakMinutes);
      }, 10_000); // update every 10 seconds

      // Immediate first tick
      const { workMinutes, breakMinutes } = calcLiveElapsedMinutes(
        activeSession,
        activeBreakRec?.started_at ?? null
      );
      setLiveWorkMinutes(workMinutes);
      setLiveBreakMinutes(breakMinutes);
    } else {
      setLiveWorkMinutes(0);
      setLiveBreakMinutes(0);
    }

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeSession, activeBreakRec]);

  // ── Actions ────────────────────────────────────────────────

  const handleCheckIn = async () => {
    if (!user || !config || activeSession) return;
    const currentTz = config.timezone;
    const today = localDateInTz(currentTz);

    const session = await checkIn(user.id, currentTz);
    if (!session) return;

    setActiveSession(session);
    setActiveBreakRec(null);

    // Mark operating day as started
    const day = await markDayStarted(user.id, today);
    setTodayDay(day);

    // Sync streak
    await loadOperatingDays();
  };

  const handleTakeBreak = async () => {
    if (!user || !activeSession || activeBreakRec) return;
    const breakRec = await startBreak(user.id, activeSession.id);
    setActiveBreakRec(breakRec);
  };

  const handleResume = async () => {
    if (!user || !activeSession || !activeBreakRec) return;
    const closed = await endBreak(user.id, activeBreakRec, activeSession);
    if (!closed) return;

    // Refresh session with updated break_minutes
    const updated = await getActiveWorkSession(user.id);
    setActiveSession(updated);
    setActiveBreakRec(null);
  };

  const handleCheckOut = async () => {
    if (!user || !config || !activeSession) return;
    const currentTz = config.timezone;
    const today = localDateInTz(currentTz);

    // If on break, end break first
    if (activeBreakRec) {
      await endBreak(user.id, activeBreakRec, activeSession);
    }

    const allBreaks = await getBreaksForSession(activeSession.id, user.id);
    const result = await checkOut(user.id, activeSession, allBreaks);
    if (!result) return;

    setActiveSession(null);
    setActiveBreakRec(null);

    // Recompute total work minutes for this day
    const totalMins = await computeTotalWorkMinutesForDate(user.id, today);
    await updateDayWorkMinutes(user.id, today, totalMins, 'completed');

    // Auto-write to business_metrics.hours_worked
    const hoursWorked = parseFloat((totalMins / 60).toFixed(2));
    await supabase
      .from('business_metrics')
      .upsert(
        { user_id: user.id, date: today, hours_worked: hoursWorked,
          leads: 0, sales_calls: 0, clients_closed: 0, revenue: 0, content_posted: 0 },
        { onConflict: 'user_id,date', ignoreDuplicates: false }
      );

    // Sync streak to profile
    await loadOperatingDays();
    const allDays = await getOperatingDaysInRange(
      user.id,
      config.operating_start_date ?? today,
      today
    );
    const { currentStreak } = calculateStreakFromDays(
      allDays, today, config.operating_start_date ?? today
    );
    await syncStreakToProfile(user.id, currentStreak);
  };

  const handleSetStartDate = async () => {
    if (!user || !startDateInput) return;
    await setOperatingStartDate(user.id, startDateInput);
    const newCfg = await getOrCreateOperatorConfig(user.id);
    setConfig(newCfg);
    setShowStartDatePicker(false);
    await loadOperatingDays();
  };

  // Exec items save
  const saveExecItem = async (slot: 1 | 2 | 3, text: string, completed: boolean) => {
    if (!user) return;
    const currentTz = config?.timezone ?? tz;
    const dateForSave = localDateInTz(currentTz);
    if (text.trim() === '') {
      await supabase.from('daily_execution_items')
        .delete().eq('user_id', user.id).eq('date', dateForSave).eq('slot', slot);
    } else {
      await supabase.from('daily_execution_items').upsert(
        { user_id: user.id, date: dateForSave, slot, text: text.trim(), completed,
          updated_at: new Date().toISOString() },
        { onConflict: 'user_id,date,slot' }
      );
    }
  };

  // ── Computed values ────────────────────────────────────────

  const isCheckedIn = !!activeSession && !activeSession.ended_at;
  const isOnBreak = isCheckedIn && !!activeBreakRec;
  const isWorking = isCheckedIn && !isOnBreak;

  const startDate = config?.operating_start_date;
  const dayNumber = startDate ? computeOperatingDayNumber(todayLocal, startDate) : null;

  const todayWorkMins = isCheckedIn ? liveWorkMinutes : (todayDay?.total_work_minutes ?? 0);

  // Month average
  const currentDay = parseInt(todayLocal.split('-')[2]);
  const monthAvgMins = currentDay > 0 ? Math.round(monthTotalMins / currentDay) : 0;

  // Week day dates (computed inline in JSX)

  // ── Render ─────────────────────────────────────────────────

  if (configLoading || sessionLoading) {
    return (
      <div className="cal-page">
        <div className="cal-loading">Loading Calendar…</div>
      </div>
    );
  }

  const checkInTime = activeSession
    ? new Date(activeSession.started_at).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: tz
      })
    : null;

  const monthName = new Date().toLocaleString('default', { month: 'long' });
  const monthYear = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="cal-page">

      {/* ── Header ── */}
      <div className="cal-header-row">
        <h2 className="cal-title">CALENDAR</h2>
        <span className="cal-month-label">{monthYear}</span>
      </div>

      {/* ── Operating Period Banner ── */}
      <div className="cal-period-card skool-card">
        <div className="cal-period-left">
          {dayNumber !== null ? (
            <span className="cal-day-num">DAY {dayNumber}</span>
          ) : (
            <span className="cal-day-num cal-day-num-empty">DAY —</span>
          )}
          {startDate && (
            <span className="cal-period-meta">Started {new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          )}
        </div>
        <div className="cal-period-center">
          <span className="cal-streak-badge">{streakCurrent} DAY STREAK</span>
          {streakBest > 0 && streakBest > streakCurrent && (
            <span className="cal-best-streak">Best: {streakBest}</span>
          )}
        </div>
        <button
          className="cal-config-btn"
          onClick={() => {
            setStartDateInput(startDate ?? todayLocal);
            setShowStartDatePicker(v => !v);
          }}
          title="Configure operating start date"
        >
          <Settings size={14} />
          <span>{startDate ? 'Configure' : 'Set Day 1'}</span>
        </button>
      </div>

      {/* Start date picker */}
      {showStartDatePicker && (
        <div className="cal-datepicker-card skool-card">
          <p className="cal-dp-label">SET OPERATING START DATE (DAY 1)</p>
          <div className="cal-dp-row">
            <input
              type="date"
              className="cal-dp-input"
              value={startDateInput}
              max={todayLocal}
              onChange={e => setStartDateInput(e.target.value)}
            />
            <button className="btn btn-primary btn-sm" onClick={handleSetStartDate}>
              Confirm
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setShowStartDatePicker(false)}>
              Cancel
            </button>
          </div>
          <p className="cal-dp-note">This date becomes Day 1. All subsequent days are numbered automatically.</p>
        </div>
      )}

      {/* ── TODAY ── */}
      <div className="cal-today-card skool-card">
        <div className="cal-today-header">
          <span className="cal-today-label">TODAY</span>
          <span className="cal-today-date">
            {new Date(todayLocal + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long', month: 'short', day: 'numeric'
            })}
          </span>
        </div>

        {/* Check-in / Working / Break state */}
        {!isCheckedIn && (
          <div className="cal-checkin-block">
            <button className="btn btn-primary cal-checkin-btn" onClick={handleCheckIn}>
              CHECK IN
            </button>
            {todayWorkMins > 0 && (
              <p className="cal-today-prev">
                Previous sessions: {formatWorkDuration(todayWorkMins)} logged
              </p>
            )}
          </div>
        )}

        {isWorking && (
          <div className="cal-working-block">
            <div className="cal-state-badge cal-state-working">WORKING</div>
            <div className="cal-session-meta">
              <span>Started {checkInTime}</span>
              <span className="cal-live-time">{formatWorkDuration(liveWorkMinutes)} active</span>
            </div>
            <div className="cal-session-actions">
              <button className="btn btn-outline btn-sm" onClick={handleTakeBreak}>
                Take Break
              </button>
              <button className="btn btn-dark btn-sm" onClick={handleCheckOut}>
                Check Out
              </button>
            </div>
          </div>
        )}

        {isOnBreak && (
          <div className="cal-break-block">
            <div className="cal-state-badge cal-state-break">ON BREAK</div>
            <div className="cal-session-meta">
              <span>
                Break started {activeBreakRec
                  ? new Date(activeBreakRec.started_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit', minute: '2-digit', hour12: true, timeZone: tz
                    })
                  : ''}
              </span>
              <span className="cal-live-time">{formatWorkDuration(liveBreakMinutes)} break</span>
            </div>
            <div className="cal-session-actions">
              <button className="btn btn-primary btn-sm" onClick={handleResume}>
                Resume
              </button>
              <button className="btn btn-dark btn-sm" onClick={handleCheckOut}>
                Check Out
              </button>
            </div>
          </div>
        )}

        {/* Daily Execution Items */}
        <div className="cal-exec-section">
          <span className="cal-exec-label">COMPLETED TODAY</span>
          <div className="cal-exec-items">
            {execItems.map((item, i) => (
              <div key={item.slot} className="cal-exec-row">
                <button
                  className={`cal-exec-check ${item.completed ? 'checked' : ''}`}
                  onClick={async () => {
                    const updated = execItems.map((it, j) =>
                      j === i ? { ...it, completed: !it.completed } : it
                    );
                    setExecItems(updated);
                    await saveExecItem(item.slot, item.text, !item.completed);
                  }}
                >
                  {item.completed ? <Check size={11} /> : null}
                </button>
                <input
                  className="cal-exec-input"
                  placeholder="Add completed item…"
                  value={item.text}
                  onChange={e => {
                    const updated = execItems.map((it, j) =>
                      j === i ? { ...it, text: e.target.value } : it
                    );
                    setExecItems(updated);
                  }}
                  onBlur={e => saveExecItem(item.slot, e.target.value, item.completed)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── THIS WEEK ── */}
      <div className="cal-week-card skool-card">
        <span className="cal-week-label">THIS WEEK</span>
        <div className="cal-week-grid">
          {weekDays.map((day, i) => {
            const isToday = day.date === todayLocal;
            const isActive = isToday && isCheckedIn;
            const isMissed = day.date < todayLocal && day.date >= (startDate ?? todayLocal) && (day.status === 'not_started' || day.status === 'missed');
            const isFuture = day.date > todayLocal;
            const workMins = isToday && isCheckedIn ? liveWorkMinutes : day.total_work_minutes;
            const hasWork = workMins > 0;

            return (
              <div key={day.date} className={`cal-week-day ${isToday ? 'is-today' : ''} ${isMissed ? 'is-missed' : ''} ${isFuture ? 'is-future' : ''}`}>
                <span className="cal-week-dow">{DOW_LABELS[i]}</span>
                <span className={`cal-week-hours ${isActive ? 'is-active-text' : ''} ${isMissed ? 'missed-text' : ''}`}>
                  {isFuture ? '—'
                    : isActive ? 'ACTIVE'
                    : isMissed ? 'MISSED'
                    : hasWork ? formatWorkDuration(workMins)
                    : day.status === 'not_started' && !startDate ? '—'
                    : hasWork ? formatWorkDuration(workMins)
                    : '—'}
                </span>
                <span className={`cal-week-dot ${
                  isActive ? 'dot-active' :
                  day.status === 'completed' || (hasWork && !isMissed) ? 'dot-done' :
                  isMissed ? 'dot-missed' :
                  'dot-empty'
                }`} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MONTH SUMMARY ── */}
      {config?.operating_start_date && (
        <div className="cal-month-card skool-card">
          <span className="cal-month-label-text">MONTH SUMMARY — {monthName.toUpperCase()}</span>
          <div className="cal-month-stats">
            <div className="cal-month-stat">
              <span className="cal-month-val">{formatWorkDuration(monthTotalMins)}</span>
              <span className="cal-month-key">Total hours</span>
            </div>
            <div className="cal-month-stat">
              <span className="cal-month-val">{formatWorkDuration(monthAvgMins)}</span>
              <span className="cal-month-key">Avg / day</span>
            </div>
            <div className="cal-month-stat">
              <span className="cal-month-val">{monthOpDays}</span>
              <span className="cal-month-key">Operating days</span>
            </div>
            <div className="cal-month-stat">
              <span className="cal-month-val">{streakCurrent}</span>
              <span className="cal-month-key">Current streak</span>
            </div>
            {monthMissed > 0 && (
              <div className="cal-month-stat cal-month-stat-miss">
                <span className="cal-month-val cal-miss-val">{monthMissed}</span>
                <span className="cal-month-key">Missed days</span>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
