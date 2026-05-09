import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  IndianRupee,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
  FileText,
  Clock,
  Calendar,
  Globe,
  CreditCard
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../config';

const adminItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', badge: null },
  { path: '/clients', icon: Users, label: 'Subscribers', badge: null },
  { path: '/projects', icon: Briefcase, label: 'Project Hub', badge: null },
  { path: '/hr', icon: Users, label: 'HR Center', badge: 'HR' },
  { path: '/payroll', icon: IndianRupee, label: 'Payroll', badge: null },
  { path: '/finance', icon: IndianRupee, label: 'Billing', badge: '₹' },
  { path: '/invoice-forge', icon: FileText, label: 'Invoice Forge', badge: null },
  { path: '/id-cards', icon: CreditCard, label: 'ID Cards', badge: 'E-ID' },
  { path: '/team', icon: Users, label: 'Team', badge: 'NEW' },
  { path: '/settings', icon: Settings, label: 'Preferences', badge: null },
];

const employeeItems = [
  { path: '/employee/dashboard', icon: LayoutDashboard, label: 'Dashboard', badge: null },
  { path: '/employee/tasks', icon: Briefcase, label: 'My Tasks', badge: null },
  { path: '/employee/projects', icon: Globe, label: 'My Projects', badge: null },
  { path: '/employee/attendance', icon: Clock, label: 'Attendance', badge: null },
  { path: '/employee/leaves', icon: Calendar, label: 'Leave Manager', badge: null },
  { path: '/employee/salary', icon: IndianRupee, label: 'Salary', badge: '₹' },
  { path: '/settings', icon: Settings, label: 'Settings', badge: null },
];

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayItems = user?.role === 'Admin' ? adminItems : employeeItems;

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
        className={`h-screen backdrop-blur-xl bg-[#020617]/40 border-r border-white/5 flex flex-col fixed md:relative z-[60] top-0 bottom-0 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{ flexShrink: 0 }}
      >
        {/* Logo */}
        <div className="p-0 mb-4 flex items-center justify-center bg-black border-b border-white/5">
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-3 w-full justify-between"
              >
                <div className="w-full flex items-center justify-center overflow-hidden">
                  <div className="w-full h-28 bg-black flex items-center justify-center overflow-hidden transition-all duration-300">
                    <img src="/assets/logo.png" alt="NexovTech Logo" className="w-full h-full object-contain" />
                  </div>
                </div>
                {/* Mobile Close Button */}
                <button
                  className="md:hidden p-2 text-surface-500 hover:text-brand-500"
                  onClick={() => setMobileOpen(false)}
                >
                  <ChevronLeft size={24} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          {isCollapsed && (
            <div className="w-full px-4 flex items-center justify-center">
              <div className="w-full h-12 bg-transparent flex items-center justify-center overflow-hidden transition-all">
                <img src="/assets/logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {displayItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `
              relative flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group
              ${isActive ? 'bg-brand-600/10 text-brand-400' : 'theme-text-secondary hover:theme-text-primary'}
              ${isCollapsed ? 'justify-center' : ''}
            `}
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={22}
                    className={isActive ? 'text-brand-400' : 'group-hover:scale-110 transition-transform'}
                  />
                  {!isCollapsed && (
                    <span className="font-bold text-sm tracking-tight">{item.label}</span>
                  )}
                  {!isCollapsed && item.badge && (
                    <span className="ml-auto px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-colors"
                      style={{ background: 'var(--card-hover-bg)', color: 'var(--text-secondary)' }}>
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="activeGlow"
                      className="absolute left-0 w-1 h-6 bg-brand-500 rounded-r-full shadow-[0_0_10px_#8b5cf6]"
                    />
                  )}
                  {isCollapsed && (
                    <div className="absolute left-full ml-4 px-3 py-2 rounded-xl text-xs font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap shadow-2xl z-50"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                      {item.label}
                    </div>
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
              <img 
                src={user?.role === 'Admin' ? '/assets/admin_dp.jpg' : 
                  (user?.avatar ? (user.avatar.startsWith('http') || user.avatar.startsWith('data:') ? user.avatar : `${API_URL}${user.avatar}`) : 
                  'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin')} 
                alt="User" 
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                onClick={handleLogout}
              >
                <LogOut size={16} className="text-white" />
              </div>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black truncate leading-tight uppercase tracking-tighter theme-text-primary">{user?.name}</p>
                <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest">{user?.role || 'Admin'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-24 w-6 h-6 rounded-full flex items-center justify-center hover:bg-brand-600 transition-colors shadow-2xl z-[100]"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </motion.aside>
    </>
  );
};

export default Sidebar;
