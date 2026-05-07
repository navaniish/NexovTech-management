const mongoose = require('mongoose');

const employeeCardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employeeId: { type: String, required: true, unique: true },
  qrToken: { type: String, required: true, unique: true },
  issueDate: { type: Date, default: Date.now },
  expiryDate: { type: Date },
  status: { type: String, enum: ['Active', 'Inactive', 'Revoked'], default: 'Active' },
  designVersion: { type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model('EmployeeCard', employeeCardSchema);
