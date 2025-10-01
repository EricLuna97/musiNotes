const { body, validationResult } = require('express-validator');
const logger = require('../config/logger');

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

// Validation rules for user registration
const validateRegistration = [
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
];

// Validation rules for user login
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Validation rules for password reset
const validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
];

// Validation rules for forgot password
const validateForgotPassword = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
];

// Validation rules for account deletion
const validateDeleteAccount = [
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Validation rules for song creation/update
const validateSong = [
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
];

module.exports = {
  handleValidationErrors,
  validateRegistration,
  validateLogin,
  validatePasswordReset,
  validateForgotPassword,
  validateDeleteAccount,
  validateSong
};