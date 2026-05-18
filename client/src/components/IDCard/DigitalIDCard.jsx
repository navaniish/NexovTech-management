import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { RefreshCcw, DownloadCloud } from 'lucide-react';
import { motion } from 'framer-motion';
import API_URL from '../../config';

const DigitalIDCard = ({ employee, cardData, isAdmin = false }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [scale, setScale] = useState(1);
  const frontRef = useRef(null);
  const backRef = useRef(null);

  React.useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const baseWidth = 320;
      if (width < baseWidth + 40) {
        setScale((width - 40) / baseWidth);
      } else {
        setScale(1);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const dummyCardData = {
    employeeId: employee.employeeId || 'NEX-PENDING',
    issueDate: new Date(),
    expiryDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000),
    qrToken: 'pending',
    status: 'Pending',
    ...cardData
  };

  // Always use the live production site origin for public QR code verification
  const verificationOrigin = 'https://nexovtech-management.netlify.app';
  const verificationUrl = `${verificationOrigin}/#/verify/${dummyCardData.qrToken}`;

  const downloadCard = async (side = 'front') => {
    const ref = side === 'front' ? frontRef : backRef;
    if (!ref.current) return;
    if (side === 'front' && isFlipped) setIsFlipped(false);
    if (side === 'back' && !isFlipped) setIsFlipped(true);
    await new Promise(r => setTimeout(r, 200));
    
    // Temporarily un-mirror the back side for the canvas capture
    const originalTransform = ref.current.style.transform;
    if (side === 'back') {
      ref.current.style.transform = 'none';
    }

    const dataUrl = await toPng(ref.current, { cacheBust: true, pixelRatio: 3 });
    
    // Restore original transform
    if (side === 'back') {
      ref.current.style.transform = originalTransform;
    }

    const link = document.createElement('a');
    link.download = `E-ID-${employee.name.replace(/\s+/g, '-')}-${side}.png`;
    link.href = dataUrl;
    link.click();
  };

  const parseDate = (val) => {
    if (!val) return new Date();
    if (val._seconds) return new Date(val._seconds * 1000);
    if (val.seconds) return new Date(val.seconds * 1000);
    return new Date(val);
  };
  const issueDate = parseDate(dummyCardData.issueDate);
  const expiryDate = parseDate(dummyCardData.expiryDate);
  const fmtDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const nameParts = employee.name?.split(' ') || ['Employee'];
  const firstName = nameParts.slice(0, -1).join(' ') || nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

  return (
    <div className="flex flex-col items-center gap-6 md:gap-8 w-full">
      <div
        className="relative perspective-1000 cursor-pointer flex items-center justify-center"
        style={{ 
          width: 320 * scale, 
          height: 480 * scale,
          transition: 'all 0.3s ease'
        }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          style={{ 
            width: 320, 
            height: 480,
            transform: `scale(${scale})`,
            transformOrigin: 'center'
          }}
          transition={{ duration: 0.9, type: 'spring', stiffness: 100, damping: 20 }}
          className="relative preserve-3d"
        >
          {/* ═══════════ FRONT SIDE ═══════════ */}
          <div
            ref={frontRef}
            className="absolute inset-0 backface-hidden overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)]"
            style={{ borderRadius: 20, background: '#0a0a0a' }}
          >
            {/* Red geometric corners */}
            <div style={{
              position: 'absolute', top: 0, right: 0, width: 140, height: 90,
              background: 'linear-gradient(225deg, #c41018 0%, #6b0a0e 40%, transparent 70%)',
              clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 50% 60%, 0 30%)',
              opacity: 0.9
            }} />
            <div style={{
              position: 'absolute', top: 25, right: 0, width: 100, height: 50,
              background: 'linear-gradient(225deg, rgba(196,16,24,0.3) 0%, transparent 60%)',
              clipPath: 'polygon(40% 0, 100% 0, 100% 100%, 60% 70%)',
            }} />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, width: 140, height: 70,
              background: 'linear-gradient(45deg, #c41018 0%, #6b0a0e 40%, transparent 70%)',
              clipPath: 'polygon(0 40%, 50% 50%, 100% 100%, 0 100%)',
              opacity: 0.9
            }} />
            {/* Subtle dot pattern */}
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.04,
              backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)',
              backgroundSize: '12px 12px'
            }} />

            {/* Lanyard slot */}
            <div style={{
              position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
              width: 40, height: 10, background: '#1a1a1a', borderRadius: '0 0 8px 8px',
              border: '1px solid #333', borderTop: 'none', zIndex: 20
            }} />

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', padding: '20px 18px 14px' }}>
              {/* Logo */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 2 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                  border: '1.5px solid #e11d24', boxShadow: '0 0 10px rgba(225,29,36,0.3)'
                }}>
                  <img src="/assets/nexo_logo.jpeg" alt="NexovTech" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <span style={{ color: '#fff', fontFamily: "'Inter',sans-serif", fontWeight: 900, fontSize: 13, letterSpacing: '-0.5px' }}>NEXOV</span>
                    <span style={{ color: '#e11d24', fontFamily: "'Inter',sans-serif", fontWeight: 900, fontSize: 13, letterSpacing: '-0.5px' }}>TECH</span>
                  </div>
                  <p style={{ color: '#888', fontSize: 5, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 1 }}>Innovate. Build. Elevate.</p>
                </div>
              </div>

              {/* Photo Frame - Octagonal */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 6px' }}>
                <div style={{ position: 'relative', width: 102, height: 110 }}>
                  {/* Outer red octagon border */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    clipPath: 'polygon(30% 0%, 70% 0%, 100% 25%, 100% 75%, 70% 100%, 30% 100%, 0% 75%, 0% 25%)',
                    background: 'linear-gradient(135deg, #e11d24, #8b0000)',
                    boxShadow: '0 0 20px rgba(225,29,36,0.2)'
                  }} />
                  {/* Dark inner octagon */}
                  <div style={{
                    position: 'absolute', inset: 2.5,
                    clipPath: 'polygon(30% 0%, 70% 0%, 100% 25%, 100% 75%, 70% 100%, 30% 100%, 0% 75%, 0% 25%)',
                    background: '#111',
                  }} />
                  {/* Photo */}
                  <div style={{
                    position: 'absolute', inset: 5,
                    clipPath: 'polygon(30% 0%, 70% 0%, 100% 25%, 100% 75%, 70% 100%, 30% 100%, 0% 75%, 0% 25%)',
                    overflow: 'hidden',
                  }}>
                    <img
                       src={(() => {
                         const avatar = employee.avatar;
                         if (!avatar) return '/assets/admin_dp.jpg';
                         if (avatar.startsWith('http') || avatar.startsWith('data:')) return avatar;
                         if (/^[A-Za-z0-9+/=]+$/.test(avatar.trim()) && avatar.length > 100) {
                           return `data:image/jpeg;base64,${avatar.trim()}`;
                         }
                         return `${API_URL.replace('/api', '')}${avatar}`;
                       })()}
                      alt={employee.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                </div>
              </div>

              {/* Name */}
              <div style={{ textAlign: 'center', marginBottom: 2 }}>
                <h2 style={{ color: '#fff', fontFamily: "'Inter',sans-serif", fontWeight: 400, fontSize: 14, letterSpacing: '0.5px', textTransform: 'uppercase', lineHeight: 1.2 }}>
                  {firstName} <span style={{ fontWeight: 900 }}>{lastName}</span>
                </h2>
              </div>

              {/* Role badge */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '2px 0 6px' }}>
                <div style={{
                  background: 'linear-gradient(90deg, #c41018, #e11d24)',
                  padding: '3px 14px', borderRadius: 3,
                  boxShadow: '0 2px 8px rgba(225,29,36,0.25)'
                }}>
                  <span style={{ color: '#fff', fontSize: 7, fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {employee.role || 'Team Member'}
                  </span>
                </div>
              </div>

              {/* Info Grid */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 4, paddingBottom: 2 }}>
                <InfoRow icon="person" label="EMP ID" value={dummyCardData.employeeId} />
                <InfoRow icon="phone" label="PHONE" value={employee.phone || '+91 XXXXXXXXXX'} />
                <InfoRow icon="email" label="EMAIL" value={employee.email || 'N/A'} />
              </div>

              {/* Bottom website */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 6, borderTop: '1px solid #222' }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#e11d24" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                <span style={{ color: '#888', fontSize: 7, fontWeight: 600, letterSpacing: '0.5px' }}>www.nexovtech.com</span>
              </div>
            </div>
          </div>

          {/* ═══════════ BACK SIDE ═══════════ */}
          <div
            ref={backRef}
            className="absolute inset-0 backface-hidden rotate-y-180 overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)]"
            style={{ borderRadius: 20, background: '#0a0a0a' }}
          >
            {/* Red geometric corners */}
            <div style={{
              position: 'absolute', top: 0, right: 0, width: 120, height: 70,
              background: 'linear-gradient(225deg, #c41018 0%, #6b0a0e 40%, transparent 70%)',
              clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 50% 60%, 0 30%)',
              opacity: 0.9
            }} />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, width: 160, height: 80,
              background: 'linear-gradient(45deg, #c41018 0%, #6b0a0e 40%, transparent 70%)',
              clipPath: 'polygon(0 30%, 40% 40%, 80% 100%, 0 100%)',
              opacity: 0.9
            }} />
            <div style={{
              position: 'absolute', bottom: 0, right: 0, width: 90, height: 50,
              background: 'linear-gradient(315deg, rgba(196,16,24,0.5) 0%, transparent 60%)',
              clipPath: 'polygon(50% 40%, 100% 60%, 100% 100%, 30% 100%)',
            }} />
            {/* Dot pattern */}
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.03,
              backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)',
              backgroundSize: '12px 12px'
            }} />

            {/* Lanyard slot */}
            <div style={{
              position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
              width: 40, height: 10, background: '#1a1a1a', borderRadius: '0 0 8px 8px',
              border: '1px solid #333', borderTop: 'none', zIndex: 20
            }} />

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', padding: '20px 18px 14px', alignItems: 'center' }}>
              {/* Logo */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', overflow: 'hidden',
                  border: '1.5px solid #e11d24', boxShadow: '0 0 12px rgba(225,29,36,0.3)'
                }}>
                  <img src="/assets/nexo_logo.jpeg" alt="NexovTech" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <span style={{ color: '#fff', fontFamily: "'Inter',sans-serif", fontWeight: 900, fontSize: 12, letterSpacing: '-0.5px' }}>NEXOV</span>
                  <span style={{ color: '#e11d24', fontFamily: "'Inter',sans-serif", fontWeight: 900, fontSize: 12, letterSpacing: '-0.5px' }}>TECH</span>
                </div>
                <div style={{ width: 38, height: 1, background: '#e11d24', borderRadius: 2, marginTop: 1 }} />
              </div>

              {/* Certification text */}
              <div style={{ textAlign: 'center', margin: '8px 4px 0', maxWidth: 240 }}>
                <p style={{ color: '#ccc', fontSize: 9, fontWeight: 400, lineHeight: 1.4, fontFamily: "'Inter',sans-serif" }}>
                  This ID card certifies that the bearer is an official employee of Nexovtech. This card is non-transferable and must be presented upon request.
                </p>
              </div>
              {/* Employee Address */}
              <div style={{ margin: '6px 0 0', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, width: '100%' }}>
                <p style={{ color: '#666', fontSize: 6, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 2 }}>Employee Address</p>
                <p style={{ color: '#bbb', fontSize: 8, fontWeight: 500, lineHeight: 1.3, fontFamily: "'Inter',sans-serif" }}>
                  {employee.address || 'Address not provided'}
                </p>
              </div>

              {/* Signature Block */}
              <div style={{ display: 'flex', width: '100%', gap: 10, margin: '6px 0 0' }}>
                {/* Authorized Sign */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ width: '100%', height: 24, borderBottom: '1px solid #e11d24', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 1 }}>
                    <span className="signature-font" style={{ color: '#fff', fontSize: 14, opacity: 0.7 }}>{employee.authorizedSign || 'NexovTech'}</span>
                  </div>
                  <p style={{ color: '#999', fontSize: 5, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Authorized Sign</p>
                </div>
                {/* Team Sign */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ width: '100%', height: 24, borderBottom: '1px solid #e11d24', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 1 }}>
                    <span className="signature-font" style={{ color: '#fff', fontSize: 14, opacity: 0.7 }}>{employee.teamSign || 'Team'}</span>
                  </div>
                  <p style={{ color: '#999', fontSize: 5, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Team Sign</p>
                </div>
              </div>

              {/* Contact Info + QR */}
              <div style={{ flex: 1, display: 'flex', width: '100%', alignItems: 'flex-end', gap: 8, marginTop: 8, paddingBottom: 2 }}>
                {/* Contact details */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <ContactRow icon="location" text="India & Global" />
                  <ContactRow icon="web" text="www.nexovtech.com" />
                  <ContactRow icon="phone" text="+91 7075708980" />
                </div>
                {/* QR Code */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                  <div style={{
                    padding: 3, background: '#fff', borderRadius: 5,
                    border: '1px solid #333',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                  }}>
                    <QRCodeSVG value={verificationUrl} size={48} />
                  </div>
                  <span style={{ color: '#999', fontSize: 5, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Scan to verify</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 w-full max-w-sm sm:max-w-none px-4">
        <button
          onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}
          className="w-full sm:w-auto flex items-center justify-center gap-3 md:gap-4 px-6 md:px-12 py-3.5 md:py-4.5 rounded-[18px] md:rounded-[24px] bg-white text-black hover:bg-slate-100 transition-all font-black text-[10px] md:text-[12px] uppercase tracking-[0.2em] shadow-2xl"
        >
          <RefreshCcw size={18} className={isFlipped ? 'rotate-180 transition-all duration-700' : 'transition-all duration-700'} />
          Rotate Unit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); downloadCard(isFlipped ? 'back' : 'front'); }}
          className="w-full sm:w-auto flex items-center justify-center gap-3 md:gap-4 px-6 md:px-12 py-3.5 md:py-4.5 rounded-[18px] md:rounded-[24px] bg-red-600 text-white hover:bg-red-700 transition-all font-black text-[10px] md:text-[12px] uppercase tracking-[0.2em] shadow-2xl shadow-red-500/40"
        >
          <DownloadCloud size={18} /> Export Unit
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Mrs+Saint+Delafield&family=Inter:wght@400;500;600;700;900&display=swap');
        .signature-font { font-family: 'Mrs Saint Delafield', cursive; }
        .premium-font { font-family: 'Inter', sans-serif; }
      `}} />
    </div>
  );
};

/* ─── Front Info Row ─── */
const InfoRow = ({ icon, label, value }) => {
  const iconMap = {
    person: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    calendar: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    shield: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    dept: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    phone: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    email: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/></svg>,
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 20, height: 20, borderRadius: 4,
        background: '#e11d24', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center',
        flexShrink: 0, boxShadow: '0 1.5px 5px rgba(225,29,36,0.2)'
      }}>
        {iconMap[icon]}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span style={{ color: '#999', fontSize: 7, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ color: '#666', fontSize: 7, fontWeight: 700 }}>:</span>
        <span style={{ color: '#fff', fontSize: 9, fontWeight: 700, fontFamily: "'Inter',sans-serif" }}>{value}</span>
      </div>
    </div>
  );
};

/* ─── Back Contact Row ─── */
const ContactRow = ({ icon, text }) => {
  const iconMap = {
    location: <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    web: <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    email: <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/></svg>,
    phone: <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
      <div style={{
        width: 16, height: 16, borderRadius: 3,
        background: '#e11d24', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 1
      }}>
        {iconMap[icon]}
      </div>
      <span style={{ color: '#ccc', fontSize: 8, fontWeight: 500, lineHeight: 1.3, fontFamily: "'Inter',sans-serif" }}>{text}</span>
    </div>
  );
};

export default DigitalIDCard;
