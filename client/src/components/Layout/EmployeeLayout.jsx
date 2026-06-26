import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import EmployeeSidebar from './EmployeeSidebar';
import TopBar from './TopBar';

const EmployeeLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    // Lock body scrolling while dashboard is active to prevent scroll gaps
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100%';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';

    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
    };
  }, []);

  return (
    <div className="w-full h-screen bg-slate-950 flex flex-col overflow-hidden relative z-10">
      {/* 1. FIXED OFFICE BACKGROUND LAYER */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-slate-900/60 z-10" />
        <img
          src="/assets/office-bg.png"
          alt="Office Theme"
          className="w-full h-full object-cover opacity-30"
        />
      </div>

      {/* 2. TOPBAR - IN FLOW */}
      <div className="relative z-[60] shrink-0">
        <TopBar onToggleSidebar={() => setIsMobileOpen(!isMobileOpen)} />
      </div>

      <div className="flex flex-1 overflow-hidden relative z-50 w-full">
        {/* 3. SIDEBAR */}
        <EmployeeSidebar isMobileOpen={isMobileOpen} onCloseMobile={() => setIsMobileOpen(false)} />

        {/* 4. SCROLLABLE CONTENT AREA */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-transparent scroll-smooth">
          <main className="min-h-full flex flex-col px-6 py-6 md:px-8">

            {/* CONTENT WRAPPER */}
            <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-700">
              <Outlet />
            </div>

          </main>
        </div>
      </div>
    </div>
  );
};

export default EmployeeLayout;
