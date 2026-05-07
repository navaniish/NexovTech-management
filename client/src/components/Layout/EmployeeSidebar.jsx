import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, CheckSquare, Briefcase, Clock, Wallet,
  ChevronLeft, ChevronRight, LogOut, Sparkles, Bell, Calendar, IndianRupee, Settings, CreditCard
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const menuItems = [
  { path: '/employee/dashboard', icon: LayoutDashboard, label: 'Dashboard',      badge: null },
  { path: '/employee/tasks',     icon: CheckSquare,     label: 'My Tasks',       badge: null },
  { path: '/employee/projects',  icon: Briefcase,       label: 'My Projects',    badge: null },
  { path: '/employee/attendance',icon: Clock,           label: 'Attendance',     badge: null },
  { path: '/employee/leaves',   icon: Calendar,        label: 'Leave Request',  badge: null },
  { path: '/employee/salary',   icon: IndianRupee,     label: 'Salary',         badge: null },
  { path: '/employee/timesheet', icon: Clock,           label: 'Timesheet',      badge: null },
  { path: '/employee/id-card',   icon: CreditCard,      label: 'My E-ID Card',   badge: 'New' },
  { path: '/employee/settings',  icon: Settings,        label: 'Settings',       badge: null },
];

const EmployeeSidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <motion.aside
      animate={{ width: isCollapsed ? '96px' : '280px' }}
      className="h-screen theme-sidebar flex flex-col relative z-[50]"
      style={{ flexShrink: 0 }}
    >
      {/* Logo */}
      <div className="p-8 mb-4 flex items-center justify-between">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-600/20">
                <Sparkles className="text-white" size={24} />
              </div>
              <div>
                <span className="font-black text-lg tracking-tighter theme-text-primary block leading-none">NEXOVTECH</span>
                <span className="text-[9px] font-black text-brand-400 uppercase tracking-[0.2em]">Team Portal</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {isCollapsed && (
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-600/20 mx-auto">
            <Sparkles className="text-white" size={22} />
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              relative flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group
              ${isActive ? 'bg-brand-600/10 text-brand-400' : 'theme-text-secondary hover:theme-text-primary'}
              ${isCollapsed ? 'justify-center' : ''}
            `}
          >
            {({ isActive }) => (
              <>
                <item.icon size={22} className={isActive ? 'text-brand-400' : 'group-hover:scale-110 transition-transform'} />
                {!isCollapsed && <span className="font-bold text-sm tracking-tight">{item.label}</span>}
                {!isCollapsed && item.badge && (
                  <span className="ml-auto px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest"
                    style={{ background: 'var(--card-hover-bg)', color: 'var(--text-secondary)' }}>{item.badge}</span>
                )}
                {isActive && (
                  <motion.div layoutId="empActiveGlow"
                    className="absolute left-0 w-1 h-6 bg-brand-500 rounded-r-full shadow-[0_0_10px_#8b5cf6]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-4 mt-auto" style={{ borderTop: '1px solid var(--border-default)', background: 'var(--card-hover-bg)' }}>
        <div className={`flex items-center gap-4 ${isCollapsed ? 'justify-center' : 'px-4 py-3 rounded-2xl'}`}
          style={!isCollapsed ? { background: 'var(--bg-card)', border: '1px solid var(--border-default)' } : {}}>
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-brand-600 shadow-lg relative group shrink-0 cursor-pointer">
            <img src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'Emp'}`} alt="User" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              onClick={handleLogout}>
              <LogOut size={16} className="text-white" />
            </div>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black truncate leading-tight uppercase tracking-tighter theme-text-primary">{user?.name}</p>
              <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest">{user?.role || 'Developer'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse Toggle */}
      <button onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-24 w-6 h-6 rounded-full flex items-center justify-center text-white hover:bg-brand-600 transition-colors shadow-2xl z-[100]"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </motion.aside>
  );
};

export default EmployeeSidebar;
