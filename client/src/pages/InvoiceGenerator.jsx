import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import logoSilver from '../assets/logo-silver.png';
import {
   Plus,
   Trash2,
   Settings,
   X,
   Printer,
   CreditCard,
   Phone,
   Mail,
   Globe,
   MapPin,
   Building2,
   User,
   Hash,
   Briefcase,
   Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const InvoiceGenerator = () => {
   const { user } = useAuth();
   const [invoice, setInvoice] = useState({
      id: `INV-${Date.now().toString().slice(-6)}`,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      client: {
         name: '',
         company: '',
         phone: '',
         address: '',
         email: ''
      },
      from: {
         name: user?.name || 'Administrator',
         company: 'NexovTech Solutions Ltd.',
         phone: '+91 98765 43210',
         address: 'Innovate Hub, Sector 5, Bangalore, India',
         email: user?.email || 'admin@nexovtech.com',
         web: 'www.nexovtech.com'
      },
      items: [
         { id: 1, service: 'AI Implementation Phase 1', qty: 1, unitPrice: 0, total: 0 },
      ],
      paymentMethod: {
         accountNo: '333 2156 6354',
         accountName: 'NEXOV TECH',
         bank: 'Nexov Global Bank',
         branch: 'BANGALORE'
      },
      tax: 0,
      discount: 0
   });

   const subtotal = invoice.items.reduce((acc, item) => acc + item.total, 0);
   const totalAmount = subtotal + invoice.tax - invoice.discount;

   const handleUpdateItem = (id, field, value) => {
      setInvoice(prev => ({
         ...prev,
         items: prev.items.map(item => {
            if (item.id === id) {
               const updated = { ...item, [field]: value };
               if (field === 'qty' || field === 'unitPrice') {
                  updated.total = updated.qty * updated.unitPrice;
               }
               return updated;
            }
            return item;
         })
      }));
   };

   const addNewItem = () => {
      if (invoice.items.length >= 8) return;
      const newItem = { id: Date.now(), service: 'New Service', qty: 1, unitPrice: 0, total: 0 };
      setInvoice(prev => ({ ...prev, items: [...prev.items, newItem] }));
   };

   const removeItem = (id) => {
      if (invoice.items.length <= 1) return;
      setInvoice(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }));
   };

   const formatCurrency = (val) => {
      return new Intl.NumberFormat('en-IN', {
         style: 'currency',
         currency: 'INR',
         maximumFractionDigits: 0
      }).format(val);
   };

   return (
      <div className="invoice-generator-container">
         <div className="flex h-[calc(100vh-120px)] gap-0 -m-4 overflow-hidden bg-[#0f172a]/5">

         {/* SIDEBAR EDITOR */}
         <div className="w-[450px] bg-[#0f172a] flex flex-col border-r border-white/10 shadow-2xl print:hidden">
            <div className="p-8 border-b border-white/10 bg-[#1e293b] shrink-0">
               <h2 className="text-xl font-black text-white flex items-center gap-3">
                  <Settings className="text-brand-500" size={22} /> Forge Control
               </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar pb-32">
               <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-brand-500 uppercase tracking-widest flex items-center gap-2">
                     <Hash size={12} /> Document Setup
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                     <input value={invoice.id} onChange={(e) => setInvoice({ ...invoice, id: e.target.value })} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-brand-500" placeholder="Invoice ID" />
                     <input value={invoice.date} onChange={(e) => setInvoice({ ...invoice, date: e.target.value })} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-brand-500" placeholder="Date" />
                  </div>
               </section>

               <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-brand-500 uppercase tracking-widest flex items-center gap-2">
                     <User size={12} /> Recipient Intelligence
                  </h3>
                  <div className="space-y-3">
                     <input value={invoice.client.name} onChange={(e) => setInvoice({ ...invoice, client: { ...invoice.client, name: e.target.value } })} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-brand-500" placeholder="Client Name" />
                     <input value={invoice.client.company} onChange={(e) => setInvoice({ ...invoice, client: { ...invoice.client, company: e.target.value } })} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-brand-500" placeholder="Client Company" />
                     <input value={invoice.client.phone} onChange={(e) => setInvoice({ ...invoice, client: { ...invoice.client, phone: e.target.value } })} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-brand-500" placeholder="Client Phone" />
                     <textarea value={invoice.client.address} onChange={(e) => setInvoice({ ...invoice, client: { ...invoice.client, address: e.target.value } })} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-brand-500 h-20 resize-none" placeholder="Client Address" />
                  </div>
               </section>

               <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-brand-500 uppercase tracking-widest flex items-center gap-2">
                     <Briefcase size={12} /> Origin Identity
                  </h3>
                  <div className="space-y-3">
                     <input value={invoice.from.company} onChange={(e) => setInvoice({ ...invoice, from: { ...invoice.from, company: e.target.value } })} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-brand-500" placeholder="Your Company" />
                     <div className="grid grid-cols-2 gap-3">
                        <input value={invoice.from.phone} onChange={(e) => setInvoice({ ...invoice, from: { ...invoice.from, phone: e.target.value } })} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-brand-500" placeholder="Phone" />
                        <input value={invoice.from.web} onChange={(e) => setInvoice({ ...invoice, from: { ...invoice.from, web: e.target.value } })} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-brand-500" placeholder="Website" />
                     </div>
                     <input value={invoice.from.email} onChange={(e) => setInvoice({ ...invoice, from: { ...invoice.from, email: e.target.value } })} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-brand-500" placeholder="Email" />
                  </div>
               </section>

               <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-brand-500 uppercase tracking-widest flex items-center gap-2">
                     <CreditCard size={12} /> Settlement Gateway
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                     <input value={invoice.paymentMethod.bank} onChange={(e) => setInvoice({ ...invoice, paymentMethod: { ...invoice.paymentMethod, bank: e.target.value } })} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded text-white text-[11px] outline-none focus:border-brand-500" placeholder="Bank" />
                     <input value={invoice.paymentMethod.accountNo} onChange={(e) => setInvoice({ ...invoice, paymentMethod: { ...invoice.paymentMethod, accountNo: e.target.value } })} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded text-white text-[11px] outline-none focus:border-brand-500" placeholder="Acc No" />
                  </div>
               </section>

               <section className="space-y-4">
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                     <h3 className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Billable Items</h3>
                     <button onClick={addNewItem} className="p-1 bg-brand-600 text-white rounded hover:bg-brand-500 transition-all"><Plus size={14} /></button>
                  </div>
                  <div className="space-y-3">
                     {invoice.items.map(item => (
                        <div key={item.id} className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3 group relative">
                           <button onClick={() => removeItem(item.id)} className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                           <input value={item.service} onChange={(e) => handleUpdateItem(item.id, 'service', e.target.value)} className="w-full bg-transparent border-b border-white/10 text-white text-xs font-bold outline-none focus:border-brand-500 pb-1" />
                           <div className="grid grid-cols-2 gap-4">
                              <input type="number" value={item.qty} onChange={(e) => handleUpdateItem(item.id, 'qty', Number(e.target.value))} className="bg-white/10 border border-white/10 rounded px-3 py-1.5 text-xs text-white outline-none" />
                              <input type="number" value={item.unitPrice} onChange={(e) => handleUpdateItem(item.id, 'unitPrice', Number(e.target.value))} className="bg-white/10 border border-white/10 rounded px-3 py-1.5 text-xs text-white outline-none" />
                           </div>
                        </div>
                     ))}
                  </div>
               </section>

               <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Adjustments</h3>
                  <div className="grid grid-cols-2 gap-4">
                     <input type="number" value={invoice.tax} onChange={(e) => setInvoice({ ...invoice, tax: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-brand-500" placeholder="Tax" />
                     <input type="number" value={invoice.discount} onChange={(e) => setInvoice({ ...invoice, discount: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-brand-500" placeholder="Discount" />
                  </div>
               </section>
            </div>

            <div className="p-8 border-t border-white/10 shrink-0">
               <button onClick={() => window.print()} className="w-full py-4 bg-brand-600 text-white rounded font-black uppercase tracking-widest text-xs hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/20">Finalize & Print A4</button>
            </div>
         </div>

         {/* PREVIEW CANVAS */}
         <div className="flex-1 overflow-y-auto p-0 flex justify-center custom-scrollbar print:p-0 bg-[#0f172a]/5 print:bg-white relative">
            <div className="fixed top-8 right-8 bg-brand-600 text-white px-6 py-2 rounded-full font-black uppercase tracking-widest text-[10px] shadow-2xl z-50 print:hidden">
               NexovForge Preview
            </div>

            <motion.div
               id="invoice-forge-document"
               initial={{ opacity: 0, scale: 0.98 }}
               animate={{ opacity: 1, scale: 1 }}
               className="bg-white w-[210mm] h-[297mm] shadow-[0_50px_100px_rgba(0,0,0,0.25)] relative overflow-hidden print:shadow-none print:w-full print:h-full flex flex-col my-12"
            >
               {/* HEADER */}
               <div className="h-[260px] bg-[#0f172a] relative overflow-hidden shrink-0 border-none">
                  <div className="absolute top-0 right-[22%] w-[150px] h-full bg-brand-600 skew-x-[32deg] origin-top z-0" />
                  <div className="absolute bottom-[-40px] left-0 w-full h-[80px] bg-brand-600 skew-y-[-2.5deg] origin-bottom z-0" />

                  <div className="relative z-10 h-full flex justify-between items-center px-16 pb-6">
                     <div className="flex items-center gap-12">
                        <div className="relative w-36 h-36 flex items-center justify-center shrink-0 drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]">
                           <img src={logoSilver} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <div className="space-y-0">
                           <h1 className="text-6xl font-black text-white leading-none tracking-tighter uppercase">Nexov</h1>
                           <div className="flex items-center gap-4 mt-3">
                              <div className="h-[2px] w-8 bg-brand-500" />
                              <span className="text-2xl font-light text-slate-300 tracking-[0.5em] uppercase">TECH</span>
                           </div>
                        </div>
                     </div>

                     <div className="text-right">
                        <h2 className="text-[55px] font-black text-brand-600 leading-none uppercase italic tracking-tighter drop-shadow-lg">INVOICE</h2>
                        <p className="text-sm font-bold text-slate-300 mt-2 tracking-widest uppercase opacity-90">ID NO : {invoice.id}</p>
                     </div>
                  </div>
               </div>

               {/* MAIN CONTENT AREA */}
               <div className="px-16 py-10 flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="space-y-8 mb-8 shrink-0">
                     <div className="grid grid-cols-2 gap-20">
                        <div className="space-y-4">
                           <div className="bg-[#0f172a] text-white px-5 py-2 inline-flex items-center gap-3 font-black uppercase text-[10px] tracking-widest">
                              Invoice To <div className="w-2 h-2 bg-brand-600" />
                           </div>
                           <div className="pl-1 space-y-1.5 text-[11px] font-bold text-slate-600">
                              <h4 className="text-xl font-black text-[#0f172a] uppercase leading-tight">{invoice.client.name || 'UNSPECIFIED RECIPIENT'}</h4>
                              <p className="text-slate-500 uppercase tracking-widest mb-1">{invoice.client.company}</p>
                              <p className="flex items-center gap-3"><Phone size={10} className="text-brand-500" /> {invoice.client.phone}</p>
                              <p className="flex items-start gap-3"><MapPin size={10} className="text-brand-500 mt-0.5" /> <span className="w-56">{invoice.client.address}</span></p>
                           </div>
                        </div>

                        <div className="space-y-4">
                           <div className="bg-[#0f172a] text-white px-5 py-2 inline-flex items-center gap-3 font-black uppercase text-[10px] tracking-widest">
                              Invoice From <div className="w-2 h-2 bg-brand-600" />
                           </div>
                           <div className="pl-1 space-y-1.5 text-[11px] font-bold text-slate-600">
                              <h4 className="text-xl font-black text-[#0f172a] uppercase leading-tight">{invoice.from.company}</h4>
                              <p className="flex items-center gap-3"><Phone size={10} className="text-brand-500" /> {invoice.from.phone}</p>
                              <p className="flex items-center gap-3"><Mail size={10} className="text-brand-500" /> {invoice.from.email}</p>
                              <p className="flex items-center gap-3"><Globe size={10} className="text-brand-500" /> {invoice.from.web}</p>
                           </div>
                        </div>
                     </div>

                     {/* ITEMS TABLE HEADER */}
                     <div className="bg-brand-600 text-white h-12 flex items-center relative overflow-hidden px-10 border-none shrink-0">
                        <div className="absolute top-0 left-[50%] w-[3px] h-full bg-white skew-x-[45deg] z-20" />
                        <div className="absolute top-0 left-[68%] w-[3px] h-full bg-white skew-x-[45deg] z-20" />
                        <div className="absolute top-0 left-[82%] w-[3px] h-full bg-white skew-x-[45deg] z-20" />
                        <div className="grid grid-cols-[1fr_120px_80px_120px] w-full font-black uppercase tracking-[0.2em] text-[9px] relative z-10">
                           <span>Description</span>
                           <span className="text-center">Price</span>
                           <span className="text-center">Qty</span>
                           <span className="text-right">Total</span>
                        </div>
                     </div>
                  </div>

                  {/* DYNAMIC ITEMS LIST */}
                  <div className="flex-1 min-h-0 overflow-hidden divide-y divide-slate-100 border-none">
                     {invoice.items.map(item => (
                        <div key={item.id} className="grid grid-cols-[1fr_120px_80px_120px] px-10 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors border-none">
                           <span className="text-[13px] font-bold text-[#0f172a] uppercase whitespace-nowrap truncate pr-4">{item.service || 'Service Placeholder'}</span>
                           <span className="text-center pt-0.5">{formatCurrency(item.unitPrice)}</span>
                           <span className="text-center pt-0.5">{item.qty}</span>
                           <span className="text-right font-black text-[13px] text-[#0f172a] pt-0.5">{formatCurrency(item.total)}</span>
                        </div>
                     ))}
                  </div>

                  {/* FOOTER AREA */}
                  <div className="grid grid-cols-[1fr_1fr_1fr] gap-12 pt-8 pb-4 border-none relative mt-auto shrink-0">
                     <div className="absolute bottom-0 left-1/2 -translate-x-1/2 opacity-[0.03] pointer-events-none">
                        <img src={logoSilver} alt="Watermark" className="w-56 h-56 object-contain grayscale" />
                     </div>

                     <div className="space-y-5 relative z-10">
                        <div className="bg-[#0f172a] text-white px-5 py-2 inline-flex items-center gap-3 font-black uppercase text-[9px] tracking-widest border-none">
                           PAYMENT METHOD <div className="w-2 h-2 bg-brand-600" />
                        </div>
                        <div className="text-[10px] font-black text-slate-600 space-y-1.5 pl-1 uppercase tracking-tight">
                           <div className="flex items-center gap-3 text-[#0f172a]"><Building2 size={12} className="text-brand-500" /> <span>{invoice.paymentMethod.bank}</span></div>
                           <div className="flex items-center gap-3"><CreditCard size={12} className="text-brand-500" /> <span>ACC: {invoice.paymentMethod.accountNo}</span></div>
                           <div className="flex items-center gap-3"><MapPin size={12} className="text-brand-500" /> <span>BRANCH: {invoice.paymentMethod.branch}</span></div>
                        </div>
                        <div className="pt-4">
                           <h5 className="font-black text-xl text-[#0f172a] leading-none uppercase italic tracking-tighter">Thank You</h5>
                           <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-[0.2em]">FOR CHOOSING NEXOVTECH</p>
                        </div>
                     </div>

                     <div className="space-y-5 text-right col-start-3 relative z-10">
                        <div className="space-y-2 text-[10px] font-black uppercase pr-2">
                           <div className="flex justify-between items-center text-slate-400"><span>SUBTOTAL :</span><span className="text-[#0f172a] text-lg">{formatCurrency(subtotal)}</span></div>
                           <div className="flex justify-between items-center text-rose-500"><span>TAX :</span><span className="text-lg">{formatCurrency(invoice.tax)}</span></div>
                        </div>
                        <div className="bg-brand-600 h-14 flex items-center relative overflow-hidden px-8 shadow-none border-none">
                           <div className="absolute top-0 left-[60%] w-[4px] h-full bg-white/20 skew-x-[45deg]" />
                           <div className="flex justify-between w-full font-black text-white text-xl tracking-tighter relative z-10 italic uppercase"><span>TOTAL</span><span>{formatCurrency(totalAmount)}</span></div>
                        </div>
                        <div className="pt-10 text-right">
                           <div className="w-full h-[1px] bg-slate-200 mb-2" />
                           <p className="font-black text-[#0f172a] text-xl italic leading-none uppercase">NEXOVTECH</p>
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Authorized Signature</p>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="h-[50px] bg-[#0f172a] relative overflow-hidden shrink-0 border-none">
                  <div className="absolute top-[-40px] left-[35%] w-[100px] h-[100px] bg-brand-600 skew-x-[35deg] origin-bottom" />
               </div>
            </motion.div>
         </div>

         <style dangerouslySetInnerHTML={{
            __html: `
        @media print {
          @page { 
            size: A4; 
            margin: 0 !important; 
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            background: white !important;
            visibility: hidden !important;
          }

          #invoice-forge-document, #invoice-forge-document * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          #invoice-forge-document {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }

          .print\\:hidden, nav, header, aside { 
            display: none !important; 
          }
        }
      `}} />
         </div>
      </div>
   );
};

export default InvoiceGenerator;
