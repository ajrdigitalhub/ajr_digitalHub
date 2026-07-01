import { Router } from 'express';
import { dynamicController } from './dynamic.controller';
import { authenticate, authorizeAdmin } from '../../middlewares/auth.middleware';

const router = Router();

// Form-specific endpoints (precede generic dynamic endpoints)
router.post('/forms/:id/submit', dynamicController.submitFormResponse);
router.get('/forms/:id/responses', dynamicController.getFormResponses);
router.get('/forms/:id/analytics', dynamicController.getFormAnalytics);

// Public READ routes
router.get('/:collection', dynamicController.getAll);
router.get('/:collection/:id', dynamicController.getOne);

// User CRUD routes (authenticated)
router.post('/:collection', authenticate, dynamicController.create);
router.put('/:collection/:id', authenticate, dynamicController.update);
router.delete('/:collection/:id', authenticate, dynamicController.delete);

// Admin CRUD routes
router.post('/admin/:collection', authenticate, authorizeAdmin, dynamicController.create);
router.put('/admin/:collection/:id', authenticate, authorizeAdmin, dynamicController.update);
router.delete('/admin/:collection/:id', authenticate, authorizeAdmin, dynamicController.delete);

export default router;
