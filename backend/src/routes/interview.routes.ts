import { Router } from 'express';
import { createInterviewSession, getInterviewSessions } from '../controllers/interview.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, createInterviewSession);
router.get('/', authenticate, getInterviewSessions);

export default router;
