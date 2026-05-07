const express = require('express');
const fs = require('fs');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/clients', require('./routes/clientRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/finance', require('./routes/financeRoutes'));
app.use('/api/team', require('./routes/teamRoutes'));
app.use('/api/timesheet', require('./routes/timesheetRoutes'));
app.use('/api/payroll', require('./routes/payrollRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/idcard', require('./routes/idCardRoutes'));
app.use('/api/leave', require('./routes/leaveRoutes'));

// Basic Route
app.get('/', (req, res) => {
  res.send('NexovTech Management API is running...');
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-project', (projectId) => {
    socket.join(projectId);
    console.log(`User ${socket.id} joined project ${projectId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 5005;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nexovtech';

const seedAdmin = require('./seedAdmin');

// Cloud Firestore Initialization
console.log('🛡️ CLOUD_DATABASE: Activating Firestore Synchronization...');
seedAdmin().then(() => {
  console.log('✅ SYSTEM READY: Cloud-Hybrid Bridge Online');
}).catch(err => {
  console.error('❌ INITIALIZATION FAILED:', err.message);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
