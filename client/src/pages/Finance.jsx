import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IndianRupee, 
  ArrowUpRight, 
  ArrowDownRight, 
  FileText, 
  Download, 
  Search, 
  Filter,
  Calendar,
  Wallet,
  PieChart as PieIcon,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Target,
  Zap,
  Plus,
  X,
  CheckCircle2,
  Activity,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';

import API_URL from '../config';

const formatCurrency = (val) => {
  if (!val) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
};

const Finance = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ clientName: '', amount: '', description: '' });
  const [notification, setNotification] = useState(null);

  const fetchFinanceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/finance/transactions`);
      if (!response.ok) throw new Error('Failed to synchronize with billing core');
      const data = await response.json();
      setTransactions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/finance/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newInvoice, amount: Number(newInvoice.amount) })
      });
      if (response.ok) {
        const saved = await response.json();
        setTransactions([saved, ...transactions]);
        setShowGenerator(false);
        setNewInvoice({ clientName: '', amount: '', description: '' });
        showNotification('Invoice generated and stored in system.');
      } else {
        showNotification('Invoice forging failed.', true);
      }
    } catch (err) {
      showNotification('Server connection failed.', true);
    }
  };

  const handleDownloadPDF = async (id) => {
    window.open(`${API_URL}/finance/invoices/${id}/pdf`, '_blank');
  };

  const showNotification = (msg, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => setNotification(null), 3000);
  };

  // Calculate real stats from transactions
  const totalRevenue = transactions.filter(t => t.type === 'Revenue').reduce((acc, t) => acc + t.amount, 0);
  const pendingCollections = transactions.filter(t => t.status === 'Pending').reduce((acc, t) => acc + t.amount, 0);
  const operationalCosts = transactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);
  const netProfit = totalRevenue - operationalCosts;

  // Generate chart data from real transactions
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const chartData = days.map(day => {
    const dayRevenue = transactions
      .filter(t => days[new Date(t.date).getDay()] === day && t.type === 'Revenue')
      .reduce((acc, t) => acc + t.amount, 0);
    const dayExpense = transactions
      .filter(t => days[new Date(t.date).getDay()] === day && t.type === 'Expense')
      .reduce((acc, t) => acc + t.amount, 0);
    return { name: day, revenue: dayRevenue, expense: dayExpense };
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
       <Loader2 size={48} className="text-brand-500 animate-spin" />
       <p className="text-black font-black uppercase tracking-widest text-xs">Accessing Billing Core...</p>
    </div>
  );

  if (error) return (
    <div className="text-center py-20 glass rounded-[40px] border border-rose-500/20">
       <AlertTriangle size={64} className="text-rose-500 mx-auto mb-6" />
       <h3 className="text-2xl font-black text-black">Financial Link Severed</h3>
       <p className="text-black mt-2">{error}</p>
       <button onClick={fetchFinanceData} className="mt-8 px-8 py-3 bg-brand-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-500 transition-all">Reconnect Vault</button>
    </div>
  );

  return (
    <div className="space-y-12 pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter">Billing Architecture</h1>
          <p className="text-black mt-2 font-medium">Monitoring revenue streams and automated subscriptions.</p>
        </div>
        <button 
          onClick={() => setShowGenerator(true)}
          className="bg-brand-600 text-black px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/30 flex items-center gap-3 group"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform" /> Generate New Invoice
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard title="Net Revenue (ARR)" value={totalRevenue} icon={Wallet} color="text-brand-400" bgColor="bg-brand-600/10" trend="+ Live Update" />
        <StatCard title="Pending Collections" value={pendingCollections} icon={Zap} color="text-neon-blue" bgColor="bg-neon-blue/10" trend={`${transactions.filter(t => t.status === 'Pending').length} pending`} />
        <StatCard title="Operational Costs" value={operationalCosts} icon={Activity} color="text-rose-400" bgColor="bg-rose-600/10" trend="Real-time" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 glass-light p-10 rounded-[40px] border border-white/5 min-w-0">
           <h2 className="text-2xl font-black text-black tracking-tight mb-10">Cash Flow Intelligence</h2>
           <div className="h-[350px] w-full relative min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                 <AreaChart data={chartData}>
                   <defs>
                     <linearGradient id="colorFinance" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#00d2ff" stopOpacity={0.2}/>
                       <stop offset="95%" stopColor="#00d2ff" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 11, fontWeight: 800}} dy={15} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 11, fontWeight: 800}} tickFormatter={(val) => `₹${val/1000}k`} />
                   <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }} />
                   <Area type="monotone" dataKey="revenue" stroke="#00d2ff" strokeWidth={3} fillOpacity={1} fill="url(#colorFinance)" />
                   <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="rgba(244, 63, 94, 0.1)" />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="glass-light p-10 rounded-[40px] border border-white/5 flex flex-col shadow-2xl">
           <h2 className="text-2xl font-black text-black tracking-tight mb-10">Subscription Ledger</h2>
           <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
              {transactions.length === 0 ? (
                 <p className="text-black font-black text-center py-20 uppercase tracking-widest text-xs">No Recorded Ledger Entries</p>
              ) : transactions.map((inv, index) => (
                <div key={inv._id || inv.id || index} className="flex items-center justify-between p-5 bg-white/5 rounded-[24px] border border-white/5 hover:border-brand-500/30 transition-all group">
                   <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-black group-hover:text-brand-400 transition-colors">
                         <FileText size={22} />
                      </div>
                      <div className="max-w-[120px]">
                         <p className="font-bold text-black text-sm truncate">{inv.description?.split(' - ')[0] || 'System'}</p>
                         <p className="text-[9px] text-black font-black uppercase tracking-widest mt-1">{new Date(inv.date).toLocaleDateString()}</p>
                      </div>
                   </div>
                   <div className="text-right flex items-center gap-4">
                      <div>
                         <p className="font-black text-black text-sm">{formatCurrency(inv.amount)}</p>
                         <p className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 ${inv.status === 'Paid' ? 'text-emerald-500' : 'text-amber-500'}`}>{inv.status || 'Pending'}</p>
                      </div>
                      <button 
                        onClick={() => handleDownloadPDF(inv._id)}
                        className="p-3 bg-white/5 rounded-xl text-black hover:text-black transition-colors"
                      >
                         <Download size={16} />
                      </button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      <AnimatePresence>
        {showGenerator && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGenerator(false)}
              className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl glass border border-white/10 rounded-[40px] p-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black text-black tracking-tighter">Forge Invoice</h2>
                <button onClick={() => setShowGenerator(false)} className="p-2 text-black hover:text-black transition-colors"><X size={24} /></button>
              </div>

              <form onSubmit={handleGenerateInvoice} className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-black uppercase tracking-widest ml-1">Client Entity</label>
                   <input 
                     required
                     value={newInvoice.clientName}
                     onChange={(e) => setNewInvoice({...newInvoice, clientName: e.target.value})}
                     className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-black focus:outline-none focus:border-brand-500/50" 
                     placeholder="e.g. Reliance Industries"
                   />
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-black uppercase tracking-widest ml-1">Tax Protocol (GST)</label>
                       <div className="flex items-center gap-4 px-6 py-4 bg-white/5 border border-white/5 rounded-2xl">
                          <input type="checkbox" className="w-5 h-5 rounded-lg border-white/10 bg-brand-600" defaultChecked />
                          <span className="text-xs font-bold text-black">Apply 18% GST</span>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-black uppercase tracking-widest ml-1">Client GSTIN</label>
                       <input 
                         className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-black focus:outline-none focus:border-brand-500/50" 
                         placeholder="e.g. 27AAACN1234F1Z5"
                       />
                    </div>
                 </div>
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-black uppercase tracking-widest ml-1">Amount (INR)</label>
                      <input 
                        required
                        type="number"
                        value={newInvoice.amount}
                        onChange={(e) => setNewInvoice({...newInvoice, amount: e.target.value})}
                        className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-black focus:outline-none focus:border-brand-500/50" 
                        placeholder="e.g. 125000"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-black uppercase tracking-widest ml-1">Service Type</label>
                      <select className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-black focus:outline-none focus:border-brand-500/50 appearance-none">
                         <option>Subscription</option>
                         <option>One-time Audit</option>
                         <option>Implementation</option>
                      </select>
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-black uppercase tracking-widest ml-1">Description</label>
                   <textarea 
                     required
                     value={newInvoice.description}
                     onChange={(e) => setNewInvoice({...newInvoice, description: e.target.value})}
                     className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-black focus:outline-none focus:border-brand-500/50 h-32" 
                     placeholder="Specify services rendered..."
                   />
                </div>
                <button type="submit" className="w-full py-5 bg-brand-600 text-black rounded-2xl font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/20">Generate & Store Invoice</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 glass border ${notification.isError ? 'border-rose-500/50' : 'border-brand-500/30'} px-8 py-4 rounded-2xl shadow-2xl text-black font-bold flex items-center gap-3 z-50`}
          >
             {notification.isError ? <AlertTriangle className="text-rose-500" /> : <CheckCircle2 className="text-emerald-500" />} 
             {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, bgColor, trend }) => (
  <div className="glass-light p-8 rounded-[32px] border border-white/5 relative overflow-hidden group">
    <div className={`flex items-center gap-4 mb-6 ${color}`}>
      <div className={`p-4 ${bgColor} rounded-2xl border border-white/5 group-hover:scale-110 transition-transform`}><Icon size={24} /></div>
      <h3 className="text-[10px] font-black uppercase tracking-widest">{title}</h3>
    </div>
    <p className="text-4xl font-black text-black tracking-tighter">{formatCurrency(value)}</p>
    <div className="mt-4 flex items-center gap-2 text-black text-[10px] font-bold uppercase tracking-widest">
      <TrendingUp size={14} className="text-emerald-500" /> {trend}
    </div>
  </div>
);

export default Finance;
