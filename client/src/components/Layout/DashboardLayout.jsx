import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import AIAssistant from '../AI/AIAssistant';

const DashboardLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMenu = () => {
    setMobileMenuOpen(false);
  };
  return (
    <div className="min-h-screen theme-bg flex overflow-hidden relative" style={{ color: 'var(--text-primary)' }}>
      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={closeMenu} />
      <div className="flex-1 flex flex-col min-h-screen h-screen overflow-hidden w-full">
        <TopBar onMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto custom-scrollbar pb-8">
          <div className="max-w-[1600px] mx-auto backdrop-blur-sm bg-white/5 rounded-3xl p-4 md:p-6 border border-white/10">
            <Outlet />
          </div>
        </main>
      </div>
      <AIAssistant />
    </div>
  );
};

export default DashboardLayout;
