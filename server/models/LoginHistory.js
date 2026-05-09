const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ipAddress: { type: String },
  device: { type: String },
  browser: { type: String },
  os: { type: String },
  location: { type: String },
  loginStatus: { type: String, enum: ['Success', 'Failed'], required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LoginHistory', loginHistorySchema);
