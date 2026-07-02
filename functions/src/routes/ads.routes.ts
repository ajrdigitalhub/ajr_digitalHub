import { Router } from 'express';
import { adsController } from '../controllers/ads.controller';
import { requireAuth, optionalAuth } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';

const router = Router();

// OAuth save configuration route
router.post('/oauth', requireAuth, tenantMiddleware, adsController.saveOAuthCredentials);

// Google Ads API proxies
router.get('/google', optionalAuth, tenantMiddleware, adsController.getGoogleCampaigns);
router.put('/google/:id/status', requireAuth, tenantMiddleware, adsController.updateGoogleCampaignStatus);
router.put('/google/:id/budget', requireAuth, tenantMiddleware, adsController.updateGoogleCampaignBudget);

// Meta Ads API proxies
router.get('/meta', optionalAuth, tenantMiddleware, adsController.getMetaCampaigns);
router.put('/meta/:id/status', requireAuth, tenantMiddleware, adsController.updateMetaCampaignStatus);

export default router;
