const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  description: { type: String },
  amount: { type: Number, required: true },
  type: { 
    type: String, 
    enum: ['Advance', 'Milestone', 'Final', 'Expense', 'Revenue'],
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Completed', 'Failed', 'Paid'],
    default: 'Pending'
  },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: Date, default: Date.now },
  invoiceId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
