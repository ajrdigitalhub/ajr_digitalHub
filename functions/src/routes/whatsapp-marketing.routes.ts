import { Router } from 'express';
import { whatsappMarketingController } from '../controllers/whatsapp-marketing.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';

const router = Router();

// Apply auth check and multi-tenant isolation
router.use(requireAuth, tenantMiddleware);

router.get('/templates', whatsappMarketingController.getTemplates);
router.post('/templates/sync', whatsappMarketingController.syncTemplates);
router.get('/campaigns', whatsappMarketingController.getCampaigns);
router.post('/campaigns', whatsappMarketingController.createCampaign);
router.get('/analytics', whatsappMarketingController.getAnalytics);

export default router;
