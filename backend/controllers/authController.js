const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const pool = require('../config/database');
const logger = require('../config/logger');

// Nodemailer transporter for password reset
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// User Registration
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    logger.info('User registration attempt', { username, email, ip: req.ip });

    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12); // Increased rounds for better security
    }

    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username ? username.toLowerCase() : null, email.toLowerCase(), hashedPassword]
    );

    logger.info('User registered successfully', { userId: result.rows[0].id, username });
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Registration error', { error: error.message, stack: error.stack });

    if (error.code === '23505') {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
};

// User Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    logger.info('User login attempt', { email, ip: req.ip });

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);

    if (result.rows.length === 0) {
      logger.warn('Login attempt with non-existent email', { email, ip: req.ip });
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check if user is a Google OAuth user (no password)
    if (user.google_id) {
      logger.warn('Password login attempt for Google OAuth user', { userId: user.id, email, ip: req.ip });
      return res.status(400).json({
        error: 'This account uses Google authentication',
        message: 'Please use "Login with Google" instead of password login'
      });
    }

    // Check if user has a password (traditional registration)
    if (!user.password_hash) {
      logger.warn('Login attempt for user without password', { userId: user.id, email, ip: req.ip });
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      logger.warn('Login attempt with invalid password', { userId: user.id, ip: req.ip });
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token with expiration
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        issuer: 'musinotes-api',
        audience: 'musinotes-client'
      }
    );

    logger.info('User logged in successfully', { userId: user.id, username: user.username });
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    });
  } catch (error) {
    logger.error('Login error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

// Password reset request
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    logger.info('Password reset request', { email, ip: req.ip });

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);

    if (result.rows.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }

    const user = result.rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store reset token
    await pool.query(
      'UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3',
      [resetToken, resetExpires, user.id]
    );

    // Send email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset - MusiNotes',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your MusiNotes account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    logger.info('Password reset email sent', { userId: user.id });
    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (error) {
    logger.error('Forgot password error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

// Reset password with token
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    logger.info('Password reset attempt', { ip: req.ip });

    const result = await pool.query(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_expires > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = result.rows[0];
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password and clear reset token
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2',
      [hashedPassword, user.id]
    );

    logger.info('Password reset successful', { userId: user.id });
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    logger.error('Reset password error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete account
const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    logger.info('Account deletion attempt', { userId: req.user.id, ip: req.ip });

    // Get user information
    const userResult = await pool.query('SELECT password_hash, google_id FROM users WHERE id = $1', [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // For Google OAuth users, skip password verification
    if (user.google_id) {
      logger.info('Account deletion for Google OAuth user (no password verification)', { userId: req.user.id, ip: req.ip });
    } else {
      // For traditional users, verify password
      if (!user.password_hash) {
        logger.warn('Account deletion attempt for user without password', { userId: req.user.id, ip: req.ip });
        return res.status(400).json({ error: 'Account configuration error' });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);

      if (!validPassword) {
        logger.warn('Account deletion attempt with invalid password', { userId: req.user.id, ip: req.ip });
        return res.status(400).json({ error: 'Invalid password' });
      }
    }

    // Delete user (songs will be deleted due to CASCADE)
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]);

    logger.info('Account deleted successfully', { userId: req.user.id });
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    logger.error('Delete account error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  deleteAccount
};