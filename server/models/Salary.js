const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  salaryType: { type: String, enum: ['Monthly', 'Hourly', 'Per Project'], default: 'Monthly' },
  baseSalary: { type: Number, default: 0 },
  hourlyRate: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  paymentMethod: { type: String, default: 'Bank Transfer' },
  accountDetails: { type: String },
  currency: { type: String, default: 'INR' }
}, { timestamps: true });

module.exports = mongoose.model('Salary', salarySchema);
