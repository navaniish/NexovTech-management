import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import EmployeeSidebar from './EmployeeSidebar';
import TopBar from './TopBar';

const EmployeeLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden relative">
      {/* 1. FIXED OFFICE BACKGROUND LAYER */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0 opacity-40 grayscale-[0.5]"
        style={{ backgroundImage: "url('/assets/office-bg.png')" }}
      />
      
      {/* 2. GLASS OVERLAY */}
      <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-0" />

      {/* 3. CONTENT STRUCTURE */}
      <div className="relative z-10 flex flex-col h-full w-full">
        <TopBar onMenuToggle={() => setMobileMenuOpen(true)} />
        
        <div className="flex flex-1 overflow-hidden">
          <EmployeeSidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
          
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar scroll-smooth">
             <main className="min-h-full flex flex-col p-6 md:p-10">
                <div className="w-full max-w-[1440px] mx-auto">
                   <Outlet />
                </div>
             </main>
          </div>
        </div>
      </div>
    </div>

  );
};

export default EmployeeLayout;
