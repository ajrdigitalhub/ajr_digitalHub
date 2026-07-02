import { Router } from 'express';
import { documentationController } from '../controllers/documentation.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Public routes (No Login Required)
router.get('/', documentationController.getPages);
router.get('/search', documentationController.searchPages);

// User history & bookmark lists (Auth required, must be declared before /:slug)
router.get('/history/recent', requireAuth, documentationController.getRecentHistory);
router.get('/bookmarks/list', requireAuth, documentationController.getBookmarks);

router.get('/:slug', documentationController.getPageBySlug);

// Public/User actions
router.post('/:id/feedback', requireAuth, documentationController.giveFeedback);
router.post('/:id/bookmark', requireAuth, documentationController.toggleBookmark);

// Protected Admin-only routes
router.post('/', requireAuth, requireRole('admin'), documentationController.createPage);
router.put('/:id', requireAuth, requireRole('admin'), documentationController.updatePage);
router.delete('/:id', requireAuth, requireRole('admin'), documentationController.deletePage);
router.get('/:id/versions', requireAuth, requireRole('admin'), documentationController.getVersions);
router.post('/:id/versions/:versionId/rollback', requireAuth, requireRole('admin'), documentationController.rollbackVersion);

export default router;
