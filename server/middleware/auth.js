const jwt = require('jsonwebtoken');
const fallbackDb = require('../utils/fallbackDb');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'nexovtech_secret_key_prime_2026';

// Propagate back to environment to ensure parity across all files
process.env.JWT_SECRET = JWT_SECRET;

// Verify JWT token and attach user + tenantId to req
// Accepts both:
//   1. Internal JWT (issued by /auth/login after Firebase verification) — preferred
//   2. Firebase ID Token (issued by Firebase directly) — fallback
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      console.warn('🔑 [AUTH] 401 Unauthorized: Authorization header token is missing.');
      return res.status(401).json({ message: 'No token, access denied' });
    }

    // ── 1. Try internal JWT first (fast, no network call) ────────────────────
    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // Fetch user from fallbackDb to prevent offline Postgres db crashes
      let user = await fallbackDb.findById('users', decoded.id);
      if (!user && (decoded.id === 'root' || decoded.id === 'root_admin_nexov' || decoded.role === 'Super Admin')) {
        user = {
          id: decoded.id || 'root_admin_nexov',
          name: 'NEXOVTECH ADMINISTRATION',
          email: 'nexovtech@myyahoo.com',
          role: 'Super Admin',
          department: 'Executive',
          status: 'Active',
          tenantId: decoded.tenantId || 'org_nexovtech'
        };
      }
      if (user) {
        req.user = user;
        req.tenantId = user.tenantId || decoded.tenantId || 'org_default';
        return next();
      } else {
        console.warn(`🔑 [AUTH] JWT verified but user ID "${decoded.id}" not found in database registry.`);
      }
    } catch (jwtErr) {
      console.warn(`🔑 [AUTH] JWT Verification failed: ${jwtErr.message}`);
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
      console.warn(`🔑 [AUTH] Firebase ID Token verification failed: ${fbErr.message}`);
      // Firebase token also invalid
      return res.status(401).json({ message: 'Token expired or invalid' });
    }
  } catch (err) {
    console.error('🔥 [AUTH] Middleware error:', err.message);
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

module.exports = { auth, requireRole, JWT_SECRET };
