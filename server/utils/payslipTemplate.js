const toWords = require('./numberToWords');

const payslipTemplate = (data) => {
  const { 
    employeeName, 
    employeeId, 
    month, 
    year, 
    calculatedSalary = {}, 
    paymentDate,
    metadata = {} 
  } = data;

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = months[Number(month) - 1] || 'May';
  const totalDaysInMonth = new Date(year, Number(month), 0).getDate();

  const baseSalary = calculatedSalary.base || data.salary || data.netSalary || 0;
  const bonus = calculatedSalary.bonus || data.bonus || 0;
  const totalAmount = calculatedSalary.total || baseSalary + bonus;

  const fmt = (val) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val || 0);

  const displayDate = paymentDate ? new Date(paymentDate).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  }) : new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  const bd = calculatedSalary.breakdown || {};
  const items = [
    { label: 'Web Development', val: bd.web || 0 },
    { label: 'AI Solutions', val: bd.ai || 0 },
    { label: 'Video Editing', val: bd.video || 0 },
    { label: 'Management Systems', val: bd.systems || 0 },
  ];
  const accountedTotal = items.reduce((acc, curr) => acc + curr.val, 0);
  const otherServices = baseSalary - accountedTotal;
  if (otherServices > 0) items.push({ label: 'Specialist Services', val: otherServices });
  if (bonus > 0) items.push({ label: 'Performance Bonus', val: bonus });

  const finalItems = items.filter(i => i.val > 0);

  const logoSrc = data.logoBase64 || "https://nexovtech-portfolio.netlify.app/logo.jpg";

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Playfair+Display:ital,wght@1,900&display=swap');
        
        :root {
          --brand-gold: #d97706;
          --slate-900: #0f172a;
          --slate-600: #475569;
          --slate-100: #f1f5f9;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { 
          height: 100%;
          overflow: hidden;
          background: white; 
          color: black;
          -webkit-print-color-adjust: exact;
        }

        .container {
          width: 210mm;
          height: 297mm;
          padding: 40px 50px;
          position: relative;
          background: white;
          overflow: hidden;
        }

        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
        .logo-section { display: flex; align-items: center; gap: 16px; }
        .logo-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 2px solid #f1f5f9;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logo-circle img { width: 100%; height: 100%; object-fit: contain; transform: scale(1.1); }
        
        .brand-text h1 { font-size: 32px; font-weight: 900; letter-spacing: -1.5px; text-transform: uppercase; margin: 0; line-height: 1; }
        .brand-text p { font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 4px; color: var(--slate-600); margin-top: 4px; }

        .contact-info { text-align: right; font-size: 10px; font-weight: 700; color: #000; line-height: 1.6; }

        .title-section { text-align: center; margin-bottom: 30px; }
        .title-section h2 { font-family: 'Playfair Display', serif; font-style: italic; font-size: 52px; font-weight: 900; letter-spacing: -2px; margin-bottom: 5px; }
        .title-section .month { font-size: 18px; font-weight: 700; color: var(--slate-600); }
        .title-section .month span { color: var(--brand-gold); font-weight: 900; }

        .greeting { margin-bottom: 30px; }
        .greeting p { font-size: 14px; font-weight: 900; margin-bottom: 5px; }
        .greeting .sub { font-size: 13px; font-weight: 700; color: var(--slate-600); line-height: 1.5; }

        .section-tag {
          background: var(--slate-900);
          color: white;
          padding: 10px 20px;
          border-radius: 12px 12px 0 0;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 2px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .grid-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 40px;
          padding: 25px;
          background: white;
          border: 1px solid var(--slate-100);
          border-top: none;
          margin-bottom: 30px;
        }
        .grid-item { display: flex; align-items: center; font-size: 10px; }
        .grid-label { font-weight: 900; color: rgba(0,0,0,0.4); width: 100px; text-transform: uppercase; }
        .grid-val { font-weight: 900; }

        .ledger {
          border: 1px solid var(--slate-100);
          border-radius: 0 0 24px 24px;
          margin-bottom: 30px;
          overflow: hidden;
        }
        .ledger-items { padding: 25px; background: white; }
        .ledger-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid var(--slate-100);
          font-size: 12px;
          font-weight: 900;
        }
        .ledger-row:last-child { border-bottom: none; }
        .ledger-total {
          background: #f8fafc;
          padding: 25px;
          border-top: 1px solid var(--slate-100);
        }
        .total-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .total-label { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.6; }
        .total-val { font-size: 14px; font-weight: 900; }

        .net-pay-card {
          background: #fffbeb;
          border: 1px solid #fef3c7;
          border-radius: 32px;
          padding: 30px 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
        }
        .net-pay-left h3 { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; }
        .net-pay-left p { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; opacity: 0.4; }
        .net-pay-right { text-align: right; }
        .net-pay-val { font-size: 48px; font-weight: 900; letter-spacing: -2px; }

        .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 50px; }
        .footer-left h4 { font-family: 'Playfair Display', serif; font-style: italic; font-size: 28px; font-weight: 900; margin-bottom: 8px; }
        .footer-left p { font-size: 11px; font-weight: 700; color: var(--slate-600); max-width: 350px; }
        
        .seal { text-align: right; }
        .seal-circle {
          width: 100px;
          height: 100px;
          border: 1px dashed #e2e8f0;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-left: auto;
          opacity: 0.5;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-section">
            <div class="logo-circle">
              <img src="${logoSrc}" alt="Logo">
            </div>
            <div class="brand-text">
              <h1>NEXOV<span style="color: var(--brand-gold)">TECH</span></h1>
              <p>Innovate. Create. Elevate.</p>
            </div>
          </div>
          <div class="contact-info">
            <p>nexovtech@myyahoo.com</p>
            <p>https://nexovtech-portfolio.netlify.app</p>
            <p>India and Global Wide</p>
          </div>
        </div>

        <div class="title-section">
          <h2>Payment Statement</h2>
          <p class="month">For the Month of <span>${monthName} ${year}</span></p>
        </div>

        <div class="greeting">
          <p>Dear Team Member,</p>
          <p class="sub">We truly appreciate your dedication and the positive energy you bring to the team every day. Thank you for being an important part of <span style="color: var(--brand-gold); font-weight: 900;">NexovTech!</span></p>
        </div>

        <div class="section-tag">
          <div style="width: 4px; height: 10px; background: var(--brand-gold)"></div>
          Member Detection
        </div>
        <div class="grid-container">
          <div class="grid-item"><span class="grid-label">Member Name</span><span class="grid-val">: ${employeeName}</span></div>
          <div class="grid-item"><span class="grid-label">Payment Date</span><span class="grid-val">: ${displayDate}</span></div>
          <div class="grid-item"><span class="grid-label">Member ID</span><span class="grid-val">: ${employeeId || 'NX-' + Date.now().toString().slice(-4)}</span></div>
          <div class="grid-item"><span class="grid-label">Pay Period</span><span class="grid-val">: 01 ${monthName} ${year} - ${totalDaysInMonth} ${monthName} ${year}</span></div>
          <div class="grid-item"><span class="grid-label">Member Service</span><span class="grid-val">: ${metadata.service || 'Specialist Services'}</span></div>
          <div class="grid-item"><span class="grid-label">Project Name</span><span class="grid-val">: ${metadata.projectName || 'Internal Operations'}</span></div>
          <div class="grid-item"><span class="grid-label">Department</span><span class="grid-val">: ${metadata.department || 'Development'}</span></div>
          <div class="grid-item"><span class="grid-label">Payment Mode</span><span class="grid-val">: Bank Transfer</span></div>
          <div class="grid-item"><span class="grid-label">Designation</span><span class="grid-val">: ${metadata.designation || 'Specialist'}</span></div>
          <div class="grid-item"><span class="grid-label">Bank Name</span><span class="grid-val">: HDFC Bank</span></div>
        </div>

        <div class="section-tag">
          <div style="width: 4px; height: 10px; background: var(--brand-gold)"></div>
          Service Compensation Summary
        </div>
        <div class="ledger">
          <div class="ledger-items">
            ${finalItems.map(item => `
              <div class="ledger-row">
                <span style="opacity: 0.6">${item.label}</span>
                <span>${fmt(item.val)}</span>
              </div>
            `).join('')}
          </div>
          <div class="ledger-total">
            <div class="total-row">
              <span class="total-label">Base Settlement</span>
              <span class="total-val">${fmt(baseSalary)}</span>
            </div>
            ${bonus > 0 ? `
              <div class="total-row">
                <span class="total-label">Performance Bonus</span>
                <span class="total-val" style="color: #059669">+ ${fmt(bonus)}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="net-pay-card">
          <div class="net-pay-left">
            <h3>Net Pay</h3>
            <p>(${toWords(totalAmount)})</p>
          </div>
          <div class="net-pay-right">
            <div class="net-pay-val">${fmt(totalAmount)}</div>
            <p style="font-size: 9px; font-weight: 900; color: var(--brand-gold); text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">Final Settlement Amount</p>
          </div>
        </div>

        <div class="footer">
          <div class="footer-left">
            <h4>Thank You!</h4>
            <p>Your hard work and commitment help us build a stronger future together. Keep growing, keep inspiring!</p>
          </div>
          <div class="seal">
            <p style="font-size: 10px; font-weight: 900; color: var(--brand-gold); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;">NexovTech Official</p>
            <div class="seal-circle">
              <span style="font-size: 8px; font-weight: 900;">NEXOVTECH</span>
              <span style="font-size: 24px; font-weight: 900;">N</span>
              <span style="font-size: 8px; font-weight: 900;">HYDERABAD</span>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = payslipTemplate;
