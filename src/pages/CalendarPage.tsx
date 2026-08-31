import React, { useState } from 'react';
import { sampleCalendarMonth } from '../data/sampleData';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Clock, Video, User } from 'lucide-react';
import './CalendarPage.css';

interface CalendarEventDetail {
  title: string;
  time: string;
  type: string;
  dayNumber: number;
}

export const CalendarPage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState('August 2026');
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [activeEvent, setActiveEvent] = useState<CalendarEventDetail | null>(null);

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="calendar-page">
      {/* Calendar Top Controls Header (matching Skool calendar screenshot) */}
      <div className="calendar-controls-card skool-card">
        <div className="calendar-controls-inner">
          <div className="controls-left">
            <button
              className="btn btn-outline btn-sm today-btn"
              onClick={() => setSelectedMonth('August 2026')}
            >
              Today
            </button>
          </div>

          <div className="controls-center">
            <button className="nav-arrow-btn" title="Previous month" aria-label="Previous Month">
              <ChevronLeft size={18} />
            </button>
            <div className="month-display-group">
              <h2 className="current-month-text">{selectedMonth}</h2>
              <span className="cal-timezone">{sampleCalendarMonth.timeZoneDisplay}</span>
            </div>
            <button className="nav-arrow-btn" title="Next month" aria-label="Next Month">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="controls-right">
            <div className="view-toggle-group">
              <button
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List View"
                aria-label="List View"
              >
                <List size={16} />
              </button>
              <button
                className={`view-btn ${viewMode === 'month' ? 'active' : ''}`}
                onClick={() => setViewMode('month')}
                title="Month View"
                aria-label="Month View"
              >
                <CalendarIcon size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Month Grid View */}
      {viewMode === 'month' ? (
        <div className="calendar-grid-wrapper skool-card">
          {/* Weekday Column Headers */}
          <div className="calendar-weekdays-row">
            {daysOfWeek.map((day) => (
              <div key={day} className="weekday-cell">
                {day}
              </div>
            ))}
          </div>

          {/* Days Cells Grid */}
          <div className="calendar-days-grid">
            {sampleCalendarMonth.days.map((dayItem, index) => {
              return (
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
                    {dayItem.events.map((evt) => (
                      <div
                        key={evt.id}
                        className="calendar-event-chip"
                        onClick={() => setActiveEvent({
                          title: evt.title,
                          time: evt.time,
                          type: evt.type,
                          dayNumber: dayItem.dayNumber
                        })}
                        role="button"
                        tabIndex={0}
                      >
                        <span className="event-chip-text">{evt.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="calendar-list-view skool-card">
          <div className="list-view-header">
            <h3>Scheduled Simulated Training — August 2026</h3>
          </div>
          <div className="list-events-stack">
            {sampleCalendarMonth.days
              .filter(d => d.events.length > 0)
              .map((d, i) => (
                <div key={i} className={`list-day-row ${d.isToday ? 'today-highlight' : ''}`}>
                  <div className="list-date-badge">
                    <span className="list-day-num">{d.dayNumber}</span>
                    <span className="list-month-name">Aug</span>
                  </div>
                  <div className="list-day-events">
                    {d.events.map(e => (
                      <div key={e.id} className="list-event-card">
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

      {/* Simulated Live Session Detail Modal */}
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
                <span>{activeEvent.time} (Simulated Live Session)</span>
              </div>
              <div className="detail-item">
                <User size={16} />
                <span>Coach: {activeEvent.title.includes('Saad') ? 'Saad Mohamed' : activeEvent.title.includes('Emad') ? 'Emad' : 'Shafaq'}</span>
              </div>
            </div>
            <p className="cal-modal-desc">
              Interactive session with live call teardowns, active script objections, and live student execution breakdown.
            </p>
            <div className="cal-modal-actions">
              <button className="btn btn-primary full-w" onClick={() => setActiveEvent(null)}>
                <Video size={16} />
                <span>JOIN SIMULATED ROOM</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
