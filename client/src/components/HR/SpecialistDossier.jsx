import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  FileText, 
  Download, 
  Upload, 
  ShieldCheck, 
  CreditCard, 
  Building2, 
  Calendar, 
  Briefcase,
  Mail,
  Smartphone,
  MapPin,
  Sparkles,
  Trash2,
  ExternalLink
} from 'lucide-react';
import API_URL from '../../config';

const SpecialistDossier = ({ member, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [vaultDocuments, setVaultDocuments] = useState([]);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/team/${member._id || member.id}/documents`);
      if (response.ok) {
        const data = await response.json();
        setVaultDocuments(data);
      }
    } catch (err) {
      console.error('Vault link severed:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayroll = async () => {
    try {
      const response = await fetch(`${API_URL}/payroll/employee/${member.id || member._id}`);
      if (response.ok) {
        const data = await response.json();
        setPayrollHistory(data.sort((a, b) => (b.year - a.year) || (b.month - a.month)));
      }
    } catch (err) {
      console.error('Financial uplink severed:', err);
    }
  };

  const deletePayrollRecord = async (id) => {
    if (!confirm('Are you sure you want to purge this financial record? This action is irreversible.')) return;
    try {
      const response = await fetch(`${API_URL}/payroll/${id}`, { method: 'DELETE' });
      if (response.ok) fetchPayroll();
    } catch (err) {
      console.error('Purge failed');
    }
  };

  useEffect(() => {
    if (activeTab === 'document-vault') fetchDocuments();
    if (activeTab === 'financials') fetchPayroll();
  }, [activeTab]);

  const handleUpload = async () => {
    const docName = prompt('Enter Document Name:');
    if (!docName) return;
    
    try {
      const response = await fetch(`${API_URL}/team/${member._id || member.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: docName, 
          type: 'Corporate', 
          size: `${(Math.random() * 2 + 0.5).toFixed(1)} MB` 
        })
      });
      if (response.ok) fetchDocuments();
    } catch (err) {
      console.error('Upload failed');
    }
  };

  const handleDelete = async (docId) => {
    if (!confirm('Purge document from vault?')) return;
    try {
      const response = await fetch(`${API_URL}/team/documents/${docId}`, { method: 'DELETE' });
      if (response.ok) fetchDocuments();
    } catch (err) {
      console.error('Purge failed');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-10"
    >
      <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-2xl" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 50 }}
        className="relative w-full max-w-4xl h-full md:h-[80vh] bg-[#020617] border border-white/10 rounded-none md:rounded-[40px] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
      >
        {/* Header Section */}
        <div className="p-6 md:p-10 bg-white/5 border-b border-white/5 flex flex-col md:flex-row items-center gap-6 relative">
           <button onClick={onClose} className="absolute top-6 right-6 p-2.5 bg-white/5 rounded-xl text-white/40 hover:text-white transition-all border border-white/5">
             <X size={20} />
           </button>

           <div className="w-24 h-24 md:w-32 md:h-32 rounded-[32px] bg-gradient-to-tr from-brand-600 to-indigo-600 p-1 shadow-2xl shadow-brand-600/30">
              <div className="w-full h-full rounded-[28px] bg-[#020617] overflow-hidden">
                 <img 
                    src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} 
                    className="w-full h-full object-cover scale-110" 
                    alt="" 
                 />
              </div>
           </div>

           <div className="text-center md:text-left flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-1">
                 <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter">{member.name}</h1>
                 <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Active</span>
                 </div>
              </div>
              <p className="text-sm md:text-base font-bold text-brand-500 uppercase tracking-[0.2em]">{member.role}</p>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-6 mt-8">
                 <div className="flex items-center gap-2 text-white/40">
                    <Building2 size={16} className="text-brand-400" />
                    <span className="text-xs font-bold uppercase tracking-widest">{member.department || 'Development'}</span>
                 </div>
                 <div className="flex items-center gap-2 text-white/40">
                    <Calendar size={16} className="text-brand-400" />
                    <span className="text-xs font-bold uppercase tracking-widest">Joined: {member.doj || '12 Aug 2024'}</span>
                 </div>
                 <div className="flex items-center gap-2 text-white/40">
                    <MapPin size={16} className="text-brand-400" />
                    <span className="text-xs font-bold uppercase tracking-widest">Hyderabad, IN</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex px-6 md:px-10 bg-white/5 border-b border-white/5">
           {['overview', 'document-vault', 'financials', 'activity'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-4 text-[9px] font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === tab ? 'text-brand-400' : 'text-white/30 hover:text-white'}`}
              >
                {tab.replace('-', ' ')}
                {activeTab === tab && (
                   <motion.div layoutId="tabLine" className="absolute bottom-0 left-4 right-4 h-0.5 bg-brand-500 rounded-t-full shadow-[0_0_15px_#8b5cf6]" />
                )}
              </button>
           ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar bg-[#020617]">
           {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 <div className="space-y-10">
                    <div className="glass-light p-8 rounded-[40px] border border-white/5">
                       <h3 className="text-xs font-black text-brand-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                          <ShieldCheck size={16} /> Identity Protocols
                       </h3>
                       <div className="space-y-4">
                          <DetailRow label="Employee ID" value={member.employeeId || 'NX-2024-001'} />
                          <DetailRow label="Official Email" value={member.email || 'specialist@nexovtech.com'} />
                          <DetailRow label="Phone Link" value="+91 98765 43210" />
                          <DetailRow label="Digital Signature" value="NX_SIG_VERIFIED" active />
                       </div>
                    </div>

                    <div className="glass-light p-8 rounded-[40px] border border-white/5">
                       <h3 className="text-xs font-black text-brand-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                          <CreditCard size={16} /> Financial Disposition
                       </h3>
                       <div className="space-y-4">
                          <DetailRow label="Bank Name" value="HDFC Bank" />
                          <DetailRow label="Account Num" value="**** **** 4242" />
                          <DetailRow label="IFSC Code" value="HDFC0001234" />
                          <DetailRow label="Taxation ID" value="PANCARD_VERIFIED" active />
                       </div>
                    </div>
                 </div>

                 <div className="space-y-8">
                    <div className="bg-slate-900 rounded-[40px] p-10 border border-white/10 relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:scale-110 transition-transform">
                          <Sparkles size={120} className="text-white" />
                       </div>
                       <h3 className="text-2xl font-black text-white tracking-tight mb-2">Performance Audit</h3>
                       <p className="text-xs text-white/40 font-black uppercase tracking-widest mb-8">Real-time Efficiency Metrics</p>
                       
                       <div className="grid grid-cols-2 gap-8">
                          <StatBox label="Efficiency" value={`${member.performance?.onTimeRate || 0}%`} />
                          <StatBox label="Deadlines" value="100%" />
                          <StatBox label="Active" value={member.performance?.activeTasks || 0} />
                          <StatBox label="Missions" value={member.performance?.tasksCompleted || 0} />
                       </div>
                    </div>
                 </div>
              </div>
           )}

           {activeTab === 'document-vault' && (
              <div className="space-y-8">
                 <div className="flex items-center justify-between">
                    <div>
                       <h2 className="text-2xl font-black text-white tracking-tight">Personnel Vault</h2>
                       <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-1">Encrypted Document Repository</p>
                    </div>
                    <button 
                      onClick={handleUpload}
                      className="flex items-center gap-3 px-6 py-3 bg-brand-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/20"
                    >
                       <Upload size={16} /> Upload Document
                    </button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {loading ? (
                       <div className="col-span-full py-20 flex flex-col items-center gap-4">
                          <Loader2 className="text-brand-500 animate-spin" size={32} />
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Accessing Vault...</p>
                       </div>
                    ) : vaultDocuments.length === 0 ? (
                       <div className="col-span-full py-20 text-center">
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">No Documents Archived</p>
                       </div>
                    ) : vaultDocuments.map(doc => (
                       <div key={doc._id || doc.id} className="glass-light p-6 rounded-[32px] border border-white/5 hover:border-brand-500/30 transition-all group">
                          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-brand-400 mb-6 group-hover:bg-brand-600 group-hover:text-white transition-all">
                             <FileText size={24} />
                          </div>
                          <h4 className="text-sm font-black text-white truncate">{doc.name}</h4>
                          <div className="flex items-center justify-between mt-2">
                             <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{doc.type}</span>
                             <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{doc.size}</span>
                          </div>
                          <div className="flex gap-2 mt-6">
                             <button 
                               onClick={() => window.open(`${API_URL}/team/documents/${doc._id || doc.id}/download`, '_blank')}
                               className="flex-1 py-3 bg-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                             >
                                <Download size={14} /> Download
                             </button>
                             <button 
                               onClick={() => handleDelete(doc._id || doc.id)}
                               className="p-3 bg-white/5 rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                             >
                                <Trash2 size={14} />
                             </button>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           )}

           {activeTab === 'financials' && (
              <div className="space-y-8">
                 <div className="flex items-center justify-between">
                    <div>
                       <h2 className="text-2xl font-black text-white tracking-tight">Payment Registry</h2>
                       <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-1">Specialist Compensation History</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    {payrollHistory.length === 0 ? (
                       <p className="text-white/30 text-xs font-bold uppercase tracking-widest text-center py-20 border border-dashed border-white/10 rounded-[40px]">
                          No compensation records found for this specialist.
                       </p>
                    ) : (
                       <div className="grid grid-cols-1 gap-4">
                          {payrollHistory.map((p) => (
                             <div key={p.id || p._id} className="glass-light p-6 rounded-[32px] border border-white/5 flex items-center justify-between group hover:border-brand-500/30 transition-all">
                                <div className="flex items-center gap-6">
                                   <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-brand-400 group-hover:bg-brand-600 group-hover:text-white transition-all">
                                      <Calendar size={20} />
                                   </div>
                                   <div>
                                      <h4 className="text-sm font-black text-white">
                                         {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][p.month - 1]} {p.year}
                                      </h4>
                                      <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Ref: {(p.id || p._id || 'NEX-REF').toString().slice(-8).toUpperCase()}</span>
                                   </div>
                                </div>
                                <div className="flex items-center gap-8 text-right">
                                   <div>
                                      <p className="text-lg font-black text-white tracking-tight">₹{(p.calculatedSalary?.total || 0).toLocaleString()}</p>
                                      <span className={`text-[9px] font-black uppercase tracking-widest ${p.paymentStatus === 'Paid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                         {p.paymentStatus}
                                      </span>
                                   </div>
                                   <button 
                                     onClick={() => deletePayrollRecord(p.id || p._id)}
                                     className="p-3 bg-white/5 rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                   >
                                      <Trash2 size={16} />
                                   </button>
                                </div>
                             </div>
                          ))}
                       </div>
                    )}
                 </div>
              </div>
           )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const DetailRow = ({ label, value, active }) => (
  <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
     <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{label}</span>
     <span className={`text-xs font-black ${active ? 'text-emerald-500' : 'text-white'}`}>{value}</span>
  </div>
);

const StatBox = ({ label, value }) => (
  <div className="space-y-1">
     <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{label}</p>
     <p className="text-3xl font-black text-white tracking-tighter">{value}</p>
  </div>
);

export default SpecialistDossier;
