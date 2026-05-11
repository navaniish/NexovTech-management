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
    <div className="max-w-[1400px] mx-auto space-y-6 md:space-y-8 pb-24 md:pb-12 animate-in fade-in duration-1000">
      {/* 1. HIGH-FIDELITY OFFICE HEADER */}
      <section className="relative w-full overflow-hidden rounded-[40px] bg-white shadow-2xl border border-white flex flex-col min-h-[200px] group">
         <div 
           className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
           style={{ backgroundImage: "url('/assets/office-bg.png')" }}
         />
         <div className="absolute inset-0 bg-white/70 backdrop-blur-[4px]" />
         
         <div className="relative z-10 flex-1 p-6 md:p-12 flex flex-col justify-center">
            <div className="space-y-2">
               <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter leading-none flex items-center gap-3">
                  Digital Identity <span className="animate-pulse">🛡️</span>
               </h1>
               <p className="text-slate-500 text-[15px] font-medium">
                  Official E-ID credentials for NexovTech personnel.
               </p>
            </div>
         </div>
      </section>

      {error ? (
        <div className="max-w-md mx-auto theme-card rounded-2xl md:rounded-[32px] p-6 md:p-12 text-center border border-rose-500/10">
           <AlertTriangle size={32} className="md:hidden text-rose-500 mx-auto mb-4" />
           <AlertTriangle size={48} className="hidden md:block text-rose-500 mx-auto mb-6" />
           <p className="text-[11px] md:text-sm font-bold theme-text-primary leading-relaxed">{error}</p>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center w-full"
        >
          <DigitalIDCard 
            employee={{ ...user, avatar: cardData.userAvatar || user.avatar }} 
            cardData={cardData} 
          />
        </motion.div>
      )}

      <div className="max-w-md mx-auto mt-8 md:mt-12 p-4 md:p-6 rounded-2xl md:rounded-3xl bg-gray-50 border border-gray-200 text-center">
         <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 md:mb-4">Verification Policy</p>
         <p className="text-[10px] md:text-xs text-gray-500 leading-relaxed font-medium">
            This card is a cryptographically signed digital credential. Scanning the QR code will provide instant verification of your current status.
         </p>
      </div>
    </div>
  );
};

export default MyIDCard;


