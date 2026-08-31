import React, { useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth/AuthContext';
import { Header } from './components/Header';
import { NavigationTabs, TabId } from './components/NavigationTabs';
import { DashboardPage } from './pages/DashboardPage';
import { ClassroomPage } from './pages/ClassroomPage';
import { CalendarPage } from './pages/CalendarPage';
import { BusinessPage } from './pages/BusinessPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { AboutPage } from './pages/AboutPage';
import { LoginPage } from './pages/LoginPage';
import './styles/global.css';

// Inner app shell — only rendered when authenticated
const AppShell: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  if (loading) {
    return (
      <div className="app-loading-screen">
        <div className="app-loading-inner">
          <img src="/assets/build100-icon.png" alt="BUILD100" className="app-loading-logo" />
          <p className="app-loading-text">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
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
