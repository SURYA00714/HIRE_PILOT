import { Router } from 'express';
import { register, login, oauthGoogle, oauthGithub } from '../controllers/auth.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);

router.get('/google', oauthGoogle);
router.get('/github', oauthGithub);

// Example protected route for testing
router.get('/me', authenticate, (req, res) => {
  res.json({ message: 'You are authenticated', user: (req as any).user });
});

router.get('/admin', authenticate, authorize(['ADMIN']), (req, res) => {
  res.json({ message: 'Welcome Admin' });
});

export default router;
