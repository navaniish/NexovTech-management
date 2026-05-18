import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, CheckSquare, Briefcase, Clock, Wallet,
  ChevronLeft, ChevronRight, LogOut, Sparkles, Bell, Calendar, IndianRupee, Settings, CreditCard, MessageSquare, Mail, ShieldCheck, BookOpen, X
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../config';

const menuItems = [
  { path: '/employee/dashboard', icon: LayoutDashboard, label: 'Dashboard', badge: null },
  { path: '/employee/tasks', icon: CheckSquare, label: 'My Tasks', badge: null },
  { path: '/employee/projects', icon: Briefcase, label: 'My Projects', badge: null },
  { path: '/employee/attendance', icon: Clock, label: 'Attendance', badge: null },
  { path: '/employee/leaves', icon: Calendar, label: 'Leave Request', badge: null },
  { path: '/employee/salary', icon: IndianRupee, label: 'Salary', badge: null },
  { path: '/employee/timesheet', icon: Clock, label: 'Timesheet', badge: null },
  { path: '/employee/id-card', icon: CreditCard, label: 'My E-ID Card', badge: 'New' },
  { path: '/employee/mail', icon: Mail, label: 'Nexus Mail', badge: 'OFFICIAL' },
  { path: '/employee/security', icon: ShieldCheck, label: 'Security Shield', badge: 'PRO' },
  { path: '/employee/learning', icon: BookOpen, label: 'My Learning', badge: 'New' },
  { path: '/employee/settings', icon: Settings, label: 'Settings', badge: null },
];

const EmployeeSidebar = ({ mobileOpen, setMobileOpen }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

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

      <motion.aside
        animate={{ width: isCollapsed ? '80px' : '240px' }}
        className={`h-screen backdrop-blur-2xl bg-slate-900/95 border-r border-white/10 flex flex-col fixed md:relative z-[110] top-0 bottom-0 transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{ flexShrink: 0 }}
      >
        {/* MOBILE CLOSE BUTTON - REMOVED */}
        <button 
          onClick={() => setMobileOpen(false)}
          className="hidden absolute top-4 right-4 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white"
        >
          <X size={20} />
        </button>

        {/* LOGO AREA - REMOVED ON MOBILE DRAWER */}
        <div className="hidden p-6 mb-2">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg p-1.5 flex items-center justify-center">
                 <img src="/assets/company-logo.jpeg" alt="NexovTech" className="w-full h-full object-contain" />
              </div>
              <span className="text-white font-black uppercase tracking-tighter text-lg">NexovTech</span>
           </div>
        </div>

        <div className="h-4 shrink-0 hidden md:block" />

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto no-scrollbar pt-4">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `
              relative flex items-center gap-4 px-4 h-[46px] rounded-xl transition-all duration-300 group
              ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}
            `}
            >
              <item.icon size={18} className="shrink-0" />
              {(!isCollapsed || mobileOpen) && <span className="font-semibold text-[13px] tracking-tight">{item.label}</span>}
              {(!isCollapsed || mobileOpen) && item.badge && (
                <span className="ml-auto px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Footer - HIDDEN ON MOBILE TO PREVENT CLUTTER */}
        <div className="hidden md:block p-6 mt-auto border-t border-white/5 bg-slate-900/50">
          <div className={`flex items-center gap-4 ${isCollapsed ? 'justify-center' : 'px-4 py-3 rounded-2xl bg-white/5 border border-white/5'}`}>
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-indigo-600 shadow-xl relative group shrink-0 cursor-pointer">
              <img
                src={user?.avatar ? (user.avatar.startsWith('http') || user.avatar.startsWith('data:') ? user.avatar : `${API_URL.replace('/api', '')}${user.avatar}`) :
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'Emp'}`}
                alt="User"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                onClick={handleLogout}>
                <LogOut size={16} className="text-white" />
              </div>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-black truncate leading-tight uppercase tracking-tighter text-white">{user?.name}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 truncate">{user?.role || 'Developer'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Collapse Toggle - HIDDEN ON MOBILE */}
        <button onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-24 w-6 h-6 rounded-full bg-slate-800 border border-white/10 items-center justify-center text-white hover:bg-indigo-600 transition-all shadow-2xl z-[110]">
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </motion.aside>
    </>
  );
};

export default EmployeeSidebar;
