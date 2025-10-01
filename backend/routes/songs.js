const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middlewares/auth');
const { validateSong, handleValidationErrors } = require('../middlewares/validation');
const {
  getSong,
  getSongs,
  createSong,
  updateSong,
  deleteSong,
  downloadSongPDF
} = require('../controllers/songController');

const router = express.Router();

// Rate limiter for API requests
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all song routes
router.use(apiLimiter);

// Get all songs for authenticated user
router.get('/', authenticateToken, getSongs);

// Get a single song
router.get('/:id', authenticateToken, getSong);

// Create a new song
router.post('/', authenticateToken, validateSong, handleValidationErrors, createSong);

// Update a song
router.put('/:id', authenticateToken, validateSong, handleValidationErrors, updateSong);

// Delete a song
router.delete('/:id', authenticateToken, deleteSong);

// Download song as PDF
router.get('/:id/pdf', authenticateToken, downloadSongPDF);

module.exports = router;