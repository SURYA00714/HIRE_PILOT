import { Router } from 'express';
import { register, login, getMe, oauthGoogle, oauthGithub } from '../controllers/auth.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimiter';
import { validate, registerSchema, loginSchema } from '../middleware/validation';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);

router.get('/google', oauthGoogle);
router.get('/github', oauthGithub);

// Get current user (for session verification)
router.get('/me', authenticate, getMe);

// Admin check endpoint
router.get('/admin', authenticate, authorize(['ADMIN']), (_req, res) => {
  res.json({ message: 'Welcome Admin' });
});

export default router;
