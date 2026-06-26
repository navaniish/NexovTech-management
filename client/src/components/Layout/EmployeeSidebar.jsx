import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Briefcase, Clock, Sparkles,
  LogOut, Calendar, IndianRupee, Settings, CreditCard, Mail, ShieldCheck, BookOpen, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../config';

const baseSections = [
  {
    title: 'Workspace',
    items: [
      { path: '/employee/dashboard', icon: LayoutDashboard, label: 'Dashboard', badge: null },
      { path: '/employee/ai-chat', icon: Sparkles, label: 'NEXA AI Hub', badge: 'Active' },
    ]
  },
  {
    title: 'Tasks & Projects',
    items: [
      { path: '/employee/tasks', icon: CheckSquare, label: 'My Tasks', badge: null },
      { path: '/employee/projects', icon: Briefcase, label: 'My Projects', badge: null },
      { path: '/employee/timesheet', icon: Clock, label: 'Timesheet', badge: null },
    ]
  },
  {
    title: 'Company & Learning',
    items: [
      { path: '/employee/attendance', icon: Clock, label: 'Attendance', badge: null },
      { path: '/employee/leaves', icon: Calendar, label: 'Leave Request', badge: null },
      { path: '/employee/learning', icon: BookOpen, label: 'My Learning', badge: 'New' },
    ]
  },
  {
    title: 'Registry & Comms',
    items: [
      { path: '/employee/id-card', icon: CreditCard, label: 'My E-ID Card', badge: 'New' },
      { path: '/employee/mail', icon: Mail, label: 'Nexus Mail', badge: 'OFFICIAL' },
    ]
  },
  {
    title: 'Finance & Security',
    items: [
      { path: '/employee/salary', icon: IndianRupee, label: 'Salary', badge: null },
      { path: '/employee/security', icon: ShieldCheck, label: 'Security Shield', badge: 'PRO' },
      { path: '/employee/settings', icon: Settings, label: 'Settings', badge: null },
    ]
  }
];

const EmployeeSidebar = ({ isMobileOpen, onCloseMobile }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm('Terminate secure session?')) {
      logout();
      navigate('/login');
    }
  };

  const isAdmin = user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'Manager';
  const dynamicMenuSections = isAdmin
    ? [
      {
        title: 'Management Command',
        items: [
          { path: '/', icon: LayoutDashboard, label: 'Admin Command Center', badge: 'TEST' }
        ]
      },
      ...baseSections
    ]
    : baseSections;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <div 
        className={`h-full bg-slate-900 border-r border-white/10 flex flex-col py-6 shrink-0 transition-all duration-300 z-50
          fixed inset-y-0 left-0 md:relative md:inset-auto md:translate-x-0
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isCollapsed ? 'w-[260px] md:w-[72px]' : 'w-[260px]'}
        `}
      >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-10 w-6 h-6 rounded-full bg-slate-800 border border-white/10 hidden md:flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-50 shadow-md"
      >
        {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Navigation Icons & Labels */}
      <div className="flex-1 w-full overflow-y-auto no-scrollbar px-3 space-y-6">
        {dynamicMenuSections.map((section, sIdx) => (
          <div key={`${section.title}-${sIdx}`} className="flex flex-col gap-1.5">
            {!isCollapsed && (
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider px-2">
                {section.title}
              </span>
            )}
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive }) => `
                  relative flex items-center h-12 rounded-xl transition-all group px-3.5 gap-3.5
                  ${isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white active:bg-white/10'}
                `}
              >
                <item.icon size={18} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
                {!isCollapsed && (
                  <span className="text-xs font-bold truncate tracking-tight">{item.label}</span>
                )}
                {item.badge && (
                  <span className={`
                    flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white
                    ${isCollapsed ? 'absolute -top-1 -right-1 border border-slate-900' : 'ml-auto'}
                  `}>
                    !
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {/* User Footer with Logout Action */}
      <div className="pt-4 border-t border-white/5 w-full px-3 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl overflow-hidden bg-indigo-600 shadow-xl relative group shrink-0 cursor-pointer"
            onClick={() => { navigate('/employee/settings'); onCloseMobile(); }}
          >
            <img
              src={user?.avatar ? (user.avatar.startsWith('http') || user.avatar.startsWith('data:') ? user.avatar : `${API_URL.replace('/api', '')}${user.avatar}`) :
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'Emp'}`}
              alt="User"
              className="w-full h-full object-cover"
            />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="text-white text-xs font-black truncate leading-tight uppercase">{user?.name || 'Employee'}</span>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{user?.role || 'Developer'}</span>
            </div>
          )}
        </div>
        
        <button
          onClick={handleLogout}
          className="h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-white/5 hover:text-white active:bg-white/10 transition-colors w-full px-3 gap-3"
          title="Logout"
        >
          <LogOut size={18} className="shrink-0" />
          {!isCollapsed && (
            <span className="text-xs font-bold tracking-tight text-slate-400 group-hover:text-white w-full text-left uppercase">Logout</span>
          )}
        </button>
      </div>
      </div>
    </>
  );
};

export default EmployeeSidebar;
