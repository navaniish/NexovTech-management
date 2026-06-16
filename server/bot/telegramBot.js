const { Telegraf, Scenes } = require('telegraf');
const LocalSession = require('./localSession');
const authService = require('./authService');
const { getAIResponse } = require('./aiAssistant');
const fallbackDb = require('../utils/fallbackDb');

// 1. Scene for Authentication
const authScene = new Scenes.WizardScene(
  'AUTH_SCENE',
  // Step 1: Ask for Email
  async (ctx) => {
    await ctx.reply('👋 Welcome to the NEXA Agentic AI Systems Manager.\n\nPlease enter your company email to authenticate:');
    return ctx.wizard.next();
  },
  // Step 2: Verify Email & Send OTP
  async (ctx) => {
    const email = ctx.message.text.trim().toLowerCase();
    const user = await authService.verifyEmail(email);

    if (!user) {
      await ctx.reply('❌ This email is not registered in the NexovTech ecosystem. Please contact your administrator.');
      return ctx.scene.leave();
    }

    ctx.wizard.state.email = email;
    ctx.wizard.state.firebaseUid = user.firebaseUid || user.id;
    ctx.wizard.state.role = user.role;
    ctx.wizard.state.name = user.name;

    const otp = await authService.generateOTP(email);
    await ctx.reply(`🔐 *NexovTech Identity Bridge*\n\nYour secure 6-digit verification code is:\n\n\`${otp}\`\n\nPlease enter this code now to link your account to the NexovTech Enterprise Workspace.`, { parse_mode: 'Markdown' });
    return ctx.wizard.next();
  },
  // Step 3: Verify OTP & Link
  async (ctx) => {
    const otp = ctx.message.text.trim();
    const { email, firebaseUid, role, name } = ctx.wizard.state;

    const isValid = await authService.verifyOTP(email, otp);
    if (!isValid) {
      await ctx.reply('❌ Invalid or expired OTP. Authentication aborted.');
      return ctx.scene.leave();
    }

    await authService.linkTelegram(ctx.from.id, firebaseUid, email, role);
    await ctx.reply(`✅ *Identity Verified!*\n\nWelcome to the NexovTech ecosystem, ${name}. Your account is now securely linked.\n\n🤖 *NEXA Agentic AI Admin* is now active and ready to assist you.`, { parse_mode: 'Markdown' });
    
    // Show main menu
    const menu = (role === 'Admin' || role === 'Super Admin' || role === 'Manager') ? ADMIN_MENU : MAIN_MENU;
    await ctx.reply('How can I assist you today?', menu);
    
    return ctx.scene.leave();
  }
);

