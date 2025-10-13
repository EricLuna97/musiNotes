// Load environment variables FIRST
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('passport');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./config/database');
const logger = require('./config/logger');

const app = express();
const port = process.env.PORT || 3001;

// Import routes
const authRoutes = require('./routes/auth');
const songRoutes = require('./routes/songs');

// Security middleware - CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    // In development, allow localhost
    if (process.env.NODE_ENV === 'development') {
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }

    // In production, only allow specific origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-eval'", "blob:"],
      workerSrc: ["'self'", "blob:"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Session middleware for Passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
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
          // Create new user - generate unique username from email or display name
          const emailUsername = profile.emails[0].value.split('@')[0];
          let generatedUsername = profile.displayName ?
            profile.displayName.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() :
            emailUsername.replace(/[^a-zA-Z0-9_]/g, '');

          // Ensure username is not empty and handle duplicates
          if (!generatedUsername) {
            generatedUsername = `user_${Date.now()}`;
          }

          // Check if username exists and generate unique one
          let usernameExists = true;
          let finalUsername = generatedUsername;
          let counter = 1;

          while (usernameExists) {
            const usernameCheck = await pool.query('SELECT id FROM users WHERE username = $1', [finalUsername]);
            if (usernameCheck.rows.length === 0) {
              usernameExists = false;
            } else {
              finalUsername = `${generatedUsername}_${counter}`;
              counter++;
            }
          }

          const insertResult = await pool.query(
            'INSERT INTO users (username, email, google_id) VALUES ($1, $2, $3) RETURNING *',
            [finalUsername, profile.emails[0].value, profile.id]
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
    // Validate that id is a number
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return done(null, false);
    }

    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      // User doesn't exist (e.g., account was deleted)
      // Return false to clear the session
      return done(null, false);
    }

    done(null, result.rows[0]);
  } catch (error) {
    logger.error('Deserialize user error', { error: error.message, userId: id });
    done(error, null);
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve static files from React build
const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'build');
app.use(express.static(frontendBuildPath));

// For single-page applications, redirect all routes to index.html
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

// Start server
const server = app.listen(port, () => {
  logger.info(`MusiNotes server running on http://localhost:${port}`, {
    port,
    environment: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
  });
  console.log(`🚀 MusiNotes server running on http://localhost:${port}`);
  console.log("Visit this URL in your browser to see the application.");
});
