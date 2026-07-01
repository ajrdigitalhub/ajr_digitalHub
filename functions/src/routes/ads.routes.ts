import { Router } from 'express';
import { adsController } from '../controllers/ads.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';

const router = Router();

// Apply security auth guards and multi-tenant isolation context
router.use(requireAuth, tenantMiddleware);

// OAuth save configuration route
router.post('/oauth', adsController.saveOAuthCredentials);

// Google Ads API proxies
router.get('/google', adsController.getGoogleCampaigns);
router.put('/google/:id/status', adsController.updateGoogleCampaignStatus);
router.put('/google/:id/budget', adsController.updateGoogleCampaignBudget);

// Meta Ads API proxies
router.get('/meta', adsController.getMetaCampaigns);
router.put('/meta/:id/status', adsController.updateMetaCampaignStatus);

export default router;
