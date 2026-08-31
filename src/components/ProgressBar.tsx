import React from 'react';
import './ProgressBar.css';

interface ProgressBarProps {
  value: number; // 0 - 100
  label?: string;
  showPercent?: boolean;
  color?: string; // custom hex or css var
  height?: number; // in pixels
  trackColor?: string;
  animated?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  label,
  showPercent = true,
  color = 'var(--brand-lime)',
  height = 8,
  trackColor = 'var(--border-light)',
  animated = false
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className="progress-bar-container">
      {(label || showPercent) && (
        <div className="progress-bar-header">
          {label && <span className="progress-bar-label">{label}</span>}
          {showPercent && <span className="progress-bar-percent">{clampedValue}%</span>}
        </div>
      )}
      <div
        className="progress-bar-track"
        style={{
          height: `${height}px`,
          backgroundColor: trackColor,
          borderRadius: `${height}px`
        }}
      >
        <div
          className={`progress-bar-fill ${animated ? 'animated' : ''}`}
          style={{
            width: `${clampedValue}%`,
            backgroundColor: color,
            borderRadius: `${height}px`
          }}
        />
      </div>
    </div>
  );
};
