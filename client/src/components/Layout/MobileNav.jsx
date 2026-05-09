import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Home, 
  Briefcase, 
  BarChart2, 
  Bell, 
  User,
  LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const MobileNav = () => {
  const { user } = useAuth();
  
  const navItems = user?.role === 'Admin' ? [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/projects', icon: Briefcase, label: 'Projects' },
    { path: '/finance', icon: BarChart2, label: 'Analytics' },
    { path: '/settings', icon: User, label: 'Profile' },
  ] : [
    { path: '/employee/dashboard', icon: LayoutDashboard, label: 'Home' },
    { path: '/employee/projects', icon: Briefcase, label: 'Projects' },
    { path: '/employee/salary', icon: BarChart2, label: 'Earnings' },
    { path: '/settings', icon: User, label: 'Profile' },
  ];

  return (
    <div className="md:hidden fixed bottom-6 left-6 right-6 z-[100]">
      <div className="relative h-16 backdrop-blur-xl bg-black/40 border border-white/10 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-around px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/' || item.path === '/employee/dashboard'}
            className={({ isActive }) => `
              relative flex flex-col items-center justify-center w-14 h-12 rounded-2xl transition-all duration-300
              ${isActive ? 'text-cyan-400' : 'text-white/30'}
            `}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveBackdrop"
                    className="absolute inset-0 bg-cyan-500/10 rounded-xl blur-md"
                  />
                )}
                <item.icon size={20} className={`z-10 ${isActive ? 'drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : ''}`} />
                <span className={`z-10 text-[7px] font-black uppercase tracking-widest mt-1 ${isActive ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
                  {item.label}
                </span>
                
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveGlow"
                    className="absolute -bottom-1.5 w-6 h-1 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee]"
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
