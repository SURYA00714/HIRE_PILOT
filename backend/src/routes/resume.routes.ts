import { Router } from 'express';
import multer from 'multer';
import { uploadResume } from '../controllers/resume.controller';
import { authenticate } from '../middleware/auth.middleware';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post('/upload', authenticate, upload.single('resume'), uploadResume);

export default router;
