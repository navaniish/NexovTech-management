const mongoose = require('mongoose');

const timesheetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  hoursWorked: { type: Number, required: true, min: 0, max: 24 },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  description: { type: String },
  status: {
    type: String,
    enum: ['Draft', 'Submitted', 'Approved', 'Rejected'],
    default: 'Draft'
  }
}, { timestamps: true });

timesheetSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Timesheet', timesheetSchema);
