import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Home, 
  Briefcase, 
  User,
  CheckSquare,
  ShieldCheck,
  LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const MobileNav = () => {
  const { user } = useAuth();
  
  if (!user) return null;

  const isAdmin = user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'Manager';

  const navItems = isAdmin 
    ? [
        { path: '/', icon: Home, label: 'Home' },
        { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
        { path: '/projects', icon: Briefcase, label: 'Projects' },
        { path: '/settings', icon: User, label: 'Settings' },
      ]
    : [
        { path: '/employee/dashboard', icon: Home, label: 'Home' },
        { path: '/employee/tasks', icon: CheckSquare, label: 'Tasks' },
        { path: '/employee/projects', icon: Briefcase, label: 'Projects' },
        { path: '/employee/security', icon: ShieldCheck, label: 'Security' },
      ];

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[40] md:hidden">
      <div className="relative h-14 backdrop-blur-xl bg-black/60 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-around px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/' || item.path === '/employee/dashboard'}
            className={({ isActive }) => `
              relative flex flex-col items-center justify-center w-14 h-12 rounded-2xl transition-all duration-300
              ${isActive ? 'text-indigo-400' : 'text-white/30'}
            `}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveBackdrop"
                    className="absolute inset-0 bg-indigo-500/10 rounded-xl blur-md"
                  />
                )}
                <item.icon size={20} className={`z-10 ${isActive ? 'drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]' : ''}`} />
                <span className={`z-10 text-[7px] font-black uppercase tracking-widest mt-1 ${isActive ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
                  {item.label}
                </span>
                
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveGlow"
                    className="absolute -bottom-1.5 w-6 h-1 bg-indigo-400 rounded-full shadow-[0_0_10px_#6366f1]"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default MobileNav;
