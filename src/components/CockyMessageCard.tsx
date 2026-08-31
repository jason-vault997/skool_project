import React from 'react';
import { Flame } from 'lucide-react';
import './CockyMessageCard.css';

interface CockyMessageProps {
  headline?: string;
  stats?: Array<{ label: string; value: string }>;
  callout?: string;
}

export const CockyMessageCard: React.FC<CockyMessageProps> = ({
  headline = "You've learned more than you've used.",
  stats = [
    { label: "Sales Complete", value: "74%" },
    { label: "Actually Applied", value: "31%" }
  ],
  callout = "Stop collecting information and start making the market prove you learned it."
}) => {
  return (
    <div className="cocky-card skool-card-dark">
      <div className="cocky-header">
        <div className="cocky-tag">
          <Flame size={14} className="flame-icon" />
          <span>REALITY CHECK</span>
        </div>
      </div>

      <div className="cocky-body">
        <h3 className="cocky-headline">{headline}</h3>

        <div className="cocky-stats-row">
          {stats.map((item, idx) => (
            <div key={idx} className="cocky-stat-chip">
              <span className="stat-chip-val">{item.value}</span>
              <span className="stat-chip-lbl">{item.label}</span>
            </div>
          ))}
        </div>

        <p className="cocky-callout">"{callout}"</p>
      </div>
    </div>
  );
};
