import { Router } from 'express';
import { logsController } from './logs.controller';
import { authenticate, authorizeAdmin } from '../../middlewares/auth.middleware';

const router = Router();

router.post('/', logsController.createLog);
router.get('/', authenticate, authorizeAdmin, logsController.getLogs);

export default router;
