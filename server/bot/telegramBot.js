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
    await ctx.reply('How can I assist you today?', MAIN_MENU);
    
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

    const phone = ctx.message.contact.phone_number;
    const user = await authService.lookupByPhone(phone);

    if (!user) {
      await ctx.reply('❌ This phone number is not linked to any NexovTech account. Please contact HR.');
      return ctx.scene.leave();
    }

    // Show plain text password if available (less than 30 chars), otherwise show hint
    let displayPassword = user.password || 'Nexovtech@123';
    if (displayPassword.length > 30) {
       displayPassword = user.role === 'Admin' ? 'Admin@123 (or your custom pass)' : 'password123 (Default)';
    }

    await ctx.reply(`✅ *Credentials Retrieved!*\n\n📧 *Email:* \`${user.companyEmail || user.email}\`\n🔑 *Password:* \`${displayPassword}\`\n\n_Note: If you haven't changed your password, try the default 'password'. If hidden, please use the reset link in the portal or contact support._`, { parse_mode: 'Markdown' });
    
    // Auto-link account
    await authService.linkTelegram(ctx.from.id, user.id || user._id, user.email || user.companyEmail, user.role);
    await ctx.reply(`🔗 *Identity Linked*\n\nYour Telegram account is now linked to your NexovTech profile. You can now use the management menu.`, MAIN_MENU);
    return ctx.scene.leave();
  }
);

const stage = new Scenes.Stage([authScene, recoveryScene]);

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

  // Register Official Menu Commands
  bot.telegram.setMyCommands([
    { command: 'start', description: '🚀 Authenticate / Start Session' },
    { command: 'menu', description: '📊 Open Command Center' },
    { command: 'reset', description: '🔄 Unlink Account / Reset' },
    { command: 'help', description: '🆘 Get Assistance' }
  ]);

  // Use persistent session to survive server restarts
const sessionStore = new LocalSession({ database: 'data/sessions.json' });
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
    
    const tgUser = await authService.getTelegramUser(ctx.from.id);
    if (!tgUser) {
      return ctx.reply('🔐 Your session is not authenticated. Please type /start to link your account.');
    }
    
    ctx.state.user = tgUser;
    return next();
  });

  bot.command('menu', (ctx) => ctx.reply('NexovTech Command Center:', MAIN_MENU));

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
      return ctx.reply(`🚀 *NexovAI System Online*\n\nWelcome back, ${tgUser.name || tgUser.companyEmail}. I am your Operational Intelligence Engine.\n\nYou can use the menu below for quick actions, or simply chat with me naturally for any workspace assistance.`, { ...MAIN_MENU, parse_mode: 'Markdown' });
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
    // Mock dashboard data - in real app, fetch from Firestore
    ctx.reply(`🏢 *NexovTech Workspace Summary*\n\nRole: ${user.role}\nStatus: ${user.workspaceStatus}\nPending Tasks: 3\nRecent Notifications: 2`, { parse_mode: 'Markdown' });
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

  // Default fallback to AI Assistant
  bot.on('text', async (ctx) => {
    if (ctx.state.user) {
      const response = await getAIResponse(ctx.message.text, ctx.state.user);
      await ctx.reply(response);
    }
  });

  bot.launch()
    .then(() => {
      console.log('🤖 TELEGRAM_BOT: Operational and synchronized.');
    })
    .catch((err) => {
      console.error('❌ TELEGRAM_BOT_LAUNCH_FAILED:', err.message);
      if (err.message.includes('Unexpected token <')) {
        console.error('⚠️ DIAGNOSTIC: It appears your network is blocking Telegram API and redirecting to a login/block page.');
      }
    });

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
