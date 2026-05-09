import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import API_URL from '../../config';
import { Search, Bell, HelpCircle, Sparkles, Command, ChevronDown, Menu, IndianRupee, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TopBar = ({ onMenuToggle }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Identity Synced', desc: 'Specialist ID #442 synchronized successfully.', time: '2m ago', type: 'system', icon: Sparkles, color: '#22d3ee', path: '/id-cards' },
    { id: 2, title: 'Payroll Processed', desc: 'Monthly cycle for May 2024 finalized.', time: '1h ago', type: 'finance', icon: IndianRupee, color: '#10b981', path: '/payroll' },
    { id: 3, title: 'New Specialist Joined', desc: 'Sarah Jenkins added to the roster.', time: '3h ago', type: 'team', icon: Menu, color: '#8b5cf6', path: '/team' },
  ]);

  const clearNotifications = () => setNotifications([]);
  const handleNotifyClick = (path) => {
    setShowNotifications(false);
    window.location.href = path;
  };

  return (
    <header className="backdrop-blur-xl bg-[#020617]/60 h-20 flex items-center justify-between px-4 md:px-10 sticky top-0 z-[60] border-b border-white/10 shadow-2xl">
      <div className="flex items-center gap-2 md:gap-4 flex-1">
        <button 
          className="md:hidden p-2 rounded-lg text-brand-500 hover:bg-brand-500/10 transition-colors"
          onClick={onMenuToggle}
        >
          <Menu size={24} />
        </button>
        {/* Search */}
        <div className="flex-1 max-w-2xl group hidden sm:block">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 theme-text-secondary group-focus-within:text-brand-400 transition-colors pointer-events-none">
            <Search size={20} />
          </div>
          <input
            type="text"
            placeholder="Search missions, specialists, or reports... (Ctrl+K)"
            className="w-full pl-12 pr-16 py-3.5 rounded-[20px] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/30 transition-all theme-text-primary font-medium text-sm"
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'var(--text-primary)',
            }}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 rounded-lg border border-white/10 theme-text-secondary group-focus-within:text-brand-500 transition-colors"
            style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
            <Command size={12} />
            <span className="text-[10px] font-black tracking-widest uppercase">K</span>
          </div>
        </div>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-6">
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowHelp(false);
                setShowProfileMenu(false);
              }}
              className={`p-3 rounded-2xl transition-all relative group ${showNotifications ? 'bg-cyan-500/10' : 'hover:bg-white/5'}`}
              style={{ color: showNotifications ? '#22d3ee' : 'var(--text-secondary)' }}
            >
              <Bell size={22} className={showNotifications ? 'animate-pulse' : ''} />
              {notifications.length > 0 && !showNotifications && (
                <span className="absolute top-3.5 right-3.5 w-2.5 h-2.5 bg-cyan-500 rounded-full border-2 border-[#020617] shadow-[0_0_10px_#06b6d4]"></span>
              )}
            </button>
            
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.95 }}
                  className="absolute right-0 mt-4 w-80 bg-white rounded-[28px] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.5)] z-[100]"
                >
                  <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Mission Control</h3>
                    <button onClick={clearNotifications} className="text-[10px] font-bold text-brand-600 hover:text-brand-700 transition-colors uppercase tracking-widest">Clear All</button>
                  </div>
                  <div className="max-h-[380px] overflow-y-auto custom-scrollbar bg-white">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          onClick={() => handleNotifyClick(n.path)}
                          className="p-5 flex items-start gap-4 hover:bg-gray-50 transition-all cursor-pointer border-b border-gray-50 active:scale-[0.98]"
                        >
                          <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background: `${n.color}15`, border: `1px solid ${n.color}25` }}>
                            <n.icon size={18} style={{ color: n.color }} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-black text-gray-900 uppercase tracking-wide">{n.title}</p>
                              <span className="text-[9px] font-bold text-gray-400 whitespace-nowrap">{n.time}</span>
                            </div>
                            <p className="text-[11px] text-gray-600 mt-1.5 leading-relaxed font-medium">{n.desc}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 px-6 text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                           <Bell size={20} className="text-gray-300" />
                        </div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No Active Missions</p>
                      </div>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="p-4 bg-gray-50 text-center border-t border-gray-100">
                      <button className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600 hover:text-brand-700 transition-colors">Audit Full Activity Log</button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Help */}
          <div className="relative">
            <button
              onClick={() => {
                setShowHelp(!showHelp);
                setShowNotifications(false);
                setShowProfileMenu(false);
              }}
              className={`p-3 rounded-2xl transition-all relative group ${showHelp ? 'bg-violet-500/10' : 'hover:bg-white/5'}`}
              style={{ color: showHelp ? '#a78bfa' : 'var(--text-secondary)' }}
            >
              <HelpCircle size={22} />
            </button>
            
            <AnimatePresence>
              {showHelp && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.95 }}
                  className="absolute right-0 mt-4 w-80 bg-white rounded-[32px] p-1 shadow-[0_40px_80px_rgba(0,0,0,0.5)] z-[100]"
                >
                  <div className="p-6 bg-white rounded-[31px]">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 bg-violet-100 rounded-2xl">
                        <Sparkles size={24} className="text-violet-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">NexovTech Support</h3>
                        <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest mt-1">24/7 Agentic Help</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                       {[
                         { label: 'Platform Documentation', icon: FileText },
                         { label: 'Video Walkthroughs', icon: Command },
                         { label: 'API Reference', icon: Sparkles }
                       ].map(item => (
                         <button key={item.label} className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-transparent hover:border-gray-200 transition-all group/item">
                            <item.icon size={16} className="text-gray-400 group-hover/item:text-brand-600 transition-colors" />
                            <span className="text-[11px] font-bold text-gray-600 group-hover/item:text-gray-900 transition-colors">{item.label}</span>
                         </button>
                       ))}
                    </div>

                    <button 
                      onClick={() => window.open('mailto:support@nexovtech.com')}
                      className="w-full py-4 rounded-2xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black active:scale-[0.98] transition-all shadow-xl"
                    >
                      Summon Specialist
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="h-8 w-[1px] mx-2" style={{ background: 'var(--border-default)' }}></div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
              setShowHelp(false);
            }}
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
                  src={user?.role === 'Admin' ? '/assets/admin_dp.jpg' : 
                    (user?.avatar ? (user.avatar.startsWith('http') || user.avatar.startsWith('data:') ? user.avatar : `${API_URL}${user.avatar}`) : 
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`)}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`;
                  }}
                />
              </div>
            </div>
            <ChevronDown size={16} className={`transition-transform duration-300 ${showProfileMenu ? 'rotate-180' : ''}`}
              style={{ color: 'var(--text-secondary)' }} />
          </button>

          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                className="absolute right-0 mt-4 w-56 glass-panel rounded-[24px] p-2 shadow-2xl overflow-hidden z-[50]"
              >
                <div className="p-3 border-b border-white/5">
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
                <div className="mt-2 pt-2 border-t border-white/5">
                   <button 
                    onClick={() => { window.location.href = '/settings' }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-sm font-bold text-white/60 hover:text-white transition-colors">
                     Settings
                   </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
