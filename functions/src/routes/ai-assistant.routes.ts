import { Router } from 'express';
import { aiAssistantController } from '../controllers/ai-assistant.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';

const router = Router();

// Apply auth verify security middleware and multi-tenant contextual checks
router.use(requireAuth, tenantMiddleware);

router.post('/generate', aiAssistantController.generateCopy);

export default router;
