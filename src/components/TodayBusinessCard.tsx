import React from 'react';
import { PhoneCall, Users, CheckCircle2, Share2, Clock } from 'lucide-react';
import './TodayBusinessCard.css';

interface TodayBusinessProps {
  leadsToday?: number;
  salesCalls?: number;
  closed?: number;
  contentPosted?: { current: number; target: number };
  workedHours?: number;
}

export const TodayBusinessCard: React.FC<TodayBusinessProps> = ({
  leadsToday = 3,
  salesCalls = 2,
  closed = 0,
  contentPosted = { current: 4, target: 8 },
  workedHours = 6.5
}) => {
  return (
    <div className="today-business-card skool-card">
      <div className="today-business-header">
        <span className="section-label">TODAY'S BUSINESS</span>
        <span className="live-date-indicator">Day 17 Log</span>
      </div>

      <div className="business-metrics-grid">
        {/* Metric 1: Leads */}
        <div className="biz-metric-item">
          <div className="metric-icon-label">
            <Users size={14} className="metric-icon" />
            <span className="biz-metric-title">LEADS TODAY</span>
          </div>
          <div className="biz-metric-value">{leadsToday}</div>
        </div>

        {/* Metric 2: Sales Calls */}
        <div className="biz-metric-item">
          <div className="metric-icon-label">
            <PhoneCall size={14} className="metric-icon" />
            <span className="biz-metric-title">SALES CALLS</span>
          </div>
          <div className="biz-metric-value">{salesCalls}</div>
        </div>

        {/* Metric 3: Closed */}
        <div className="biz-metric-item">
          <div className="metric-icon-label">
            <CheckCircle2 size={14} className="metric-icon" />
            <span className="biz-metric-title">CLOSED</span>
          </div>
          <div className="biz-metric-value highlight-zero">{closed}</div>
        </div>

        {/* Metric 4: Content Posted */}
        <div className="biz-metric-item">
          <div className="metric-icon-label">
            <Share2 size={14} className="metric-icon" />
            <span className="biz-metric-title">CONTENT POSTED</span>
          </div>
          <div className="biz-metric-value">{contentPosted.current} <span className="val-sub">/ {contentPosted.target}</span></div>
        </div>

        {/* Metric 5: Worked */}
        <div className="biz-metric-item full-span">
          <div className="metric-icon-label">
            <Clock size={14} className="metric-icon" />
            <span className="biz-metric-title">WORKED TODAY</span>
          </div>
          <div className="biz-metric-value highlight-worked">{workedHours}h</div>
        </div>
      </div>
    </div>
  );
};
