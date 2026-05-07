import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Search, Bell, HelpCircle, Sparkles, Command, ChevronDown, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TopBar = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="theme-topbar h-20 flex items-center justify-between px-10 sticky top-0 z-40">
      {/* Search */}
      <div className="flex-1 max-w-2xl group">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 theme-text-secondary group-focus-within:text-brand-400 transition-colors pointer-events-none">
            <Search size={20} />
          </div>
          <input
            type="text"
            placeholder="Ask anything or search..."
            className="w-full pl-12 pr-16 py-3.5 rounded-[20px] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/30 transition-all theme-text-primary font-medium text-sm"
            style={{
              background: 'var(--input-bg)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 rounded-lg border theme-text-secondary group-focus-within:text-brand-500 transition-colors"
            style={{ background: 'var(--card-hover-bg)', borderColor: 'var(--border-default)' }}>
            <Command size={12} />
            <span className="text-[10px] font-black tracking-widest uppercase">K</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          {/* Theme Toggle removed */}

          <button
            className="p-3 rounded-2xl transition-all relative group"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Bell size={22} />
            <span className="absolute top-3.5 right-3.5 w-2.5 h-2.5 bg-brand-500 rounded-full border-2 group-hover:scale-110 transition-transform"
              style={{ borderColor: 'var(--bg-base)' }}></span>
          </button>
          <button
            className="p-3 rounded-2xl transition-all"
            style={{ color: 'var(--text-secondary)' }}
          >
            <HelpCircle size={22} />
          </button>
        </div>

        <div className="h-8 w-[1px] mx-2" style={{ background: 'var(--border-default)' }}></div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-4 p-2 pl-4 rounded-[20px] hover:opacity-80 transition-all group border"
            style={{ borderColor: 'transparent' }}
          >
            <div className="text-right hidden md:block">
              <p className="text-sm font-black leading-none" style={{ color: 'var(--text-primary)' }}>{user?.name || 'User'}</p>
              <p className="text-[10px] text-brand-500 font-black uppercase tracking-widest mt-1.5 flex items-center justify-end gap-1 group-hover:text-neon-blue transition-colors">
                <Sparkles size={10} /> {user?.role || 'Guest'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-neon-blue p-[2px] shadow-2xl shadow-brand-600/20 group-hover:rotate-6 transition-transform">
              <div className="w-full h-full rounded-[14px] flex items-center justify-center overflow-hidden"
                style={{ background: 'var(--bg-base)' }}>
                <img
                  src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <ChevronDown size={16} className={`transition-transform duration-300 ${showProfileMenu ? 'rotate-180' : ''}`}
              style={{ color: 'var(--text-secondary)' }} />
          </button>

          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-4 w-56 rounded-[24px] p-2 shadow-2xl overflow-hidden"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
              >
                <div className="p-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Switch Role</p>
                </div>
                <button className="w-full flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-colors"
                  style={{ color: 'var(--text-primary)' }}>
                  <div className="w-2 h-2 rounded-full bg-brand-500"></div> Admin Mode
                </button>
                <button className="w-full flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-colors"
                  style={{ color: 'var(--text-secondary)' }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--border-hover)' }}></div> Team Mode
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
