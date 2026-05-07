const express = require('express');
const router = express.Router();
const fallbackDb = require('../utils/fallbackDb');

// --- EMPLOYEE: Apply Leave ---
router.post('/apply', async (req, res) => {
  const { employeeId, employeeName, leaveType, startDate, endDate, reason } = req.body;
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const leave = {
      id: `lv_${Date.now()}`,
      employeeId,
      employeeName: employeeName || '',
      leaveType,
      startDate,
      endDate,
      totalDays: days,
      reason,
      status: 'Pending',
      approvedBy: null,
      createdAt: new Date().toISOString()
    };
    const saved = await fallbackDb.save('leaves', leave);
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Leave application failed' });
  }
});

// --- EMPLOYEE: My Leaves ---
router.get('/my', async (req, res) => {
  const { employeeId } = req.query;
  try {
    const all = await fallbackDb.find('leaves', {});
    const mine = all.filter(l => l.employeeId === employeeId);
    res.json(mine.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch leave records' });
  }
});

// --- ADMIN: All Leaves ---
router.get('/all', async (req, res) => {
  try {
    const all = await fallbackDb.find('leaves', {});
    res.json(all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch leave records' });
  }
});

// --- ADMIN: Approve/Reject Leave ---
router.put('/:id/approve', async (req, res) => {
  const { status, approvedBy } = req.body; // status: 'Approved' or 'Rejected'
  try {
    const all = await fallbackDb.find('leaves', {});
    const leave = all.find(l => l.id === req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave not found' });

    const updated = { ...leave, status, approvedBy: approvedBy || 'Admin' };
    await fallbackDb.save('leaves', updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Leave update failed' });
  }
});

// --- ADMIN: Leave Balance Summary ---
router.get('/balance/:employeeId', async (req, res) => {
  try {
    const all = await fallbackDb.find('leaves', {});
    const mine = all.filter(l => l.employeeId === req.params.employeeId && l.status === 'Approved');

    const year = new Date().getFullYear();
    const thisYear = mine.filter(l => new Date(l.startDate).getFullYear() === year);

    const used = {
      'Sick Leave': 0,
      'Casual Leave': 0,
      'Paid Leave': 0,
      'Work From Home': 0
    };

    thisYear.forEach(l => {
      if (used[l.leaveType] !== undefined) {
        used[l.leaveType] += l.totalDays || 1;
      }
    });

    // Default quotas
    const quotas = { 'Sick Leave': 12, 'Casual Leave': 12, 'Paid Leave': 15, 'Work From Home': 24 };

    const balance = Object.keys(quotas).map(type => ({
      type,
      total: quotas[type],
      used: used[type] || 0,
      remaining: quotas[type] - (used[type] || 0)
    }));

    res.json(balance);
  } catch (err) {
    res.status(500).json({ message: 'Failed to compute leave balance' });
  }
});

module.exports = router;
