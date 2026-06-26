import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Briefcase,
  Clock, Banknote, CreditCard,
  Settings, ChevronLeft, ChevronRight, ShieldCheck, Sparkles, Mail, Target, BookOpen,
  Bot
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../config';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ employees: 0, mail: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const token = localStorage.getItem('nexov_token') || '';
        const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

        // Fetch Employee Count
        const empRes = await fetch(`${API_URL}/auth/count`, { headers: authHeaders });
        const empData = empRes.ok ? await empRes.json() : { count: 0 };

        // Fetch Mail Count
        let mailCount = 0;
        if (user?.email) {
          try {
            const mailRes = await fetch(`${API_URL}/mail/unread-count/${user.email}`, { headers: authHeaders });
            if (mailRes.ok) {
              const mailData = await mailRes.json();
              mailCount = mailData.count || 0;
            }
          } catch (_) { }
        }

        setCounts({ employees: empData.count || 0, mail: mailCount });
      } catch (err) {
        // Fail silently
      }
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 60000); // Sync every minute
    return () => clearInterval(interval);
  }, [user?.email]);

  const menuSections = [
    {
      title: 'Command Center',
      items: [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/ai', icon: Bot, label: 'NEXA Growth' },
        { path: '/employee/dashboard', icon: LayoutDashboard, label: 'Employee Workspace' },
      ]
    },
    {
      title: 'Operations',
      items: [
        { path: '/projects', icon: Briefcase, label: 'Projects' },
        { path: '/tasks', icon: Target, label: 'Work Assignment' },
        { path: '/timesheets', icon: Clock, label: 'Time Registry' },
      ]
    },
    {
      title: 'HR & Finance',
      items: [
        { path: '/hr', icon: Users, label: 'Employees', badge: counts.employees },
        { path: '/attendance', icon: Clock, label: 'Attendance' },
        { path: '/payroll', icon: Banknote, label: 'Payroll' },
        { path: '/id-cards', icon: CreditCard, label: 'E-id' },
      ]
    },
    {
      title: 'Client Acquisition',
      items: [
        { path: '/clients', icon: Users, label: 'Client Portfolio' },
        { path: '/nexus-mail', icon: Mail, label: 'Nexus Mail', badge: counts.mail },
        { path: '/comm-intelligence', icon: Sparkles, label: 'Intelligence' },
        { path: '/admin-learning', icon: BookOpen, label: 'Learning Ops' },
      ]
    },
    {
      title: 'Governance & Safety',
      items: [
        { path: '/audit', icon: ShieldCheck, label: 'AI Audit' },
        ...(user?.role === 'Admin' || user?.role === 'Super Admin' ? [
          { path: '/security-shield', icon: ShieldCheck, label: 'Security Shield' }
        ] : []),
        { path: '/settings', icon: Settings, label: 'Settings' },
      ]
    }
  ];

  return (
    <div 
      className={`h-full bg-slate-900 border-r border-white/10 hidden md:flex flex-col py-6 shrink-0 transition-all duration-300 relative z-40 ${
        isCollapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-10 w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-50 shadow-md"
      >
        {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Navigation Icons & Labels */}
      <div className="flex-1 w-full overflow-y-auto no-scrollbar px-3 space-y-6">
        {menuSections.map((section) => (
          <div key={section.title} className="flex flex-col gap-1.5">
            {!isCollapsed && (
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider px-2">
                {section.title}
              </span>
            )}
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  relative flex items-center h-12 rounded-xl transition-all group px-3.5 gap-3.5
                  ${isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white active:bg-white/10'}
                `}
              >
                <item.icon size={20} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
                {!isCollapsed && (
                  <span className="text-xs font-bold truncate tracking-tight">{item.label}</span>
                )}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`
                    flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white
                    ${isCollapsed ? 'absolute -top-1 -right-1 border border-slate-900' : 'ml-auto'}
                  `}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {/* User Footer */}
      <div className="pt-4 border-t border-white/5 w-full px-3 flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-xl overflow-hidden bg-indigo-600 shadow-xl relative group shrink-0 cursor-pointer"
          onClick={() => navigate('/settings')}
        >
          <img
            src={user?.avatar ? (user.avatar.startsWith('http') || user.avatar.startsWith('data:') ? user.avatar : `${API_URL.replace('/api', '')}${user.avatar}`) :
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'Admin'}`}
            alt="User"
            className="w-full h-full object-cover"
          />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col truncate">
            <span className="text-white text-xs font-black truncate leading-tight uppercase">{user?.name || 'Admin User'}</span>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{user?.role || 'Authorized'}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
