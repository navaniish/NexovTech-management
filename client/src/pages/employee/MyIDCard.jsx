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
        const res = await fetch(`${API_URL}/idcard/${user._id || user.id || user.firebaseUid}`);
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
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="p-3 bg-brand-600/10 rounded-3xl border border-brand-500/20">
          <Shield className="text-brand-400" size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-black tracking-tighter theme-text-primary">My Digital Identity</h1>
          <p className="mt-2 text-sm font-medium theme-text-secondary">Official E-ID credentials for NexovTech personnel.</p>
        </div>
      </div>

      {error ? (
        <div className="max-w-md mx-auto theme-card rounded-[32px] p-12 text-center border border-rose-500/10">
           <AlertTriangle size={48} className="text-rose-500 mx-auto mb-6" />
           <p className="text-sm font-bold theme-text-primary leading-relaxed">{error}</p>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <DigitalIDCard 
            employee={user} 
            cardData={cardData} 
          />
        </motion.div>
      )}

      <div className="max-w-md mx-auto mt-12 p-6 rounded-3xl bg-white/5 border border-white/10 text-center">
         <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4">Verification Policy</p>
         <p className="text-xs text-white/50 leading-relaxed">
            This card is a cryptographically signed digital credential. Scanning the QR code will provide instant verification of your current employment status and role within the organization.
         </p>
      </div>
    </div>
  );
};

export default MyIDCard;
