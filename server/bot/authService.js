const { db } = require('../firebaseAdmin');
const fallbackDb = require('../utils/fallbackDb');
const speakeasy = require('speakeasy');

// Helper: normalize phone digits
const cleanPhone = (p) => (p || '').replace(/\D/g, '');
// Helper: last 10 digits for flexible matching
const phoneTail = (p) => cleanPhone(p).slice(-10);

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

  async linkTelegram(telegramId, firebaseUid, email, role, name) {
    // Build full mapping with name for greeting
    let resolvedName = name;
    if (!resolvedName) {
      try {
        const u = await fallbackDb.findOne('users', { email: email.toLowerCase() });
        resolvedName = u?.name || u?.displayName || email;
      } catch (e) { resolvedName = email; }
    }

    const mapping = {
      telegramId: telegramId.toString(),
      firebaseUid,
      companyEmail: email,
      name: resolvedName,
      role,
      workspaceStatus: 'Active',
      linkedAt: new Date()
    };

    await fallbackDb.save('telegram_users', mapping);
    
    // Also update the user record to include telegramId
    try {
      const user = await fallbackDb.findOne('users', { email: email.toLowerCase() }) ||
                   await fallbackDb.findOne('users', { companyEmail: email.toLowerCase() });
      if (user) {
        await fallbackDb.update('users', user.id || user._id, { telegramId: telegramId.toString() });
      }
    } catch (e) { console.warn('linkTelegram user update failed:', e.message); }

    return mapping;
  }

  async getTelegramUser(telegramId) {
    return await fallbackDb.findOne('telegram_users', { telegramId: telegramId.toString() });
  }

  async lookupByPhone(phone) {
    const incomingClean = cleanPhone(phone);
    if (!incomingClean) return null;

    const incomingTail = phoneTail(incomingClean);
    console.log(`📱 [AUTH] lookupByPhone: raw="${phone}" clean="${incomingClean}" tail="${incomingTail}"`);

    // Check any record from a collection for phone match
    const matchByPhone = (records) => {
      const PHONE_FIELDS = ['phone', 'phoneNumber', 'mobile', 'contactNumber'];
      for (const u of records) {
        for (const field of PHONE_FIELDS) {
          if (!u[field]) continue;
          const dbTail = phoneTail(u[field]);
          const dbClean = cleanPhone(u[field]);
          console.log(`   checking [${field}="${u[field]}"] tail="${dbTail}" vs incoming tail="${incomingTail}"`);
          if (dbClean === incomingClean || (dbTail && dbTail.length === 10 && dbTail === incomingTail)) {
            console.log(`   ✅ MATCH FOUND for field ${field}`);
            return u;
          }
        }
      }
      return null;
    };

    // 1. Try direct Firestore scan of 'users' collection
    try {
      if (db) {
        const snap = await db.collection('users').get();
        const allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log(`📱 [AUTH] Firestore users scan: ${allUsers.length} records`);
        const found = matchByPhone(allUsers);
        if (found) return found;

        // 2. Try 'employees' collection as well
        const empSnap = await db.collection('employees').get();
        const allEmps = empSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log(`📱 [AUTH] Firestore employees scan: ${allEmps.length} records`);
        const foundEmp = matchByPhone(allEmps);
        if (foundEmp) return foundEmp;
      }
    } catch (err) {
      console.warn(`⚠️ [AUTH] Firestore phone lookup failed: ${err.message}`);
    }

    // 3. Final fallback: local JSON files
    const localUsers = await fallbackDb.find('users', {});
    console.log(`📱 [AUTH] Local users fallback: ${localUsers.length} records`);
    const localFound = matchByPhone(localUsers);
    if (localFound) return localFound;

    const localEmps = await fallbackDb.find('employees', {});
    console.log(`📱 [AUTH] Local employees fallback: ${localEmps.length} records`);
    return matchByPhone(localEmps);
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
