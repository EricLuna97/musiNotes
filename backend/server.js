const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const winston = require('winston');
const pool = require('./db');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
require('dotenv').config();

// Configure logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: "*"
}));
app.use(express.json({ limit: '10mb' })); // Limit request size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(helmet({
 contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    scriptSrc: ["'self'", "'unsafe-eval'", "blob:"],  // Added 'unsafe-eval' and 'blob:' for dev
    workerSrc: ["'self'", "blob:"],  // Explicitly allow workers from blob
    imgSrc: ["'self'", "data:", "https:"],
  },
}, 
}));

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Session middleware for Passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport Google Strategy (only if credentials are provided)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID_HERE') {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/google/callback`
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists with this Google ID
      let result = await pool.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);

      if (result.rows.length === 0) {
        // Check if user exists with this email
        result = await pool.query('SELECT * FROM users WHERE email = $1', [profile.emails[0].value]);

        if (result.rows.length === 0) {
          // Create new user
          const insertResult = await pool.query(
            'INSERT INTO users (email, google_id) VALUES ($1, $2) RETURNING *',
            [profile.emails[0].value, profile.id]
          );
          return done(null, insertResult.rows[0]);
        } else {
          // Link Google ID to existing user
          await pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [profile.id, result.rows[0].id]);
          return done(null, result.rows[0]);
        }
      } else {
        return done(null, result.rows[0]);
      }
    } catch (error) {
      return done(error, null);
    }
  }));
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (error) {
    done(error, null);
  }
});

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

// Input validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors', { errors: errors.array(), ip: req.ip });
    return res.status(400).json({
      error: 'Invalid input data',
      details: errors.array()
    });
  }
  next();
};

// API Routes

// User Registration with validation
app.post('/api/auth/register', [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
], handleValidationErrors, async (req, res) => {
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
});

// User Login with validation
app.post('/api/auth/login', loginLimiter, [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    logger.info('User login attempt', { email, ip: req.ip });

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);

    if (result.rows.length === 0) {
      logger.warn('Login attempt with non-existent email', { email, ip: req.ip });
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
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
});

// Google OAuth routes
app.get('/api/auth/google', (req, res) => {
  // Check if Google OAuth is configured
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
    return res.status(400).json({
      error: 'Google OAuth not configured',
      message: 'Google authentication is not available. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the server environment. Get credentials from Google Cloud Console.'
    });
  }

  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res);
});

