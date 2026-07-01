import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();
const authController = new AuthController();

router.post('/login', authController.login.bind(authController));
router.post('/google-login', authController.googleLogin.bind(authController));
router.post('/register', authController.register.bind(authController));
router.post('/refresh', authController.refresh.bind(authController));
router.post('/logout', requireAuth, authController.logout.bind(authController));
router.get('/me', requireAuth, authController.me.bind(authController));

export default router;
