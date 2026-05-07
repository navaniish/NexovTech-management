const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const fallbackDb = require('../utils/fallbackDb');

// Create Invoice (Transaction)
router.post('/invoices', async (req, res) => {
  const { clientName, amount, description, date } = req.body;
  const transactionData = {
    type: 'Revenue',
    amount,
    description: `${clientName} - ${description}`,
    date: date || new Date(),
    status: 'Pending',
    createdAt: new Date()
  };

  const saved = await fallbackDb.save('transactions', { ...transactionData, id: `inv_${Date.now()}` });
  res.json(saved);
});

// Generate PDF Invoice
router.get('/invoices/:id/pdf', async (req, res) => {
  try {
    const transaction = await fallbackDb.findOne('transactions', { id: req.params.id });
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice-${transaction.id}.pdf`);
    doc.pipe(res);
    doc.fillColor('#444444').fontSize(20).text('NEXOVTECH MANAGEMENT', 50, 50);
    doc.fontSize(10).text('123 Innovation Drive, Bangalore, India', 50, 80);
    doc.moveDown();
    doc.fillColor('#000000').fontSize(25).text('INVOICE', 50, 160, { align: 'right' });
    doc.fontSize(12).text('BILL TO:', 50, 260);
    doc.fontSize(14).font('Helvetica-Bold').text(transaction.description.split(' - ')[0], 50, 280);
    doc.rect(50, 350, 500, 20).fill('#7c3aed');
    doc.fillColor('#ffffff').fontSize(10).text('DESCRIPTION', 60, 356);
    doc.text('AMOUNT (INR)', 450, 356, { align: 'right' });
    doc.fillColor('#000000').fontSize(12).text(transaction.description.split(' - ')[1] || 'Services Rendered', 60, 380);
    doc.text(`₹ ${transaction.amount.toLocaleString('en-IN')}`, 450, 380, { align: 'right' });
    doc.end();
  } catch (err) {
    res.status(500).json({ message: 'PDF generation failed' });
  }
});

// Get All Transactions
router.get('/transactions', async (req, res) => {
  try {
    const transactions = await fallbackDb.find('transactions', {});
    res.json(transactions || []);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});

// Get Employee Earnings
router.get('/earnings/:userId', async (req, res) => {
  const transactions = await fallbackDb.find('transactions', { employeeId: req.params.userId });
  const totalEarned = transactions.filter(t => t.status === 'Completed').reduce((acc, t) => acc + (t.amount || 0), 0);
  const pendingPayout = transactions.filter(t => t.status === 'Pending').reduce((acc, t) => acc + (t.amount || 0), 0);
  
  res.json({
    totalEarned,
    pendingPayout,
    history: transactions
  });
});

module.exports = router;