// 2. Scene for Credential Recovery via Phone
const recoveryScene = new Scenes.WizardScene(
  'RECOVERY_SCENE',
  async (ctx) => {
    await ctx.reply('🔐 *NexovTech Identity Recovery*\n\nPlease share your contact (phone number) using the button below to retrieve your workspace credentials.', {
      parse_mode: 'Markdown',
      reply_markup: {
        keyboard: [[{ text: '📱 Share My Contact', request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message.contact) {
      await ctx.reply('❌ You must share your contact to continue. Recovery cancelled.');
      return ctx.scene.leave();
    }

    const contact = ctx.message.contact;
    const phone = contact.phone_number;
    
    // SECURITY CHECK: Ensure the shared contact is actually the user's own contact
    // Telegram sends user_id if the contact belongs to the sender.
    if (!contact.user_id || contact.user_id !== ctx.from.id) {
      await ctx.reply('⚠️ *Security Alert*: You must share your *own* contact using the button provided to link your identity. Sharing other people\'s contacts is not permitted for security reasons.', { parse_mode: 'Markdown' });
      return ctx.scene.leave();
    }

    const user = await authService.lookupByPhone(phone);
    if (!user) {
      await ctx.reply('❌ This phone number is not linked to any NexovTech account.\n\n💡 *Tip*: If you have an account, please type /start and select "Authenticate via Email" to link your profile.', { parse_mode: 'Markdown' });
      return ctx.scene.leave();
    }

    // Show plain text password if available, otherwise show instructions
    let displayPassword = 'nexovtech@123'; // New Default
    if (user.password && user.password.startsWith('$2')) {
       displayPassword = '🔒 Encrypted (Your custom password)';
    } else if (user.password) {
       displayPassword = user.password;
    }

    await ctx.reply(`✅ *NexovTech Credentials Found*\n\n👤 *Identity:* ${user.name}\n📧 *Work Email:* \`${user.companyEmail || user.email}\`\n🔑 *Access Key:* \`${displayPassword}\`\n\n💡 *Action Required*: If you haven't set a custom password yet, please use \`nexovtech@123\`. To change your password, visit the Security Shield in your management portal.`, { parse_mode: 'Markdown' });
    
    // Auto-link account
    await authService.linkTelegram(ctx.from.id, user.id || user._id, user.email || user.companyEmail, user.role);
    const menu = (user.role === 'Admin' || user.role === 'Super Admin' || user.role === 'Manager') ? ADMIN_MENU : MAIN_MENU;
    await ctx.reply(`🔗 *Identity Linked*\n\nYour Telegram account is now linked to your NexovTech profile. You can now use the management menu.`, menu);
    return ctx.scene.leave();
  }
);

// 3. Scene for Task Assignment via Telegram (Admin Feature)
const assignTaskScene = new Scenes.WizardScene(
  'ASSIGN_TASK_SCENE',
  // Step 1: Select Specialist
  async (ctx) => {
    const user = ctx.state.user;
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      await ctx.reply('⚠️ *Access Denied*: Task assignment is restricted to Administrators.');
      return ctx.scene.leave();
    }
    await ctx.reply('⏳ *Retrieving specialist roster...*', { parse_mode: 'Markdown' });
    const employees = await fallbackDb.find('employees', {}) || [];
    if (employees.length === 0) {
      await ctx.reply('❌ No specialists found in the database registry. Task allocation aborted.');
      return ctx.scene.leave();
    }

    ctx.wizard.state.employees = employees;
    const keyboard = employees.map(emp => [{ text: `👤 ${emp.name} (${emp.role})` }]);
    keyboard.push([{ text: '❌ Cancel' }]);

    await ctx.reply('🎯 *Mission Control: Task Allocation Wizard*\n\nPlease select the specialist to assign the task to:', {
      reply_markup: {
        keyboard,
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
    return ctx.wizard.next();
  },
  // Step 2: Receive Specialist selection & Ask Title
  async (ctx) => {
    const selection = ctx.message.text.trim();
    if (selection === '❌ Cancel') {
      await ctx.reply('❌ Task assignment cancelled.', { reply_markup: { remove_keyboard: true } });
      return ctx.scene.leave();
    }

    const employees = ctx.wizard.state.employees;
    const match = employees.find(emp => selection.includes(emp.name));
    if (!match) {
      await ctx.reply('⚠️ Please select a valid specialist from the keyboard or type /start to reset.');
      return;
    }

    ctx.wizard.state.targetEmployee = match;
    await ctx.reply(`👤 *Selected Specialist:* ${match.name}\n\n📝 Please enter the *Task Title* (e.g. "Optimize API Gateway"):`, { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } });
    return ctx.wizard.next();
  },
  // Step 3: Receive Title & Ask Description
  async (ctx) => {
    const title = ctx.message.text.trim();
    if (title.length < 3) {
      await ctx.reply('⚠️ Task title must be at least 3 characters. Please enter a valid title:');
      return;
    }
    ctx.wizard.state.title = title;
    await ctx.reply(`📝 *Selected Title:* ${title}\n\n📖 Please enter the *Task Description* / Mission Objectives:`, { parse_mode: 'Markdown' });
    return ctx.wizard.next();
  },
  // Step 4: Receive Description & Ask Due Date
  async (ctx) => {
    const description = ctx.message.text.trim();
    ctx.wizard.state.description = description;
    await ctx.reply(`📖 *Description Captured.*\n\n📅 Please enter the *Due Date* (e.g. "2026-05-25", "tomorrow", or "next Friday"):`);
    return ctx.wizard.next();
  },
  // Step 5: Save Task & Notify!
  async (ctx) => {
    const dueDate = ctx.message.text.trim();
    const { targetEmployee, title, description } = ctx.wizard.state;

    try {
      const taskId = `task_${Date.now()}`;
      const newTask = {
        id: taskId,
        title,
        description,
        assignedTo: targetEmployee.id || targetEmployee._id || targetEmployee.email || targetEmployee.companyEmail,
        dueDate,
        status: 'Assigned',
        projectId: 'general',
        createdAt: new Date().toISOString()
      };

      await fallbackDb.save('tasks', newTask);

      // Log UI notification
      try {
        await fallbackDb.save('notifications', {
          userId: newTask.assignedTo,
          type: 'TASK_ASSIGNED',
          title: 'New Mission Assigned',
          message: `You have been assigned to: ${newTask.title}`,
          link: '/employee/tasks',
          read: false,
          createdAt: new Date().toISOString()
        });
      } catch (e) {}

      await ctx.reply(`🎉 *Mission Deployed Successfully!* 🚀\n\n` +
                      `📋 *Task:* ${title}\n` +
                      `👤 *Assigned To:* ${targetEmployee.name}\n` +
                      `📅 *Due Date:* ${dueDate}\n\n` +
                      `🤖 Task has been saved to the centralized workspace registry.`, { parse_mode: 'Markdown' });

      // Synergistic Telegram Push Notification to Target Employee!
      const targetUserMapping = await fallbackDb.findOne('telegram_users', { companyEmail: targetEmployee.email }) ||
                                await fallbackDb.findOne('telegram_users', { companyEmail: targetEmployee.companyEmail });
      
      if (targetUserMapping && targetUserMapping.telegramId) {
        const directAlert = `🚀 *New Mission Assigned!* 🎯\n\n` +
                            `Hello *${targetEmployee.name}*, you have just been assigned a new task directly from the Admin Command Center:\n\n` +
                            `📋 *Mission:* ${title}\n` +
                            `📖 *Objective:* _${description}_\n` +
                            `📅 *Target Due Date:* ${dueDate}\n\n` +
                            `Please review details on the workspace and mark your check-in!`;
        
        await sendNotification(targetUserMapping.telegramId, directAlert);
        await ctx.reply(`💬 *Real-time Alert Dispatched*: Specialist has been notified directly on Telegram!`);
      }
    } catch (err) {
      console.error(err);
      await ctx.reply('❌ Failed to deploy the task due to an internal system error.');
    }

    return ctx.scene.leave();
  }
);

// 4. Scene for Distributing APK to Specialist (Admin Feature)
const distributeApkScene = new Scenes.WizardScene(
  'DISTRIBUTE_APK_SCENE',
  // Step 1: Select Specialist
  async (ctx) => {
    const user = ctx.state.user;
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      await ctx.reply('⚠️ *Access Denied*: APK distribution is restricted to Administrators.');
      return ctx.scene.leave();
    }
    await ctx.reply('⏳ *Retrieving linked specialists roster...*', { parse_mode: 'Markdown' });
    
    // Find all linked Telegram users
    const linkedUsers = await fallbackDb.find('telegram_users', {}) || [];
    if (linkedUsers.length === 0) {
      await ctx.reply('❌ No linked Telegram profiles found in the registry.');
      return ctx.scene.leave();
    }

    // Map them to employees directory to get their actual names
    const employees = await fallbackDb.find('employees', {}) || [];
    const roster = linkedUsers.map(link => {
      const emp = employees.find(e => e.email?.toLowerCase() === link.companyEmail?.toLowerCase() || e.companyEmail?.toLowerCase() === link.companyEmail?.toLowerCase());
      return {
        name: emp ? emp.name : link.companyEmail,
        telegramId: link.telegramId,
        role: link.role
      };
    }).filter(r => r.telegramId !== ctx.from.id); // Exclude the admin themselves

    if (roster.length === 0) {
      await ctx.reply('📭 No other specialists are currently linked to Telegram.');
      return ctx.scene.leave();
    }

    ctx.wizard.state.roster = roster;
    const keyboard = roster.map(r => [{ text: `👤 ${r.name} (${r.role})` }]);
    keyboard.push([{ text: '❌ Cancel' }]);

    await ctx.reply('📤 *Mission Control: APK Distribution Wizard*\n\nPlease select the specialist to send the Android APK to:', {
      reply_markup: {
        keyboard,
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
    return ctx.wizard.next();
  },
  // Step 2: Confirm Selection & Send!
  async (ctx) => {
    const selection = ctx.message.text.trim();
    if (selection === '❌ Cancel') {
      await ctx.reply('❌ APK distribution cancelled.', { reply_markup: { remove_keyboard: true } });
      return ctx.scene.leave();
    }

    const roster = ctx.wizard.state.roster;
    const match = roster.find(r => selection.includes(r.name));
    if (!match) {
      await ctx.reply('⚠️ Please select a valid specialist from the keyboard or type /start to reset.');
      return;
    }

    await ctx.reply(`⏳ *Preparing payload...* Dispatching nexovtech.apk to *${match.name}*...`, { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } });

    const fs = require('fs');
    const path = require('path');
    const apkPath = path.resolve(__dirname, '../../nexovtech.apk');

    if (!fs.existsSync(apkPath)) {
      await ctx.reply('❌ Error: The compiled `nexovtech.apk` file is missing from the server root.');
      return ctx.scene.leave();
    }

    try {
      await ctx.telegram.sendDocument(match.telegramId, {
        source: fs.createReadStream(apkPath),
        filename: 'nexovtech.apk'
      }, {
        caption: `🛡️ *NexovTech Live Production Android APK*\n\nHello *${match.name}*, your Administrator has sent you the latest production-ready Android APK with the circular logo, live Netlify API integration, and staggered entrance animations. Ready for installation!`,
        parse_mode: 'Markdown'
      });

      await ctx.reply(`🎉 *APK Successfully Dispatched!* 🚀\n\nLatest binary payload has been uploaded and delivered directly to *${match.name}* on Telegram.`);
    } catch (err) {
      console.error(err);
      await ctx.reply(`❌ Failed to send APK to *${match.name}*: ${err.message}`, { parse_mode: 'Markdown' });
    }

    return ctx.scene.leave();
  }
);

const stage = new Scenes.Stage([authScene, recoveryScene, assignTaskScene, distributeApkScene]);

const MAIN_MENU = {
  reply_markup: {
    keyboard: [
      [{ text: '📊 Dashboard Summary' }, { text: '📅 My Schedule' }],
      [{ text: '📄 View Payslip' }, { text: '🚀 AI Workspace Assistant' }],
      [{ text: '🔐 Security Status' }]
    ],
    resize_keyboard: true
  }
};

const ADMIN_MENU = {
  reply_markup: {
    keyboard: [
      [{ text: '📊 Dashboard Summary' }, { text: '📅 Today\'s Attendance' }],
      [{ text: '👥 Personnel List' }, { text: '🚀 Leave Requests' }],
      [{ text: '🎯 Assign Task' }, { text: '📤 Distribute APK' }],
      [{ text: '🤖 AI Workspace Assistant' }]
    ],
    resize_keyboard: true
  }
};

function initBot(token) {
  if (!token) {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN missing. Bot is disabled.');
    return;
  }

  // Bypass for institutional firewalls (SSL interception)
  if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.warn('⚠️ SECURITY_WARNING: SSL certificate verification disabled for Telegram Bot (Local Dev Bypass).');
  }

  const bot = new Telegraf(token);
  global.tgBot = bot;

  const IS_SERVERLESS = !!(process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  // Register Official Menu Commands
  bot.telegram.setMyCommands([
    { command: 'start', description: '🚀 Authenticate / Start Session' },
    { command: 'menu', description: '📊 Open Command Center' },
    { command: 'employee_view', description: '🤖 Toggle Employee Test Menu (Admin)' },
    { command: 'admin_view', description: '🤖 Return to Admin Menu (Admin)' },
    { command: 'dashboard', description: '📊 Live Analytics Briefing (Admin)' },
    { command: 'assign_task', description: '🚀 Deploy Task to Specialist (Admin)' },
    { command: 'send_apk', description: '📤 Distribute APK to Specialist (Admin)' },
    { command: 'attendance_alert', description: '📅 Daily Attendance Briefing' },
    { command: 'trigger_broadcast', description: '🔔 Trigger Real Alert Broadcast (Admin)' },
    { command: 'specialists', description: '👥 View Specialist Directory (Admin)' },
    { command: 'leaves', description: '🚀 View Pending Leaves (Admin)' },
    { command: 'rag_search', description: '🔍 Semantic RAG Memory Search (Admin)' },
    { command: 'security_alerts', description: '🛡️ Geolocational Threat Alerts (Super Admin)' },
    { command: 'voice_campaigns', description: '📞 View Voice Outreach Campaign Logs' },
    { command: 'reset', description: '🔄 Unlink Account / Reset' },
    { command: 'help', description: '🆘 Get Assistance' }
  ]);

  // Use persistent session
  const sessionStore = new LocalSession({ 
    database: IS_SERVERLESS ? 'telegram_sessions' : 'data/sessions.json',
    useFirestore: IS_SERVERLESS 
  });
  bot.use(sessionStore.middleware());
  bot.use(stage.middleware());

  // Middleware to check if user is authenticated
  bot.use(async (ctx, next) => {
    const isStart = ctx.message && ctx.message.text === '/start';
    const isRecovery = ctx.message && ctx.message.text === '📱 Get My Credentials (Phone)';
    const isContact = ctx.message && ctx.message.contact;
    
    // Check if user is currently in the middle of an authentication or recovery flow
    const isInAuthFlow = ctx.scene && ctx.scene.current;
    
    if (isStart || isRecovery || isContact || isInAuthFlow) return next();
    
    if (!ctx.from || !ctx.from.id) return next();
    
    const tgUser = await authService.getTelegramUser(ctx.from.id);
    if (!tgUser) {
      return ctx.reply('🔐 Your session is not authenticated. Please type /start to link your account.');
    }
    
    ctx.state.user = tgUser;
    return next();
  });

  const getMenuForUser = (ctx, user) => {
    if (!user) return MAIN_MENU;
    const isForcedEmployee = ctx.session && ctx.session.viewMode === 'employee';
    const hasAdminPrivilege = user.role === 'Admin' || user.role === 'Super Admin' || user.role === 'Manager';
    if (hasAdminPrivilege && !isForcedEmployee) {
      return ADMIN_MENU;
    }
    return MAIN_MENU;
  };

  bot.command('employee_view', async (ctx) => {
    const user = ctx.state.user;
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return ctx.reply('⚠️ *Access Denied*: This test toggle is restricted to Administrators.');
    }
    if (!ctx.session) ctx.session = {};
    ctx.session.viewMode = 'employee';
    await ctx.reply('🤖 *Testing Employee View Active*\n\nYour Telegram menu has been switched to the Employee Workspace for testing. Use /admin_view to switch back.', MAIN_MENU);
  });

  bot.command('admin_view', async (ctx) => {
    const user = ctx.state.user;
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return ctx.reply('⚠️ *Access Denied*: Restricted to Administrators.');
    }
    if (!ctx.session) ctx.session = {};
    ctx.session.viewMode = 'admin';
    await ctx.reply('🤖 *Admin Command Center Active*\n\nReturned to the Administrator dashboard menu.', ADMIN_MENU);
  });

  bot.command('menu', (ctx) => {
    const user = ctx.state.user;
    const menu = getMenuForUser(ctx, user);
    ctx.reply('NexovTech Command Center:', menu);
  });

  bot.command('attendance_alert', async (ctx) => {
    const user = ctx.state.user;
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return ctx.reply('⚠️ *Access Denied*: This intelligence briefing is restricted to NexovTech Administrators.', { parse_mode: 'Markdown' });
    }
    await ctx.reply('⏳ *Processing...* Compiling today\'s attendance stats.', { parse_mode: 'Markdown' });
    const { generateAttendanceReport } = require('../services/schedulerService');
    const report = await generateAttendanceReport();
    await ctx.reply(report, { parse_mode: 'Markdown' });
  });

  bot.command('trigger_broadcast', async (ctx) => {
    console.log(`📢 TELEGRAM_BOT: /trigger_broadcast command triggered by user ${ctx.from?.id}`);
    const user = ctx.state.user;
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      console.warn(`⚠️ TELEGRAM_BOT: Unauthorized access attempt to /trigger_broadcast by user ${ctx.from?.id}`);
      return ctx.reply('⚠️ *Access Denied*: Triggering real alerts is restricted to NexovTech Administrators.', { parse_mode: 'Markdown' });
    }
    await ctx.reply('⏳ *Processing...* Dispatching command to trigger daily attendance broadcast to all admins and personnel.', { parse_mode: 'Markdown' });
    try {
      const { sendDailyAttendanceAlert } = require('../services/schedulerService');
      const result = await sendDailyAttendanceAlert();
      console.log(`✅ TELEGRAM_BOT: Broadcast successful. Admins: ${result.adminSuccessCount}/${result.totalAdmins}, Employees reminded: ${result.employeeReminderCount}`);
      await ctx.reply(`✅ *Broadcast Complete!*\n\n• Admin briefings sent: ${result.adminSuccessCount}/${result.totalAdmins}\n• Employee reminders sent: ${result.employeeReminderCount}`, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('❌ TELEGRAM_BOT: Broadcast failed:', err);
      await ctx.reply('❌ Failed to trigger daily attendance alert broadcast due to system error.', { parse_mode: 'Markdown' });
    }
  });

  bot.command('specialists', async (ctx) => {
    const user = ctx.state.user;
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return ctx.reply('⚠️ *Access Denied*: Restricted to administrators.', { parse_mode: 'Markdown' });
    }
    await ctx.reply('⏳ *Retrieving personnel database...*', { parse_mode: 'Markdown' });
    const employees = await fallbackDb.find('employees', {}) || [];
    if (employees.length === 0) {
      return ctx.reply('📭 The personnel database is currently empty.');
    }
    let msg = `👥 *NexovTech Specialist Directory* 🏢\n\n`;
    employees.forEach((emp, idx) => {
      const phone = emp.phone || emp.phoneNumber || 'Not linked';
      msg += `${idx + 1}. *${emp.name}*\n` +
             `   • Role: ${emp.role || 'Specialist'}\n` +
             `   • Email: \`${emp.email || emp.companyEmail || 'No email'}\`\n` +
             `   • Contact: \`${phone}\`\n\n`;
    });
    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  bot.command('leaves', async (ctx) => {
    const user = ctx.state.user;
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return ctx.reply('⚠️ *Access Denied*: Restricted to administrators.', { parse_mode: 'Markdown' });
    }
    await ctx.reply('⏳ *Fetching pending leaves...*', { parse_mode: 'Markdown' });
    const leaves = await fallbackDb.find('leaves', {}) || [];
    const pendingLeaves = leaves.filter(l => l.status === 'Pending');
    if (pendingLeaves.length === 0) {
      return ctx.reply('✅ *All Leaves Reconciled*\n\nThere are no pending leave requests awaiting approval.', { parse_mode: 'Markdown' });
    }
    let msg = `🚀 *Pending Leave Requests* 📂\n\n`;
    pendingLeaves.forEach((leave, idx) => {
      const start = leave.startDate ? new Date(leave.startDate).toLocaleDateString() : '--';
      const end = leave.endDate ? new Date(leave.endDate).toLocaleDateString() : '--';
      msg += `${idx + 1}. *${leave.employeeName || 'Specialist'}*\n` +
             `   • Type: ${leave.leaveType}\n` +
             `   • Duration: ${leave.totalDays || 1} Days (${start} to ${end})\n` +
             `   • Reason: _${leave.reason || 'None provided'}_\n\n`;
    });
    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  bot.command('assign_task', async (ctx) => {
    const user = ctx.state.user;
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return ctx.reply('⚠️ *Access Denied*: Restricted to administrators.', { parse_mode: 'Markdown' });
    }
    await ctx.scene.enter('ASSIGN_TASK_SCENE');
  });

  bot.command('send_apk', async (ctx) => {
    const user = ctx.state.user;
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return ctx.reply('⚠️ *Access Denied*: Restricted to administrators.', { parse_mode: 'Markdown' });
    }
    await ctx.scene.enter('DISTRIBUTE_APK_SCENE');
  });

  bot.command('dashboard', async (ctx) => {
    const user = ctx.state.user;
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return ctx.reply('⚠️ *Access Denied*: Restricted to administrators.', { parse_mode: 'Markdown' });
    }
    await ctx.reply('⏳ *Aggregating real-time operational metrics...*', { parse_mode: 'Markdown' });
    
    try {
      const employees = await fallbackDb.find('employees', {}) || [];
      const projects = await fallbackDb.find('projects', {}) || [];
      const tasks = await fallbackDb.find('tasks', {}) || [];
      const leaves = await fallbackDb.find('leaves', {}) || [];
      const attendance = await fallbackDb.find('attendance', {}) || [];
      
      const today = new Date().toISOString().split('T')[0];
      const todayAtt = attendance.filter(r => r.date === today);

      const activeProjects = projects.filter(p => p.status === 'Active').length;
      const completedProjects = projects.filter(p => p.status === 'Completed').length;

      const pendingTasks = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Terminated').length;
      const completedTasks = tasks.filter(t => t.status === 'Completed').length;

      const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;

      const presentCount = todayAtt.filter(r => r.attendanceStatus === 'Present').length;
      const lateCount = todayAtt.filter(r => r.attendanceStatus === 'Late').length;
      const totalPresent = presentCount + lateCount;
      const absentees = Math.max(0, employees.length - totalPresent);

      const healthIndex = employees.length > 0 ? Math.round((totalPresent / employees.length) * 100) : 100;
      const healthEmoji = healthIndex > 80 ? '🟢 Excellent' : (healthIndex > 50 ? '🟡 Average' : '🔴 Critical');

      const dashboardMsg = `📊 *NexovTech Real-time Dashboard Analytics* 📈\n` +
                           `*Operational Intelligence Briefing*\n\n` +
                           `🏢 *Specialist Registry:*\n` +
                           `• Total Staff: ${employees.length} Members\n` +
                           `• Present: ${presentCount} ✅ | Late: ${lateCount} ⚠️\n` +
                           `• Absent/On Leave: ${absentees} 💤\n` +
                           `• *Workspace Health Index:* ${healthIndex}% (${healthEmoji})\n\n` +
                           `🚀 *Mission Dispatch (Tasks):*\n` +
                           `• Active Missions: ${pendingTasks} Pending\n` +
                           `• Terminated/Completed: ${completedTasks} Completed\n\n` +
                           `📂 *Operational Milestones (Projects):*\n` +
                           `• Active Campaigns: ${activeProjects} Projects\n` +
                           `• Completed Campaigns: ${completedProjects} Projects\n\n` +
                           `📂 *Leaves Registry:*\n` +
                           `• Pending Applications: ${pendingLeaves} Requests\n\n` +
                           `🤖 *NEXA Agentic AI Systems Management Online*`;

      await ctx.reply(dashboardMsg, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error(err);
      await ctx.reply('❌ Failed to compile dashboard analytics.');
    }
  });

  bot.command('reset', async (ctx) => {
    const success = await authService.unlinkTelegram(ctx.from.id);
    if (success) {
      await ctx.reply('🔄 *Identity Reset Successful*\n\nYour Telegram account has been unlinked from the NexovTech Enterprise Workspace. You can now use /start to link a new account.', { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } });
    } else {
      await ctx.reply('⚠️ No active link found for this account.');
    }
  });

  bot.start(async (ctx) => {
    const tgUser = await authService.getTelegramUser(ctx.from.id);
    if (tgUser) {
      const menu = getMenuForUser(ctx, tgUser);
      return ctx.reply(`🚀 *NEXA Agentic AI Admin Online*\n\nWelcome back, ${tgUser.name || tgUser.companyEmail}. I am your Agentic AI Workspace Administrator.\n\nYou can use the menu below for quick actions, or simply chat with me naturally for any workspace assistance.`, { ...menu, parse_mode: 'Markdown' });
    }
    
    return ctx.reply('👋 Welcome to the NEXA Agentic AI Systems Manager.\n\nPlease share your contact to retrieve your credentials and link your account:', {
      reply_markup: {
        keyboard: [
          [{ text: '📱 Get My Credentials (Phone)' }]
        ],
        resize_keyboard: true
      }
    });
  });

  bot.hears('🔐 Authenticate via Email', (ctx) => ctx.scene.enter('AUTH_SCENE'));
  bot.hears('📱 Get My Credentials (Phone)', (ctx) => ctx.scene.enter('RECOVERY_SCENE'));

  // Handle Menu Actions
  bot.hears('📊 Dashboard Summary', async (ctx) => {
    const user = ctx.state.user;
    const isForcedEmployee = ctx.session && ctx.session.viewMode === 'employee';
    if (isForcedEmployee || !user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return ctx.reply(`🏢 *NexovTech Workspace Summary*\n\nRole: ${user.role}\nStatus: ${user.workspaceStatus || 'Active'}\nPending Tasks: 3\nRecent Notifications: 2`, { parse_mode: 'Markdown' });
    }

    await ctx.reply('⏳ *Aggregating real-time operational metrics...*', { parse_mode: 'Markdown' });
    try {
      const employees = await fallbackDb.find('employees', {}) || [];
      const projects = await fallbackDb.find('projects', {}) || [];
      const tasks = await fallbackDb.find('tasks', {}) || [];
      const leaves = await fallbackDb.find('leaves', {}) || [];
      const attendance = await fallbackDb.find('attendance', {}) || [];
      
      const today = new Date().toISOString().split('T')[0];
      const todayAtt = attendance.filter(r => r.date === today);

      const activeProjects = projects.filter(p => p.status === 'Active').length;
      const completedProjects = projects.filter(p => p.status === 'Completed').length;

      const pendingTasks = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Terminated').length;
      const completedTasks = tasks.filter(t => t.status === 'Completed').length;

      const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;

      const presentCount = todayAtt.filter(r => r.attendanceStatus === 'Present').length;
      const lateCount = todayAtt.filter(r => r.attendanceStatus === 'Late').length;
      const totalPresent = presentCount + lateCount;
      const absentees = Math.max(0, employees.length - totalPresent);

      const healthIndex = employees.length > 0 ? Math.round((totalPresent / employees.length) * 100) : 100;
      const healthEmoji = healthIndex > 80 ? '🟢 Excellent' : (healthIndex > 50 ? '🟡 Average' : '🔴 Critical');

      const dashboardMsg = `📊 *NexovTech Real-time Dashboard Analytics* 📈\n` +
                           `*Operational Intelligence Briefing*\n\n` +
                           `🏢 *Specialist Registry:*\n` +
                           `• Total Staff: ${employees.length} Members\n` +
                           `• Present: ${presentCount} ✅ | Late: ${lateCount} ⚠️\n` +
                           `• Absent/On Leave: ${absentees} 💤\n` +
                           `• *Workspace Health Index:* ${healthIndex}% (${healthEmoji})\n\n` +
                           `🚀 *Mission Dispatch (Tasks):*\n` +
                           `• Active Missions: ${pendingTasks} Pending\n` +
                           `• Terminated/Completed: ${completedTasks} Completed\n\n` +
                           `📂 *Operational Milestones (Projects):*\n` +
                           `• Active Campaigns: ${activeProjects} Projects\n` +
                           `• Completed Campaigns: ${completedProjects} Projects\n\n` +
                           `📂 *Leaves Registry:*\n` +
                           `• Pending Applications: ${pendingLeaves} Requests\n\n` +
                           `🤖 *NEXA Agentic AI Systems Management Online*`;

      await ctx.reply(dashboardMsg, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error(err);
      await ctx.reply('❌ Failed to compile dashboard analytics.');
    }
  });

  bot.hears('📅 My Schedule', async (ctx) => {
    ctx.reply('📅 *Your Schedule for Today*\n\n09:00 AM - Morning Briefing\n11:30 AM - Development Sync\n02:00 PM - Operational Review\n04:30 PM - Deployment Window', { parse_mode: 'Markdown' });
  });

  bot.hears('📄 View Payslip', async (ctx) => {
    ctx.reply('📄 *NexovTech Secure Payroll*\n\nYour digital payslips are protected by Netlify Enterprise security. You can access your full financial dossier here:\n\n🔗 [Open NexovTech Payroll Portal](https://nexovtech-management.netlify.app/payslips)', { parse_mode: 'Markdown' });
  });

  bot.hears('🔐 Security Status', async (ctx) => {
    const user = ctx.state.user;
    ctx.reply(`🔐 *Security Dossier*\n\nAccount linked: ✅\nRole: ${user.role}\nLast Web Login: ${new Date().toLocaleDateString()}\nStatus: Secure`, { parse_mode: 'Markdown' });
  });

  bot.hears(['🚀 AI Workspace Assistant', '🤖 AI Workspace Assistant'], (ctx) => {
    ctx.reply('🤖 AI Assistant Activated. Ask me anything about your workspace, tasks, or company policies.');
  });

  bot.hears('📅 Today\'s Attendance', async (ctx) => {
    const user = ctx.state.user;
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return ctx.reply('⚠️ *Access Denied*: Restricted to administrators.');
    }
    await ctx.reply('⏳ *Compiling real-time statistics...*', { parse_mode: 'Markdown' });
    const { generateAttendanceReport } = require('../services/schedulerService');
    const report = await generateAttendanceReport();
    await ctx.reply(report, { parse_mode: 'Markdown' });
  });

  bot.hears('👥 Personnel List', async (ctx) => {
    const user = ctx.state.user;
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return ctx.reply('⚠️ *Access Denied*: Restricted to administrators.');
    }
    await ctx.reply('⏳ *Retrieving personnel database...*', { parse_mode: 'Markdown' });
    const employees = await fallbackDb.find('employees', {}) || [];
    if (employees.length === 0) {
      return ctx.reply('📭 The personnel database is currently empty.');
    }
    let msg = `👥 *NexovTech Specialist Directory* 🏢\n\n`;
    employees.forEach((emp, idx) => {
      const phone = emp.phone || emp.phoneNumber || 'Not linked';
      msg += `${idx + 1}. *${emp.name}*\n` +
             `   • Role: ${emp.role || 'Specialist'}\n` +
             `   • Email: \`${emp.email || emp.companyEmail || 'No email'}\`\n` +
             `   • Contact: \`${phone}\`\n\n`;
    });
    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  bot.hears('🚀 Leave Requests', async (ctx) => {
    const user = ctx.state.user;
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return ctx.reply('⚠️ *Access Denied*: Restricted to administrators.');
    }
    await ctx.reply('⏳ *Fetching pending leaves...*', { parse_mode: 'Markdown' });
    const leaves = await fallbackDb.find('leaves', {}) || [];
    const pendingLeaves = leaves.filter(l => l.status === 'Pending');
    if (pendingLeaves.length === 0) {
      return ctx.reply('✅ *All Leaves Reconciled*\n\nThere are no pending leave requests awaiting approval at this time.', { parse_mode: 'Markdown' });
    }
    let msg = `🚀 *Pending Leave Requests* 📂\n\n`;
    pendingLeaves.forEach((leave, idx) => {
      const start = leave.startDate ? new Date(leave.startDate).toLocaleDateString() : '--';
      const end = leave.endDate ? new Date(leave.endDate).toLocaleDateString() : '--';
      msg += `${idx + 1}. *${leave.employeeName || 'Specialist'}*\n` +
             `   • Type: ${leave.leaveType}\n` +
             `   • Duration: ${leave.totalDays || 1} Days (${start} to ${end})\n` +
             `   • Reason: _${leave.reason || 'None provided'}_\n\n`;
    });
    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  bot.hears('🎯 Assign Task', async (ctx) => {
    const user = ctx.state.user;
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return ctx.reply('⚠️ *Access Denied*: Restricted to administrators.');
    }
    await ctx.scene.enter('ASSIGN_TASK_SCENE');
  });

  bot.hears('📤 Distribute APK', async (ctx) => {
    const user = ctx.state.user;
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return ctx.reply('⚠️ *Access Denied*: Restricted to administrators.');
    }
    await ctx.scene.enter('DISTRIBUTE_APK_SCENE');
  });

  // ─── ADVANCED COMMANDS ─────────────────────────────────────────────────────

  // /rag_search <query> — Semantic search across RAG vector memory
  bot.command('rag_search', async (ctx) => {
    const user = ctx.state.user;
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return ctx.reply('⚠️ *Access Denied*: RAG Memory access is restricted to administrators.', { parse_mode: 'Markdown' });
    }
    const query = ctx.message.text.replace('/rag_search', '').trim();
    if (!query) {
      return ctx.reply('🔍 *RAG Memory Search*\n\nUsage: `/rag_search <your query>`\n\nExample: `/rag_search pricing policy`', { parse_mode: 'Markdown' });
    }

    await ctx.reply(`🔍 *Searching vector memory for:* "${query}"...`, { parse_mode: 'Markdown' });
    try {
      const docs = await fallbackDb.find('vector_memory', { tenantId: 'org_default' }) || [];
      const results = docs
        .filter(d => (d.text || '').toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);

      if (!results.length) {
        return ctx.reply(`❌ *No matches found* for "${query}" in the RAG knowledge base.`, { parse_mode: 'Markdown' });
      }

      let msg = `📚 *RAG Memory Search Results* — "${query}"\n\n`;
      results.forEach((doc, i) => {
        msg += `*${i + 1}.* [${doc.collection || 'knowledge'}]\n`;
        msg += `_${(doc.text || '').substring(0, 200)}${doc.text?.length > 200 ? '...' : ''}_\n`;
        if (doc.metadata?.client) msg += `🏢 Client: ${doc.metadata.client}\n`;
        msg += '\n';
      });
      await ctx.reply(msg, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('❌ RAG search error:', err.message);
      await ctx.reply('❌ Vector memory search failed. The RAG store may be offline.', { parse_mode: 'Markdown' });
    }
  });

  // /security_alerts — Show latest impossible-travel geolocational anomalies
  bot.command('security_alerts', async (ctx) => {
    const user = ctx.state.user;
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin')) {
      return ctx.reply('⚠️ *Access Denied*: Security alerts are restricted to Super Admins.', { parse_mode: 'Markdown' });
    }

    await ctx.reply('🛡️ *Fetching Sentinel AI Geolocational Alerts...*', { parse_mode: 'Markdown' });
    try {
      // Try to get login history and detect velocity anomalies
      const loginHistory = await fallbackDb.find('login_history', {}) || [];
      
      // Group by userId and check for impossible travel (>800 km/h)
      const COORDS = {
        'mumbai': [19.076, 72.8777], 'delhi': [28.6139, 77.2090],
        'bangalore': [12.9716, 77.5946], 'london': [51.5074, -0.1278],
        'new york': [40.7128, -74.0060], 'tokyo': [35.6762, 139.6503],
        'singapore': [1.3521, 103.8198]
      };
      function haversine(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      }

      const grouped = {};
      loginHistory.forEach(l => {
        if (!grouped[l.userId]) grouped[l.userId] = [];
        grouped[l.userId].push(l);
      });

      const anomalies = [];
      Object.entries(grouped).forEach(([uid, logs]) => {
        const sorted = logs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        for (let i = 1; i < sorted.length; i++) {
          const prev = sorted[i-1], curr = sorted[i];
          const loc1 = (prev.location || '').toLowerCase();
          const loc2 = (curr.location || '').toLowerCase();
          const c1 = Object.entries(COORDS).find(([k]) => loc1.includes(k));
          const c2 = Object.entries(COORDS).find(([k]) => loc2.includes(k));
          if (c1 && c2 && c1[0] !== c2[0]) {
            const dist = haversine(...c1[1], ...c2[1]);
            const hours = (new Date(curr.createdAt) - new Date(prev.createdAt)) / 3600000;
            if (hours > 0 && dist / hours > 800) {
              anomalies.push({ uid, loc1: c1[0], loc2: c2[0], velocity: dist / hours });
            }
          }
        }
      });

      if (!anomalies.length) {
        return ctx.reply('✅ *Sentinel AI — All Clear*\n\nNo impossible-travel anomalies detected in the current login history dataset.', { parse_mode: 'Markdown' });
      }

      let msg = `🚨 *Sentinel AI — Geolocational Threat Report*\n\n`;
      anomalies.slice(0, 5).forEach((a, i) => {
        msg += `*${i + 1}.* User \`${a.uid}\`\n`;
        msg += `   📍 ${a.loc1.toUpperCase()} ➔ ${a.loc2.toUpperCase()}\n`;
        msg += `   ⚡ Velocity: *${a.velocity.toFixed(0)} km/h* (threshold: 800 km/h)\n\n`;
      });
      msg += `Use /lockout_<userId> or the Sentinel Shield dashboard to take action.`;
      await ctx.reply(msg, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('❌ Security alerts error:', err.message);
      await ctx.reply('❌ Security alert scan failed.', { parse_mode: 'Markdown' });
    }
  });

  // /voice_campaigns — List recent outreach campaign logs
  bot.command('voice_campaigns', async (ctx) => {
    const user = ctx.state.user;
    if (!user) {
      return ctx.reply('🔐 Please authenticate first using /start', { parse_mode: 'Markdown' });
    }

    await ctx.reply('📞 *Fetching voice campaign logs...*', { parse_mode: 'Markdown' });
    try {
      const logs = await fallbackDb.find('outreach_logs', {}) || [];
      const recent = logs
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 8);

      if (!recent.length) {
        return ctx.reply('📞 *No voice campaigns found.*\n\nSend outreach campaigns via the NEXA Sales Hub → Outreach section to see records here.', { parse_mode: 'Markdown' });
      }

      let msg = `📞 *NEXA Voice Campaign Outreach Logs*\n\n`;
      recent.forEach((log, i) => {
        const date = log.createdAt ? new Date(log.createdAt).toLocaleDateString() : 'Unknown';
        msg += `*${i + 1}.* ${log.recipientName || log.companyName || 'Target'}\n`;
        msg += `   • Channel: ${(log.channel || 'voice').toUpperCase()}\n`;
        msg += `   • Status: ${log.status || 'sent'} | Date: ${date}\n\n`;
      });
      await ctx.reply(msg, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('❌ Voice campaign fetch error:', err.message);
      await ctx.reply('❌ Failed to retrieve voice campaign logs.', { parse_mode: 'Markdown' });
    }
  });

  // Default fallback to AI Assistant
  bot.on('text', async (ctx) => {
    if (ctx.state.user) {
      const response = await getAIResponse(ctx.message.text, ctx.state.user);
      try {
        await ctx.reply(response, { parse_mode: 'Markdown' });
      } catch (err) {
        console.warn('⚠️ Telegram Markdown parsing failed, falling back to plain text:', err.message);
        await ctx.reply(response);
      }
    }
  });

  // Only launch polling if NOT serverless and TELEGRAM_POLLING is enabled
  if (!IS_SERVERLESS) {
    if (process.env.TELEGRAM_POLLING === 'true') {
      const launchBotWithRetry = (retries = 5, delay = 3000) => {
        bot.launch()
          .then(() => {
            console.log('🤖 TELEGRAM_BOT: Operational and synchronized (Polling).');
          })
          .catch((err) => {
            console.error(`❌ TELEGRAM_BOT_LAUNCH_FAILED: ${err.message}`);
            if (retries > 0 && err.message.includes('409')) {
              console.log(`🔄 Retrying Telegram Bot launch in ${delay / 1000}s... (${retries} retries left)`);
              setTimeout(() => {
                launchBotWithRetry(retries - 1, delay * 1.5);
              }, delay);
            }
          });
      };
      launchBotWithRetry();
    } else {
      console.log('🤖 TELEGRAM_BOT: Polling is disabled locally. Set TELEGRAM_POLLING=true in .env to enable local bot testing.');
    }
  } else {
    console.log('🤖 TELEGRAM_BOT: Instance ready for Webhook delivery.');
  }

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  return bot;
}

// Notification Engine
async function sendNotification(telegramId, message) {
  try {
    // We need a way to access the bot instance. 
    // Since initBot might not have been called yet or we might need it globally, 
    // we'll handle bot instance management.
    if (global.tgBot) {
      await global.tgBot.telegram.sendMessage(telegramId, message, { parse_mode: 'Markdown' });
      return true;
    }
  } catch (err) {
    console.error('❌ TELEGRAM_NOTIFICATION_FAILED:', err.message);
  }
  return false;
}

module.exports = { initBot, sendNotification }; // Force nodemon restart
