const fs = require('fs');
const path = require('path');

class LocalSession {
  constructor(options = {}) {
    this.database = options.database || 'data/sessions.json';
    this.sessions = {};
    this.load();
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

  save() {
    try {
      const dir = path.dirname(this.database);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.database, JSON.stringify(this.sessions, null, 2));
    } catch (e) {
      console.error('Session save failed:', e.message);
    }
  }

  middleware() {
    return async (ctx, next) => {
      if (!ctx.from) return next();
      
      const key = `${ctx.from.id}:${ctx.chat.id}`;
      ctx.session = this.sessions[key] || {};
      
      await next();
      
      this.sessions[key] = ctx.session;
      this.save();
    };
  }
}

module.exports = LocalSession;
