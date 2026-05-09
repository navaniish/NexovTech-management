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

const AdminIDCards = () => {
  const { user: currentUser } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [generatingId, setGeneratingId] = useState(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', role: '', phone: '', avatar: '', issueDate: '', expiryDate: '' });
  const [savingDetails, setSavingDetails] = useState(false);
  
  // Mobile UI state
  const [activeTab, setActiveTab] = useState('registry'); // 'registry' or 'preview'

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, cardRes] = await Promise.all([
        fetch(`${API_URL}/team`),
        fetch(`${API_URL}/idcard/list/all`)
      ]);
      if (empRes.ok) setEmployees(await empRes.json());
      if (cardRes.ok) setCards(await cardRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      const updatedEmp = employees.find(e => (e._id || e.id) === (selectedEmployee._id || selectedEmployee.id));
      if (updatedEmp) {
        const updatedCard = cards.find(c => c.userId === (updatedEmp._id || updatedEmp.id));
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
      await fetch(`${API_URL}/auth/update-profile/${selectedEmployee._id || selectedEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editForm.name, role: editForm.role, phone: editForm.phone, avatar: editForm.avatar })
      });
      if (selectedEmployee.card) {
        await fetch(`${API_URL}/idcard/update-details/${selectedEmployee.card.id || selectedEmployee.card._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            issueDate: editForm.issueDate ? new Date(editForm.issueDate).toISOString() : selectedEmployee.card.issueDate,
            expiryDate: editForm.expiryDate ? new Date(editForm.expiryDate).toISOString() : selectedEmployee.card.expiryDate
          })
        });
      }
      setIsEditingDetails(false);
      
      const updatedEmployee = { ...selectedEmployee, ...editForm };
      setSelectedEmployee(updatedEmployee);
      
      setEmployees(prev => prev.map(emp => 
        (emp._id || emp.id) === (selectedEmployee._id || selectedEmployee.id) 
        ? { ...emp, ...editForm } 
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

  const getCardForEmployee = (userId) => cards.find(c => 
    c.userId === userId || 
    c.id === userId || 
    (c.userId && c.userId.toString() === userId?.toString())
  );

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.email.toLowerCase().includes(search.toLowerCase())
  );

  const selectEmployeeForPreview = (emp, card) => {
    setSelectedEmployee({ ...emp, card });
    if (window.innerWidth < 1024) {
      setActiveTab('preview');
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-24 md:pb-12 px-1 md:px-0">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#020617]/40 p-4 md:p-6 rounded-[32px] border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-500/10 rounded-2xl flex items-center justify-center text-brand-500 shadow-lg shadow-brand-500/10">
            <Shield size={28} />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-black tracking-tight text-white leading-none">E-ID Hub</h1>
            <p className="mt-1.5 text-[10px] md:text-xs font-bold text-white/40 uppercase tracking-widest">Identity Command Center</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" size={14} />
            <input 
              placeholder="Search personnel..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-64 pl-10 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
            />
          </div>
          <button className="p-2.5 bg-white/5 border border-white/10 rounded-2xl text-white/40 hover:text-white transition-all">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex p-1 bg-white/5 border border-white/10 rounded-2xl">
        <button 
          onClick={() => setActiveTab('registry')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'registry' ? 'bg-brand-600 text-white shadow-lg' : 'text-white/40'}`}
        >
          <ClipboardList size={14} /> Personnel
        </button>
        <button 
          onClick={() => setActiveTab('preview')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'preview' ? 'bg-brand-600 text-white shadow-lg' : 'text-white/40'}`}
        >
          <Eye size={14} /> Preview
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Registry Section */}
        <div className={`lg:col-span-7 space-y-4 ${activeTab !== 'registry' && 'hidden lg:block'}`}>
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="theme-card rounded-[32px] overflow-hidden"
          >
             <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <UserCheck size={16} className="text-brand-400" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-white/60">Personnel Registry</h3>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                   <span className="text-[9px] font-black text-white/50 uppercase">{employees.length} Secured Profiles</span>
                </div>
             </div>

             <div className="divide-y divide-white/5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {loading ? (
                  <div className="py-20 flex flex-col items-center gap-4">
                    <Loader2 size={32} className="text-brand-500 animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Synchronizing Biometrics...</p>
                  </div>
                ) : filteredEmployees.map((emp) => {
                  const card = getCardForEmployee(emp._id || emp.id);
                  const isSelected = selectedEmployee && (selectedEmployee._id || selectedEmployee.id) === (emp._id || emp.id);
                  
                  return (
                    <div 
                      key={emp._id || emp.id} 
                      onClick={() => selectEmployeeForPreview(emp, card)}
                      className={`p-4 flex items-center justify-between group transition-all cursor-pointer ${isSelected ? 'bg-brand-500/10 border-l-4 border-brand-500' : 'hover:bg-white/[0.03] border-l-4 border-transparent'}`}
                    >
                       <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <img src={emp.avatar} className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl object-cover" alt="" />
                            {card?.status === 'Active' && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
                            )}
                          </div>
                          <div className="min-w-0">
                             <p className="text-xs md:text-sm font-black text-white leading-none truncate">{emp.name}</p>
                             <p className="text-[9px] md:text-[10px] text-white/40 font-bold mt-1 truncate">{emp.email}</p>
                          </div>
                       </div>

                       <div className="flex items-center gap-3 md:gap-6 shrink-0">
                          <div className="hidden sm:block text-right">
                             <p className="text-[8px] font-black uppercase text-white/30 mb-1">Status</p>
                             {card ? (
                               <span className={`text-[9px] font-black uppercase tracking-tighter ${card.status === 'Active' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                 {card.status}
                               </span>
                             ) : (
                               <span className="text-[9px] font-black text-white/10 uppercase">Pending</span>
                             )}
                          </div>

                          <div className="flex items-center gap-2">
                             {card ? (
                               <div className="p-2 md:p-2.5 bg-white/5 border border-white/10 rounded-xl text-white/40 group-hover:text-brand-400 transition-all">
                                 <ChevronRight size={18} />
                               </div>
                             ) : (
                               <button 
                                 onClick={(e) => { e.stopPropagation(); handleGenerate(emp._id || emp.id); }}
                                 disabled={generatingId === (emp._id || emp.id)}
                                 className="p-2 md:px-4 md:py-2 bg-brand-600/20 border border-brand-500/30 text-brand-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-brand-600 hover:text-white transition-all flex items-center gap-2 shadow-lg shadow-brand-900/10"
                               >
                                 {generatingId === (emp._id || emp.id) ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                 <span className="hidden md:inline">Issue Card</span>
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
        <div className={`lg:col-span-5 ${activeTab !== 'preview' && 'hidden lg:block'}`}>
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
                    <div className="scale-[0.75] md:scale-[0.85] lg:scale-100 origin-center">
                      <DigitalIDCard 
                        employee={isEditingDetails ? { ...selectedEmployee, ...editForm } : selectedEmployee} 
                        cardData={selectedEmployee.card} 
                        isAdmin={true}
                      />
                    </div>
                  </div>
                  
                  {/* Action Suite */}
                  <div className="theme-card rounded-[32px] p-6 border border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-3 mb-6">
                      <Settings2 size={16} className="text-brand-400" />
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-white/60">Verification Suite</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => handleUpdateStatus(selectedEmployee.card.id || selectedEmployee.card._id, selectedEmployee.card.status === 'Active' ? 'Inactive' : 'Active')}
                        className={`group py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                          selectedEmployee.card.status === 'Active' 
                          ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 border border-rose-500/20 hover:text-white' 
                          : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 border border-emerald-500/20 hover:text-white'
                        }`}
                      >
                        {selectedEmployee.card.status === 'Active' ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                        {selectedEmployee.card.status === 'Active' ? 'Suspend' : 'Authorize'}
                      </button>
                      
                      <button 
                        onClick={() => handleGenerate(selectedEmployee._id || selectedEmployee.id)}
                        disabled={generatingId === (selectedEmployee._id || selectedEmployee.id)}
                        className="py-3.5 rounded-2xl bg-brand-500/10 text-brand-500 text-[10px] font-black uppercase tracking-widest hover:bg-brand-500 hover:text-white border border-brand-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        {generatingId === (selectedEmployee._id || selectedEmployee.id) ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Reissue
                      </button>

                      {currentUser?.role === 'Admin' && (
                        <button 
                          onClick={() => {
                            setEditForm({
                              name: selectedEmployee.name,
                              role: selectedEmployee.role,
                              phone: selectedEmployee.phone || '',
                              avatar: selectedEmployee.avatar || '',
                              issueDate: selectedEmployee.card.issueDate ? selectedEmployee.card.issueDate.split('T')[0] : '',
                              expiryDate: selectedEmployee.card.expiryDate ? selectedEmployee.card.expiryDate.split('T')[0] : ''
                            });
                            setIsEditingDetails(true);
                          }}
                          className="col-span-2 py-3.5 rounded-2xl bg-white/5 text-white/60 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white border border-white/10 transition-all"
                        >
                          Modify Credentials
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="theme-card rounded-[40px] p-12 flex flex-col items-center text-center space-y-6 border-2 border-dashed border-white/5 bg-white/[0.01]">
                   <div className="w-20 h-20 rounded-[28px] bg-white/5 flex items-center justify-center text-white/20">
                      <CreditCard size={40} />
                   </div>
                   <div className="space-y-2">
                      <h4 className="text-sm font-black text-white uppercase tracking-widest">Awaiting Identity</h4>
                      <p className="text-[10px] text-white/30 font-bold leading-relaxed max-w-[200px]">Select a profile from the registry to engage the E-ID verification suite.</p>
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
              className="relative w-full max-w-lg bg-[#020617] rounded-[40px] p-6 md:p-8 shadow-2xl z-10 border border-white/10 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-500/10 rounded-xl text-brand-500">
                    <Settings2 size={20} />
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight">Modify Identity</h3>
                </div>
                <button onClick={() => setIsEditingDetails(false)} className="p-2 text-white/20 hover:text-white hover:bg-white/5 rounded-full transition-all">
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveDetails} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Full Name</label>
                    <input 
                      value={editForm.name} 
                      onChange={e => setEditForm({...editForm, name: e.target.value})} 
                      className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:ring-2 focus:ring-brand-500/30 transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Designation</label>
                    <input 
                      value={editForm.role} 
                      onChange={e => setEditForm({...editForm, role: e.target.value})} 
                      className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:ring-2 focus:ring-brand-500/30 transition-all" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Contact Protocol (Phone)</label>
                  <input 
                    value={editForm.phone} 
                    onChange={e => setEditForm({...editForm, phone: e.target.value})} 
                    className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:ring-2 focus:ring-brand-500/30 transition-all" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Portrait Sync</label>
                  <div className="p-4 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl border-2 border-brand-500/30 overflow-hidden shrink-0">
                        <img src={editForm.avatar} className="w-full h-full object-cover" alt="Preview" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="block w-full text-[10px] text-white/40 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-brand-500 file:text-white hover:file:bg-brand-400 transition-all cursor-pointer"
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

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Issue Timestamp</label>
                    <input 
                      type="date" 
                      value={editForm.issueDate} 
                      onChange={e => setEditForm({...editForm, issueDate: e.target.value})} 
                      className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:ring-2 focus:ring-brand-500/30 transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Deactivation Date</label>
                    <input 
                      type="date" 
                      value={editForm.expiryDate} 
                      onChange={e => setEditForm({...editForm, expiryDate: e.target.value})} 
                      className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:ring-2 focus:ring-brand-500/30 transition-all" 
                    />
                  </div>
                </div>
                
                <div className="pt-6 flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => setIsEditingDetails(false)} 
                    className="flex-1 py-4 rounded-2xl bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
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

