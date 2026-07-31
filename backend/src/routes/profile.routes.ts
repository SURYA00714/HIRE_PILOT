import { Router } from 'express';
import multer from 'multer';
import { getProfile, updateProfile, uploadProfileImage } from '../controllers/profile.controller';
import { authenticate } from '../middleware/auth.middleware';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.get('/me', authenticate, getProfile);
router.put('/me', authenticate, updateProfile);
router.post('/me/image', authenticate, upload.single('image'), uploadProfileImage);

export default router;
