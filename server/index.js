const express = require('express');
// NEXOV-HEARTBEAT: Premium PDF Architecture Active [FINAL_SYNC_2026-05-10T0349]
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const IS_SERVERLESS = !!(process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

try { dotenv.config({ path: path.join(__dirname, '.env') }); } catch (e) { /* no .env in serverless */ }
const { loadIntegrationCredentials } = require('./utils/credentialLoader');
loadIntegrationCredentials();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'nexovtech_secret_key_prime_2026';

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

// Dynamic fallback for serving uploads from writable /tmp directory under serverless environments
app.get(['/uploads/:folder/:file', '/api/uploads/:folder/:file'], (req, res) => {
  const { folder, file } = req.params;
  const localPath = path.join(__dirname, 'uploads', folder, file);
  const tmpPath = path.join('/tmp', folder, file);
  const directTmpPath = path.join('/tmp', file);

  if (fs.existsSync(localPath)) {
    return res.sendFile(localPath);
  } else if (fs.existsSync(tmpPath)) {
    return res.sendFile(tmpPath);
  } else if (fs.existsSync(directTmpPath)) {
    return res.sendFile(directTmpPath);
  } else {
    res.status(404).send('File not found');
  }
});

app.get(['/uploads/:file', '/api/uploads/:file'], (req, res) => {
  const { file } = req.params;
  const localPath = path.join(__dirname, 'uploads', file);
  const tmpPath = path.join('/tmp', file);

  if (fs.existsSync(localPath)) {
    return res.sendFile(localPath);
  } else if (fs.existsSync(tmpPath)) {
    return res.sendFile(tmpPath);
  } else {
    res.status(404).send('File not found');
  }
});

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
const nexaRoutes = require('./routes/nexaRoutes');
const linkedinRoutes = require('./routes/linkedinRoutes');
const executiveRoutes = require('./routes/executiveRoutes');
const storeRoutes = require('./routes/storeRoutes');


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
app.use('/api/nexa', nexaRoutes);
app.use('/api/linkedin', linkedinRoutes);
app.use('/api/executive', executiveRoutes);
app.use('/api/store', storeRoutes);

// Dynamic Telegram Webhook Setup Endpoint (Bypasses Local Firewalls)
app.get('/api/set-telegram-webhook', async (req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return res.status(500).send('Bot token missing in env');
  const host = req.get('host');
  // Support custom domains or Vercel secure headers
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const webhookUrl = `${protocol}://${host}/api/telegram-webhook`;
  
  try {
    const axios = require('axios');
    console.log(`Setting Telegram webhook dynamically to: ${webhookUrl}`);
    const response = await axios.get(`https://api.telegram.org/bot${token}/setWebhook`, {
      params: { url: webhookUrl }
    });
    res.json({
      success: true,
      webhookUrl,
      telegramResponse: response.data
    });
  } catch (err) {
    console.error('Failed to set webhook dynamically:', err.message);
    res.status(500).json({
      success: false,
      webhookUrl,
      error: err.response ? err.response.data : err.message
    });
  }
});

// Telegram Webhook Endpoint
app.post('/api/telegram-webhook', async (req, res) => {
  if (!tgBot) return res.status(503).send('Bot not initialized');
  try {
    const update = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!update || Object.keys(update).length === 0) {
      if (!res.headersSent) return res.sendStatus(200);
      return;
    }
    await tgBot.handleUpdate(update, res);
    if (!res.headersSent) res.sendStatus(200);
  } catch (err) {
    console.error('❌ TELEGRAM_WEBHOOK_ERROR:', err.message);
    res.status(500).send('Webhook Error');
  }
});

// Health Check
app.get('/health', (req, res) => res.json({ status: 'Operational', timestamp: new Date() }));

// Bot Check
app.get('/api/bot-check', async (req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return res.status(500).json({ error: 'Token missing' });
  try {
    const axios = require('axios');
    const response = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
    res.json({
      success: true,
      botInfo: response.data
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      details: err.response ? err.response.data : null
    });
  }
});

// DB Check
app.get('/api/db-check', async (req, res) => {
  try {
    const { db } = require('./firebaseAdmin');
    res.json({
      success: true,
      dbInitialized: db !== null,
      hasServiceAccountEnv: !!process.env.FIREBASE_SERVICE_ACCOUNT,
      nodeEnv: process.env.NODE_ENV,
      isServerless: IS_SERVERLESS
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});


// Send Test Message
app.get('/api/send-test-msg', async (req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const { chatId } = req.query;
  if (!token) return res.status(500).json({ error: 'Token missing' });
  if (!chatId) return res.status(400).json({ error: 'chatId missing' });
  try {
    const axios = require('axios');
    const response = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: '🤖 NEXA Diagnostic: Webhook is operational and communicating with Vercel!'
    });
    res.json({
      success: true,
      result: response.data
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      details: err.response ? err.response.data : null
    });
  }
});

// Secure Cron endpoint for triggering daily alerts
app.get('/api/cron/daily-alerts', async (req, res) => {
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  const key = req.query.key || req.headers['x-cron-key'];
  const expectedKey = process.env.ADMIN_OVERRIDE_KEY || 'NEXOV-PRIME-2026';
  
  if (!isVercelCron && (!key || key !== expectedKey)) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid override key.' });
  }

  // Await dynamic credentials loading to guarantee environment variables are fully loaded
  const { loadIntegrationCredentials } = require('./utils/credentialLoader');
  await loadIntegrationCredentials();

  console.log(`⏰ CRON_ENDPOINT: Secure trigger received for daily alerts.`);
  try {
    const { sendDailyAttendanceAlert } = require('./services/schedulerService');
    const result = await sendDailyAttendanceAlert();
    res.json({
      success: true,
      message: 'Daily attendance alerts successfully triggered and sent.',
      result
    });
  } catch (err) {
    console.error(`⏰ CRON_ENDPOINT_ERROR: Daily alert execution failed:`, err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to process daily attendance alerts.',
      error: err.message
    });
  }
});

