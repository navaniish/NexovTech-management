const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  employeeId: { type: String, required: true },
  attendanceSummary: {
    presentDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 }
  },
  calculatedSalary: {
    base: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  paymentStatus: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
  paymentDate: { type: Date },
  transactionRef: { type: String },
  payslipUrl: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Payroll', payrollSchema);
