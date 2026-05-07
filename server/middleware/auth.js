const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token and attach user to req
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token, access denied' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'Token invalid' });

    req.user = user;
    next();
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
