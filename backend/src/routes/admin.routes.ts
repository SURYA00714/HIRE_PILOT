import { Router } from 'express';
import { getAdminDashboard, getAllUsers, getAuditLogs } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Secure all admin routes with authentication and ADMIN role check
router.use(authenticate, authorize(['ADMIN']));

router.get('/dashboard', getAdminDashboard);
router.get('/stats', getAdminDashboard); // alias
router.get('/users', getAllUsers);
router.get('/audit-logs', getAuditLogs);

export default router;
