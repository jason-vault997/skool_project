import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { CheckInItem } from '../data/sampleData';
import './CheckInCard.css';

interface CheckInCardProps {
  checkIn: CheckInItem;
}

export const CheckInCard: React.FC<CheckInCardProps> = ({ checkIn }) => {
  const [status, setStatus] = useState<boolean | null>(checkIn.applied);

  return (
    <div className="checkin-card skool-card">
      <div className="checkin-header">
        <span className="section-label">TODAY'S CHECK-IN</span>
        {status !== null && (
          <span className={`checkin-status-tag ${status ? 'applied' : 'missed'}`}>
            {status ? 'Applied Yesterday' : 'Not Applied'}
          </span>
        )}
      </div>

      <div className="checkin-content">
        <div className="checkin-study-topic">
          <span className="study-sublabel">Yesterday you studied:</span>
          <h4 className="study-topic-title">{checkIn.studiedYesterday}</h4>
        </div>

        <p className="checkin-question">{checkIn.question}</p>

        <div className="checkin-actions">
          <button
            className={`checkin-btn checkin-btn-yes ${status === true ? 'selected' : ''}`}
            onClick={() => setStatus(true)}
            aria-pressed={status === true}
          >
            <Check size={16} />
            <span>YES</span>
          </button>

          <button
            className={`checkin-btn checkin-btn-no ${status === false ? 'selected' : ''}`}
            onClick={() => setStatus(false)}
            aria-pressed={status === false}
          >
            <X size={16} />
            <span>NO</span>
          </button>
        </div>
      </div>
    </div>
  );
};
