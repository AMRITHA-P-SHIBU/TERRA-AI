import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  signupIndividual,
  signupOrganization,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  changePassword,
  syncPassword,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import { documentUpload } from '../middleware/upload.js';

const router = Router();

// Rate limiters for security against brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 signups per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many account creation attempts. Please try again later.' },
});

// Authentication endpoints
router.post('/signup/individual', signupLimiter, signupIndividual);
router.post('/signup/organization', signupLimiter, documentUpload.single('document'), signupOrganization);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

// Password & Email verification
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/sync-password', authLimiter, syncPassword);
router.post('/change-password', authenticate, changePassword);
router.get('/verify-email', verifyEmail);

export default router;