// Secure Cron endpoint for triggering NEXA Autopilot & Sync Ticks
app.get('/api/cron/autopilot', async (req, res) => {
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  const key = req.query.key || req.headers['x-cron-key'];
  const expectedKey = process.env.ADMIN_OVERRIDE_KEY || 'NEXOV-PRIME-2026';
  
  if (!isVercelCron && (!key || key !== expectedKey)) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid override key.' });
  }

  // Await dynamic credentials loading to guarantee environment variables are fully loaded
  const { loadIntegrationCredentials } = require('./utils/credentialLoader');
  await loadIntegrationCredentials();

  console.log(`⏰ CRON_ENDPOINT: Secure trigger received for NEXA Autopilot & Polling sync.`);
  const results = {};

  // Auto-set Telegram Webhook
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (token && IS_SERVERLESS) {
    try {
      const host = req.get('host');
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const webhookUrl = `${protocol}://${host}/api/telegram-webhook`;
      const axios = require('axios');
      console.log(`🤖 [CRON Telegram Webhook Auto-Set]: Registering webhook url: ${webhookUrl}`);
      const webhookResponse = await axios.get(`https://api.telegram.org/bot${token}/setWebhook`, {
        params: { url: webhookUrl }
      });
      results.telegramWebhookAutoSet = webhookResponse.data;
    } catch (err) {
      console.error(`⚠️ [CRON Telegram Webhook Auto-Set FAILED]:`, err.message);
      results.telegramWebhookAutoSet = `Failed: ${err.message}`;
    }
  }

  const host = req.get('host');
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const baseUrl = `${protocol}://${host}`;
  
  // 1. Run Autopilot Cycle
  try {
    const { runAutopilotCycle } = require('./services/nexaAutopilotService');
    await runAutopilotCycle();
    results.autopilot = 'Executed successfully';
  } catch (err) {
    console.error('⏰ CRON_ENDPOINT ERROR [Autopilot]:', err.message);
    results.autopilot = `Error: ${err.message}`;
  }

  // 2. Process Pending Outreach
  try {
    const { processPendingOutreach } = require('./services/outreachWorker');
    await processPendingOutreach(baseUrl);
    results.outreachWorker = 'Executed successfully';
  } catch (err) {
    console.error('⏰ CRON_ENDPOINT ERROR [Outreach]:', err.message);
    results.outreachWorker = `Error: ${err.message}`;
  }

  // 3. Poll Incoming Emails
  try {
    const { pollIncomingEmails } = require('./services/mailPollingService');
    await pollIncomingEmails();
    results.mailPolling = 'Executed successfully';
  } catch (err) {
    console.error('⏰ CRON_ENDPOINT ERROR [Mail Polling]:', err.message);
    results.mailPolling = `Error: ${err.message}`;
  }

  // 4. Poll LinkedIn Comments
  try {
    const { pollLinkedInComments } = require('./services/linkedinPollingService');
    await pollLinkedInComments();
    results.linkedinPolling = 'Executed successfully';
  } catch (err) {
    console.error('⏰ CRON_ENDPOINT ERROR [LinkedIn Polling]:', err.message);
    results.linkedinPolling = `Error: ${err.message}`;
  }

  res.json({
    success: true,
    message: 'NEXA Autopilot tick and poller synchronization completed.',
    timestamp: new Date(),
    results
  });
});

// Root Route - Automatically registers Telegram Webhook in serverless/production to ensure Zero-Config Bot setup
app.get('/', async (req, res) => {
  let webhookStatus = 'Not configured';
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (token && IS_SERVERLESS) {
    try {
      const host = req.get('host');
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const webhookUrl = `${protocol}://${host}/api/telegram-webhook`;
      const axios = require('axios');
      const response = await axios.get(`https://api.telegram.org/bot${token}/setWebhook`, {
        params: { url: webhookUrl }
      });
      webhookStatus = response.data?.description || 'Configured successfully';
      console.log(`🤖 [TELEGRAM WEBHOOK AUTO-SET]: ${webhookStatus}`);
    } catch (err) {
      console.error(`⚠️ [TELEGRAM WEBHOOK AUTO-SET FAILED]:`, err.message);
      webhookStatus = `Failed: ${err.message}`;
    }
  }

  res.json({
    message: 'NexovTech Management API - Mission Control Online',
    version: '1.0.0',
    telegramWebhookStatus: webhookStatus
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

  // Register with socketHub for background worker emissions
  const { setIo } = require('./utils/socketHub');
  setIo(io);

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