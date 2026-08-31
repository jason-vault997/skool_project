import React from 'react';
import './NavigationTabs.css';

export type TabId = 'dashboard' | 'classroom' | 'calendar' | 'business' | 'leaderboard' | 'about';

interface NavigationTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

interface TabItem {
  id: TabId;
  label: string;
}

const TABS: TabItem[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'classroom', label: 'Classroom' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'business', label: 'Business' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'about', label: 'About' }
];

export const NavigationTabs: React.FC<NavigationTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="nav-tabs-bar">
      <div className="nav-tabs-container">
        <nav className="nav-tabs-list" aria-label="Main Navigation">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`nav-tab-item ${isActive ? 'active' : ''}`}
                onClick={() => onTabChange(tab.id)}
                role="tab"
                aria-selected={isActive}
              >
                <span className="nav-tab-text">{tab.label}</span>
                {isActive && <span className="nav-tab-indicator" />}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
