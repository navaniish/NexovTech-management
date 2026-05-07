import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, Search, Filter, Loader2, Sparkles, 
  ChevronRight, RefreshCw, CheckCircle2, XCircle, 
  Eye, Download, MoreVertical, Plus, CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DigitalIDCard from '../components/IDCard/DigitalIDCard';

import API_URL from '../config';
const AdminIDCards = () => {
  const [employees, setEmployees] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [generatingId, setGeneratingId] = useState(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', role: '', phone: '', issueDate: '', expiryDate: '' });
  const [savingDetails, setSavingDetails] = useState(false);

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
        fetchData(); // Refresh
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
      // Update employee profile
      await fetch(`${API_URL}/auth/update-profile/${selectedEmployee._id || selectedEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editForm.name, role: editForm.role, phone: editForm.phone })
      });
      // Update card dates
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
      fetchData(); // Refresh UI
    } catch (err) {
      console.error(err);
    } finally {
      setSavingDetails(false);
    }
  };

  const getCardForEmployee = (userId) => cards.find(c => c.userId === userId);

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter theme-text-primary">E-ID Command Center</h1>
          <p className="mt-2 text-sm font-medium theme-text-secondary">Secure identity management & digital credential verification.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 theme-text-secondary" size={16} />
            <input 
              placeholder="Search personnel..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 rounded-xl theme-bg border theme-text-primary text-sm outline-none focus:ring-2 focus:ring-brand-500/20"
              style={{ borderColor: 'var(--border-default)' }}
            />
          </div>
          <button className="p-2.5 theme-card rounded-xl theme-text-secondary hover:theme-text-primary">
            <Filter size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Employee List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="theme-card rounded-[32px] overflow-hidden">
             <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest theme-text-secondary">Personnel Registry</h3>
                <div className="flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[10px] font-black theme-text-secondary uppercase">{employees.length} Active Profiles</span>
                </div>
             </div>

             <div className="divide-y divide-white/5">
                {loading ? (
                  <div className="py-20 flex flex-col items-center gap-4">
                    <Loader2 size={32} className="text-brand-500 animate-spin" />
                    <p className="text-xs font-black uppercase tracking-widest theme-text-secondary">Synchronizing Data...</p>
                  </div>
                ) : filteredEmployees.map((emp) => {
                  const card = getCardForEmployee(emp._id || emp.id);
                  return (
                    <div key={emp._id || emp.id} className="p-4 flex items-center justify-between group hover:bg-white/[0.02] transition-all">
                       <div className="flex items-center gap-4">
                          <img src={emp.avatar} className="w-12 h-12 rounded-2xl" alt="" />
                          <div>
                             <p className="text-sm font-black theme-text-primary leading-tight">{emp.name}</p>
                             <p className="text-[10px] theme-text-secondary font-bold">{emp.email}</p>
                          </div>
                       </div>

                       <div className="flex items-center gap-6">
                          <div>
                             <p className="text-[8px] font-black uppercase theme-text-secondary mb-1">ID Status</p>
                             {card ? (
                               <div className={`flex items-center gap-1.5 ${card.status === 'Active' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {card.status === 'Active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                  <span className="text-[10px] font-black uppercase tracking-widest">{card.status}</span>
                               </div>
                             ) : (
                               <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Not Issued</span>
                             )}
                          </div>

                          <div className="flex items-center gap-2">
                             {card ? (
                               <>
                                 <button 
                                   onClick={() => setSelectedEmployee({ ...emp, card })}
                                   className="p-2.5 theme-card rounded-xl theme-text-secondary hover:theme-text-primary hover:bg-white/5 transition-all"
                                   title="Preview Card"
                                 >
                                   <Eye size={18} />
                                 </button>
                                 <button 
                                   onClick={() => handleGenerate(emp._id || emp.id)}
                                   disabled={generatingId === (emp._id || emp.id)}
                                   className="p-2.5 theme-card rounded-xl theme-text-secondary hover:theme-text-primary hover:bg-white/5 transition-all"
                                   title="Regenerate"
                                 >
                                   {generatingId === (emp._id || emp.id) ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                                 </button>
                               </>
                             ) : (
                               <button 
                                 onClick={() => handleGenerate(emp._id || emp.id)}
                                 disabled={generatingId === (emp._id || emp.id)}
                                 className="px-4 py-2 bg-brand-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-500 transition-all flex items-center gap-2"
                               >
                                 {generatingId === (emp._id || emp.id) ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                 Issue Card
                               </button>
                             )}
                          </div>
                       </div>
                    </div>
                  );
                })}
             </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-28">
            <AnimatePresence mode="wait">
              {selectedEmployee ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <DigitalIDCard 
                    employee={selectedEmployee} 
                    cardData={selectedEmployee.card} 
                    isAdmin={true}
                  />
                  
                  <div className="mt-8 theme-card rounded-2xl p-6 border border-white/5">
                    <h4 className="text-xs font-black uppercase tracking-widest theme-text-primary mb-4">Management Protocol</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => handleUpdateStatus(selectedEmployee.card.id || selectedEmployee.card._id, selectedEmployee.card.status === 'Active' ? 'Inactive' : 'Active')}
                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          selectedEmployee.card.status === 'Active' 
                          ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20' 
                          : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                        }`}
                      >
                        {selectedEmployee.card.status === 'Active' ? 'Deactivate Card' : 'Activate Card'}
                      </button>
                      <button className="py-3 rounded-xl bg-white/5 theme-text-secondary text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                        Audit Logs
                      </button>
                      <button 
                        onClick={() => {
                          setEditForm({
                            name: selectedEmployee.name,
                            role: selectedEmployee.role,
                            phone: selectedEmployee.phone || '',
                            issueDate: selectedEmployee.card.issueDate ? selectedEmployee.card.issueDate.split('T')[0] : '',
                            expiryDate: selectedEmployee.card.expiryDate ? selectedEmployee.card.expiryDate.split('T')[0] : ''
                          });
                          setIsEditingDetails(true);
                        }}
                        className="col-span-2 py-3 rounded-xl bg-brand-500/10 text-brand-500 text-[10px] font-black uppercase tracking-widest hover:bg-brand-500/20 transition-all"
                      >
                        Edit Details
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="theme-card rounded-[32px] p-12 flex flex-col items-center text-center space-y-4 border-2 border-dashed border-white/10">
                   <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center theme-text-secondary">
                      <CreditCard size={32} />
                   </div>
                   <div>
                      <h4 className="text-sm font-black theme-text-primary">No Preview Selected</h4>
                      <p className="text-xs theme-text-secondary mt-1">Select an employee from the registry to view or manage their E-ID credentials.</p>
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
              onClick={() => setIsEditingDetails(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md theme-card rounded-3xl p-6 shadow-2xl z-10 border border-white/10"
              style={{ background: 'var(--bg-surface)' }}>
              
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black theme-text-primary">Edit Card Details</h3>
                <button onClick={() => setIsEditingDetails(false)} className="p-2 theme-text-secondary hover:bg-white/5 rounded-full">
                  <XCircle size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveDetails} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest theme-text-secondary ml-1">Name</label>
                  <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full px-4 py-3 rounded-xl theme-bg border theme-text-primary outline-none focus:ring-1 focus:ring-brand-500/50" style={{ borderColor: 'var(--border-default)' }} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest theme-text-secondary ml-1">Role</label>
                  <input value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} className="w-full px-4 py-3 rounded-xl theme-bg border theme-text-primary outline-none focus:ring-1 focus:ring-brand-500/50" style={{ borderColor: 'var(--border-default)' }} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest theme-text-secondary ml-1">Phone Number</label>
                  <input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl theme-bg border theme-text-primary outline-none focus:ring-1 focus:ring-brand-500/50" style={{ borderColor: 'var(--border-default)' }} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest theme-text-secondary ml-1">Issue Date</label>
                    <input type="date" value={editForm.issueDate} onChange={e => setEditForm({...editForm, issueDate: e.target.value})} className="w-full px-4 py-3 rounded-xl theme-bg border theme-text-primary outline-none focus:ring-1 focus:ring-brand-500/50" style={{ borderColor: 'var(--border-default)' }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest theme-text-secondary ml-1">Expiry Date</label>
                    <input type="date" value={editForm.expiryDate} onChange={e => setEditForm({...editForm, expiryDate: e.target.value})} className="w-full px-4 py-3 rounded-xl theme-bg border theme-text-primary outline-none focus:ring-1 focus:ring-brand-500/50" style={{ borderColor: 'var(--border-default)' }} />
                  </div>
                </div>
                
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsEditingDetails(false)} className="flex-1 py-3 rounded-xl bg-white/5 theme-text-secondary text-xs font-black uppercase tracking-widest hover:bg-white/10">Cancel</button>
                  <button type="submit" disabled={savingDetails} className="flex-1 py-3 rounded-xl bg-brand-600 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-600/20 disabled:opacity-50 flex justify-center items-center">
                    {savingDetails ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
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
