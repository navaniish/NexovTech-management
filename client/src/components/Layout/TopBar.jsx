import React, { useState, useEffect } from 'react';
import { Menu, Search, Bell, MessageSquare, Sun, Moon, Command, ChevronDown, LogOut, User, Settings as SettingsIcon, CheckCircle2, AlertTriangle, Info, Check } from 'lucide-react';
import API_URL from '../../config';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const TopBar = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/notifications?userId=${user.id || user._id}&role=${user.role}`);
      if (res.ok) {
        setNotifications(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [user]);

  const markAsRead = async (id) => {
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) { console.error(err); }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id || user?._id })
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) { console.error(err); }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = async () => {
    if (window.confirm('Terminate secure session?')) {
      await logout();
      navigate('/login');
    }
  };

  return (
    <header className="h-[70px] md:h-[80px] w-full glass-panel border-b border-white/20 px-4 md:px-8 flex items-center justify-between relative z-[100] shrink-0">
      
      {/* LEFT AREA - BRAND LOGO */}
      <div className="flex items-center gap-4 md:w-[260px]">
        <button 
          onClick={onMenuToggle}
          className="md:hidden p-2 text-slate-500 hover:bg-white/50 rounded-xl"
        >
          <Menu size={22} />
        </button>
        
        <div className="flex items-center group cursor-pointer" onClick={() => navigate('/')}>
           <div className="h-[40px] md:h-[60px] bg-white rounded-lg p-1 px-2 flex items-center justify-center transition-all duration-300 group-hover:scale-105 shadow-sm">
              <img src="/assets/company-logo.jpeg" alt="Logo" className="h-full w-auto object-contain" />
           </div>
        </div>
      </div>

      {/* WIDE SEARCH BAR - GLASSMORPHIC */}
      <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-full max-w-[600px]">
        <div className="relative w-full group">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
            <Search size={18} />
          </div>
          <input 
            type="text" 
            placeholder="Search for employees, projects, tasks..." 
            className="w-full h-12 pl-12 pr-16 bg-white/40 border border-white/60 rounded-2xl text-[14px] font-bold focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
            <Command size={10} className="text-slate-400" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">K</span>
          </div>
        </div>
      </div>

      {/* RIGHT UTILITIES */}
      <div className="flex items-center gap-3">
        <button onClick={toggleTheme} className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white/60 rounded-2xl transition-all">
          <Sun size={20} />
        </button>
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-11 h-11 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white/60 rounded-2xl transition-all"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-4 h-4 bg-rose-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-lg animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-4 w-[340px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-20 backdrop-blur-xl"
                >
                  <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                    <div>
                      <p className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Alerts</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{unreadCount} Unread</p>
                    </div>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors flex items-center gap-1">
                        <Check size={12} /> Mark All Read
                      </button>
                    )}
                  </div>

                  <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400">
                        <Bell size={24} className="mb-2 opacity-50" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No Active Alerts</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          className={`p-4 border-b border-slate-50 flex gap-3 hover:bg-slate-50 transition-colors group cursor-pointer ${!n.read ? 'bg-indigo-50/30' : ''}`}
                          onClick={() => {
                            if (!n.read) markAsRead(n.id);
                            if (n.link) {
                              navigate(n.link);
                              setShowNotifications(false);
                            }
                          }}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                            n.type === 'error' ? 'bg-rose-100 text-rose-500' :
                            n.type === 'warning' ? 'bg-amber-100 text-amber-500' :
                            n.type === 'success' ? 'bg-emerald-100 text-emerald-500' :
                            'bg-indigo-100 text-indigo-600'
                          }`}>
                            {n.type === 'error' ? <AlertTriangle size={14} /> :
                             n.type === 'warning' ? <AlertTriangle size={14} /> :
                             n.type === 'success' ? <CheckCircle2 size={14} /> :
                             <Info size={14} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <p className={`text-[11px] font-black truncate uppercase tracking-widest ${!n.read ? 'text-slate-900' : 'text-slate-500'}`}>
                                {n.title}
                              </p>
                              {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />}
                            </div>
                            <p className="text-[11px] font-medium text-slate-500 leading-tight line-clamp-2">{n.message}</p>
                            <p className="text-[9px] font-bold text-slate-400 mt-1.5 uppercase tracking-widest">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
        <button className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white/60 rounded-2xl transition-all">
          <MessageSquare size={20} />
        </button>
        
        <div className="w-px h-8 bg-white/40 mx-2" />

        <div className="relative">
           <div 
             onClick={() => setShowUserMenu(!showUserMenu)}
             className="flex items-center gap-3 pl-2 group cursor-pointer"
           >
              <div className="text-right hidden lg:block">
                <p className="text-[13px] font-black text-slate-900 leading-tight uppercase tracking-tighter">
                  {user?.name || 'Navaneeswar'}
                </p>
                <p className={`text-[9px] font-black uppercase tracking-[0.1em] ${
                  user?.role === 'Admin' ? 'text-indigo-600' : 
                  user?.role === 'Editor' ? 'text-purple-500' : 
                  user?.role === 'Manager' ? 'text-emerald-600' : 
                  'text-slate-400'
                }`}>
                  {user?.role || 'Super Admin'}
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-white shadow-xl group-hover:scale-105 transition-all duration-300">
                 <img 
                   src={user?.avatar ? (user.avatar.startsWith('http') || user.avatar.startsWith('data:') ? user.avatar : `${API_URL.replace('/api', '')}${user.avatar}`) : `https://api.dicebear.com/7.x/avataaars/svg?seed=Admin`} 
                   alt="" 
                   className="w-full h-full object-cover" 
                 />
              </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${showUserMenu ? 'rotate-180' : ''}`} />
           </div>

           <AnimatePresence>
             {showUserMenu && (
               <>
                 <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                 <motion.div
                   initial={{ opacity: 0, y: 10, scale: 0.95 }}
                   animate={{ opacity: 1, y: 0, scale: 1 }}
                   exit={{ opacity: 0, y: 10, scale: 0.95 }}
                   className="absolute right-0 mt-4 w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 p-3 z-20 backdrop-blur-xl"
                 >
                    <div className="p-4 border-b border-slate-50 mb-2">
                       <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Authenticated Unit</p>
                       <p className="text-sm font-black text-slate-900 truncate">{user?.companyEmail || user?.email || 'admin@nexovtech.com'}</p>
                    </div>

                    <button 
                      onClick={() => { navigate('/settings'); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all group"
                    >
                       <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                          <User size={16} />
                       </div>
                       <span className="text-xs font-black uppercase tracking-widest">Command Profile</span>
                    </button>

                    <button 
                      onClick={() => { navigate('/settings'); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all group"
                    >
                       <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                          <SettingsIcon size={16} />
                       </div>
                       <span className="text-xs font-black uppercase tracking-widest">System Settings</span>
                    </button>

                    <div className="my-2 border-t border-slate-50" />

                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-rose-500 hover:bg-rose-50 transition-all group"
                    >
                       <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                          <LogOut size={16} />
                       </div>
                       <span className="text-xs font-black uppercase tracking-widest">Terminate Session</span>
                    </button>
                 </motion.div>
               </>
             )}
           </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
