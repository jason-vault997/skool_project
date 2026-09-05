import React, { useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth/AuthContext';
import { Header } from './components/Header';
import { NavigationTabs, TabId } from './components/NavigationTabs';
import { DashboardPage } from './pages/DashboardPage';
import { ClassroomPage } from './pages/ClassroomPage';
import { CalendarPage } from './pages/CalendarPage';
import { BusinessPage } from './pages/BusinessPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AboutPage } from './pages/AboutPage';
import './styles/global.css';

// Inner app shell — auto-signs-in on load, no login page shown
const AppShell: React.FC = () => {
  const { loading, authError } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  // Signing in silently — show BUILD100 loading screen
  if (loading) {
    return (
      <div className="app-loading-screen">
        <div className="app-loading-inner">
          <img src="/assets/build100-icon.png" alt="BUILD100" className="app-loading-logo" />
          <p className="app-loading-text">Loading BUILD100…</p>
        </div>
      </div>
    );
  }

  // Safety net: only shown if env vars are missing/wrong (should never happen in prod)
  if (authError) {
    return (
      <div className="app-loading-screen">
        <div className="app-loading-inner">
          <img src="/assets/build100-icon.png" alt="BUILD100" className="app-loading-logo" />
          <p className="app-loading-text" style={{ color: '#dc2626', maxWidth: 320, textAlign: 'center' }}>
            {authError}
          </p>
        </div>
      </div>
    );
  }

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage onNavigateTab={(tab) => setActiveTab(tab as TabId)} />;
      case 'classroom':
        return <ClassroomPage />;
      case 'calendar':
        return <CalendarPage />;
      case 'business':
        return <BusinessPage />;
      case 'leaderboard':
        return <LeaderboardPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'about':
        return <AboutPage />;
      default:
        return <DashboardPage onNavigateTab={(tab) => setActiveTab(tab as TabId)} />;
    }
  };

  return (
    <div className="app-shell">
      {/* Top Header with Build100 Branding, Search, Notifications & User */}
      <Header
        onNavigateHome={() => setActiveTab('dashboard')}
      />

      {/* Main Secondary Navigation Tab Bar */}
      <NavigationTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Page Body Container */}
      <main className="main-content">
        <div className="page-container">
          {renderActivePage()}
        </div>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
};

export default App;
