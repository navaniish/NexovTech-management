const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  sector: { 
    type: String, 
    enum: ['Video', 'Web', 'AI', 'Cyber'],
    required: true 
  },
  deadline: { type: Date },
  budget: { type: Number },
  status: { 
    type: String, 
    enum: ['Pending', 'In Progress', 'Review', 'Completed'],
    default: 'Pending'
  },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  team: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  tasks: [{
    title: String,
    status: { type: String, enum: ['Todo', 'In Progress', 'Done'], default: 'Todo' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  files: [{
    name: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
