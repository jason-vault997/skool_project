import React, { useState } from 'react';
import { Play, Clock, Video } from 'lucide-react';
import { SessionInfo } from '../data/sampleData';
import './SessionCard.css';

interface SessionCardProps {
  session: SessionInfo;
}

export const SessionCard: React.FC<SessionCardProps> = ({ session }) => {
  const [isStarted, setIsStarted] = useState(false);

  return (
    <div className="session-card skool-card">
      <div className="session-card-header">
        <span className="section-label">TODAY'S SESSION</span>
        <div className="session-live-chip">
          <span className="live-pulse" />
          <span>Scheduled</span>
        </div>
      </div>

      <div className="session-main-info">
        <h2 className="session-title">{session.title}</h2>
        <p className="session-description">{session.description}</p>
      </div>

      <div className="session-time-block">
        <div className="time-item">
          <Clock size={16} className="time-icon" />
          <span className="time-value">{session.timeDisplay}</span>
        </div>
        <div className="time-divider">•</div>
        <div className="countdown-box">
          <span className="countdown-label">Session starts in:</span>
          <span className="countdown-time">{session.countdown}</span>
        </div>
      </div>

      <div className="session-card-actions">
        <button
          className={`btn btn-primary session-start-btn ${isStarted ? 'active-call' : ''}`}
          onClick={() => setIsStarted(!isStarted)}
        >
          {isStarted ? (
            <>
              <Video size={16} />
              <span>IN SESSION</span>
            </>
          ) : (
            <>
              <Play size={16} fill="currentColor" />
              <span>START SESSION</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
