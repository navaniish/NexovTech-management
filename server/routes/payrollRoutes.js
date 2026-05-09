const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const fallbackDb = require('../utils/fallbackDb');
const payslipTemplate = require('../utils/payslipTemplate');

// --- SALARY CONFIGURATION (Admin) ---

// Get Salary Config for an employee
router.get('/salary/:employeeId', async (req, res) => {
  try {
    const salaries = await fallbackDb.find('salaries', { employeeId: req.params.employeeId });
    res.json(salaries[0] || null);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch salary configuration' });
  }
});

// Update/Create Salary Config
router.post('/salary', async (req, res) => {
  try {
    const { employeeId } = req.body;
    const existing = await fallbackDb.find('salaries', { employeeId });
    
    let result;
    if (existing.length > 0) {
      result = await fallbackDb.save('salaries', { ...existing[0], ...req.body });
    } else {
      result = await fallbackDb.save('salaries', req.body);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to save salary configuration' });
  }
});

// --- PAYROLL PROCESSING ---

// Get all payroll records (Admin)
router.get('/', async (req, res) => {
  try {
    const records = await fallbackDb.find('payrolls', {});
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch payroll records' });
  }
});

// Get payroll for specific employee
router.get('/employee/:employeeId', async (req, res) => {
  try {
    const records = await fallbackDb.find('payrolls', { employeeId: req.params.employeeId });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch employee payroll' });
  }
});

// Generate Payroll for all employees for a month
router.post('/generate', async (req, res) => {
  const { month, year } = req.body;
  try {
    const team = await fallbackDb.find('team', {});
    const salaries = await fallbackDb.find('salaries', {});
    const timesheets = await fallbackDb.find('timesheets', {});
    const existingPayrolls = await fallbackDb.find('payrolls', {}); 

    const results = [];
    console.log(`[PAYROLL] Starting generation for ${month}/${year}. Found ${team.length} specialists.`);

    for (const member of team) {
      const employeeId = member.id || member._id;

      // Primary check: salaries collection, Fallback: team.salary field
      let salaryConfig = salaries.find(s => s.employeeId === employeeId);
      
      if (!salaryConfig) {
        console.log(`[PAYROLL] No salary config for ${member.name}, using dossier baseline.`);
        salaryConfig = {
          baseSalary: member.salary || 0,
          bonus: 0,
          deductions: 0,
          breakdown: { web: 25, ai: 25, video: 25, systems: 25 }, // Default allocation
          metadata: { service: member.department, projectName: 'General Operations' }
        };
      }

      const employeeLogs = timesheets.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() + 1 === Number(month) && d.getFullYear() === Number(year) && (t.userId === employeeId);
      });

      const presentDays = employeeLogs.length || 22; // Default to full month if no logs for demo
      const totalAmount = (salaryConfig.baseSalary || 0) + (salaryConfig.bonus || 0) - (salaryConfig.deductions || 0);
      
      const calculatedSalary = {
        base: salaryConfig.baseSalary,
        bonus: salaryConfig.bonus,
        deductions: salaryConfig.deductions,
        total: totalAmount,
        breakdown: salaryConfig.breakdown || { web: 0, ai: 0, video: 0, systems: 0 }
      };

      const payrollRecord = {
        month: Number(month),
        year: Number(year),
        employeeId: employeeId,
        employeeName: member.name,
        attendanceSummary: {
          presentDays,
          absentDays: 22 - presentDays,
          overtimeHours: 0
        },
        metadata: salaryConfig.metadata || { service: '', projectName: '' },
        calculatedSalary,
        paymentStatus: 'Pending',
        createdAt: new Date()
      };

      const existing = existingPayrolls.find(p => p.employeeId === employeeId && p.month === Number(month) && p.year === Number(year));
      
      if (existing) {
        const updated = await fallbackDb.save('payrolls', { ...existing, ...payrollRecord, createdAt: existing.createdAt, id: existing.id || existing._id });
        results.push(updated);
      } else {
        const saved = await fallbackDb.save('payrolls', payrollRecord);
        results.push(saved);
      }
    }
    console.log(`[PAYROLL] Generation complete. Processed ${results.length} records.`);
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate payroll' });
  }
});

// Mark as Paid
router.put('/:id', async (req, res) => {
  try {
    const existing = await fallbackDb.findById('payrolls', req.params.id);
    if (!existing) return res.status(404).json({ message: 'Record not found' });
    const updated = await fallbackDb.save('payrolls', { ...existing, ...req.body });

    // Integrate with Finance Architecture: Generate Expense Ledger Entry
    if (req.body.paymentStatus === 'Paid' && existing.paymentStatus !== 'Paid') {
      await fallbackDb.save('transactions', {
        id: `txn_pr_${Date.now()}`,
        type: 'Expense',
        amount: existing.calculatedSalary.total,
        description: `Payroll Settlement - ${existing.employeeName} (${existing.month}/${existing.year})`,
        date: new Date(),
        status: 'Paid',
        createdAt: new Date()
      });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update payment status' });
  }
});

// Payslip PDF Generation (Enterprise-Grade Puppeteer Architecture)
router.get('/:id/pdf', async (req, res) => {
  try {
    console.log(`📄 PDF_GEN: Initiating statement forgery for ID: ${req.params.id}`);
    const payroll = await fallbackDb.findById('payrolls', req.params.id);
    
    if (!payroll) {
      console.error(`❌ PDF_GEN_FAILURE: Record ${req.params.id} not found in the mission vault.`);
      return res.status(404).json({ message: 'Payroll record not found' });
    }
    
    console.log(`✅ PDF_GEN: Record found for ${payroll.employeeName}. Launching Puppeteer engine...`);

    // Prepare Logo Base64
    let logoBase64 = '';
    try {
      const logoPath = path.join(__dirname, '../../client/public/logo.jpg');
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;
      }
    } catch (e) {
      console.warn('Logo encoding failed:', e);
    }

    // Generate HTML Content
    const htmlContent = payslipTemplate({ ...payroll, logoBase64 });

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });

    await browser.close();

    // Secure Storage Persistence
    const fileName = `Payslip-${payroll.employeeName.replace(/\s+/g, '_')}-${payroll.month}-${payroll.year}-${Date.now()}.pdf`;
    const storagePath = path.join(__dirname, '../storage/payslips', fileName);
    fs.writeFileSync(storagePath, pdfBuffer);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error('Puppeteer PDF Generation Failed:', err);
    res.status(500).json({ message: 'Failed to generate enterprise-grade PDF statement' });
  }
});

// Delete Payroll Record
router.delete('/:id', async (req, res) => {
  try {
    const existing = await fallbackDb.findById('payrolls', req.params.id);
    if (!existing) return res.status(404).json({ message: 'Record not found' });
    await fallbackDb.deleteOne('payrolls', existing.id || existing._id);
    res.json({ message: 'Payroll record deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete payroll record' });
  }
});

module.exports = router;
