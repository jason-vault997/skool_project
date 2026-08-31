import React from 'react';
import { ProgressBar } from './ProgressBar';
import { Target, Zap, Award } from 'lucide-react';
import './ExecutionVsLearningCard.css';

interface ExecutionVsLearningProps {
  learningPercent?: number;
  applicationPercent?: number;
  currentClients?: number;
  targetClients?: number;
}

export const ExecutionVsLearningCard: React.FC<ExecutionVsLearningProps> = ({
  learningPercent = 74,
  applicationPercent = 31,
  currentClients = 6,
  targetClients = 100
}) => {
  return (
    <div className="exec-learning-card skool-card">
      <div className="card-header-row">
        <span className="section-label">EXECUTION VS LEARNING</span>
        <span className="contrast-subtext">Application {applicationPercent}% vs Knowledge {learningPercent}%</span>
      </div>

      <div className="contrast-items-list">
        {/* Learning */}
        <div className="contrast-item">
          <div className="contrast-item-head">
            <div className="item-title-group">
              <Zap size={15} className="item-icon zap" />
              <span className="item-name">LEARNING</span>
            </div>
            <span className="item-val">{learningPercent}%</span>
          </div>
          <ProgressBar
            value={learningPercent}
            color="var(--accent-emerald)"
            height={8}
            showPercent={false}
          />
        </div>

        {/* Application */}
        <div className="contrast-item">
          <div className="contrast-item-head">
            <div className="item-title-group">
              <Target size={15} className="item-icon target" />
              <span className="item-name">APPLICATION</span>
            </div>
            <span className="item-val alert">{applicationPercent}%</span>
          </div>
          <ProgressBar
            value={applicationPercent}
            color="var(--brand-lime)"
            height={8}
            showPercent={false}
          />
        </div>

        {/* Business Clients */}
        <div className="contrast-item">
          <div className="contrast-item-head">
            <div className="item-title-group">
              <Award size={15} className="item-icon award" />
              <span className="item-name">BUSINESS OUTCOME</span>
            </div>
            <span className="item-val bold">{currentClients} / {targetClients} CLIENTS</span>
          </div>
          <ProgressBar
            value={(currentClients / targetClients) * 100}
            color="var(--brand-green-dark)"
            height={8}
            showPercent={false}
          />
        </div>
      </div>

      <div className="contrast-truth-footer">
        <span className="truth-statement">
          Learning is not the same as application.
        </span>
      </div>
    </div>
  );
};
