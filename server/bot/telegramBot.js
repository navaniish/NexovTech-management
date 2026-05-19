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
    await ctx.reply('👋 Welcome to NexovTech Management Assistant.\n\nPlease enter your company email to authenticate:');
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
    await ctx.reply(`✅ *Identity Verified!*\n\nWelcome to the NexovTech ecosystem, ${name}. Your account is now securely linked.\n\n🤖 *NexovAI* is now active and ready to assist you.`, { parse_mode: 'Markdown' });
    
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
    { command: 'dashboard', description: '📊 Live Analytics Briefing (Admin)' },
    { command: 'assign_task', description: '🚀 Deploy Task to Specialist (Admin)' },
    { command: 'send_apk', description: '📤 Distribute APK to Specialist (Admin)' },
    { command: 'attendance_alert', description: '📅 Daily Attendance Briefing' },
    { command: 'specialists', description: '👥 View Specialist Directory (Admin)' },
    { command: 'leaves', description: '🚀 View Pending Leaves (Admin)' },
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

  bot.command('menu', (ctx) => {
    const user = ctx.state.user;
    const menu = (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) ? MAIN_MENU : ADMIN_MENU;
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
                           `🤖 *NexovAI Systems Management Online*`;

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
      const menu = (tgUser.role === 'Admin' || tgUser.role === 'Super Admin' || tgUser.role === 'Manager') ? ADMIN_MENU : MAIN_MENU;
      return ctx.reply(`🚀 *NexovAI System Online*\n\nWelcome back, ${tgUser.name || tgUser.companyEmail}. I am your Operational Intelligence Engine.\n\nYou can use the menu below for quick actions, or simply chat with me naturally for any workspace assistance.`, { ...menu, parse_mode: 'Markdown' });
    }
    
    return ctx.reply('👋 Welcome to NexovTech Management Assistant.\n\nPlease share your contact to retrieve your credentials and link your account:', {
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
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return ctx.reply(`🏢 *NexovTech Workspace Summary*\n\nRole: ${user.role}\nStatus: ${user.workspaceStatus}\nPending Tasks: 3\nRecent Notifications: 2`, { parse_mode: 'Markdown' });
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
                           `🤖 *NexovAI Systems Management Online*`;

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

  bot.hears('🚀 AI Workspace Assistant', (ctx) => {
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

  // Default fallback to AI Assistant
  bot.on('text', async (ctx) => {
    if (ctx.state.user) {
      const response = await getAIResponse(ctx.message.text, ctx.state.user);
      await ctx.reply(response);
    }
  });

  // Only launch polling if NOT serverless
  if (!IS_SERVERLESS) {
    bot.launch()
      .then(() => {
        console.log('🤖 TELEGRAM_BOT: Operational and synchronized (Polling).');
      })
      .catch((err) => {
        console.error('❌ TELEGRAM_BOT_LAUNCH_FAILED:', err.message);
      });
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

module.exports = { initBot, sendNotification };
