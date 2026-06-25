const fs = require('fs');
const path = require('path');
const { db } = require('../firebaseAdmin');

const timeoutPromise = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore operation timeout')), ms));

class LocalSession {
  constructor(options = {}) {
    this.database = options.database || 'data/sessions.json';
    this.useFirestore = options.useFirestore || false;
    this.sessions = {};
    if (!this.useFirestore) {
      this.load();
    }
  }

  load() {
    if (fs.existsSync(this.database)) {
      try {
        this.sessions = JSON.parse(fs.readFileSync(this.database, 'utf8'));
      } catch (e) {
        this.sessions = {};
      }
    }
  }

  async save(key, session) {
    if (this.useFirestore && db) {
      try {
        await Promise.race([
          db.collection(this.database).doc(key).set(session),
          timeoutPromise(1500)
        ]);
      } catch (e) {
        console.error('Cloud Session save failed:', e.message);
      }
    } else {
      try {
        this.sessions[key] = session;
        const dir = path.dirname(this.database);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(this.database, JSON.stringify(this.sessions, null, 2));
      } catch (e) {
        console.error('Local Session save failed:', e.message);
      }
    }
  }

  middleware() {
    return async (ctx, next) => {
      if (!ctx.from) return next();
      
      const chatId = ctx.chat ? ctx.chat.id : ctx.from.id;
      const key = `${ctx.from.id}:${chatId}`;
      
      if (this.useFirestore && db) {
        try {
          const doc = await Promise.race([
            db.collection(this.database).doc(key).get(),
            timeoutPromise(1500)
          ]);
          ctx.session = doc.exists ? doc.data() : {};
        } catch (e) {
          ctx.session = {};
        }
      } else {
        ctx.session = this.sessions[key] || {};
      }
      
      await next();
      
      await this.save(key, ctx.session);
    };
  }
}

module.exports = LocalSession;
