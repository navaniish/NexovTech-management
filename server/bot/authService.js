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

  async lookupByPhone(phone) {
    // 1. Standardize incoming phone number (digits only)
    const cleanIncoming = phone.replace(/\D/g, '');
    if (!cleanIncoming) return null;

    // 2. Try direct match first (for performance)
    let user = await fallbackDb.findOne('users', { phone: cleanIncoming });
    if (user) return user;

    // 3. Fallback: Robust search (Handle spaces, dashes, etc. in DB)
    // Since the database might store "+91 12345 67890", a literal match fails.
    const allUsers = await fallbackDb.find('users', {});
    
    // Helper to get last 10 digits
    const getTail = (p) => p.replace(/\D/g, '').slice(-10);
    const incomingTail = getTail(cleanIncoming);

    for (const u of allUsers) {
      if (!u.phone) continue;
      const dbPhoneClean = u.phone.replace(/\D/g, '');
      const dbTail = getTail(u.phone);

      // Match full digits or last 10 digits
      if (dbPhoneClean === cleanIncoming || (dbTail && dbTail === incomingTail)) {
        return u;
      }
    }

    return null;
  }

  async unlinkTelegram(telegramId) {
    const tid = telegramId.toString();
    const record = await fallbackDb.findOne('telegram_users', { telegramId: tid });
    if (record) {
      // 1. Remove from mapping collection
      await fallbackDb.deleteOne('telegram_users', record.id || record._id);
      
      // 2. Clear from user profile
      const user = await fallbackDb.findOne('users', { telegramId: tid });
      if (user) {
        await fallbackDb.update('users', user.id || user._id, { telegramId: null });
      }
      return true;
    }
    return false;
  }
}

module.exports = new AuthService();
