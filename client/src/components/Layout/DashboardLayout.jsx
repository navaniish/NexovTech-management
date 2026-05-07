import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const DashboardLayout = () => {
  return (
    <div className="min-h-screen theme-bg flex overflow-hidden" style={{ color: 'var(--text-primary)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen h-screen overflow-hidden">
        <TopBar />
        <main className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar" style={{ background: 'var(--bg-base)' }}>
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
