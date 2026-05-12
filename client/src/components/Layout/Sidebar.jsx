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
    { path: '/security', icon: ShieldCheck, label: 'Security Shield' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/10 z-[100] md:hidden backdrop-blur-md"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <div
        style={{ width: isCollapsed ? '80px' : '240px', minWidth: isCollapsed ? '80px' : '240px' }}
        className={`h-full bg-slate-900/95 backdrop-blur-xl border-r border-white/10 flex flex-col fixed md:relative z-[110] shrink-0 transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* LOGO AREA */}
        <div className="h-4 shrink-0" />

        {/* NAVIGATION ITEMS */}
        <div className="flex-1 overflow-y-auto scrollbar-hide py-4">
           <nav className="px-4 space-y-1">
              {menuItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `
                    flex items-center gap-4 px-4 h-11 rounded-xl transition-all group sidebar-link
                    ${isActive ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}
                  `}
                >
                  <item.icon size={18} className="shrink-0" />
                  {!isCollapsed && <span className="text-[13.5px] font-medium">{item.label}</span>}
                  {!isCollapsed && item.badge && (
                    <span className="ml-auto px-2 py-0.5 rounded-full bg-rose-500 text-white text-[8px] font-black">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
           </nav>
        </div>

        {/* USER PROFILE SECTION */}
        <div className="p-4 border-t border-white/10">
           <div className={`flex items-center gap-3 p-2 rounded-xl transition-all ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-10 h-10 rounded-2xl overflow-hidden border-2 border-white shadow-lg shrink-0 bg-slate-800">
                 <img 
                   src={user?.avatar ? (user.avatar.startsWith('http') || user.avatar.startsWith('data:') ? user.avatar : `${API_URL.replace('/api', '')}${user.avatar}`) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'Admin'}`} 
                   alt="" 
                   className="w-full h-full object-cover"
                 />
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                   <p className="text-[13px] font-black text-white truncate">{user?.name || 'Authorized User'}</p>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{user?.role || 'Access Granted'}</p>
                </div>
              )}
           </div>
        </div>

        {/* COLLAPSE TOGGLE */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-10 w-6 h-6 rounded-full bg-slate-800 border border-white/10 text-slate-400 hover:text-indigo-400 transition-all shadow-lg flex items-center justify-center z-[110]"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </>
  );
};

export default Sidebar;
