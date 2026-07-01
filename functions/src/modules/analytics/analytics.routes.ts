import { Router } from 'express';
import { analyticsController } from './analytics.controller';
import { authenticate, authorizeAdmin } from '../../middlewares/auth.middleware';

const router = Router();
router.get('/', authenticate, authorizeAdmin, analyticsController.getStats);

export default router;
