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

module.exports = router;
