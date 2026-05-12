const mongoose = require('mongoose');

const securityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // e.g., 'login', 'failed_login', '2fa_enabled', 'device_added'
  status: { type: String, enum: ['Success', 'Failure', 'Warning'], default: 'Success' },
  ipAddress: String,
  device: String,
  browser: String,
  os: String,
  location: {
    city: String,
    country: String,
    ll: [Number] // Latitude, Longitude
  },
  details: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('SecurityLog', securityLogSchema);
