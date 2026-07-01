import { Router } from 'express';
import { marketplaceController } from '../controllers/marketplace.controller';
import { authenticateAdmin } from '../middlewares/auth';

const router = Router();

// Public routes
router.get('/', marketplaceController.getItems);

// Admin routes
router.post('/', authenticateAdmin, marketplaceController.create);
router.put('/:id', authenticateAdmin, marketplaceController.update);
router.delete('/:id', authenticateAdmin, marketplaceController.delete);

export default router;
