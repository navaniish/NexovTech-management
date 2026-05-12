const mongoose = require('mongoose');

const trustedDeviceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deviceId: { type: String, required: true }, // Fingerprint or unique ID
  deviceName: String,
  browser: String,
  os: String,
  lastIp: String,
  lastLocation: String,
  isTrusted: { type: Boolean, default: true },
  lastUsedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('TrustedDevice', trustedDeviceSchema);
