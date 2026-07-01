import { Router } from 'express';
import { adminDataController } from '../controllers/admin-data.controller';
import { authenticateAdmin } from '../middlewares/auth';

const router = Router();

router.use(authenticateAdmin);

router.get('/:table', adminDataController.getTableData);
router.put('/:table/:id', adminDataController.updateTableData);

export default router;
