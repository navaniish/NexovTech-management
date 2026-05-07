const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'In Progress', 'Completed'],
    default: 'Pending'
  },
  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  deadline: { type: Date },
  files: [{
    name: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
