import { Router } from 'express';
import { createInterviewSession, getInterviewSessions, getInterviewById } from '../controllers/interview.controller';
import { authenticate } from '../middleware/auth.middleware';
import { interviewLimiter } from '../middleware/rateLimiter';
import { validate, interviewSetupSchema } from '../middleware/validation';

const router = Router();

// POST /api/interviews — create session
router.post('/', authenticate, interviewLimiter, validate(interviewSetupSchema), createInterviewSession);
router.post('/setup', authenticate, interviewLimiter, validate(interviewSetupSchema), createInterviewSession);

// GET /api/interviews — list user sessions
router.get('/', authenticate, getInterviewSessions);

// GET /api/interviews/:id — get single session with feedback
router.get('/:id', authenticate, getInterviewById);

export default router;
