const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
  companyName: { type: String, required: true, trim: true },
  website: { type: String, trim: true },
  industry: { type: String, index: true },
  contactInfo: {
    emails: [{ type: String }],
    phones: [{ type: String }],
    linkedInUrls: [{ type: String }],
    primaryContactName: { type: String }
  },
  companySize: { type: String, enum: ['1-10', '11-50', '51-200', '201-500', '500+'], default: '1-10' },
  techStack: [{ type: String }],
  source: { type: String, required: true, index: true }, // 'LinkedIn', 'Yelp', 'G2', 'WebScrape'
  status: { 
    type: String, 
    enum: ['Discovered', 'Scored', 'Proposal_Generated', 'Outreach_Sent', 'Responded', 'Converted', 'Archived'], 
    default: 'Discovered',
    index: true
  },
  metaData: { type: Map, of: String } // Dynamic scraper tags
}, { timestamps: true });

module.exports = mongoose.model('Lead', LeadSchema);
