const { db } = require('../firebaseAdmin');
const fallbackDb = require('../utils/fallbackDb');
const speakeasy = require('speakeasy');

class AuthService {
  async verifyEmail(email) {
    const emailLower = email.toLowerCase();
    const user = await fallbackDb.findOne('users', { email: emailLower }) || 
                 await fallbackDb.findOne('users', { companyEmail: emailLower });
    return user;
  }

  async generateOTP(email) {
    // In a real system, you'd send this via email.
    // For this implementation, we'll store it in a temporary collection.
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await fallbackDb.save('telegram_otps', {
      email: email.toLowerCase(),
      otp,
      expiresAt
    });

    console.log(`[TELEGRAM_BOT] OTP for ${email}: ${otp}`);
    return otp;
  }

  async verifyOTP(email, otp) {
    const record = await fallbackDb.findOne('telegram_otps', { 
      email: email.toLowerCase(), 
      otp 
    });

    const expiry = record?.expiresAt?.toDate ? record.expiresAt.toDate() : new Date(record?.expiresAt);
    if (record && expiry > new Date()) {
      // Valid OTP
      return true;
    }
    return false;
  }

  async linkTelegram(telegramId, firebaseUid, email, role) {
    const mapping = {
      telegramId: telegramId.toString(),
      firebaseUid,
      companyEmail: email,
      role,
      workspaceStatus: 'Active',
      linkedAt: new Date()
    };

    await fallbackDb.save('telegram_users', mapping);
    
    // Also update the user record to include telegramId
    const user = await fallbackDb.findOne('users', { email: email.toLowerCase() });
    if (user) {
      await fallbackDb.update('users', user.id || user._id, { telegramId: telegramId.toString() });
    }

    return mapping;
  }

  async getTelegramUser(telegramId) {
    return await fallbackDb.findOne('telegram_users', { telegramId: telegramId.toString() });
  }
}

module.exports = new AuthService();
