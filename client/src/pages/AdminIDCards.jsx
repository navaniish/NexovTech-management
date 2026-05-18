import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, Search, Filter, Loader2, Sparkles, 
  ChevronRight, RefreshCw, CheckCircle2, XCircle, 
  Eye, Download, MoreVertical, Plus, CreditCard,
  UserCheck, ClipboardList, Settings2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DigitalIDCard from '../components/IDCard/DigitalIDCard';

import API_URL from '../config';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

// Resolve avatar URLs: local paths need the backend server prefix
const SERVER_BASE = API_URL.replace('/api', '');
const getAvatarUrl = (avatar) => {
  if (!avatar) return 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
  if (avatar.startsWith('http') || avatar.startsWith('data:')) return avatar;
  // If raw base64 data without prefix, auto-wrap it
  if (/^[A-Za-z0-9+/=]+$/.test(avatar.trim()) && avatar.length > 100) {
    return `data:image/jpeg;base64,${avatar.trim()}`;
  }
  return `${SERVER_BASE}${avatar}`;
};

const AdminIDCards = () => {
  const { user: currentUser } = useAuth();
  const [employees, setEmployees] = useState(() => {
    const saved = localStorage.getItem('nexov_admin_employees');
    try { return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [cards, setCards] = useState(() => {
    const saved = localStorage.getItem('nexov_admin_cards');
    try { return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [generatingId, setGeneratingId] = useState(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', role: '', phone: '', avatar: '', issueDate: '', expiryDate: '', address: '', authorizedSign: '', teamSign: '' });
  const [savingDetails, setSavingDetails] = useState(false);
  
  // Mobile UI state
  const [activeTab, setActiveTab] = useState('registry'); // 'registry' or 'preview'

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch from Legacy Backend
      let legacyEmployees = [];
      let cardData = [];
      
      try {
        const [legacyEmpRes, cardRes] = await Promise.all([
          fetch(`${API_URL}/team`),
          fetch(`${API_URL}/idcard/list/all`)
        ]);
        
        if (legacyEmpRes.ok) {
          legacyEmployees = await legacyEmpRes.json();
        }
        if (cardRes.ok) {
          cardData = await cardRes.json();
        }
      } catch (err) {
        console.warn("Legacy backend registry synchronization failed:", err);
      }

      // 2. Fetch from Firestore (Source of Truth) with resilient exception wrapping
      let fsEmployees = [];
      try {
        const fsSnap = await getDocs(collection(db, 'employees'));
        fsEmployees = fsSnap.docs.map(d => ({ ...d.data(), id: d.id, _id: d.id }));
      } catch (fsErr) {
        console.warn("Firestore registry sync failed (falling back to cache/legacy):", fsErr.message || fsErr);
        // Resilient Fallback to local storage registry
        const savedEmp = localStorage.getItem('nexov_admin_employees');
        if (savedEmp) {
          try {
            fsEmployees = JSON.parse(savedEmp);
          } catch (e) {
            console.error("Local registry parsing failure:", e);
          }
        }
      }

      // 3. Merge: Prioritize Firestore/Cache, but include unique legacy users (filter revoked)
      const mergedEmployees = fsEmployees.filter(e => e.status !== 'revoked' && e.status !== 'Revoked');
      legacyEmployees.forEach(lUser => {
        const lEmail = lUser.email?.toLowerCase();
        if (lEmail && !mergedEmployees.find(m => m.email?.toLowerCase() === lEmail) && lUser.status !== 'revoked' && lUser.status !== 'Revoked') {
          mergedEmployees.push(lUser);
        }
      });

      // If we got absolutely zero records (e.g. clean start with offline firestore), try to merge from legacy directly
      if (mergedEmployees.length === 0 && legacyEmployees.length > 0) {
        mergedEmployees.push(...legacyEmployees.filter(e => e.status !== 'revoked' && e.status !== 'Revoked'));
      }

      setEmployees(mergedEmployees);
      localStorage.setItem('nexov_admin_employees', JSON.stringify(mergedEmployees));

      // Handle Card Data State
      if (cardData && cardData.length > 0) {
        setCards(cardData);
        localStorage.setItem('nexov_admin_cards', JSON.stringify(cardData));
      } else {
        const savedCards = localStorage.getItem('nexov_admin_cards');
        if (savedCards) {
          try {
            const parsedCards = JSON.parse(savedCards);
            if (parsedCards && parsedCards.length > 0) setCards(parsedCards);
          } catch {}
        }
      }
    } catch (err) {
      console.error("Critical Admin ID Card Sync Failure:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedEmployee) {
      const updatedEmp = employees.find(e => (e._id || e.id) === (selectedEmployee._id || selectedEmployee.id));
      if (updatedEmp) {
        const updatedCard = getCardForEmployee(updatedEmp);
        setSelectedEmployee({ ...updatedEmp, card: updatedCard });
      }
    }
  }, [employees, cards]);

  const handleGenerate = async (userId) => {
    setGeneratingId(userId);
    try {
      const res = await fetch(`${API_URL}/idcard/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingId(null);
    }
  };

  const handleUpdateStatus = async (cardId, status) => {
    try {
      const res = await fetch(`${API_URL}/idcard/update/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setSavingDetails(true);
    try {
      const profileRes = await fetch(`${API_URL}/auth/update-profile/${selectedEmployee._id || selectedEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: editForm.name, 
          role: editForm.role, 
          phone: editForm.phone, 
          avatar: editForm.avatar,
          address: editForm.address,
          authorizedSign: editForm.authorizedSign,
          teamSign: editForm.teamSign
        })
      });

      if (!profileRes.ok) throw new Error('Identity Registry update failed');
      let updatedCard = selectedEmployee.card;
      if (selectedEmployee.card) {
        const newIssueDate = editForm.issueDate ? new Date(editForm.issueDate).toISOString() : selectedEmployee.card.issueDate;
        const newExpiryDate = editForm.expiryDate ? new Date(editForm.expiryDate).toISOString() : selectedEmployee.card.expiryDate;
        
        const cardRes = await fetch(`${API_URL}/idcard/update-details/${selectedEmployee.card.id || selectedEmployee.card._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ issueDate: newIssueDate, expiryDate: newExpiryDate })
        });
        
        if (!cardRes.ok) throw new Error('ID Card metadata update failed');
        
        updatedCard = { ...selectedEmployee.card, issueDate: newIssueDate, expiryDate: newExpiryDate };
      }
      setIsEditingDetails(false);
      
      const updatedEmployee = { ...selectedEmployee, ...editForm, card: updatedCard };
      setSelectedEmployee(updatedEmployee);
      
      setEmployees(prev => prev.map(emp => 
        (emp._id || emp.id) === (selectedEmployee._id || selectedEmployee.id) 
        ? { ...emp, ...editForm, card: updatedCard } 
        : emp
      ));

      if (editForm.avatar) {
        localStorage.setItem(`nexov_portrait_${selectedEmployee._id || selectedEmployee.id}`, editForm.avatar);
      }
      
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingDetails(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm({ ...editForm, avatar: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const getCardForEmployee = (employee) => {
    if (!employee) return null;
    const empId = employee._id || employee.id;
    const empEmail = employee.email?.toLowerCase();

    return cards.find(c => 
      c.userId === empId || 
      c.id === empId || 
      (c.email && empEmail && c.email.toLowerCase() === empEmail)
    );
  };

  const filteredEmployees = employees.filter(emp => {
    const nameMatch = emp.name?.toLowerCase().includes(search.toLowerCase());
    const emailMatch = emp.email?.toLowerCase().includes(search.toLowerCase());
    const idMatch = emp.employeeId?.toLowerCase().includes(search.toLowerCase());
    return nameMatch || emailMatch || idMatch;
  });

  const selectEmployeeForPreview = (emp, card) => {
    setSelectedEmployee({ ...emp, card });
    if (window.innerWidth < 1280) {
      setActiveTab('preview');
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-4 sm:p-6 md:p-10 space-y-6 pb-24 md:pb-12 max-w-[1400px] mx-auto overflow-y-auto scrollbar-hide">
       {/* 1. HIGH-FIDELITY OFFICE HEADER */}
       <section className="relative w-full overflow-hidden rounded-[24px] md:rounded-[40px] bg-white shadow-2xl border border-white flex flex-col min-h-[200px] group">
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 blur-[8px] scale-105 group-hover:scale-110"
            style={{ backgroundImage: "url('/assets/office-bg.png')" }}
          />
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[12px]" />
          
          <div className="relative z-10 flex-1 p-4 sm:p-6 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
             <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tighter leading-none flex items-center gap-3">
                   E-ID Command Hub <span className="animate-bounce-slow">🪪</span>
                </h1>
                <p className="text-slate-500 text-[13px] sm:text-[15px] font-medium">
                   Identity lifecycle, digital credentialing & secure registry.
                </p>
             </div>

             <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
               <div className="relative w-full sm:w-72">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <input 
                   placeholder="Personnel lookup..." 
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                   className="w-full pl-12 pr-6 py-4 rounded-[20px] bg-white/60 border border-white text-slate-900 text-sm font-bold shadow-xl backdrop-blur-md outline-none focus:ring-4 focus:ring-brand-500/10 transition-all"
                 />
               </div>
               <button className="p-4 bg-white/60 border border-white rounded-[20px] text-slate-400 hover:text-slate-900 shadow-xl backdrop-blur-md transition-all flex items-center justify-center shrink-0 w-full sm:w-auto">
                 <Filter size={20} />
               </button>
             </div>
          </div>
       </section>


       {/* Tab Switcher - Now with premium styling */}
       <div className="xl:hidden flex p-1.5 bg-slate-900/5 backdrop-blur-md border border-slate-900/10 rounded-[20px]">
         <button 
           onClick={() => setActiveTab('registry')}
           className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'registry' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-slate-900'}`}
         >
           <UserCheck size={14} /> Registry
         </button>
         <button 
           onClick={() => setActiveTab('preview')}
           className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'preview' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-slate-900'}`}
         >
           <Eye size={14} /> Preview
         </button>
       </div>

       <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
         {/* Registry Section */}
         <div className={`xl:col-span-7 space-y-4 ${activeTab !== 'registry' && 'hidden xl:block'}`}>
           <motion.div 
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             className="glass-card !p-0 rounded-[24px] md:rounded-[40px] overflow-hidden border-slate-100 shadow-2xl"
           >
              <div className="p-4 sm:p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between bg-white/40 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">Personnel Registry</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Biometric Database</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/60 border border-white shadow-sm">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                   <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{employees.length} Secured</span>
                </div>
             </div>

             <div className="divide-y divide-slate-50 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white/20">
                {loading ? (
                  <div className="py-24 flex flex-col items-center gap-6">
                    <div className="relative">
                      <Loader2 size={40} className="text-slate-900 animate-spin" />
                      <div className="absolute inset-0 bg-brand-500 blur-[20px] opacity-20" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Synchronizing Biometrics...</p>
                  </div>
                ) : filteredEmployees.map((emp) => {
                  const card = getCardForEmployee(emp);
                  const isSelected = selectedEmployee && (selectedEmployee._id || selectedEmployee.id) === (emp._id || emp.id);
                  
                  return (
                    <div 
                      key={emp._id || emp.id} 
                      onClick={() => selectEmployeeForPreview(emp, card)}
                      className={`p-4 md:p-6 flex items-center justify-between group transition-all cursor-pointer ${isSelected ? 'bg-white/80 border-l-4 border-slate-900' : 'hover:bg-white/40 border-l-4 border-transparent'}`}
                    >
                       <div className="flex items-center gap-5 min-w-0">
                          <div className="relative shrink-0">
                            <div className={`p-1 rounded-[20px] transition-all ${isSelected ? 'bg-slate-900 shadow-xl' : 'bg-slate-100 group-hover:bg-white'}`}>
                              <img src={getAvatarUrl(emp.avatar)} className="w-12 h-12 md:w-14 md:h-14 rounded-[18px] object-cover" alt="" />
                            </div>
                            {card?.status === 'Active' && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-[3px] border-white shadow-lg" />
                            )}
                          </div>
                          <div className="min-w-0">
                             <p className="text-sm md:text-base font-black text-slate-900 tracking-tighter leading-none truncate">{emp.name}</p>
                             <div className="flex items-center gap-2 mt-2">
                               <p className="text-[10px] text-slate-400 font-bold truncate uppercase tracking-widest">{emp.role}</p>
                               <span className="w-1 h-1 rounded-full bg-slate-400" />
                               <p className="text-[9px] text-slate-500 font-bold truncate">{emp.email}</p>
                             </div>
                          </div>
                       </div>

                       <div className="flex items-center gap-4 md:gap-8 shrink-0">
                          <div className="hidden sm:block text-right">
                             <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Status</p>
                             {card ? (
                               <div className="flex items-center justify-end gap-2">
                                  <span className={`text-[10px] font-black uppercase tracking-widest ${card.status === 'Active' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {card.status}
                                  </span>
                               </div>
                             ) : (
                               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Pending Issue</span>
                             )}
                          </div>

                          <div className="flex items-center gap-2">
                             {card ? (
                               <div className={`p-3 rounded-2xl transition-all ${isSelected ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-slate-900'}`}>
                                 <ChevronRight size={20} />
                               </div>
                             ) : (
                               <button 
                                 onClick={(e) => { e.stopPropagation(); handleGenerate(emp._id || emp.id); }}
                                 disabled={generatingId === (emp._id || emp.id)}
                                 className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-3 shadow-xl disabled:opacity-50"
                               >
                                 {generatingId === (emp._id || emp.id) ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                 <span className="hidden md:inline">Authorize E-ID</span>
                               </button>
                             )}
                          </div>
                       </div>
                    </div>
                  );
                })}
             </div>
          </motion.div>
        </div>

        {/* Preview Panel */}
        <div className={`xl:col-span-5 ${activeTab !== 'preview' && 'hidden xl:block'}`}>
          <div className="sticky top-28 space-y-6">
            <AnimatePresence mode="wait">
              {selectedEmployee ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="space-y-6"
                >
                  {/* Card Container with Responsive Scaling */}
                  <div className="flex justify-center w-full overflow-hidden py-4">
                    <DigitalIDCard 
                      employee={isEditingDetails ? { ...selectedEmployee, ...editForm } : selectedEmployee} 
                      cardData={selectedEmployee.card} 
                      isAdmin={true}
                    />
                  </div>
                  
                  {/* Action Suite */}
                  <div className="theme-card rounded-[32px] p-6 border border-gray-100 bg-white/[0.02]">
                    <div className="flex items-center gap-3 mb-6">
                      <Settings2 size={16} className="text-brand-400" />
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-600">Verification Suite</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {selectedEmployee.card ? (
                        <>
                          <button 
                            onClick={() => handleUpdateStatus(selectedEmployee.card.id || selectedEmployee.card._id, selectedEmployee.card.status === 'Active' ? 'Inactive' : 'Active')}
                            className={`group py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                              selectedEmployee.card.status === 'Active' 
                              ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 border border-rose-500/20 hover:text-gray-900' 
                              : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 border border-emerald-500/20 hover:text-gray-900'
                            }`}
                          >
                            {selectedEmployee.card.status === 'Active' ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                            {selectedEmployee.card.status === 'Active' ? 'Suspend' : 'Authorize'}
                          </button>
                      
                          <button 
                            onClick={() => handleGenerate(selectedEmployee._id || selectedEmployee.id)}
                            disabled={generatingId === (selectedEmployee._id || selectedEmployee.id)}
                            className="py-3.5 rounded-2xl bg-brand-500/10 text-brand-500 text-[10px] font-black uppercase tracking-widest hover:bg-brand-500 hover:text-gray-900 border border-brand-500/20 transition-all flex items-center justify-center gap-2"
                          >
                            {generatingId === (selectedEmployee._id || selectedEmployee.id) ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                            Reissue
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => handleGenerate(selectedEmployee._id || selectedEmployee.id)}
                          disabled={generatingId === (selectedEmployee._id || selectedEmployee.id)}
                          className="col-span-2 py-3.5 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
                        >
                          {generatingId === (selectedEmployee._id || selectedEmployee.id) ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                          Generate E-ID Card
                        </button>
                      )}

                      {(currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') && (
                        <button 
                          onClick={() => {
                            setEditForm({
                              name: selectedEmployee.name,
                              role: selectedEmployee.role,
                              phone: selectedEmployee.phone || '',
                              avatar: selectedEmployee.avatar || '',
                              issueDate: selectedEmployee.card?.issueDate ? selectedEmployee.card.issueDate.split('T')[0] : '',
                              expiryDate: selectedEmployee.card?.expiryDate ? selectedEmployee.card.expiryDate.split('T')[0] : '',
                              address: selectedEmployee.address || '',
                              authorizedSign: selectedEmployee.authorizedSign || '',
                              teamSign: selectedEmployee.teamSign || ''
                            });
                            setIsEditingDetails(true);
                          }}
                          className="col-span-2 py-3.5 rounded-2xl bg-gray-50 text-gray-600 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-gray-900 border border-gray-200 transition-all"
                        >
                          Modify Credentials
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="theme-card rounded-[40px] p-12 flex flex-col items-center text-center space-y-6 border-2 border-dashed border-gray-100 bg-white/[0.01]">
                   <div className="w-20 h-20 rounded-[28px] bg-gray-50 flex items-center justify-center text-gray-300">
                      <CreditCard size={40} />
                   </div>
                   <div className="space-y-2">
                      <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Awaiting Identity</h4>
                      <p className="text-[10px] text-gray-400 font-bold leading-relaxed max-w-[200px]">Select a profile from the registry to engage the E-ID verification suite.</p>
                   </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Edit Details Modal */}
      <AnimatePresence>
        {isEditingDetails && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsEditingDetails(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] p-6 md:p-8 shadow-2xl z-10 border border-gray-200 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-500/10 rounded-xl text-brand-500">
                    <Settings2 size={20} />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Modify Identity</h3>
                </div>
                <button onClick={() => setIsEditingDetails(false)} className="p-2 text-gray-300 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-all">
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveDetails} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Full Name</label>
                    <input 
                      value={editForm.name} 
                      onChange={e => setEditForm({...editForm, name: e.target.value})} 
                      className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Designation</label>
                    <input 
                      value={editForm.role} 
                      onChange={e => setEditForm({...editForm, role: e.target.value})} 
                      className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 transition-all" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Contact Protocol (Phone)</label>
                  <input 
                    value={editForm.phone} 
                    onChange={e => setEditForm({...editForm, phone: e.target.value})} 
                    className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 transition-all" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Portrait Sync</label>
                  <div className="p-4 rounded-3xl bg-gray-50 border border-gray-200 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl border-2 border-brand-500/30 overflow-hidden shrink-0">
                        <img src={getAvatarUrl(editForm.avatar)} className="w-full h-full object-cover" alt="Preview" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="block w-full text-[10px] text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-brand-500 file:text-gray-900 hover:file:bg-brand-400 transition-all cursor-pointer"
                        />
                        <button 
                          type="button"
                          onClick={() => setEditForm({...editForm, avatar: '/assets/admin_dp.jpg'})}
                          className="text-[9px] font-black uppercase text-brand-400 hover:text-brand-300 transition-colors"
                        >
                          Use Corporate Default
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Issue Timestamp</label>
                    <input 
                      type="date" 
                      value={editForm.issueDate} 
                      onChange={e => setEditForm({...editForm, issueDate: e.target.value})} 
                      className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Deactivation Date</label>
                    <input 
                      type="date" 
                      value={editForm.expiryDate} 
                      onChange={e => setEditForm({...editForm, expiryDate: e.target.value})} 
                      className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 transition-all" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Employee Address</label>
                  <textarea 
                    value={editForm.address} 
                    onChange={e => setEditForm({...editForm, address: e.target.value})} 
                    rows={2}
                    className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 transition-all resize-none" 
                    placeholder="Enter employee address..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Authorized Sign</label>
                    <input 
                      value={editForm.authorizedSign} 
                      onChange={e => setEditForm({...editForm, authorizedSign: e.target.value})} 
                      className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 transition-all" 
                      placeholder="e.g. NexovTech"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Team Sign</label>
                    <input 
                      value={editForm.teamSign} 
                      onChange={e => setEditForm({...editForm, teamSign: e.target.value})} 
                      className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 transition-all" 
                      placeholder="e.g. Team"
                    />
                  </div>
                </div>
                
                <div className="pt-6 flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => setIsEditingDetails(false)} 
                    className="flex-1 py-4 rounded-2xl bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-gray-900 transition-all"
                  >
                    Abort
                  </button>
                  <button 
                    type="submit" 
                    disabled={savingDetails} 
                    className="flex-1 py-4 rounded-2xl bg-brand-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand-600/20 disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {savingDetails ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={14} />}
                    Authorize Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminIDCards;



