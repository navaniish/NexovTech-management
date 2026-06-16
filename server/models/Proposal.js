const mongoose = require('mongoose');

const ProposalSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  serviceType: { 
    type: String, 
    enum: ['AI Solutions', 'Web Development', 'Mobile Applications', 'Dashboard Systems', 'Automation Platforms', 'Video Editing'], 
    required: true 
  },
  proposalText: { type: String, required: true },
  quotationAmount: { type: Number },
  status: { type: String, enum: ['Draft', 'Sent', 'Accepted', 'Rejected'], default: 'Draft' },
  pdfUrl: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Proposal', ProposalSchema);
