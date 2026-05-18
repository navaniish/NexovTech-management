const express = require('express');
// NEXOV-HEARTBEAT: Premium PDF Architecture Active [FINAL_SYNC_2026-05-10T0349]
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const IS_SERVERLESS = !!(process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

try { dotenv.config(); } catch (e) { /* no .env in serverless */ }

// Initialize Telegram Bot
const { initBot } = require('./bot/telegramBot');
const tgBot = initBot(process.env.TELEGRAM_BOT_TOKEN);
if (tgBot && IS_SERVERLESS) {
  console.log('📡 TELEGRAM_WEBHOOK: Listening on /api/telegram-webhook');
}

const UPLOADS_DIR = path.join(__dirname, 'uploads');
try { if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch (e) { /* read-only FS */ }

const app = express();

// Hardened CORS for Mobile APK + Netlify compatibility
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/authRoutes');
const teamRoutes = require('./routes/teamRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const financeRoutes = require('./routes/financeRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const aiRoutes = require('./routes/aiRoutes');
const clientRoutes = require('./routes/clientRoutes');
const securityRoutes = require('./routes/securityRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const auditRoutes = require('./routes/auditRoutes');
const communicationRoutes = require('./routes/communicationRoutes');
const idCardRoutes = require('./routes/idCardRoutes');
const mailRoutes = require('./routes/mailRoutes');
const recruitmentRoutes = require('./routes/recruitmentRoutes');
const timesheetRoutes = require('./routes/timesheetRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/communication', communicationRoutes);
app.use('/api/idcard', idCardRoutes);
app.use('/api/mail', mailRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/timesheet', timesheetRoutes);

// Telegram Webhook Endpoint
app.post('/api/telegram-webhook', async (req, res) => {
  if (!tgBot) return res.status(503).send('Bot not initialized');
  try {
    await tgBot.handleUpdate(req.body, res);
    if (!res.headersSent) res.sendStatus(200);
  } catch (err) {
    console.error('❌ TELEGRAM_WEBHOOK_ERROR:', err.message);
    res.status(500).send('Webhook Error');
  }
});

// Health Check
app.get('/health', (req, res) => res.json({ status: 'Operational', timestamp: new Date() }));

// Root Route
app.get('/', (req, res) => {
  res.json({
    message: 'NexovTech Management API - Mission Control Online',
    version: '1.0.0'
  });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('🔥 Mission Control Error:', err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

if (!IS_SERVERLESS) {
  const http = require('http');
  const socketIo = require('socket.io');
  const server = http.createServer(app);
  const io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Socket.io for Real-time Team Activity
  io.on('connection', (socket) => {
    console.log('📡 COMMUNICATION_HUB: Specialist connected');
    
    socket.on('join', (room) => {
      socket.join(room);
      console.log(`📡 COMMUNICATION_HUB: Specialist joined room [${room}]`);
    });

    socket.on('disconnect', () => {
      console.log('📡 COMMUNICATION_HUB: User disconnected');
    });
  });

  // Start the background cron scheduler for daily 10:00 AM notifications
  const { startScheduler } = require('./services/schedulerService');
  startScheduler();

  const PORT = process.env.PORT || 5006;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ PORT ${PORT} IS BUSY! (Ghost process found)`);
      console.error(`Please run: Stop-Process -Name "node" -Force\n`);
      process.exit(1);
    }
  });
}

module.exports = app;