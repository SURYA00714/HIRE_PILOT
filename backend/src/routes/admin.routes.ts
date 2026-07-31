import { Router } from 'express';
import { getPlatformStats, getAllUsers } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Secure all admin routes with authentication and ADMIN role check
router.use(authenticate, authorize(['ADMIN']));

router.get('/stats', getPlatformStats);
router.get('/users', getAllUsers);

export default router;
