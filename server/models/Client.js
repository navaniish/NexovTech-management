const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  contactInfo: { type: String },
  businessType: { type: String },
  serviceType: { type: String, enum: ['Video Editing', 'Web Development', 'AI Solutions', 'Cybersecurity'] },
  status: { 
    type: String, 
    enum: ['Lead', 'Converted', 'Active', 'Completed'],
    default: 'Lead'
  },
  history: [{
    action: String,
    date: { type: Date, default: Date.now },
    notes: String
  }],
}, { timestamps: true });

module.exports = mongoose.model('Client', clientSchema);
