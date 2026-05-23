import { Router } from 'express';
import { validate, loginSchema } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { authController } from '../composition-root';

const router = Router();

// POST /api/auth/login
router.post('/login', validate(loginSchema), authController.login);

// GET /api/auth/profile
router.get('/profile', authenticate, authController.getProfile);

export default router;
