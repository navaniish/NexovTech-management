import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Briefcase, 
  Clock, Banknote, CreditCard,
  MessageSquare, Settings,
  ChevronLeft, ChevronRight,
  ChevronDown, X, ShieldCheck, Sparkles, Mail, Target, BookOpen
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../config';

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useAuth();
  const [counts, setCounts] = useState({ employees: 0, mail: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Fetch Employee Count
        const empRes = await fetch(`${API_URL}/auth/count`);
        const empData = await empRes.json();
        
        // Fetch Mail Count
        let mailCount = 0;
        if (user?.email) {
           const mailRes = await fetch(`${API_URL}/mail/unread-count/${user.email}`);
           const mailData = await mailRes.json();
           mailCount = mailData.count;
        }

        setCounts({ employees: empData.count, mail: mailCount });
      } catch (err) {
        console.error('Sidebar count sync failed');
      }
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 60000); // Sync every minute
    return () => clearInterval(interval);
  }, [user?.email]);

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/hr', icon: Users, label: 'Employees', badge: counts.employees },
    { path: '/tasks', icon: Target, label: 'Work Assignment' },
    { path: '/projects', icon: Briefcase, label: 'Projects' },
    { path: '/attendance', icon: Clock, label: 'Attendance' },
    { path: '/payroll', icon: Banknote, label: 'Payroll' },
    { path: '/id-cards', icon: CreditCard, label: 'E-id' },
    { path: '/timesheets', icon: Clock, label: 'Time Registry' },
    { path: '/nexus-mail', icon: Mail, label: 'Nexus Mail', badge: counts.mail },
    { path: '/comm-intelligence', icon: Sparkles, label: 'Intelligence' },
    { path: '/admin-learning', icon: BookOpen, label: 'Learning Ops' },
    { path: '/audit', icon: ShieldCheck, label: 'AI Audit' },
    // EXCLUSIVE: Security Shield
    ...(user?.role === 'Admin' || user?.role === 'Super Admin' ? [
      { path: '/security-shield', icon: ShieldCheck, label: 'Security Shield' }
    ] : []),
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 z-[100] md:hidden backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <div
        style={{ 
          width: isCollapsed ? '80px' : '280px', 
          minWidth: isCollapsed ? '80px' : '280px' 
        }}
        className={`h-full bg-slate-900/98 backdrop-blur-3xl border-r border-white/5 flex flex-col fixed md:relative z-[110] shrink-0 transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) ${
          mobileOpen ? 'translate-x-0 shadow-2xl shadow-black/50' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* MOBILE CLOSE BUTTON - INTEGRATED - REMOVED ON MOBILE DRAWER */}
        <button 
          onClick={() => setMobileOpen(false)}
          className="hidden absolute top-6 right-6 w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all active:scale-95 z-20"
        >
          <X size={22} />
        </button>
        
        <div className="h-full flex flex-col pt-8">
          {/* LOGO AREA - REFINED - REMOVED ON MOBILE DRAWER */}
          <div className="hidden px-7 mb-8">
             <div className="flex items-center gap-3.5 group cursor-pointer" onClick={() => navigate('/')}>
                <div className="w-11 h-11 bg-white rounded-2xl p-1.5 flex items-center justify-center shadow-2xl shadow-indigo-500/20 transition-transform group-hover:scale-105">
                   <img src="/assets/company-logo.jpeg" alt="NexovTech" className="w-full h-full object-contain" />
                </div>
                <div className="flex flex-col">
                   <span className="text-white font-black uppercase tracking-[-0.05em] text-xl leading-none">NexovTech</span>
                   <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-1 opacity-80">Management</span>
                </div>
             </div>
          </div>

          {/* NAVIGATION ITEMS - OPTIMIZED TOUCH TARGETS */}
          <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8">
             <div className="mb-4 px-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Primary Ops</span>
             </div>
             
             <nav className="space-y-1">
                {menuItems.map((item, idx) => (
                  <React.Fragment key={item.path}>
                    {/* Visual Divider for Security */}
                    {item.label === 'Security Shield' && (
                      <div className="mt-6 mb-3 px-3">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Safety Protocol</span>
                      </div>
                    )}

                    <NavLink
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) => `
                        flex items-center gap-4 px-4 h-[52px] rounded-[18px] transition-all group sidebar-link
                        ${isActive 
                          ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' 
                          : 'text-slate-400 hover:bg-white/5 hover:text-white active:bg-white/10'}
                      `}
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon size={20} className={`shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white' : 'group-hover:text-indigo-400'}`} />
                          {(!isCollapsed || mobileOpen) && (
                            <span className="text-[14px] font-bold tracking-tight">{item.label}</span>
                          )}
                          {(!isCollapsed || mobileOpen) && item.badge !== undefined && (
                            <span className={`ml-auto px-2.5 py-1 rounded-lg text-[10px] font-black min-w-[24px] text-center ${
                              item.label === 'Employees' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-rose-500 text-white'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </React.Fragment>
                ))}
             </nav>
          </div>

          {/* SYSTEM FOOTER */}
          <div className="p-6 border-t border-white/5 bg-black/20">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500">
                   <Settings size={16} />
                </div>
                <div className="flex flex-col">
                   <span className="text-[11px] font-black text-white uppercase tracking-wider">v1.2.4-PRO</span>
                   <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Secure Link Active</span>
                </div>
             </div>
          </div>
        </div>

        {/* COLLAPSE TOGGLE - HIDDEN ON MOBILE */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3.5 top-12 w-7 h-7 rounded-full bg-slate-900 border border-white/10 text-slate-400 hover:text-indigo-400 transition-all shadow-xl items-center justify-center z-[110] group"
        >
          {isCollapsed ? <ChevronRight size={14} className="group-active:translate-x-1 transition-transform" /> : <ChevronLeft size={14} className="group-active:-translate-x-1 transition-transform" />}
        </button>
      </div>
    </>
  );
};

export default Sidebar;
