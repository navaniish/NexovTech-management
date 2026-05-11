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
    
    // Notify Admin of new leave request
    try {
      await fallbackDb.save('notifications', {
        id: `nt_${Date.now()}_leave_req`,
        userId: 'all', // Or specific HR/Admin IDs
        title: 'New Leave Request',
        message: `${leave.employeeName || 'An employee'} has requested ${leave.leaveType} for ${leave.totalDays} days.`,
        type: 'warning',
        link: '/hr',
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (nErr) { console.error('Notification trigger failed:', nErr); }

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
    
    // Notify Employee of status change
    try {
      await fallbackDb.save('notifications', {
        id: `nt_${Date.now()}_leave_status`,
        userId: leave.employeeId,
        title: `Leave ${status}`,
        message: `Your leave request for ${leave.leaveType} has been ${status.toLowerCase()}.`,
        type: status === 'Approved' ? 'success' : 'error',
        link: '/attendance',
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (nErr) { console.error('Notification trigger failed:', nErr); }

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

// --- ADMIN: Leave Summary (Dashboard) ---
router.get('/admin/summary', async (req, res) => {
  try {
    const leaves = await fallbackDb.find('leaves', {});
    const team = await fallbackDb.find('team', {});
    
    const stats = {
      pending: leaves.filter(l => l.status === 'Pending').length,
      approved: leaves.filter(l => l.status === 'Approved').length,
      rejected: leaves.filter(l => l.status === 'Rejected').length,
      teamAvailability: '94%' // Simulated based on logic
    };

    const mapped = leaves.map(l => {
      const specialist = team.find(s => s.id === l.employeeId) || {};
      return {
        _id: l._id || l.id,
        name: l.employeeName || specialist.name || 'Unknown',
        role: specialist.role || 'Specialist',
        startDate: l.startDate,
        days: l.totalDays || 1,
        type: l.leaveType,
        status: l.status,
        avatar: specialist.avatar
      };
    });

    res.json({ requests: mapped, stats });
  } catch (err) {
    res.status(500).json({ message: 'Failed to aggregate leave intelligence' });
  }
});

// --- ADMIN: Quick Action (Approve/Reject) ---
router.post('/admin/action', async (req, res) => {
  const { requestId, action } = req.body; // action: 'Approved' or 'Rejected'
  try {
    const all = await fallbackDb.find('leaves', {});
    const leave = all.find(l => (l._id || l.id) === requestId);
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });

    const updated = { ...leave, status: action, approvedBy: 'Admin Orchestrator' };
    await fallbackDb.save('leaves', updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Decision protocol failed' });
  }
});

module.exports = router;
