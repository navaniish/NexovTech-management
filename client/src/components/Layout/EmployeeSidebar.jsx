import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, CheckSquare, Briefcase, Clock, Wallet,
  ChevronLeft, ChevronRight, LogOut, Sparkles, Bell, Calendar, IndianRupee, Settings, CreditCard, MessageSquare, Mail
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
  { path: '/employee/settings', icon: Settings, label: 'Settings', badge: null },
];

const EmployeeSidebar = ({ mobileOpen, setMobileOpen }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[50] md:hidden backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ width: isCollapsed ? '96px' : '280px' }}
        className={`h-screen backdrop-blur-xl bg-slate-900/95 border-r border-white/10 flex flex-col fixed md:relative z-[60] top-0 bottom-0 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{ flexShrink: 0 }}
      >
        {/* Logo */}
        <div className="h-6 shrink-0" />
        {/* Mobile Close Button */}
        <div className="px-4 flex md:hidden items-center justify-end mb-4">
          <button
            className="p-2 text-surface-500 hover:text-brand-500"
            onClick={() => setMobileOpen(false)}
          >
            <ChevronLeft size={24} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar pt-6">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `
              relative flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group
              ${isActive ? 'bg-brand-600/20 text-white shadow-lg shadow-brand-900/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}
              ${isCollapsed ? 'justify-center' : ''}
            `}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={22} className={isActive ? 'text-brand-400' : 'group-hover:scale-110 group-hover:text-white transition-all'} />
                  {!isCollapsed && <span className="font-bold text-[13px] tracking-tight">{item.label}</span>}
                  {!isCollapsed && item.badge && (
                    <span className="ml-auto px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-white/10 text-brand-400 border border-white/5">
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <motion.div layoutId="empActiveGlow"
                      className="absolute left-0 w-1.5 h-6 bg-brand-500 rounded-r-full shadow-[0_0_15px_#8b5cf6]" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-6 mt-auto border-t border-white/5 bg-slate-900/50">
          <div className={`flex items-center gap-4 ${isCollapsed ? 'justify-center' : 'px-4 py-3 rounded-2xl bg-white/5 border border-white/5'}`}>
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-brand-600 shadow-xl relative group shrink-0 cursor-pointer">
              <img
                src={user?.avatar ? (user.avatar.startsWith('http') || user.avatar.startsWith('data:') ? user.avatar : `${API_URL.replace('/api', '')}${user.avatar}`) :
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'Emp'}`}
                alt="User"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`;
                }}
              />
              <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                onClick={handleLogout}>
                <LogOut size={16} className="text-white" />
              </div>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black truncate leading-tight uppercase tracking-tighter text-white">{user?.name}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 truncate">{user?.companyEmail || user?.role || 'Developer'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Collapse Toggle */}
        <button onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-24 w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-white hover:bg-brand-600 transition-all shadow-2xl z-[100]">
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

      </motion.aside>
    </>
  );
};

export default EmployeeSidebar;
