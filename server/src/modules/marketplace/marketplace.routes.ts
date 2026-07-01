import { Router } from 'express';
import { marketplaceController } from './marketplace.controller';

const router = Router();

// Routes for both /api/marketplace and /api/admin/marketplace or aliases
router.get('/', (req, res) => {
  if (req.baseUrl.includes('admin')) {
    return marketplaceController.listAdmin(req, res);
  }
  return marketplaceController.listActive(req, res);
});

router.get('/:id', marketplaceController.getOne);
router.post('/', marketplaceController.createAdmin);
router.put('/:id', marketplaceController.updateAdmin);
router.delete('/:id', marketplaceController.deleteAdmin);

export default router;
