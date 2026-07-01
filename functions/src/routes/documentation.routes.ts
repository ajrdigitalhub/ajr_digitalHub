import { Router } from 'express';
import { documentationController } from '../controllers/documentation.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Public routes (No Login Required)
router.get('/', documentationController.getPages);
router.get('/:slug', documentationController.getPageBySlug);

// Protected Admin-only routes
router.post('/', requireAuth, requireRole('admin'), documentationController.createPage);
router.put('/:id', requireAuth, requireRole('admin'), documentationController.updatePage);
router.delete('/:id', requireAuth, requireRole('admin'), documentationController.deletePage);

export default router;
