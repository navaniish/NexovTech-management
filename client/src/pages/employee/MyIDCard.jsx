import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Loader2, Sparkles, AlertTriangle, DownloadCloud } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DigitalIDCard from '../../components/IDCard/DigitalIDCard';
import API_URL from '../../config';

const MyIDCard = () => {
  const { user } = useAuth();
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMyCard = async () => {
      if (!user) return;
      try {
        const identifier = user.email || user._id || user.id || user.firebaseUid;
        const res = await fetch(`${API_URL}/idcard/${identifier}`);
        if (res.ok) {
          const data = await res.json();
          setCardData(data);
        } else {
          setError('No digital ID card has been issued to your account yet. Please contact system administrator.');
        }
      } catch (err) {
        setError('Failed to synchronize with identity server.');
      } finally {
        setLoading(false);
      }
    };
    fetchMyCard();
  }, [user]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <Loader2 size={48} className="text-brand-500 animate-spin" />
      <p className="text-xs font-black uppercase tracking-widest theme-text-secondary">Verifying Identity...</p>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 md:space-y-8 pb-24 md:pb-12 px-1 sm:px-4 animate-in fade-in duration-1000">
      {/* 1. HIGH-FIDELITY OFFICE HEADER */}
      <section className="relative w-full overflow-hidden rounded-[24px] md:rounded-[40px] bg-white shadow-2xl border border-white flex flex-col min-h-[160px] md:min-h-[200px] group">
         <div 
           className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
           style={{ backgroundImage: "url('/assets/office-bg.png')" }}
         />
         <div className="absolute inset-0 bg-white/70 backdrop-blur-[4px]" />
         
         <div className="relative z-10 flex-1 p-6 md:p-12 flex flex-col justify-center">
            <div className="space-y-2">
               <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter leading-none flex items-center gap-3">
                  Digital Identity <span className="animate-pulse text-xl md:text-3xl">🛡️</span>
               </h1>
               <p className="text-slate-500 text-xs md:text-[15px] font-medium">
                  Official E-ID credentials for NexovTech personnel.
               </p>
            </div>
         </div>
      </section>

      {error ? (
        <div className="max-w-2xl mx-auto theme-card rounded-[24px] md:rounded-[40px] p-6 md:p-12 text-center border border-slate-200 bg-white/50 backdrop-blur-xl shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-rose-500/20" />
           <div className="w-16 h-16 md:w-20 md:h-20 bg-rose-50 rounded-2xl md:rounded-[28px] flex items-center justify-center mx-auto mb-6 md:mb-8 text-rose-500 shadow-inner">
              <AlertTriangle size={32} className="md:size-[40px]" />
           </div>
           <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight mb-3 md:mb-4">Credential Sync Required</h3>
           <p className="text-xs md:text-[13px] font-medium text-slate-500 leading-relaxed mb-6 md:mb-8 max-w-sm mx-auto">
             {error}
           </p>
           <button 
             onClick={() => window.location.reload()}
             className="px-8 py-3.5 md:px-10 md:py-4 bg-slate-900 text-white rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-brand-600 transition-all shadow-xl shadow-slate-200"
           >
             Re-Synchronize Identity
           </button>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto glass-card rounded-[24px] md:rounded-[40px] p-6 md:p-12 border-slate-100 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl shadow-slate-200/50"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 to-transparent pointer-events-none" />
          <div className="relative z-10 w-full flex justify-center">
            <DigitalIDCard 
              employee={{ ...user, avatar: cardData.userAvatar || user.avatar }} 
              cardData={cardData} 
            />
          </div>
        </motion.div>
      )}

      <div className="max-w-md mx-auto mt-8 md:mt-12 p-5 md:p-6 rounded-2xl md:rounded-3xl bg-gray-50 border border-gray-200 text-center">
         <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 md:mb-4">Verification Policy</p>
         <p className="text-[10px] md:text-xs text-gray-500 leading-relaxed font-medium">
            This card is a cryptographically signed digital credential. Scanning the QR code will provide instant verification of your current status.
         </p>
      </div>
    </div>
  );
};

export default MyIDCard;
