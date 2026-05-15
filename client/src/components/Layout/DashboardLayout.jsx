import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const DashboardLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden relative">
      {/* 1. COMPANY THEME BACKGROUND LAYER */}
      <div className="fixed inset-0 z-0">
         <div className="absolute inset-0 bg-white/20 z-10" />
         <img 
           src="/assets/office-bg.png" 
           alt="Company Theme" 
           className="w-full h-full object-cover opacity-80"
         />
      </div>

      {/* 2. TOPBAR - FULL WIDTH ANCHOR */}
      <div className="relative z-[60]">
         <TopBar onMenuToggle={() => setMobileMenuOpen(true)} />
      </div>
      
      <div className="flex flex-1 overflow-hidden relative z-50">
        {/* 3. SIDEBAR - FIXED LEFT */}
        <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
        
        {/* 4. SCROLLABLE CONTENT AREA */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-transparent scroll-smooth">
           <main className="min-h-full flex flex-col p-4 sm:p-6 md:p-10">
              
              {/* CONTENT WRAPPER - 1440px MAX */}
              <div className="w-full max-w-[1440px] mx-auto animate-in fade-in duration-700">
                 <Outlet />
              </div>
              
           </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
