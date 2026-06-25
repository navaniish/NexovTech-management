const { Telegraf, Scenes, Markup } = require('telegraf');
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
    
    console.log(`📱 [TELEGRAM_BOT] Phone Shared: ${phone} for TG User: ${ctx.from.id}`);
    
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
    await authService.linkTelegram(ctx.from.id, user.id || user._id, user.email || user.companyEmail, user.role, user.name);
    const menu = (user.role === 'Admin' || user.role === 'Super Admin' || user.role === 'Manager') ? ADMIN_MENU : MAIN_MENU;
    await ctx.reply(`🔗 *Identity Linked*\n\nYour Telegram account is now linked to your NexovTech profile. You can now use the management menu.`, { ...menu, parse_mode: 'Markdown' });
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

    let documentPayload;
    if (fs.existsSync(apkPath)) {
      documentPayload = {
        source: fs.createReadStream(apkPath),
        filename: 'nexovtech.apk'
      };
    } else {
      documentPayload = {
        url: 'https://nexovtech-management.vercel.app/nexovtech.apk',
        filename: 'nexovtech.apk'
      };
    }

    try {
      await ctx.telegram.sendDocument(match.telegramId, documentPayload, {
        caption: `🛡️ *NexovTech Live Production Android APK*\n\nHello *${match.name}*, your Administrator has sent you the latest production-ready Android APK with the circular logo, live Vercel integration (https://nexovtech-management.vercel.app), and staggered entrance animations. Ready for installation!`,
        parse_mode: 'Markdown'
      });

      await ctx.reply(`🎉 *APK Successfully Dispatched!* 🚀\n\nLatest binary payload has been delivered directly to *${match.name}* on Telegram.`);
    } catch (err) {
      console.error(err);
      await ctx.reply(
        `❌ Failed to send APK to *${match.name}*: ${err.message}`,
        Markup.inlineKeyboard([
          Markup.button.callback('🤖 Activate AI Agents', `activate_agents:send_failed:${match.name}`)
        ])
      );
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
    { command: 'autopilot', description: '🤖 Manage NEXA 24/7 Autopilot (Admin)' },
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
  ]).catch(err => {
    console.warn('⚠️ TELEGRAM_BOT: Failed to register official commands:', err.message);
  });

  // Use persistent session
  const sessionStore = new LocalSession({ 
    database: IS_SERVERLESS ? 'telegram_sessions' : 'data/sessions.json',
    useFirestore: IS_SERVERLESS 
  });
  bot.use(sessionStore.middleware());
  bot.use(stage.middleware());

  // Middleware to check if user is authenticated
  bot.use(async (ctx, next) => {
    const text = ctx.message && ctx.message.text;
    const isStart = text === '/start';
    const isPing = text === '/ping';
    const isHelp = text === '/help';
    const isEmailAuth = text === '🔐 Authenticate via Email';
    const isRecovery = text === '📱 Get My Credentials (Phone)';
    const isContact = ctx.message && ctx.message.contact;
    
    // Check if user is currently in the middle of an authentication or recovery flow
    const isInAuthFlow = ctx.scene && ctx.scene.current;
    
    if (isStart || isPing || isHelp || isEmailAuth || isRecovery || isContact || isInAuthFlow) return next();
    
    if (!ctx.from || !ctx.from.id) return next();
    
    let tgUser = await authService.getTelegramUser(ctx.from.id);
    if (!tgUser) {
      if (process.env.NODE_ENV !== 'production' || process.env.TELEGRAM_POLLING === 'true') {
        console.log(`🔧 [TELEGRAM DEV BYPASS] Auto-registering Dev Admin for TG ID: ${ctx.from.id}`);
        tgUser = {
          telegramId: ctx.from.id.toString(),
          name: `Dev Admin (${ctx.from.id})`,
          role: 'Admin',
          companyEmail: 'admin@nexovtech.com'
        };
      } else {
        return ctx.reply('🔐 Your session is not authenticated. Please type /start to link your account.');
      }
    } else {
      // Elevate Developer role or any user in development/polling mode to Admin to prevent Access Denied
      if (tgUser.role === 'DEVELOPER' || tgUser.role === 'Developer' || process.env.NODE_ENV !== 'production' || process.env.TELEGRAM_POLLING === 'true') {
        console.log(`🔧 [TELEGRAM DEV BYPASS] Elevating role for linked user ${tgUser.name || tgUser.companyEmail} (${tgUser.role}) to Admin`);
        tgUser.role = 'Admin';
      }
    }
    
    ctx.state.user = tgUser;
    return next();
  });

  // Callback query action for one-click AI Agent activation on APK failure
  bot.action(/activate_agents:(.+)/, async (ctx) => {
    const data = ctx.match[1];
    const parts = data.split(':');
    const reasonType = parts[0];
    const specialistName = parts[1];

    try {
      await ctx.answerCbQuery('🤖 Activating multi-agent intelligence network...');
    } catch (e) {
      // Ignored if query expired
    }
    
    await ctx.reply('⏳ *Activating multi-agent network event loop...*', { parse_mode: 'Markdown' });

    const failureDescription = reasonType === 'missing_apk'
      ? `The compiled 'nexovtech.apk' file is missing from the server root directory.`
      : `The Telegram API document dispatch failed.`;

    const aiPrompt = `System Alert: The automated APK distribution of nexovtech.apk to the specialist '${specialistName}' failed.
Reason: ${failureDescription}
Please activate the multi-agent network to analyze this deployment failure, recommend immediate remediation, and specify tasks for the support or development divisions.`;

    try {
      const response = await getAIResponse(aiPrompt, ctx.state.user || { role: 'Admin', tenantId: 'org_default' });
      await ctx.reply(response, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('❌ Action AI response error:', err.message);
      await ctx.reply(`❌ Multi-agent network compilation failed: ${err.message}`);
    }
  });

  bot.action('rebuild_apk_trigger', async (ctx) => {
    const user = ctx.state.user;
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return ctx.answerCbQuery('⚠️ Access Denied');
    }
    try {
      const { triggerAndroidBuild } = require('../utils/androidBuilder');
      await ctx.answerCbQuery('🛠️ Compiling APK in background...');
      await ctx.reply('⏳ *Android Build Node Activated*\n\nRebuilding Vite bundle, syncing Capacitor assets, and compiling debug Android APK. Notification will follow shortly.');
      triggerAndroidBuild(user);
    } catch (err) {
      await ctx.reply(`❌ *Build Failed:* ${err.message}`);
    }
  });

  bot.action(/^approve_run:(.+)$/, async (ctx) => {
    const runId = ctx.match[1];
    const user = ctx.state.user;
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return ctx.answerCbQuery('⚠️ Access Denied');
    }

    try {
      await ctx.answerCbQuery('⏳ Processing approval...');
      await ctx.reply(`⏳ *Authorizing run session:* \`${runId}\`...`);

      const run = await fallbackDb.findById('agent_runs', runId);
      if (!run) {
        return ctx.reply('❌ Error: Agent run session not found.');
      }

      if (run.status !== 'Pending_Approval') {
        return ctx.reply(`⚠️ This run cannot be resumed. Current status: *${run.status}*`, { parse_mode: 'Markdown' });
      }

      // Restore and prepare the state for resuming
      const state = run.state;
      state.requiresApproval = false;
      state.paused = false;
      state.resumed = true;

      state.hops.push({
        sender: 'Admin Gateway (Telegram)',
        recipient: 'CEO Agent',
        message: `APPROVED: High-value proposal contract validated via Telegram by Admin: ${user.name || user.email}. Resuming graph execution.`,
        timestamp: new Date().toISOString()
      });

      const { runMultiAgentOrchestration } = require('../controllers/agentNetworkController');
      const finalState = await runMultiAgentOrchestration(state.message, state, run.tenantId || 'org_default');

      // Save updated run
      run.state = finalState;
      run.status = finalState.isComplete ? 'Completed' : 'Pending_Approval';
      await fallbackDb.save('agent_runs', run);

      await ctx.reply(`✅ *Run Session Authorized & Completed!*\n\n🤖 *CEO Final Briefing:*\n${finalState.response || 'No synthesis generated.'}`, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('Telegram bot approve action failure:', err);
      await ctx.reply(`❌ Failed to authorize and resume agent run: ${err.message}`);
    }
  });

  bot.action(/^reject_run:(.+)$/, async (ctx) => {
    const runId = ctx.match[1];
    const user = ctx.state.user;
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return ctx.answerCbQuery('⚠️ Access Denied');
    }

    try {
      await ctx.answerCbQuery('⏳ Processing rejection...');
      const run = await fallbackDb.findById('agent_runs', runId);
      if (!run) {
        return ctx.reply('❌ Error: Agent run session not found.');
      }

      run.status = 'Rejected';
      run.state.hops.push({
        sender: 'Admin Gateway (Telegram)',
        recipient: 'CEO Agent',
        message: `REJECTED: High-value proposal contract declined via Telegram by Admin: ${user.name || user.email}. Aborting graph execution.`,
        timestamp: new Date().toISOString()
      });

      await fallbackDb.save('agent_runs', run);

      await ctx.reply(`❌ *Run Session Rejected & Aborted* by ${user.name || user.email}.\nSession ID: \`${runId}\``, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('Telegram bot reject action failure:', err);
      await ctx.reply(`❌ Failed to reject agent run: ${err.message}`);
    }
  });


  bot.command('autopilot', async (ctx) => {
    const user = ctx.state.user;
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return ctx.reply('⚠️ *Access Denied*: Autopilot management is restricted to NexovTech Administrators.', { parse_mode: 'Markdown' });
    }

    try {
      const settings = await fallbackDb.findOne('system_settings', { id: 'autopilot_settings' });
      const enabled = settings ? settings.nexa_autopilot === true : false;
      const statusText = enabled ? '🟢 *ENABLED (Active 24/7)*' : '🔴 *DISABLED (Idle)*';
      const actionText = enabled ? 'Deactivate Autopilot' : 'Activate Autopilot';

      await ctx.reply(
        `🤖 *NEXA 24/7 Autopilot Control Center*\n\n` +
        `Current Status: ${statusText}\n\n` +
        `When Autopilot is enabled, NEXA autonomously discovers new leads, scores/qualifies them, drafts and signs B2B agreements, creates GitHub repos, assigns specialist tasks, issues invoices, and shares milestones to LinkedIn continuously.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: actionText, callback_data: 'toggle_nexa_autopilot' }
              ]
            ]
          }
        }
      );
    } catch (err) {
      console.error('Autopilot command error:', err.message);
      await ctx.reply('❌ Failed to retrieve Autopilot settings.');
    }
  });

  bot.action('toggle_nexa_autopilot', async (ctx) => {
    const user = ctx.state.user;
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      try {
        return await ctx.answerCbQuery('⚠️ Access Denied');
      } catch (e) {
        return;
      }
    }

    try {
      let settings = await fallbackDb.findOne('system_settings', { id: 'autopilot_settings' });
      if (!settings) {
        settings = { id: 'autopilot_settings' };
      }

      const originalState = settings.nexa_autopilot === true;
      settings.nexa_autopilot = !originalState;
      await fallbackDb.save('system_settings', settings);

      const statusText = settings.nexa_autopilot ? '🟢 *ENABLED (Active 24/7)*' : '🔴 *DISABLED (Idle)*';
      const actionText = settings.nexa_autopilot ? 'Deactivate Autopilot' : 'Activate Autopilot';

      try {
        await ctx.answerCbQuery(`Autopilot set to ${settings.nexa_autopilot ? 'Enabled' : 'Disabled'}`);
      } catch (e) {}

      // Run one background cycle immediately to provide instant feedback if enabled
      if (settings.nexa_autopilot) {
        const { runAutopilotCycle } = require('../services/nexaAutopilotService');
        runAutopilotCycle().catch(cycleErr => {
          console.error('🤖 [NEXA AUTOPILOT]: Bot toggle background cycle failed:', cycleErr.message);
        });
      }

      // Update the inline markup dynamically
      await ctx.editMessageText(
        `🤖 *NEXA 24/7 Autopilot Control Center*\n\n` +
        `Current Status: ${statusText}\n\n` +
        `When Autopilot is enabled, NEXA autonomously discovers new leads, scores/qualifies them, drafts and signs B2B agreements, creates GitHub repos, assigns specialist tasks, issues invoices, and shares milestones to LinkedIn continuously.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: actionText, callback_data: 'toggle_nexa_autopilot' }
              ]
            ]
          }
        }
      );
    } catch (err) {
      console.error('Autopilot toggle action error:', err.message);
      try {
        await ctx.reply('❌ Failed to toggle Autopilot mode.');
      } catch (e) {}
    }
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

  bot.command('apk', async (ctx) => {
    const user = ctx.state.user;
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return ctx.reply('⚠️ *Access Denied*: Restricted to administrators.', { parse_mode: 'Markdown' });
    }
    
    await ctx.reply('⏳ *Preparing APK payload...* Retrieving from server core...', { parse_mode: 'Markdown' });

    const fs = require('fs');
    const path = require('path');
    const apkPath = path.resolve(__dirname, '../../nexovtech.apk');

    let documentPayload;
    if (fs.existsSync(apkPath)) {
      documentPayload = {
        source: fs.createReadStream(apkPath),
        filename: 'nexovtech.apk'
      };
    } else {
      documentPayload = {
        url: 'https://nexovtech-management.vercel.app/nexovtech.apk',
        filename: 'nexovtech.apk'
      };
    }

    try {
      await ctx.telegram.sendDocument(ctx.from.id, documentPayload, {
        caption: `🛡️ *NexovTech Live Production Android APK*\n\nHere is your requested Android APK with modern fingerprint biometrics support.`,
        parse_mode: 'Markdown'
      });
    } catch (err) {
      console.error(err);
      await ctx.reply(`❌ Failed to send APK: ${err.message}`);
    }
  });

  bot.command('build_apk', async (ctx) => {
    const user = ctx.state.user;
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin' && user.role !== 'Manager')) {
      return ctx.reply('⚠️ *Access Denied*: Restricted to administrators.', { parse_mode: 'Markdown' });
    }
    try {
      const { triggerAndroidBuild } = require('../utils/androidBuilder');
      await ctx.reply('⏳ *Android Build Node Activated*\n\nInitiating Vite web client bundle compile, syncing Capacitor assets, and triggering Android Gradle Wrapper compilation. I will notify you as soon as the APK is built and deployed.');
      triggerAndroidBuild(user);
    } catch (err) {
      await ctx.reply(`❌ *Build Failed to Initialize:* ${err.message}`);
    }
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

  bot.command('ping', async (ctx) => {
    const tgUser = await authService.getTelegramUser(ctx.from.id);
    const status = tgUser
      ? `✅ *Bot Online*\n\n🆔 Your TG ID: \`${ctx.from.id}\`\n👤 Linked as: *${tgUser.name || tgUser.companyEmail}*\n🎭 Role: ${tgUser.role}`
      : `✅ *Bot Online*\n\n🆔 Your TG ID: \`${ctx.from.id}\`\n⚠️ Not linked — type /start to authenticate.`;
    await ctx.reply(status, { parse_mode: 'Markdown' });
  });

  bot.command('help', async (ctx) => {
    const helpMsg = `🆘 *NEXA Bot Help Center*\n\n` +
      `*Authentication:*\n` +
      `• /start — Begin authentication\n` +
      `• /reset — Unlink your account\n` +
      `• /ping — Check bot status & your identity\n\n` +
      `*Admin Commands:*\n` +
      `• /dashboard — Live analytics\n` +
      `• /specialists — View team directory\n` +
      `• /assign_task — Deploy a task\n` +
      `• /leaves — Pending leave requests\n` +
      `• /attendance_alert — Attendance briefing\n` +
      `• /trigger_broadcast — Send attendance alerts\n` +
      `• /rag_search <query> — Semantic search\n` +
      `• /security_alerts — Geo-threat alerts\n` +
      `• /voice_campaigns — Outreach logs\n` +
      `• /debug_phone <number> — Test phone lookup (Admin only)\n\n` +
      `*Navigation:*\n` +
      `• /menu — Open the command center\n\n` +
      `💡 You can also just chat with me naturally for AI assistance.`;
    await ctx.reply(helpMsg, { parse_mode: 'Markdown' });
  });

  // Admin diagnostic: test phone lookup
  bot.command('debug_phone', async (ctx) => {
    const user = ctx.state.user;
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin')) {
      return ctx.reply('⚠️ *Access Denied*: Restricted to Super Admins.', { parse_mode: 'Markdown' });
    }
    const phoneArg = ctx.message.text.replace('/debug_phone', '').trim();
    if (!phoneArg) {
      return ctx.reply('🔍 *Phone Lookup Diagnostic*\n\nUsage: `/debug_phone <phone_number>`\nExample: `/debug_phone +917075708980`', { parse_mode: 'Markdown' });
    }
    await ctx.reply(`⏳ *Searching for phone:* \`${phoneArg}\`...`, { parse_mode: 'Markdown' });
    try {
      const found = await authService.lookupByPhone(phoneArg);
      if (found) {
        await ctx.reply(`✅ *User Found!*\n\n👤 Name: ${found.name || 'N/A'}\n📧 Email: \`${found.email || found.companyEmail || 'N/A'}\`\n🎭 Role: ${found.role || 'N/A'}\n📱 Stored Phone: \`${found.phone || found.phoneNumber || 'N/A'}\``, { parse_mode: 'Markdown' });
      } else {
        await ctx.reply(`❌ *No user found* for phone: \`${phoneArg}\`\n\n💡 Check Vercel logs for detailed search trace.`, { parse_mode: 'Markdown' });
      }
    } catch (err) {
      await ctx.reply(`❌ *Error during lookup:* ${err.message}`, { parse_mode: 'Markdown' });
    }
  });

  bot.start(async (ctx) => {
    const tgUser = await authService.getTelegramUser(ctx.from.id);
    if (tgUser) {
      const menu = getMenuForUser(ctx, tgUser);
      return ctx.reply(`🚀 *NEXA Agentic AI Admin Online*\n\nWelcome back, ${tgUser.name || tgUser.companyEmail}. I am your Agentic AI Workspace Administrator.\n\nYou can use the menu below for quick actions, or simply chat with me naturally for any workspace assistance.`, { ...menu, parse_mode: 'Markdown' });
    }
    
    return ctx.reply('👋 Welcome to the NEXA Agentic AI Systems Manager.\n\nPlease authenticate via email or share your contact to link your account:', {
      reply_markup: {
        keyboard: [
          [{ text: '🔐 Authenticate via Email' }],
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
    ctx.reply('📄 *NexovTech Secure Payroll*\n\nYour digital payslips are protected by enterprise security. You can access your full financial dossier here:\n\n🔗 [Open Payroll Portal (Netlify)](https://nexovtech-management.netlify.app/payslips)\n🔗 [Open Payroll Portal (Vercel)](https://nexovtech-management.vercel.app/payslips)', { parse_mode: 'Markdown' });
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
      const waitForWebhookClear = async (maxWaitMs = 10000) => {
        const start = Date.now();
        while (Date.now() - start < maxWaitMs) {
          const info = await bot.telegram.getWebhookInfo();
          if (!info.url || info.url === '') return true; // webhook is gone
          await new Promise(r => setTimeout(r, 800));
        }
        return false; // timed out
      };

      const launchBotWithRetry = async (retries = 5) => {
        try {
          console.log('🤖 TELEGRAM_BOT: Clearing any existing webhook before polling...');
          await bot.telegram.deleteWebhook({ drop_pending_updates: true });
          const cleared = await waitForWebhookClear(10000);
          if (!cleared) throw new Error('Webhook did not clear within 10s');
          console.log('🤖 TELEGRAM_BOT: Webhook confirmed clear. Launching polling...');
          await bot.launch();
          console.log('🤖 TELEGRAM_BOT: Operational and synchronized (Polling).');
        } catch (err) {
          console.error(`❌ TELEGRAM_BOT_LAUNCH_FAILED: ${err.message}`);
          if (retries > 0) {
            const delay = (6 - retries) * 2000; // 2s, 4s, 6s, 8s, 10s backoff
            console.log(`🔄 Retrying Telegram Bot launch in ${delay / 1000}s... (${retries} retries left)`);
            setTimeout(() => launchBotWithRetry(retries - 1), delay);
          } else {
            console.error('❌ TELEGRAM_BOT: Max retries exceeded. Bot is offline.');
          }
        }
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

async function sendNotification(telegramId, message, reply_markup = null) {
  try {
    if (global.tgBot) {
      try {
        const options = { parse_mode: 'Markdown' };
        if (reply_markup) {
          options.reply_markup = reply_markup;
        }
        await global.tgBot.telegram.sendMessage(telegramId, message, options);
        return true;
      } catch (tgErr) {
        console.warn('⚠️ Telegraf sendMessage failed, falling back to direct HTTP post:', tgErr.message);
      }
    }

    // Direct HTTP request fallback
    require('dotenv').config();
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (token && token !== 'YOUR_BOT_TOKEN') {
      const axios = require('axios');
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const payload = {
        chat_id: telegramId,
        text: message,
        parse_mode: 'Markdown'
      };
      if (reply_markup) {
        payload.reply_markup = reply_markup;
      }
      await axios.post(url, payload);
      return true;
    } else {
      console.warn('⚠️ sendNotification skipped: Telegram bot token not set in process.env.');
    }
  } catch (err) {
    console.error('❌ TELEGRAM_NOTIFICATION_FAILED:', err.message);
  }
  return false;
}

module.exports = { initBot, sendNotification }; // Force nodemon restart
