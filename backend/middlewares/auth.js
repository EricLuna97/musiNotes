const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      logger.warn('Access attempt without token', { ip: req.ip, path: req.path });
      return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        logger.warn('Invalid token attempt', { ip: req.ip, error: err.message });
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      req.user = user;
      next();
    });
  } catch (error) {
    logger.error('Authentication middleware error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Authentication error' });
  }
};

module.exports = {
  authenticateToken
};