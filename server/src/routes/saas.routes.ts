import { Router } from 'express';
import { saasController } from '../controllers/saas.controller';
import { authenticateAdmin } from '../middlewares/auth';

const router = Router();

router.use(authenticateAdmin);

router.get('/', saasController.getApps);
router.post('/', saasController.createApp);

export default router;
