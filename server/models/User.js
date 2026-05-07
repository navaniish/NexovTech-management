const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Optional for social login users
  firebaseUid: { type: String, unique: true },
  role: { 
    type: String, 
    enum: ['Admin', 'Employee', 'Manager', 'Developer', 'Editor', 'AI Specialist', 'Security Analyst'],
    default: 'Employee'
  },
  avatar: { type: String },
  assignedProjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  earnings: { type: Number, default: 0 },
  performance: {
    tasksCompleted: { type: Number, default: 0 },
    onTimeRate: { type: Number, default: 100 },
    rating: { type: Number, default: 5 }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