app.get('/api/auth/google/callback', (req, res) => {
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
app.post('/api/auth/forgot-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
], handleValidationErrors, async (req, res) => {
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
});

app.post('/api/auth/reset-password', [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
], handleValidationErrors, async (req, res) => {
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
});

// Delete account with password confirmation
app.delete('/api/auth/delete-account', authenticateToken, [
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
], handleValidationErrors, async (req, res) => {
  try {
    const { password } = req.body;

    logger.info('Account deletion attempt', { userId: req.user.id, ip: req.ip });

    // Verify password
    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      logger.warn('Account deletion attempt with invalid password', { userId: req.user.id, ip: req.ip });
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Delete user (songs will be deleted due to CASCADE)
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]);

    logger.info('Account deleted successfully', { userId: req.user.id });
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    logger.error('Delete account error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a single song for authenticated user
app.get('/api/songs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID is a number
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid song ID' });
    }

    logger.info('Fetching single song', { songId: id, userId: req.user.id });

    const result = await pool.query(
      'SELECT song_id, title, artist, album, genre, lyrics, chords, created_at FROM songs WHERE song_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      logger.warn('Song not found', { songId: id, userId: req.user.id });
      return res.status(404).json({ error: 'Song not found or access denied' });
    }

    logger.info('Song fetched successfully', { songId: id, userId: req.user.id });
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Fetch single song error', {
      error: error.message,
      stack: error.stack,
      songId: req.params.id,
      userId: req.user.id
    });
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all songs for authenticated user with search and filter
app.get('/api/songs', authenticateToken, async (req, res) => {
  try {
    logger.info('Fetching songs for user', { userId: req.user.id, query: req.query });

    const { search, genre, sort = 'created_at', order = 'DESC' } = req.query;

    let query = 'SELECT song_id, title, artist, album, genre, lyrics, chords, created_at FROM songs WHERE user_id = $1';
    let params = [req.user.id];
    let paramIndex = 2;

    // Add search filter
    if (search) {
      query += ` AND (title ILIKE $${paramIndex} OR artist ILIKE $${paramIndex} OR album ILIKE $${paramIndex} OR lyrics ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Add genre filter
    if (genre) {
      query += ` AND genre ILIKE $${paramIndex}`;
      params.push(`%${genre}%`);
      paramIndex++;
    }

    // Add sorting
    const validSortFields = ['title', 'artist', 'album', 'genre', 'created_at'];
    const validOrders = ['ASC', 'DESC'];

    if (validSortFields.includes(sort) && validOrders.includes(order.toUpperCase())) {
      query += ` ORDER BY ${sort} ${order.toUpperCase()}`;
    } else {
      query += ' ORDER BY created_at DESC';
    }

    const result = await pool.query(query, params);

    logger.info('Songs fetched successfully', {
      userId: req.user.id,
      count: result.rows.length,
      filters: { search, genre, sort, order }
    });

    res.json(result.rows);
  } catch (error) {
    logger.error('Fetch songs error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new song with validation
app.post('/api/songs', authenticateToken, [
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters'),
  body('artist')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Artist must be between 1 and 255 characters'),
  body('album')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Album must be less than 255 characters'),
  body('genre')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Genre must be less than 255 characters'),
  body('lyrics')
    .optional()
    .isLength({ max: 10000 })
    .withMessage('Lyrics must be less than 10,000 characters'),
  body('chords')
    .optional()
    .isLength({ max: 10000 })
    .withMessage('Chords must be less than 10,000 characters'),
], handleValidationErrors, async (req, res) => {
  try {
    const { title, artist, album, genre, lyrics, chords } = req.body;

    logger.info('Creating new song', {
      userId: req.user.id,
      title,
      artist
    });

    const result = await pool.query(
      'INSERT INTO songs (title, artist, album, genre, lyrics, chords, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [title.trim(), artist.trim(), album?.trim() || null, genre?.trim() || null, lyrics?.trim() || null, chords?.trim() || null, req.user.id]
    );

    logger.info('Song created successfully', {
      songId: result.rows[0].song_id,
      userId: req.user.id
    });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Create song error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a song with validation
app.put('/api/songs/:id', authenticateToken, [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters'),
  body('artist')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Artist must be between 1 and 255 characters'),
  body('album')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Album must be less than 255 characters'),
  body('genre')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Genre must be less than 255 characters'),
  body('lyrics')
    .optional()
    .isLength({ max: 10000 })
    .withMessage('Lyrics must be less than 10,000 characters'),
  body('chords')
    .optional()
    .isLength({ max: 10000 })
    .withMessage('Chords must be less than 10,000 characters'),
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID is a number
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid song ID' });
    }

    const { title, artist, album, genre, lyrics, chords } = req.body;

    logger.info('Updating song', {
      songId: id,
      userId: req.user.id,
      updates: Object.keys(req.body)
    });

    const result = await pool.query(
      'UPDATE songs SET title = $1, artist = $2, album = $3, genre = $4, lyrics = $5, chords = $6 WHERE song_id = $7 AND user_id = $8 RETURNING *',
      [title?.trim(), artist?.trim(), album?.trim() || null, genre?.trim() || null, lyrics?.trim() || null, chords?.trim() || null, id, req.user.id]
    );

    if (result.rows.length === 0) {
      logger.warn('Song not found for update', { songId: id, userId: req.user.id });
      return res.status(404).json({ error: 'Song not found or access denied' });
    }

    logger.info('Song updated successfully', { songId: id, userId: req.user.id });
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Update song error', {
      error: error.message,
      stack: error.stack,
      songId: req.params.id,
      userId: req.user.id
    });
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a song
app.delete('/api/songs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID is a number
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid song ID' });
    }

    logger.info('Deleting song', { songId: id, userId: req.user.id });

    const result = await pool.query(
      'DELETE FROM songs WHERE song_id = $1 AND user_id = $2 RETURNING song_id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      logger.warn('Song not found for deletion', { songId: id, userId: req.user.id });
      return res.status(404).json({ error: 'Song not found or access denied' });
    }

    logger.info('Song deleted successfully', { songId: id, userId: req.user.id });
    res.json({ message: 'Song deleted successfully' });
  } catch (error) {
    logger.error('Delete song error', {
      error: error.message,
      stack: error.stack,
      songId: req.params.id,
      userId: req.user.id
    });
    res.status(500).json({ error: 'Server error' });
  }
});

// Download song as PDF
app.get('/api/songs/:id/pdf', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID is a number
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid song ID' });
    }

    logger.info('Generating PDF for song', { songId: id, userId: req.user.id });

    const result = await pool.query(
      'SELECT * FROM songs WHERE song_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found or access denied' });
    }

    const song = result.rows[0];

    // Create PDF
    const doc = new PDFDocument();
    const filename = `${song.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Add content to PDF
    doc.fontSize(24).text(song.title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(18).text(`By ${song.artist}`, { align: 'center' });
    if (song.album) {
      doc.fontSize(14).text(`Album: ${song.album}`, { align: 'center' });
    }
    if (song.genre) {
      doc.fontSize(14).text(`Genre: ${song.genre}`, { align: 'center' });
    }
    doc.moveDown(2);

    if (song.lyrics) {
      doc.fontSize(16).text('Lyrics:', { underline: true });
      doc.moveDown();
      doc.fontSize(12).text(song.lyrics, {
        align: 'left',
        lineGap: 5
      });
      doc.moveDown();
    }

    if (song.chords) {
      doc.fontSize(16).text('Chords:', { underline: true });
      doc.moveDown();
      doc.fontSize(12).text(song.chords, {
        align: 'left',
        lineGap: 5
      });
      doc.moveDown();
    }


    doc.end();

    logger.info('PDF generated successfully', { songId: id, userId: req.user.id });
  } catch (error) {
    logger.error('PDF generation error', {
      error: error.message,
      stack: error.stack,
      songId: req.params.id,
      userId: req.user.id
    });
    res.status(500).json({ error: 'Server error' });
  }
});

// Servir los archivos estáticos de la aplicación de React
const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'build');
app.use(express.static(frontendBuildPath));

// Para aplicaciones de una sola página, redirigir todas las rutas a index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  res.status(500).json({
    error: 'Internal server error',
    ...(isDevelopment && { details: err.message })
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn('404 - Route not found', {
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Iniciar el servidor
const server = app.listen(port, () => {
  logger.info(`Servidor de MusiNotes corriendo en http://localhost:${port}`, {
    port,
    environment: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
  });
  console.log(`🚀 Servidor de MusiNotes corriendo en http://localhost:${port}`);
  console.log("Visita esta URL en tu navegador para ver la aplicación.");
});
