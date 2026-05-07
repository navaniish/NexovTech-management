import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Mail, 
  Globe, 
  History,
  TrendingUp,
  MoreVertical,
  CheckCircle2,
  X,
  AlertTriangle,
  Briefcase,
  FileText,
  IndianRupee,
  Download,
  Loader2
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);
  
  // Modals State
  const [deleteModal, setDeleteModal] = useState({ show: false, clientId: null, clientName: '' });
  const [addModal, setAddModal] = useState(false);
  const [invoiceModal, setInvoiceModal] = useState({ show: false, clientName: '', amount: '', description: '' });
  const [newClient, setNewClient] = useState({ name: '', email: '', businessType: 'Enterprise', serviceType: 'AI Solutions' });

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/clients`);
      if (!response.ok) throw new Error('Failed to retrieve corporate accounts');
      const data = await response.json();
      setClients(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleAddClient = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient)
      });
      if (response.ok) {
        const saved = await response.json();
        setClients([saved, ...clients]);
        setAddModal(false);
        setNewClient({ name: '', email: '', businessType: 'Enterprise', serviceType: 'AI Solutions' });
        showNotification({ text: 'Enterprise client onboarded successfully.' });
      } else {
        showNotification({ text: 'Onboarding failed. Please check parameters.', isError: true });
      }
    } catch (err) {
      showNotification({ text: 'Server connection failed.', isError: true });
    }
  };

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/finance/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...invoiceModal, amount: Number(invoiceModal.amount) })
      });
      if (response.ok) {
        const saved = await response.json();
        setInvoiceModal({ show: false, clientName: '', amount: '', description: '' });
        showNotification({ 
          text: 'Invoice generated successfully!', 
          action: () => window.open(`${API_URL}/finance/invoices/${saved._id}/pdf`, '_blank'),
          actionText: 'Download PDF'
        });
      } else {
        showNotification({ text: 'Invoice forging failed.', isError: true });
      }
    } catch (err) {
      showNotification({ text: 'Server connection failed.', isError: true });
    }
  };

  const confirmDelete = async () => {
    const { clientId } = deleteModal;
    try {
      const response = await fetch(`${API_URL}/clients/${clientId}`, { method: 'DELETE' });
      if (response.ok) {
        setClients(clients.filter(c => c._id !== clientId));
        showNotification({ text: 'Client removed successfully from the system.' });
      } else {
        showNotification({ text: 'De-authorization failed.', isError: true });
      }
    } catch (err) {
      showNotification({ text: 'Server connection failed.', isError: true });
    } finally {
      setDeleteModal({ show: false, clientId: null, clientName: '' });
    }
  };

  const showNotification = (data) => {
    setNotification(data);
    setTimeout(() => setNotification(null), 5000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Converted': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Lead': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default: return 'bg-surface-500/10 text-surface-500 border-surface-500/20';
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.businessType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
       <Loader2 size={48} className="text-brand-500 animate-spin" />
       <p className="text-surface-500 font-black uppercase tracking-widest text-xs">Accessing Client Roster...</p>
    </div>
  );

  if (error) return (
    <div className="text-center py-20 glass rounded-[40px] border border-rose-500/20">
       <AlertTriangle size={64} className="text-rose-500 mx-auto mb-6" />
       <h3 className="text-2xl font-black text-white">Directory Unreachable</h3>
       <p className="text-surface-500 mt-2">{error}</p>
       <button onClick={fetchClients} className="mt-8 px-8 py-3 bg-brand-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-500 transition-all">Retry Link</button>
    </div>
  );

  return (
    <div className="space-y-12 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter">Client Directory</h1>
          <p className="text-surface-500 mt-2 font-medium">Manage corporate accounts and conversion funnels.</p>
        </div>
        <button 
          onClick={() => setAddModal(true)}
          className="bg-brand-600 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/30 flex items-center gap-3 group"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform" /> Add Enterprise Client
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-600 group-focus-within:text-brand-400 transition-colors" size={20} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, company, or tier..." 
            className="w-full pl-12 pr-6 py-4 bg-white/[0.03] border border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/30 transition-all text-white placeholder:text-surface-700"
          />
        </div>
        <button className="p-4 bg-white/5 border border-white/5 rounded-2xl text-surface-500 hover:text-white transition-all">
          <Filter size={20} />
        </button>
      </div>

      {/* Table */}
      <div className="glass-light rounded-[40px] border border-white/5 overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="px-8 py-6 text-[10px] font-black text-surface-500 uppercase tracking-widest">Client Identity</th>
              <th className="px-8 py-6 text-[10px] font-black text-surface-500 uppercase tracking-widest">Service Vertical</th>
              <th className="px-8 py-6 text-[10px] font-black text-surface-500 uppercase tracking-widest">Engagement Status</th>
              <th className="px-8 py-6 text-[10px] font-black text-surface-500 uppercase tracking-widest text-right">Operations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredClients.length === 0 ? (
               <tr>
                 <td colSpan="4" className="px-8 py-20 text-center text-surface-500 font-bold">No enterprise clients found matching your search.</td>
               </tr>
            ) : filteredClients.map((client) => (
              <tr key={client._id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-neon-blue flex items-center justify-center text-white font-black text-xl shadow-lg">
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-white text-base">{client.name}</p>
                      <p className="text-[10px] text-surface-500 font-black uppercase tracking-widest">{client.businessType}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2 text-surface-300 font-bold text-sm">
                    <Globe size={14} className="text-brand-500" /> {client.serviceType}
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusColor(client.status)}`}>
                    {client.status}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => setInvoiceModal({ show: true, clientName: client.name, amount: '', description: '' })}
                      className="p-3 bg-brand-500/10 hover:bg-brand-500/20 rounded-xl text-brand-400 transition-colors"
                      title="Generate Invoice"
                    >
                      <FileText size={18} />
                    </button>
                    <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-surface-500 hover:text-white transition-colors">
                      <Mail size={18} />
                    </button>
                    <button 
                      onClick={() => setDeleteModal({ show: true, clientId: client._id, clientName: client.name })}
                      className="p-3 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl text-rose-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Client Modal */}
      <AnimatePresence>
        {addModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAddModal(false)}
              className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass border border-white/10 rounded-[40px] p-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black text-white tracking-tighter">Onboard Client</h2>
                <button onClick={() => setAddModal(false)} className="p-2 text-surface-500 hover:text-white transition-colors"><X size={24} /></button>
              </div>

              <form onSubmit={handleAddClient} className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Company Name</label>
                   <input 
                     required
                     value={newClient.name}
                     onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                     className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white focus:outline-none focus:border-brand-500/50" 
                     placeholder="e.g. Acme Corp"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Email Address</label>
                   <input 
                     required
                     type="email"
                     value={newClient.email}
                     onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                     className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white focus:outline-none focus:border-brand-500/50" 
                     placeholder="ops@acme.com"
                   />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Tier</label>
                    <select 
                      value={newClient.businessType}
                      onChange={(e) => setNewClient({...newClient, businessType: e.target.value})}
                      className="w-full px-4 py-4 bg-white/5 border border-white/5 rounded-2xl text-white focus:outline-none focus:border-brand-500/50 appearance-none"
                    >
                        <option>Enterprise</option>
                        <option>Startup</option>
                        <option>SME</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Vertical</label>
                    <select 
                      value={newClient.serviceType}
                      onChange={(e) => setNewClient({...newClient, serviceType: e.target.value})}
                      className="w-full px-4 py-4 bg-white/5 border border-white/5 rounded-2xl text-white focus:outline-none focus:border-brand-500/50 appearance-none"
                    >
                        <option>AI Solutions</option>
                        <option>Web Development</option>
                        <option>Cybersecurity</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full py-5 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/20">Authorize Onboarding</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice Generator Modal */}
      <AnimatePresence>
        {invoiceModal.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInvoiceModal({ ...invoiceModal, show: false })}
              className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl glass border border-white/10 rounded-[40px] p-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-10">
                <div>
                   <h2 className="text-3xl font-black text-white tracking-tighter">Forge Invoice</h2>
                   <p className="text-xs text-brand-500 font-black uppercase tracking-widest mt-1">For: {invoiceModal.clientName}</p>
                </div>
                <button onClick={() => setInvoiceModal({ ...invoiceModal, show: false })} className="p-2 text-surface-500 hover:text-white transition-colors"><X size={24} /></button>
              </div>

              <form onSubmit={handleGenerateInvoice} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Amount (INR)</label>
                      <div className="relative">
                         <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-600" size={16} />
                         <input 
                           required
                           type="number"
                           value={invoiceModal.amount}
                           onChange={(e) => setInvoiceModal({...invoiceModal, amount: e.target.value})}
                           className="w-full pl-10 pr-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white focus:outline-none focus:border-brand-500/50" 
                           placeholder="e.g. 85000"
                         />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Payment Terms</label>
                      <select className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white focus:outline-none focus:border-brand-500/50 appearance-none">
                         <option>Net 15</option>
                         <option>Net 30</option>
                         <option>Due on Receipt</option>
                      </select>
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Billable Services</label>
                   <textarea 
                     required
                     value={invoiceModal.description}
                     onChange={(e) => setInvoiceModal({...invoiceModal, description: e.target.value})}
                     className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white focus:outline-none focus:border-brand-500/50 h-32" 
                     placeholder="Specify deliverables..."
                   />
                </div>
                <button type="submit" className="w-full py-5 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/20">Authorize & Dispatch PDF</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModal.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteModal({ show: false, clientId: null, clientName: '' })}
              className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass border border-white/10 rounded-[40px] p-10 shadow-2xl text-center"
            >
               <div className="w-20 h-20 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-8 border border-rose-500/20">
                  <AlertTriangle size={40} />
               </div>
               <h2 className="text-3xl font-black text-white tracking-tighter mb-4">Confirm Removal</h2>
               <p className="text-surface-500 text-sm font-medium leading-relaxed mb-10">
                  Are you sure you want to remove <span className="text-white font-bold">{deleteModal.clientName}</span> from the system?
               </p>
               <div className="flex gap-4">
                  <button onClick={() => setDeleteModal({ show: false, clientId: null, clientName: '' })} className="flex-1 py-4 bg-white/5 text-surface-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:text-white transition-all border border-white/5">Cancel</button>
                  <button onClick={confirmDelete} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-500 transition-all shadow-xl shadow-rose-600/30">Delete Account</button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-10 left-1/2 glass border border-brand-500/30 px-8 py-4 rounded-3xl shadow-2xl text-white font-bold flex items-center gap-6 z-50"
          >
             <div className="flex items-center gap-3">
                {notification.isError ? <AlertTriangle className="text-rose-500" /> : <CheckCircle2 className="text-emerald-500" />}
                <span className="text-sm">{notification.text}</span>
             </div>
             {notification.action && (
               <button 
                 onClick={notification.action}
                 className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg"
               >
                 <Download size={14} /> {notification.actionText}
               </button>
             )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Clients;
