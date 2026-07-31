import { Router } from 'express';
import { getDashboardAnalytics, getInterviewFeedback } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/dashboard', authenticate, getDashboardAnalytics);
router.get('/interviews/:id', authenticate, getInterviewFeedback);

export default router;
