import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  ShieldCheck, XCircle, Loader2, User, 
  Briefcase, Building2, Calendar, CheckCircle2,
  AlertTriangle, Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

import API_URL from '../config';
const VerifyID = () => {
  const { qrToken } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await fetch(`${API_URL}/idcard/verify/${qrToken}`);
        if (res.ok) {
          setData(await res.json());
        } else {
          setError('This ID card could not be verified. It may be revoked, expired, or invalid.');
        }
      } catch (err) {
        setError('Verification system unreachable.');
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [qrToken]);

  if (loading) return (
    <div className="min-h-screen theme-bg flex flex-col items-center justify-center p-6 text-center">
      <Loader2 size={64} className="text-brand-500 animate-spin mb-6" />
      <h2 className="text-xl font-black theme-text-primary uppercase tracking-widest">Scanning Grid...</h2>
      <p className="theme-text-secondary text-xs mt-2">Connecting to NexovTech Identity Server</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-transparent p-6 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-[24px] flex items-center justify-center p-3 shadow-2xl shadow-brand-600/20 mb-4 border border-gray-200">
            <img 
              src="/assets/logo.jpeg" 
              alt="Logo" 
              className="w-full h-full object-contain" 
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://ui-avatars.com/api/?name=NexovTech&background=0D8ABC&color=fff';
              }}
            />
          </div>
          <h1 className="text-2xl font-black theme-text-primary tracking-tighter">NEXOVTECH IDENTITY</h1>
          <p className="text-[10px] font-black theme-text-secondary uppercase tracking-[0.3em] mt-1">Verification Gateway</p>
        </div>

        {error ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="theme-card rounded-[40px] p-12 text-center border border-rose-500/20 shadow-xl"
          >
            <XCircle size={64} className="text-rose-500 mx-auto mb-6" />
            <h3 className="text-xl font-black theme-text-primary mb-2">Verification Failed</h3>
            <p className="theme-text-secondary text-sm leading-relaxed">{error}</p>
            <div className="mt-8 pt-8 border-t border-black/5">
              <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest flex items-center justify-center gap-2">
                <AlertTriangle size={12} /> High Security Risk Detected
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="theme-card rounded-[40px] p-8 space-y-8 border border-emerald-500/10 shadow-2xl shadow-emerald-500/5"
          >
            <div className="flex flex-col items-center">
               <div className={`px-6 py-2 rounded-full border text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-8 ${
                 data.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
               }`}>
                  {data.status === 'Active' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  Identity Verified: {data.status}
               </div>

               <div className="w-32 h-32 rounded-[32px] bg-gray-50 p-1 shadow-2xl mb-6 border-4 border-gray-200 overflow-hidden backdrop-blur-xl">
                  <img 
                    src={data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}`} 
                    className="w-full h-full object-cover rounded-[26px]" 
                    alt="" 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}`;
                    }}
                  />
               </div>

               <h3 className="text-2xl font-black theme-text-primary tracking-tight">{data.name}</h3>
               <p className="text-rose-600 font-bold uppercase tracking-widest text-xs mt-1">{data.role}</p>
            </div>

            <div className="space-y-4 pt-4 border-t border-black/5">
               <InfoRow icon={ShieldCheck} label="Employee ID" value={data.employeeId} />
               <InfoRow icon={Building2} label="Organization" value={data.company} />
               <InfoRow icon={Calendar} label="Issued On" value={new Date(data.issueDate).toLocaleDateString()} />
               <InfoRow icon={Calendar} label="Expiry Date" value={new Date(data.expiryDate).toLocaleDateString()} />
            </div>

            <div className={`p-4 rounded-2xl border ${data.status === 'Active' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'}`}>
               <p className={`text-[10px] font-bold text-center leading-relaxed ${data.status === 'Active' ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                  {data.status === 'Active' 
                    ? 'This identity is current and authorized for all NexovTech facilities and operations.' 
                    : 'This credential has been deactivated. Please contact security administration.'}
               </p>
            </div>
          </motion.div>
        )}

        <p className="text-center mt-12 text-[10px] font-black theme-text-secondary/40 uppercase tracking-[0.2em]">
          &copy; 2026 NexovTech Security Operations
        </p>
      </div>
    </div>
  );
};

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 theme-text-secondary">
      <Icon size={14} />
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </div>
    <span className="text-xs font-bold theme-text-primary">{value}</span>
  </div>
);

export default VerifyID;


