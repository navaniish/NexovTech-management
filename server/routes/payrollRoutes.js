const express = require('express');
const router = express.Router();
const fallbackDb = require('../utils/fallbackDb');
const PDFDocument = require('pdfkit');

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
    const users = await fallbackDb.find('users', { role: { $ne: 'Admin' } });
    const salaries = await fallbackDb.find('salaries', {});
    const timesheets = await fallbackDb.find('timesheets', {});

    const results = [];
    for (const user of users) {
      const salaryConfig = salaries.find(s => s.employeeId === (user.id || user._id));
      if (!salaryConfig) continue;

      const employeeLogs = timesheets.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() + 1 === Number(month) && d.getFullYear() === Number(year) && (t.userId === user.id || t.userId === user._id);
      });

      const presentDays = employeeLogs.length;
      const calculatedSalary = {
        base: salaryConfig.baseSalary,
        bonus: salaryConfig.bonus,
        deductions: salaryConfig.deductions,
        total: salaryConfig.baseSalary + salaryConfig.bonus - salaryConfig.deductions
      };

      const payrollRecord = {
        month: Number(month),
        year: Number(year),
        employeeId: user.id || user._id,
        employeeName: user.name,
        attendanceSummary: {
          presentDays,
          absentDays: 22 - presentDays,
          overtimeHours: 0
        },
        calculatedSalary,
        paymentStatus: 'Pending',
        createdAt: new Date()
      };

      const saved = await fallbackDb.save('payrolls', payrollRecord);
      results.push(saved);
    }
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
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update payment status' });
  }
});

// Payslip PDF Generation
router.get('/:id/pdf', async (req, res) => {
  try {
    const payroll = await fallbackDb.findById('payrolls', req.params.id);
    if (!payroll) return res.status(404).json({ message: 'Payroll record not found' });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Payslip-${payroll.employeeName}-${payroll.month}-${payroll.year}.pdf`);
    doc.pipe(res);

    // Header
    doc.fillColor('#7c3aed').fontSize(24).text('NEXOVTECH SOLUTIONS', 50, 50);
    doc.fillColor('#444444').fontSize(10).text('Employee Compensation Ledger', 50, 80);
    doc.moveDown(2);

    // Employee Details
    doc.fillColor('#000000').fontSize(14).font('Helvetica-Bold').text('PAYSLIP SUMMARY', 50, 150);
    doc.fontSize(10).font('Helvetica').text(`Employee: ${payroll.employeeName}`, 50, 170);
    doc.text(`Period: ${payroll.month}/${payroll.year}`, 50, 185);
    doc.text(`Status: ${payroll.paymentStatus}`, 50, 200);

    // Tables
    doc.rect(50, 240, 500, 20).fill('#f1f5f9');
    doc.fillColor('#000000').text('EARNINGS', 60, 246);
    doc.text('AMOUNT (INR)', 450, 246, { align: 'right' });

    doc.text('Basic Salary', 60, 270);
    doc.text(`₹ ${payroll.calculatedSalary.base.toLocaleString()}`, 450, 270, { align: 'right' });
    doc.text('Bonus', 60, 285);
    doc.text(`₹ ${payroll.calculatedSalary.bonus.toLocaleString()}`, 450, 285, { align: 'right' });
    
    doc.rect(50, 310, 500, 20).fill('#f1f5f9');
    doc.fillColor('#000000').text('DEDUCTIONS', 60, 316);
    doc.text('AMOUNT (INR)', 450, 316, { align: 'right' });

    doc.text('Statutory Deductions', 60, 340);
    doc.text(`- ₹ ${payroll.calculatedSalary.deductions.toLocaleString()}`, 450, 340, { align: 'right' });

    doc.moveDown(4);
    doc.rect(50, 400, 500, 40).fill('#7c3aed');
    doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold').text('NET SETTLEMENT', 60, 412);
    doc.text(`₹ ${payroll.calculatedSalary.total.toLocaleString()}`, 450, 412, { align: 'right' });

    doc.end();
  } catch (err) {
    res.status(500).json({ message: 'Payslip generation failed' });
  }
});

module.exports = router;
