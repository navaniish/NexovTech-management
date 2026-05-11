const express = require('express');
// NEXOV-HEARTBEAT: Premium PDF Architecture Active [FINAL_SYNC_2026-05-10T0349]
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');

const IS_SERVERLESS = !!(process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

try { dotenv.config(); } catch (e) { /* no .env in serverless */ }

const UPLOADS_DIR = path.join(__dirname, 'uploads');
try { if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch (e) { /* read-only FS */ }

const app = express();

// Hardened CORS for Mobile APK + Netlify compatibility
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes - High Priority Security Bridge
const securityRoutes = require('./routes/securityRoutes');
app.post('/api/security/2fa/setup', (req, res) => securityRoutes.handleSetup(req, res));
app.post('/api/security/2fa/verify', (req, res) => securityRoutes.handleVerify(req, res));
app.use('/api/security', securityRoutes);

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
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/recruitment', require('./routes/recruitmentRoutes'));
app.use('/api/audit', require('./routes/auditRoutes'));
app.use('/api/communication', require('./routes/communicationRoutes'));
app.use('/api/mail', require('./routes/mailRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Health check
app.get('/', (req, res) => {
  res.send('NexovTech Management API is running...');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 UNHANDLED_API_ERROR:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body
  });
  res.status(500).json({ 
    message: 'Internal server error', 
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// === INITIALIZATION ===
const seedAdmin = require('./seedAdmin');
seedAdmin().catch(err => console.error('❌ SEEDING FAILED:', err.message));

// === TRADITIONAL SERVER MODE (local dev only) ===
if (!IS_SERVERLESS) {
  const http = require('http');
  const { Server } = require('socket.io');
  const fallbackDb = require('./utils/fallbackDb');

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    console.log('🚀 COMMUNICATION_HUB: User connected:', socket.id);

    // Join specialized rooms
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      console.log(`🔗 ROOM_JOIN: Socket ${socket.id} joined ${roomId}`);
    });

    // Handle Real-time Chat
    socket.on('send-message', async (data) => {
      try {
        const { room, sender, content, type } = data;
        const message = {
          room,
          sender,
          content,
          type: type || 'text',
          timestamp: new Date()
        };
        // Persist to DB
        await fallbackDb.save('messages', message);
        // Broadcast to room
        io.to(room).emit('new-message', message);
      } catch (err) {
        console.error('🔥 CHAT_ERROR:', err.message);
      }
    });

    // Typing Indicators
    socket.on('typing', ({ room, user }) => {
      socket.to(room).emit('user-typing', { user });
    });

    // Announcements
    socket.on('broadcast-announcement', async (data) => {
      try {
        await fallbackDb.save('announcements', { ...data, timestamp: new Date() });
        io.emit('new-announcement', data);
      } catch (err) {
        console.error('🔥 BROADCAST_ERROR:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log('📡 COMMUNICATION_HUB: User disconnected');
    });
  });

  const PORT = process.env.PORT || 5006;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
