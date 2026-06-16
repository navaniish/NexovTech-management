const mongoose = require('mongoose');

const LeadScoreSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
  budgetScore: { type: Number, min: 0, max: 100, required: true },
  complexityScore: { type: Number, min: 0, max: 100, required: true },
  readinessScore: { type: Number, min: 0, max: 100, required: true },
  urgencyScore: { type: Number, min: 0, max: 100, required: true },
  overallOpportunityScore: { type: Number, min: 0, max: 100, required: true, index: true },
  confidenceMetric: { type: Number, min: 0, max: 1 },
  aiRecommendation: { type: String, required: true }, // '🔥 High Priority', 'Medium Priority', 'Low Priority'
  evaluationLog: { type: String } // LLM reasoning dump
}, { timestamps: true });

module.exports = mongoose.model('LeadScore', LeadScoreSchema);
