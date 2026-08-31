import React, { useState, useEffect } from 'react';
import { getSessionsForMonth } from '../lib/data/sessions';
import type { Session } from '../lib/supabase/types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Clock, Video, User } from 'lucide-react';
import './CalendarPage.css';

interface CalendarEventDetail {
  title: string;
  time: string;
  type: string;
  dayNumber: number;
  coachName: string;
  meetingUrl: string | null;
}

interface DayCell {
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEventDetail[];
}

function getSessionType(session: Session): string {
  return session.session_type || 'Training';
}

function buildCalendarGrid(year: number, month: number, sessions: Session[]): DayCell[] {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Start grid on Monday (ISO week)
  let startDow = firstDay.getDay(); // 0=Sun
  startDow = startDow === 0 ? 6 : startDow - 1; // Convert to Mon=0

  const cells: DayCell[] = [];

  // Pad with previous month days
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, -i);
    cells.push({ dayNumber: d.getDate(), isCurrentMonth: false, isToday: false, events: [] });
  }

  // Current month days
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = sessions
      .filter(s => s.start_time.startsWith(dateStr))
      .map(s => {
        const start = new Date(s.start_time);
        const timeStr = start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        return {
          title: s.title,
          time: timeStr,
          type: getSessionType(s),
          dayNumber: day,
          coachName: s.coach_name ?? 'Build100',
          meetingUrl: s.meeting_url,
        };
      });

    cells.push({
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      events: dayEvents,
    });
  }

  // Pad end to complete 6 rows (42 cells)
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push({ dayNumber: i, isCurrentMonth: false, isToday: false, events: [] });
  }

  return cells;
}

export const CalendarPage: React.FC = () => {
  const now = new Date();
  const [viewYear, setViewYear]   = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [sessions, setSessions]   = useState<Session[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [viewMode, setViewMode]   = useState<'month' | 'list'>('month');
  const [activeEvent, setActiveEvent] = useState<CalendarEventDetail | null>(null);

  useEffect(() => {
    setLoadingData(true);
    getSessionsForMonth(viewYear, viewMonth)
      .then(setSessions)
      .finally(() => setLoadingData(false));
  }, [viewYear, viewMonth]);

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const monthName = new Date(viewYear, viewMonth - 1).toLocaleString('default', { month: 'long' });

  const calendarCells = buildCalendarGrid(viewYear, viewMonth, sessions);

  const goToPrev = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const goToNext = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };
  const goToToday = () => { setViewYear(now.getFullYear()); setViewMonth(now.getMonth() + 1); };

  const listDays = calendarCells.filter(d => d.isCurrentMonth && d.events.length > 0);

  return (
    <div className="calendar-page">
      {/* Calendar Controls */}
      <div className="calendar-controls-card skool-card">
        <div className="calendar-controls-inner">
          <div className="controls-left">
            <button className="btn btn-outline btn-sm today-btn" onClick={goToToday}>Today</button>
          </div>

          <div className="controls-center">
            <button className="nav-arrow-btn" title="Previous month" aria-label="Previous Month" onClick={goToPrev}>
              <ChevronLeft size={18} />
            </button>
            <div className="month-display-group">
              <h2 className="current-month-text">{monthName} {viewYear}</h2>
              <span className="cal-timezone">
                {loadingData ? 'Loading…' : `${sessions.length} session${sessions.length !== 1 ? 's' : ''} this month`}
              </span>
            </div>
            <button className="nav-arrow-btn" title="Next month" aria-label="Next Month" onClick={goToNext}>
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="controls-right">
            <div className="view-toggle-group">
              <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="List View" aria-label="List View">
                <List size={16} />
              </button>
              <button className={`view-btn ${viewMode === 'month' ? 'active' : ''}`} onClick={() => setViewMode('month')} title="Month View" aria-label="Month View">
                <CalendarIcon size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Month Grid */}
      {viewMode === 'month' ? (
        <div className="calendar-grid-wrapper skool-card">
          <div className="calendar-weekdays-row">
            {daysOfWeek.map(day => <div key={day} className="weekday-cell">{day}</div>)}
          </div>

          <div className="calendar-days-grid">
            {calendarCells.map((dayItem, index) => (
              <div
                key={index}
                className={`calendar-day-cell ${!dayItem.isCurrentMonth ? 'other-month' : ''} ${dayItem.isToday ? 'is-today-cell' : ''}`}
              >
                <div className="cell-header">
                  <span className={`day-number ${dayItem.isToday ? 'today-badge' : ''}`}>
                    {dayItem.dayNumber}
                  </span>
                </div>
                <div className="cell-events-list">
                  {dayItem.events.map((evt, ei) => (
                    <div
                      key={ei}
                      className="calendar-event-chip"
                      onClick={() => setActiveEvent(evt)}
                      role="button"
                      tabIndex={0}
                    >
                      <span className="event-chip-text">{evt.time} — {evt.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="calendar-list-view skool-card">
          <div className="list-view-header">
            <h3>Live Training Schedule — {monthName} {viewYear}</h3>
          </div>
          <div className="list-events-stack">
            {loadingData && (
              <div className="data-loading-state">Loading sessions…</div>
            )}
            {!loadingData && listDays.length === 0 && (
              <div className="data-empty-state">
                <strong>No sessions this month</strong>
                Sessions will appear here once added to the database.
              </div>
            )}
            {!loadingData && listDays.map((d, i) => (
              <div key={i} className={`list-day-row ${d.isToday ? 'today-highlight' : ''}`}>
                <div className="list-date-badge">
                  <span className="list-day-num">{d.dayNumber}</span>
                  <span className="list-month-name">{monthName.slice(0, 3)}</span>
                </div>
                <div className="list-day-events">
                  {d.events.map((e, j) => (
                    <div key={j} className="list-event-card">
                      <div className="list-event-meta">
                        <span className="list-event-type">{e.type}</span>
                        <h4 className="list-event-title">{e.title}</h4>
                      </div>
                      <div className="list-event-time">
                        <Clock size={14} />
                        <span>{e.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Detail Modal */}
      {activeEvent && (
        <div className="cal-modal-backdrop" onClick={() => setActiveEvent(null)}>
          <div className="cal-modal-card skool-card" onClick={e => e.stopPropagation()}>
            <div className="cal-modal-header">
              <span className="cal-track-tag">{activeEvent.type} LIVE TRAINING</span>
              <button className="btn-ghost btn-sm" onClick={() => setActiveEvent(null)}>✕</button>
            </div>
            <h3 className="cal-modal-title">{activeEvent.title}</h3>
            <div className="cal-modal-details">
              <div className="detail-item">
                <Clock size={16} />
                <span>{activeEvent.time}</span>
              </div>
              <div className="detail-item">
                <User size={16} />
                <span>Coach: {activeEvent.coachName}</span>
              </div>
            </div>
            <div className="cal-modal-actions">
              {activeEvent.meetingUrl ? (
                <a
                  href={activeEvent.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary full-w"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}
                >
                  <Video size={16} />
                  <span>JOIN LIVE SESSION</span>
                </a>
              ) : (
                <button className="btn btn-primary full-w" onClick={() => setActiveEvent(null)}>
                  <Video size={16} />
                  <span>MEETING LINK PENDING</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
