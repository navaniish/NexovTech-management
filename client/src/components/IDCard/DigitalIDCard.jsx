import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { RefreshCcw, DownloadCloud } from 'lucide-react';
import { motion } from 'framer-motion';
import API_URL from '../../config';

const DigitalIDCard = ({ employee, cardData, isAdmin = false }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const frontRef = useRef(null);
  const backRef = useRef(null);

  const verificationUrl = `${window.location.origin}/verify/${cardData?.qrToken}`;

  const downloadCard = async (side = 'front') => {
    const ref = side === 'front' ? frontRef : backRef;
    if (!ref.current) return;
    if (side === 'front' && isFlipped) setIsFlipped(false);
    if (side === 'back' && !isFlipped) setIsFlipped(true);
    await new Promise(r => setTimeout(r, 200));
    const dataUrl = await toPng(ref.current, { cacheBust: true, pixelRatio: 3 });
    const link = document.createElement('a');
    link.download = `E-ID-${employee.name.replace(/\s+/g, '-')}-${side}.png`;
    link.href = dataUrl;
    link.click();
  };

  if (!cardData) return null;

  const parseDate = (val) => {
    if (!val) return new Date();
    if (val._seconds) return new Date(val._seconds * 1000);
    if (val.seconds) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  };
  const issueDate = parseDate(cardData.issueDate);
  const expiryDate = parseDate(cardData.expiryDate);
  const fmtDate = (d) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  const fmtDateSlash = (d) => `${String(d.getDate()).padStart(2,'0')} / ${String(d.getMonth()+1).padStart(2,'0')} / ${String(d.getFullYear()).slice(-2)}`;
  
  // NEW: Get portrait with local cache fallback for rock-solid permanence
  const userId = employee._id || employee.id;
  const localPortrait = userId ? localStorage.getItem(`nexov_portrait_${userId}`) : null;
  const rawPortrait = localPortrait || employee.avatar;
  const displayPortrait = rawPortrait ? (rawPortrait.startsWith('http') || rawPortrait.startsWith('data:') ? rawPortrait : `${API_URL}${rawPortrait}`) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.name}`;

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className="relative perspective-1000 cursor-pointer"
        style={{ width: 340, height: 530 }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.7, type: 'spring', stiffness: 280, damping: 22 }}
          className="w-full h-full relative preserve-3d"
        >
          {/* ═══════════ FRONT SIDE ═══════════ */}
          <div
            ref={frontRef}
            className="absolute inset-0 backface-hidden rounded-[14px] overflow-hidden"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
          >
            {/* ── BLACK TOP SECTION ── */}
            <div className="relative overflow-hidden" style={{ height: 310, background: '#0d0d0d' }}>
              {/* Triangle grid pattern (Outlined) */}
              <div className="absolute inset-0 opacity-[0.3]" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg stroke='%23D41920' stroke-width='1.5' fill='none'%3E%3Cpath d='M20 0L40 40H0L20 0z'/%3E%3Cpath d='M0 0H40'/%3E%3C/g%3E%3C/svg%3E")`,
                backgroundSize: '30px 30px'
              }} />

              {/* Red diagonal stripe — right side (Thick) */}
              <div className="absolute top-0 right-0 h-full overflow-hidden" style={{ width: 140 }}>
                <div className="absolute bg-[#D41920]" style={{
                  width: 160, height: '140%', top: -20, right: -60,
                  transform: 'skewX(-16deg)'
                }} />
              </div>

              {/* Left red accent line */}
              <div className="absolute top-[160px] left-0 w-[26px] h-[2px] bg-[#D41920]" />

              {/* ── Logo + Company Name ── */}
              <div className="relative z-10 flex items-center gap-2.5 p-4 pt-5 pl-5">
                <div className="w-12 h-10 rounded-none border-[1.5px] border-[#D41920] flex items-center justify-center bg-[#0d0d0d] p-1 shadow-lg">
                  <img 
                    src="/logo.jpg" 
                    alt="" 
                    className="w-full h-full object-contain rounded-full" 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://ui-avatars.com/api/?name=NexovTech&background=0D8ABC&color=fff';
                    }}
                  />
                </div>
                <div>
                  <p className="text-white font-extrabold text-[15px] leading-none tracking-tight italic">NexovTech</p>
                  <p className="text-[#D41920] text-[8px] font-semibold tracking-wider mt-[2px]">Management Systems</p>
                </div>
              </div>

              {/* ── PHOTO FRAME with metallic border ── */}
              <div className="absolute left-1/2 -translate-x-1/2 z-20" style={{ bottom: 20 }}>
                {/* Photo Rounded Rectangle */}
                <div className="w-[120px] h-[126px] rounded-[16px] bg-[#1a1a2e] border-[3px] shadow-[0_15px_30px_rgba(0,0,0,0.6)] relative overflow-hidden" style={{ borderColor: '#888888' }}>
                  <img
                    src={displayPortrait}
                    className="w-full h-full object-cover"
                    alt=""
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.name}`;
                    }}
                  />
                  <div className="absolute inset-0 pointer-events-none" style={{
                    boxShadow: 'inset 0 0 15px rgba(255,255,255,0.2), inset 0 0 5px rgba(0,0,0,0.5)'
                  }} />
                </div>
              </div>
            </div>

            {/* ── WHITE BOTTOM SECTION ── */}
            <div className="bg-white flex flex-col relative" style={{ height: 220 }}>
              {/* Name & Details Box */}
              <div className="mt-[28px] px-8 relative flex flex-col gap-[8px] h-full">
                {/* Red connecting bracket line */}
                {/* Horizontal line above name */}
                <div className="absolute left-[20px] top-[-8px] w-[30px] h-[2px] bg-[#D41920]" />
                {/* Vertical line connecting everything */}
                <div className="absolute left-[20px] top-[-8px] bottom-[26px] w-[2px] bg-[#D41920]" />
                
                {/* Name & Role */}
                <div className="pl-4 mb-[2px] text-left">
                   <div className="text-[#D41920] font-black text-[17px] uppercase tracking-wider leading-none">{employee.name}</div>
                   <p className="text-[10px] text-slate-800 font-bold mt-[4px] tracking-wide">{employee.role}</p>
                </div>

                {/* Info Rows */}
                <div className="space-y-[6px]">
                  <InfoRow icon="ID" value={cardData.employeeId} />
                  <InfoRow icon="DOB" value={fmtDate(issueDate)} />
                  <InfoRow icon="☎" value={employee.phone || '+91 98765 43210'} />
                  <InfoRow icon="✉" value={employee.email} />
                </div>
              </div>

              {/* Red bottom bar */}
              <div className="h-[8px] bg-[#D41920]" />
            </div>
          </div>

          {/* ═══════════ BACK SIDE ═══════════ */}
          <div
            ref={backRef}
            className="absolute inset-0 backface-hidden rounded-[14px] overflow-hidden rotate-y-180 bg-white"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
          >
            {/* Logo centered at top */}
            <div className="flex flex-col items-center pt-7 pb-4">
              <div className="w-14 h-14 rounded-none border-[2.5px] border-[#C9A84C] flex items-center justify-center bg-[#0a0a0a] p-2.5">
                 <img 
                  src="/logo.jpg" 
                  alt="" 
                  className="w-full h-full object-contain rounded-full" 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://ui-avatars.com/api/?name=NexovTech&background=0D8ABC&color=fff';
                  }}
                />
              </div>
              <p className="font-extrabold text-[15px] text-slate-900 tracking-tight italic leading-none mt-2.5">NexovTech</p>
              <p className="text-[#D41920] text-[7.5px] font-semibold tracking-wider mt-[3px]">Management Systems</p>
            </div>

            {/* Terms and conditions */}
            <div className="px-6 pt-2">
              <h5 className="text-[10.5px] font-bold text-[#D41920] italic mb-3">Terms and conditions</h5>
              <ul className="space-y-2.5">
                <li className="flex gap-2 items-start">
                  <div className="w-[9px] h-[9px] rounded-full bg-[#111] mt-[2px] shrink-0" />
                  <p className="text-[8.5px] text-slate-600 leading-snug">Employees are required to use the card while on duty</p>
                </li>
                <li className="flex gap-2 items-start">
                  <div className="w-[9px] h-[9px] rounded-full bg-[#D41920] mt-[2px] shrink-0" />
                  <p className="text-[8.5px] text-slate-600 leading-snug">If the card is lost or damaged, an additional fee will be charged according to regulations</p>
                </li>
                <li className="flex gap-2 items-start">
                  <div className="w-[9px] h-[9px] rounded-full bg-[#D41920] mt-[2px] shrink-0" />
                  <p className="text-[8.5px] text-slate-600 leading-snug">If you find this card, call the number listed below</p>
                </li>
              </ul>
            </div>

            {/* Signature */}
            <div className="px-6 mt-5">
              <div className="w-24 border-b border-slate-300 pb-0.5 mb-[3px]">
                <p className="text-[10px] font-serif italic text-slate-700">Admin</p>
              </div>
              <p className="text-[7px] text-slate-400 font-medium">Your signature</p>
            </div>

            {/* Bottom section: QR + dates + black triangle */}
            <div className="absolute bottom-0 left-0 w-full" style={{ height: 110 }}>
              {/* QR code */}
              <div className="absolute left-6 bottom-[36px] z-10 bg-white p-1 rounded shadow-sm border border-slate-100">
                <QRCodeSVG value={verificationUrl} size={48} />
              </div>

              {/* Dates */}
              <div className="absolute left-[90px] bottom-[38px] z-10">
                <div className="flex items-center gap-1 mb-[4px]">
                  <p className="text-[8px] text-slate-400 w-[45px]">Issue date</p>
                  <p className="text-[8px] text-slate-400">:</p>
                  <p className="text-[9px] font-bold text-slate-800 ml-1">{fmtDateSlash(issueDate)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <p className="text-[8px] text-slate-400 w-[45px]">Expire Date</p>
                  <p className="text-[8px] text-slate-400">:</p>
                  <p className="text-[9px] font-bold text-slate-800 ml-1">{fmtDateSlash(expiryDate)}</p>
                </div>
              </div>

              {/* Black diagonal triangle — bottom right */}
              <div className="absolute bottom-0 right-0 w-full overflow-hidden" style={{ height: 60 }}>
                <div className="absolute bottom-0 right-0 bg-[#0d0d0d] w-full h-full" style={{
                  clipPath: 'polygon(100% 0%, 100% 100%, 0% 100%)'
                }}>
                  {/* Triangle grid pattern */}
                  <div className="absolute inset-0 opacity-[0.15]" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0L40 40H0L20 0zM20 5L35 35H5L20 5z' fill='%23D41920' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                    backgroundSize: '30px 30px'
                  }} />
                  {/* Red line accents inside triangle */}
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#D41920]" />
                  <div className="absolute bg-[#D41920]" style={{
                    width: 2, height: '150%',
                    bottom: 0, right: '50%',
                    transform: 'rotate(32deg)', transformOrigin: 'bottom right'
                  }} />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all font-bold text-[11px] uppercase tracking-widest"
        >
          <RefreshCcw size={14} /> Flip Card
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); downloadCard('front'); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D41920] text-white hover:bg-red-800 transition-all font-bold text-[11px] uppercase tracking-widest shadow-lg shadow-red-500/20"
        >
          <DownloadCloud size={14} /> Download PNG
        </button>
      </div>
    </div>
  );
};

/* ── Front-side info row ── */
const InfoRow = ({ icon, value }) => (
  <div className="flex items-center gap-3 pl-1 relative z-10">
    <div className="w-[20px] h-[20px] rounded-[5px] bg-[#D41920] flex items-center justify-center shrink-0 border-[1.5px] border-white shadow-sm" style={{ backgroundColor: '#D41920' }}>
      <span className="text-white text-[7px] font-black leading-none">{icon}</span>
    </div>
    <p className="text-[10px] text-slate-800 font-bold truncate">{value}</p>
  </div>
);

export default DigitalIDCard;
