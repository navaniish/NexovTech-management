import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Globe, MapPin, Wallet, Sparkles, CheckCircle2, Heart } from 'lucide-react';

const DigitalPayslip = ({ data, onClose }) => {
  if (!data) return null;

  // Format currency
  const fmt = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  // Resilient Financial Mapping
  const baseSalary = data.calculatedSalary?.base || data.salary || data.netSalary || 0;
  const bonus = data.calculatedSalary?.bonus || data.bonus || 0;
  const totalAmount = data.calculatedSalary?.total || baseSalary + bonus;

  // Number to Words (Frontend Utility)
  const toWords = (num) => {
    const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Only' : 'Only';
    return 'Rupees ' + str;
  };

  const displayDate = data.paymentDate ? new Date(data.paymentDate).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  }) : new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-slate-950/90 backdrop-blur-3xl fixed inset-0 z-[100] flex flex-col items-center p-0 md:p-8 overflow-y-auto custom-scrollbar print:p-0 print:bg-white">
      <style>{`
        #printable-payslip * { color: #000000 !important; }
        #printable-payslip .text-amber-600, #printable-payslip .text-amber-500 { color: #d97706 !important; }
        #printable-payslip .bg-slate-900 { background-color: #0f172a !important; }
        #printable-payslip .bg-slate-900 * { color: #ffffff !important; }
        #printable-payslip .bg-slate-950 { background-color: #020617 !important; }
        #printable-payslip .bg-slate-950 * { color: #ffffff !important; }
      `}</style>

      {/* Top Control Bar (Non-Printable) */}
      <div className="w-full max-w-[210mm] mb-6 flex justify-between items-center print:hidden px-4 md:px-0">
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white font-black">N</div>
           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">NexovGen Financial Ledger</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => window.print()}
            className="px-5 py-2.5 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all shadow-lg"
          >
            Print Statement
          </button>
          <button 
            onClick={onClose}
            className="px-5 py-2.5 bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
          >
            Exit
          </button>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="bg-white w-full max-w-[210mm] min-h-[297mm] shadow-[0_80px_160px_rgba(0,0,0,0.8)] overflow-hidden relative print:shadow-none print:w-[210mm] print:h-[297mm] print:min-h-0"
        style={{ aspectRatio: '210 / 297', background: '#ffffff' }}
      >
        {/* Payslip Content */}
        <div className="p-10 md:p-12 h-full flex flex-col print:p-8" id="printable-payslip" style={{ background: '#ffffff' }}>
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center overflow-hidden border-2 border-slate-900/10 shadow-lg">
                 <img src="/logo.jpg" alt="Nexov Logo" className="w-full h-full object-contain scale-110" />
              </div>
              <div>
                <h1 className="text-3xl font-[1000] tracking-tighter uppercase leading-none" style={{ color: '#000000' }}>
                  NEXOV<span className="text-amber-600" style={{ color: '#d97706' }}>TECH</span>
                </h1>
                <p className="text-[8px] font-black uppercase tracking-[0.4em] ml-0.5 opacity-60" style={{ color: '#64748b' }}>Innovate. Create. Elevate.</p>
              </div>
            </div>
            
            <div className="text-right space-y-0.5 mt-3 md:mt-0">
              <div className="flex items-center justify-end gap-2 text-[10px] font-bold" style={{ color: '#000000' }}>
                <Mail size={12} /> <span>nexovtech@myyahoo.com</span>
              </div>
              <div className="flex items-center justify-end gap-2 text-[10px] font-bold" style={{ color: '#000000' }}>
                <Globe size={12} /> <span>https://nexovtech-portfolio.netlify.app</span>
              </div>
              <div className="flex items-center justify-end gap-2 text-[10px] font-bold" style={{ color: '#000000' }}>
                <MapPin size={12} /> <span>India and Global Wide</span>
              </div>
            </div>
          </div>

          {/* Main Title */}
          <div className="text-center mb-5">
            <h2 className="text-5xl font-serif italic font-[1000] mb-1 tracking-tight" style={{ color: '#000000' }}>Payment Statement</h2>
            <div className="flex items-center justify-center gap-4">
              <div className="h-[1px] w-10 bg-slate-200" />
              <p className="text-lg font-bold" style={{ color: '#475569' }}>
                For the Month of <span className="text-amber-600 font-[1000]" style={{ color: '#d97706' }}>{data.monthName || 'May 2025'}</span>
              </p>
              <div className="h-[1px] w-10 bg-slate-200" />
            </div>
          </div>

          {/* Greeting */}
          <div className="mb-5 px-1">
            <p className="text-sm font-black mb-0.5 tracking-tight" style={{ color: '#000000' }}>Dear Team Member,</p>
            <p className="text-[13px] leading-relaxed font-bold opacity-80" style={{ color: '#1e293b' }}>
              We truly appreciate your dedication and the positive energy you bring to the team every day. 
              Thank you for being an important part of <span className="text-amber-600 font-[1000]" style={{ color: '#d97706' }}>NexovTech!</span>
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="bg-amber-50/40 rounded-[1.5rem] border border-amber-100 overflow-hidden mb-6">
            <div className="bg-slate-900 px-6 py-2 flex items-center gap-2">
               <div className="w-1 h-3 bg-amber-500 rounded-full" />
               <h3 className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: '#ffffff' }}>Member Detection</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-1.5">
              {[
                { label: 'Member Name', value: data.employeeName || 'Rahul Kumar' },
                { label: 'Payment Date', value: displayDate },
                { label: 'Member ID', value: data.employeeId || 'NEX0256' },
                { label: 'Pay Period', value: data.payPeriod || `01 ${data.month}/${data.year} - 31 ${data.month}/${data.year}` },
                { label: 'Member Service', value: data.metadata?.service || 'Specialist Services' },
                { label: 'Project Name', value: data.metadata?.projectName || 'Internal Operations' },
                { label: 'Department', value: data.metadata?.department || 'Development' },
                { label: 'Payment Mode', value: data.paymentMode || 'Bank Transfer' },
                { label: 'Designation', value: data.designation || 'Software Developer' },
                { label: 'Bank Name', value: data.bankName || 'HDFC Bank' },
                { label: 'Date of Joining', value: data.doj || '12 Aug 2024' },
                { label: 'Account Number', value: data.accountNumber || '**** **** **** 1234' },
              ].map((item, i) => (
                <div key={i} className="flex items-center text-[11px] py-0.5 border-b border-slate-100/50 last:border-0">
                  <span className="font-black min-w-[110px] uppercase tracking-tighter opacity-60" style={{ color: '#475569' }}>
                     {item.label}
                  </span>
                  <span className="font-black mr-3 opacity-20" style={{ color: '#000000' }}>:</span>
                  <span className="font-[1000] tracking-tight" style={{ color: '#000000' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Earnings Table */}
          <div className="border border-slate-200 rounded-[1.5rem] overflow-hidden mb-6 flex-1 max-h-[320px]">
            <div className="flex flex-col">
              <div className="bg-slate-900 p-3 flex items-center gap-2">
                <Sparkles size={14} className="text-amber-400" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: '#ffffff' }}>Service Compensation Summary</h3>
              </div>
              <div className="p-5 space-y-2.5 flex-1 bg-white">
                {(() => {
                  const items = [
                    { label: 'Web Development', val: data.calculatedSalary?.breakdown?.web || 0 },
                    { label: 'AI Solutions', val: data.calculatedSalary?.breakdown?.ai || 0 },
                    { label: 'Video Editing', val: data.calculatedSalary?.breakdown?.video || 0 },
                    { label: 'Management Systems', val: data.calculatedSalary?.breakdown?.systems || 0 },
                  ];
                  
                  const accountedTotal = items.reduce((acc, curr) => acc + curr.val, 0);
                  const otherServices = baseSalary - accountedTotal;

                  if (otherServices > 0) items.push({ label: 'Specialist Services', val: otherServices });
                  if (bonus > 0) items.push({ label: 'Performance Bonus', val: bonus });

                  return items.filter(item => item.val > 0).map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-[12px] border-b border-slate-50 pb-2 last:border-0">
                      <span className="font-black opacity-60" style={{ color: '#475569' }}>{item.label}</span>
                      <span className="font-[1000]" style={{ color: '#000000' }}>{fmt(item.val)}</span>
                    </div>
                  ));
                })()}
              </div>
              <div className="bg-slate-50 p-5 space-y-3 border-t border-slate-100">
                {baseSalary > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-60" style={{ color: '#000000' }}>Base Settlement</span>
                    <span className="text-sm font-[1000]" style={{ color: '#000000' }}>{fmt(baseSalary)}</span>
                  </div>
                )}
                {bonus > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-60" style={{ color: '#000000' }}>Performance Bonus</span>
                    <span className="text-sm font-[1000] text-emerald-600" style={{ color: '#059669' }}>+ {fmt(bonus)}</span>
                  </div>
                )}
                </div>
              </div>
            </div>

          {/* Net Pay Card */}
          <div className="bg-amber-50/50 border border-amber-100 rounded-[2rem] p-6 flex items-center gap-6 mb-6 shadow-inner">
            <div className="flex items-center gap-5 flex-1 border-r border-slate-200">
              <div className="w-16 h-16 bg-white rounded-full border-[3px] border-amber-200 flex items-center justify-center shadow-md">
                <Wallet size={28} className="text-amber-600" />
              </div>
              <div>
                <h4 className="text-xl font-[1000] tracking-tighter" style={{ color: '#000000' }}>NET PAY</h4>
                <p className="text-[9px] font-black uppercase tracking-widest mt-0.5 opacity-40" style={{ color: '#64748b' }}>(Total Earnings - Total Deductions)</p>
              </div>
            </div>
            <div className="text-right flex-1">
               <p className="text-4xl font-[1000] tracking-tighter" style={{ color: '#000000' }}>
                 {fmt(totalAmount)}
               </p>
               <p className="text-[9px] font-black italic mt-0.5 opacity-50" style={{ color: '#64748b' }}>({toWords(totalAmount)})</p>
            </div>
          </div>

          {/* Thank You & Signature */}
          <div className="flex justify-between items-end px-1">
            <div className="max-w-md">
              <div className="flex items-center gap-2 mb-2">
                 <div className="text-amber-600"><CheckCircle2 size={18} /></div>
                 <h5 className="text-2xl font-serif italic font-black" style={{ color: '#000000' }}>Thank You!</h5>
              </div>
              <p className="text-[11px] leading-relaxed font-black opacity-80" style={{ color: '#1e293b' }}>
                Your hard work and commitment help us build a stronger future together. 
                Keep growing, keep inspiring!
              </p>
            </div>

            <div className="text-right flex flex-col items-end gap-1">
               <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1" style={{ color: '#d97706' }}>NexovTech Official</p>
               <div className="w-24 h-[1px] bg-slate-200" />
            </div>

            {/* Circular Seal */}
            <div className="relative ml-8">
               <div className="w-32 h-32 border-2 border-slate-900/10 rounded-full flex flex-col items-center justify-center p-2">
                  <div className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-30" style={{ color: '#64748b' }}>NEXOVTECH</div>
                  <div className="text-6xl font-black opacity-10" style={{ color: '#000000' }}>N</div>
                  <div className="text-[9px] font-black uppercase tracking-widest mt-1 opacity-30" style={{ color: '#64748b' }}>HYDERABAD</div>
                  <div className="absolute inset-0 border-2 border-slate-900/5 border-dashed rounded-full scale-90" />
               </div>
            </div>
          </div>
        </div>

        {/* Cursive Tagline Footer */}
        <div className="bg-slate-950 p-4 text-center mt-auto" style={{ background: '#020617' }}>
           <div className="text-sm font-serif italic flex items-center justify-center gap-6" style={{ color: '#ffffff' }}>
              <Heart size={14} className="text-amber-500" /> Innovate. Create. Elevate.
           </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DigitalPayslip;
