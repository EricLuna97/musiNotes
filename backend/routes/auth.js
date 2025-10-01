const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const pool = require('../config/database');
const logger = require('../config/logger');
const { authenticateToken } = require('../middlewares/auth');
const {
  validateRegistration,
  validateLogin,
  validatePasswordReset,
  validateForgotPassword,
  validateDeleteAccount,
  handleValidationErrors
} = require('../middlewares/validation');
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  deleteAccount
} = require('../controllers/authController');

const router = express.Router();

// Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// User registration
router.post('/register', validateRegistration, handleValidationErrors, register);

// User login
router.post('/login', loginLimiter, validateLogin, handleValidationErrors, login);

// Google OAuth routes
router.get('/google', (req, res) => {
  // Check if Google OAuth is configured
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
    return res.status(400).json({
      error: 'Google OAuth not configured',
      message: 'Google authentication is not available. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the server environment. Get credentials from Google Cloud Console.'
    });
  }

  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res);
});

router.get('/google/callback', (req, res) => {
  // Check if Google OAuth is configured
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
    return res.status(400).json({
      error: 'Google OAuth not configured',
      message: 'Google authentication is not available. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the server environment. Get credentials from Google Cloud Console.'
    });
  }

  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login` })(req, res, (err) => {
    if (err) {
      logger.error('Google OAuth error', { error: err.message, stack: err.stack });
      return res.redirect(`${process.env.FRONTEND_URL}/?error=google_auth_failed`);
    }

    // Successful authentication, generate JWT and redirect to frontend
    const token = jwt.sign(
      {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        issuer: 'musinotes-api',
        audience: 'musinotes-client'
      }
    );

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/?token=${token}`);
  });
});

// Password reset routes
router.post('/forgot-password', validateForgotPassword, handleValidationErrors, forgotPassword);
router.post('/reset-password', validatePasswordReset, handleValidationErrors, resetPassword);

// Delete account
router.delete('/delete-account', authenticateToken, validateDeleteAccount, handleValidationErrors, deleteAccount);

module.exports = router;