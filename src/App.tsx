import React, { useState } from 'react';
import { Header } from './components/Header';
import { NavigationTabs, TabId } from './components/NavigationTabs';
import { DashboardPage } from './pages/DashboardPage';
import { ClassroomPage } from './pages/ClassroomPage';
import { CalendarPage } from './pages/CalendarPage';
import { BusinessPage } from './pages/BusinessPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { AboutPage } from './pages/AboutPage';
import './styles/global.css';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage onNavigateTab={setActiveTab} />;
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
        return <DashboardPage onNavigateTab={setActiveTab} />;
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

export default App;
