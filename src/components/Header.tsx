import React from 'react';
import { Search, Bell, MessageSquare, ChevronDown } from 'lucide-react';
import './Header.css';

interface HeaderProps {
  onSearchChange?: (val: string) => void;
  onNavigateHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigateHome }) => {
  return (
    <header className="site-header">
      <div className="header-inner">
        {/* Logo area */}
        <div className="header-left" onClick={onNavigateHome} role="button" tabIndex={0}>
          <div className="header-logo-badge">
            <img src="/assets/build100-icon.png" alt="Build100" className="logo-icon-img" />
          </div>
          <span className="header-logo-text">Build100</span>
          <ChevronDown size={15} className="header-logo-chevron" />
        </div>

        {/* Global Search Bar */}
        <div className="header-center">
          <div className="search-bar-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search..."
              className="search-input"
              aria-label="Search"
            />
          </div>
        </div>

        {/* User / Notification Actions */}
        <div className="header-right">
          <button className="icon-button" title="Conversations" aria-label="Conversations">
            <MessageSquare size={19} />
          </button>
          
          <div className="notification-wrapper">
            <button className="icon-button" title="Notifications" aria-label="Notifications">
              <Bell size={19} />
            </button>
            <span className="notification-badge">52</span>
          </div>

          <div className="user-profile-btn" title="Jason Harris">
            <img
              src="/assets/jason-avatar.png"
              alt="Jason Harris"
              className="user-avatar-img"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
