const jwt = require('jsonwebtoken');
const fallbackDb = require('../utils/fallbackDb');

// Verify JWT token and attach user + tenantId to req
// Accepts both:
//   1. Internal JWT (issued by /auth/login after Firebase verification) — preferred
//   2. Firebase ID Token (issued by Firebase directly) — fallback
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token, access denied' });

    // ── 1. Try internal JWT first (fast, no network call) ────────────────────
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexovtech_secret_key');

      // Fetch user from fallbackDb to prevent offline Postgres db crashes
      const user = await fallbackDb.findById('users', decoded.id);
      if (user) {
        req.user = user;
        req.tenantId = user.tenantId || decoded.tenantId || 'org_default';
        return next();
      }
    } catch (jwtErr) {
      // Not a valid JWT — may be a Firebase ID token, fall through
    }

    // ── 2. Try Firebase ID Token (when backend JWT hasn't been issued yet) ───
    try {
      const { admin } = require('../firebaseAdmin');
      const decodedFirebase = await admin.auth().verifyIdToken(token);

      // Look up or auto-provision the user
      let user = await fallbackDb.findOne('users', { email: decodedFirebase.email });
      if (!user) {
        // Auto-provision a minimal profile so the request can proceed
        user = {
          id: decodedFirebase.uid,
          email: decodedFirebase.email,
          firebaseUid: decodedFirebase.uid,
          role: decodedFirebase.email === 'nexovtech@myyahoo.com' ? 'Super Admin' : 'Employee',
          tenantId: 'org_default'
        };
      }

      req.user = user;
      req.tenantId = user.tenantId || 'org_default';
      return next();
    } catch (fbErr) {
      // Firebase token also invalid
      return res.status(401).json({ message: 'Token expired or invalid' });
    }
  } catch (err) {
    res.status(401).json({ message: 'Token expired or invalid' });
  }
};

// Restrict to specific roles
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied: insufficient permissions' });
  }
  next();
};

module.exports = { auth, requireRole };
