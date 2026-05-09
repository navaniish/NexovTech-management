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
  CreditCard,
  ShieldCheck
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../config';

const adminGroups = [
  {
    title: 'Core Workspace',
    items: [
      { path: '/', icon: LayoutDashboard, label: 'Global Overview' },
      { path: '/projects', icon: Briefcase, label: 'Project Hub', badge: 'LIVE' },
      { path: '/clients', icon: Globe, label: 'Client Portals' },
    ]
  },
  {
    title: 'Human Resources',
    items: [
      { path: '/team', icon: Users, label: 'Specialist Roster', badge: 'NEW' },
      { path: '/hr', icon: Users, label: 'HR Command' },
      { path: '/id-cards', icon: CreditCard, label: 'Digital IDs' },
      { path: '/attendance', icon: Clock, label: 'Smart Attendance' },
    ]
  },
  {
    title: 'Financial Management',
    items: [
      { path: '/payroll', icon: IndianRupee, label: 'Payroll Engine' },
      { path: '/finance', icon: IndianRupee, label: 'Transaction Ledger', badge: '₹' },
      { path: '/invoice-forge', icon: FileText, label: 'Invoice Forge' },
    ]
  },
  {
    title: 'System & AI',
    items: [
      { path: '/ai', icon: Sparkles, label: 'AI Command Center', badge: 'LIVE' },
      { path: '/audit', icon: ShieldCheck, label: 'Audit Intelligence', badge: 'NEW' },
      { path: '/settings', icon: Settings, label: 'Preferences' },
    ]
  }
];

const employeeItems = [
  { path: '/employee/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/employee/tasks', icon: Briefcase, label: 'My Tasks' },
  { path: '/employee/projects', icon: Globe, label: 'My Projects' },
  { path: '/employee/attendance', icon: Clock, label: 'Attendance' },
  { path: '/employee/leaves', icon: Calendar, label: 'Leave Manager' },
  { path: '/employee/salary', icon: IndianRupee, label: 'Earnings' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const groups = user?.role === 'Admin' ? adminGroups : [{ title: 'Employee Workspace', items: employeeItems }];

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#020617]/90 z-[50] md:hidden backdrop-blur-md"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ width: isCollapsed ? '96px' : '300px' }}
        className={`h-screen backdrop-blur-3xl bg-[#020617]/60 border-r border-white/5 flex flex-col fixed md:relative z-[60] top-0 bottom-0 transition-transform duration-500 ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{ flexShrink: 0 }}
      >
        <div className="p-4">
          <motion.div 
            animate={{ 
              boxShadow: ["0 0 15px rgba(139,92,246,0.15)", "0 0 35px rgba(139,92,246,0.35)", "0 0 15px rgba(139,92,246,0.15)"],
              borderColor: ["rgba(139,92,246,0.1)", "rgba(139,92,246,0.4)", "rgba(139,92,246,0.1)"]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-full bg-black border rounded-[32px] p-5 flex items-center justify-center group transition-all"
          >
             <div className="w-full h-24 rounded-2xl overflow-hidden bg-white/5 flex items-center justify-center border border-white/10">
                <img src="/logo.jpg" alt="Logo" className="w-[90%] h-auto object-contain transition-all duration-500" />
             </div>
          </motion.div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-8 overflow-y-auto custom-scrollbar py-4">
          {groups.map((group, idx) => (
            <div key={idx} className="space-y-3">
              {!isCollapsed && (
                <h3 className="px-4 text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-4">{group.title}</h3>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => `
                    relative flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group
                    ${isActive ? 'bg-brand-600/10 text-brand-400 shadow-[inset_0_0_20px_rgba(139,92,246,0.05)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          size={20}
                          className={isActive ? 'text-brand-400' : 'group-hover:scale-110 group-hover:text-white transition-all'}
                        />
                        {!isCollapsed && (
                          <span className="font-bold text-[13px] tracking-tight">{item.label}</span>
                        )}
                        {!isCollapsed && item.badge && (
                          <span className={`ml-auto px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-colors ${item.badge === 'LIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-brand-500/10 text-brand-500'}`}>
                            {item.badge}
                          </span>
                        )}
                        {isActive && (
                          <motion.div
                            layoutId="activeGlow"
                            className="absolute left-0 w-1.5 h-6 bg-brand-500 rounded-r-full shadow-[0_0_20px_#8b5cf6]"
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-6 border-t border-white/5">
          <div className={`flex items-center gap-4 ${isCollapsed ? 'justify-center' : 'bg-white/5 p-4 rounded-3xl border border-white/5 hover:border-white/10 transition-all'}`}>
            <div className="w-12 h-12 rounded-full overflow-hidden bg-brand-600 shadow-2xl relative group shrink-0 cursor-pointer border-2 border-white/10 transition-all hover:border-brand-500/50">
              <img 
                src={user?.role === 'Admin' ? '/logo.jpg' : 
                  (user?.avatar ? (user.avatar.startsWith('http') || user.avatar.startsWith('data:') ? user.avatar : `${API_URL}${user.avatar}`) : 
                  'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin')} 
                alt="User" 
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                onClick={handleLogout}
              >
                <LogOut size={18} className="text-white" />
              </div>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-black text-white truncate leading-tight uppercase tracking-tighter">{user?.name}</p>
                <p className="text-[9px] font-black text-brand-500 uppercase tracking-[0.2em] mt-1">{user?.role || 'Admin'}</p>
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
