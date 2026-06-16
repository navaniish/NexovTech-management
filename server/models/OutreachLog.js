const mongoose = require('mongoose');

const OutreachLogSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  channel: { type: String, enum: ['LinkedIn', 'Email', 'WhatsApp'], required: true },
  messageType: { type: String, enum: ['Connection_Request', 'Cold_Outreach', 'Follow_Up'], required: true },
  contentSent: { type: String, required: true },
  sentAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['Pending', 'Sent', 'Failed', 'Delivered', 'Read'], default: 'Sent' }
}, { timestamps: true });

module.exports = mongoose.model('OutreachLog', OutreachLogSchema);
