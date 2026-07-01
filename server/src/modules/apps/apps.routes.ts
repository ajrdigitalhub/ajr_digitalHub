import { Router } from 'express';
import { appsController } from './apps.controller';
import { authenticate, authorizeAdmin } from '../../middlewares/auth.middleware';

const router = Router();

router.post('/provision', authenticate, authorizeAdmin, appsController.provision);
router.get('/', authenticate, authorizeAdmin, appsController.list);

export default router;
