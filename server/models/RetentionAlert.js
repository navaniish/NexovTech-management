const mongoose = require('mongoose');

const RetentionAlertSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
  inactiveDays: { type: Number, required: true },
  engagementLevel: { type: String, enum: ['High', 'Medium', 'Critical'], required: true },
  aiSuggestion: { type: String, required: true }, // "Client has been inactive for 60 days. Recommended Action: Send follow-up proposal."
  isResolved: { type: Boolean, default: false },
  resolvedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('RetentionAlert', RetentionAlertSchema);
