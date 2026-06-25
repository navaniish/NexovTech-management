const express = require('express');
const router = express.Router();
const fallbackDb = require('../utils/fallbackDb');

// Office config
const OFFICE_START = 9; // 9 AM
const FULL_DAY_HOURS = 8;
const HALF_DAY_HOURS = 4;
const LATE_THRESHOLD_MINUTES = 15;

const getStatus = (checkInTime, totalHours) => {
  if (!checkInTime) return 'Absent';
  const checkInHour = new Date(checkInTime).getHours();
  const checkInMin = new Date(checkInTime).getMinutes();
  const isLate = checkInHour > OFFICE_START || (checkInHour === OFFICE_START && checkInMin > LATE_THRESHOLD_MINUTES);
  if (totalHours >= FULL_DAY_HOURS) return isLate ? 'Late' : 'Present';
  if (totalHours >= HALF_DAY_HOURS) return 'Half Day';
  return 'Absent';
};

// --- EMPLOYEE: Check In ---
router.post('/checkin', async (req, res) => {
  const { employeeId, remarks } = req.body;
  const today = new Date().toISOString().split('T')[0];

  try {
    // Check if already checked in today
    const existing = await fallbackDb.find('attendance', {});
    const todayRecord = existing.find(a => a.employeeId === employeeId && a.date === today);
    if (todayRecord) {
      return res.status(400).json({ message: 'Already checked in today' });
    }

    const record = {
      id: `att_${Date.now()}`,
      employeeId,
      date: today,
      checkIn: new Date().toISOString(),
      checkOut: null,
      totalHours: 0,
      attendanceStatus: 'Present',
      remarks: remarks || '',
      createdAt: new Date().toISOString()
    };
    const saved = await fallbackDb.save('attendance', record);
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Check-in failed' });
  }
});

// --- EMPLOYEE: Check Out ---
router.post('/checkout', async (req, res) => {
  const { employeeId } = req.body;
  const today = new Date().toISOString().split('T')[0];

  try {
    const all = await fallbackDb.find('attendance', {});
    const record = all.find(a => a.employeeId === employeeId && a.date === today);
    if (!record) return res.status(404).json({ message: 'No check-in found for today' });
    if (record.checkOut) return res.status(400).json({ message: 'Already checked out today' });

    const checkOut = new Date();
    const checkIn = new Date(record.checkIn);
    const totalHours = Math.round(((checkOut - checkIn) / (1000 * 60 * 60)) * 100) / 100;
    const status = getStatus(record.checkIn, totalHours);

    const updated = { ...record, checkOut: checkOut.toISOString(), totalHours, attendanceStatus: status };
    await fallbackDb.save('attendance', updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Check-out failed' });
  }
});

// --- EMPLOYEE: My Attendance ---
router.get('/my', async (req, res) => {
  const { employeeId } = req.query;
  try {
    const all = await fallbackDb.find('attendance', {});
    const mine = all.filter(a => a.employeeId === employeeId);
    res.json(mine.sort((a, b) => new Date(b.date) - new Date(a.date)));
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch attendance' });
  }
});

// --- ADMIN: All Attendance ---
router.get('/all', async (req, res) => {
  try {
    const all = await fallbackDb.find('attendance', {});
    res.json(all.sort((a, b) => new Date(b.date) - new Date(a.date)));
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch attendance records' });
  }
});

// --- ADMIN: Edit Attendance ---
router.put('/:id', async (req, res) => {
  try {
    const existing = await fallbackDb.findById('attendance', req.params.id);
    if (!existing) {
      const all = await fallbackDb.find('attendance', {});
      const found = all.find(a => a.id === req.params.id);
      if (!found) return res.status(404).json({ message: 'Record not found' });
      const updated = { ...found, ...req.body };
      await fallbackDb.save('attendance', updated);
      return res.json(updated);
    }
    const updated = { ...existing, ...req.body };
    await fallbackDb.save('attendance', updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update attendance' });
  }
});

// --- ADMIN: Delete Attendance ---
router.delete('/:id', async (req, res) => {
  try {
    await fallbackDb.deleteOne('attendance', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete record' });
  }
});

// --- ADMIN: Attendance Summary (Dashboard) ---
router.get('/admin/summary', async (req, res) => {
  try {
    const records = await fallbackDb.find('attendance', {});
    const allEmployees = await fallbackDb.find('employees', {});
    const employees = allEmployees.filter(emp => emp.role !== 'Admin' && emp.role !== 'Super Admin' && emp.role !== 'Manager');
    
    // Logic for daily stats
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = records.filter(r => {
      if (r.date !== today) return false;
      const specialist = employees.find(s => s.id === r.employeeId || s.companyEmail === r.employeeId || s.email === r.employeeId);
      return specialist !== undefined;
    });
    
    const stats = {
      present: todayRecords.length,
      late: todayRecords.filter(r => r.attendanceStatus === 'Late').length,
      onLeave: employees.length - todayRecords.length,
      avgTime: '09:15 AM'
    };

    // Mapping specialists for the grid
    const mapped = todayRecords.map(r => {
      const specialist = employees.find(s => s.id === r.employeeId || s.companyEmail === r.employeeId || s.email === r.employeeId) || {};
      
      let efficiency = 100;
      if (r.checkIn) {
        const checkInTime = new Date(r.checkIn);
        const officeTime = new Date(r.checkIn);
        officeTime.setHours(OFFICE_START, 0, 0, 0);
        if (checkInTime > officeTime) {
          const diffMin = Math.floor((checkInTime - officeTime) / (1000 * 60));
          efficiency = Math.max(50, 100 - Math.floor(diffMin * 0.5));
        }
      }

      return {
        name: specialist.name || 'Unknown',
        role: specialist.role || 'Specialist',
        avatar: specialist.avatar,
        checkIn: r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
        status: r.attendanceStatus || 'Present',
        efficiency,
        location: r.location || 'Office'
      };
    });

    res.json({ records: mapped, stats });
  } catch (err) {
    res.status(500).json({ message: 'Failed to aggregate attendance intelligence' });
  }
});

// --- ADMIN: Trigger Daily Telegram Attendance Alert ---
router.post('/trigger-telegram-alert', async (req, res) => {
  try {
    const { sendDailyAttendanceAlert } = require('../services/schedulerService');
    const result = await sendDailyAttendanceAlert();
    res.json({ success: true, message: 'Daily Telegram attendance alert triggered successfully', result });
  } catch (err) {
    res.status(500).json({ message: 'Failed to trigger Telegram attendance alert', error: err.message });
  }
});

// --- ADMIN: Cron Trigger Daily Attendance Alert (Vercel Cron) ---
router.get('/cron-trigger', async (req, res) => {
  try {
    const isVercelCron = req.headers['x-vercel-cron'] === '1';
    // Allow request if we are in development environment or if it is a genuine Vercel Cron trigger
    if (process.env.NODE_ENV === 'production' && !isVercelCron) {
      return res.status(401).json({ message: 'Unauthorized: Only Vercel Cron can call this gateway' });
    }

    const { sendDailyAttendanceAlert } = require('../services/schedulerService');
    const result = await sendDailyAttendanceAlert();
    res.json({ success: true, message: 'Cron daily attendance alert triggered successfully', result });
  } catch (err) {
    res.status(500).json({ message: 'Failed to trigger cron daily attendance alert', error: err.message });
  }
});

module.exports = router;
