import { Router } from 'express';
import { crmController } from '../controllers/crm.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';

const router = Router();

// Apply auth and tenant context verification middleware
router.use(requireAuth, tenantMiddleware);

// Leads REST endpoints
router.get('/leads', crmController.getLeads);
router.post('/leads', crmController.createLead);
router.put('/leads/:id', crmController.updateLead);
router.delete('/leads/:id', crmController.deleteLead);

// Contacts REST endpoints
router.get('/contacts', crmController.getContacts);
router.post('/contacts', crmController.createContact);

// Deals REST endpoints
router.get('/deals', crmController.getDeals);
router.post('/deals', crmController.createDeal);
router.put('/deals/:id/stage', crmController.updateDealStage);

// Activities REST endpoints
router.get('/activities', crmController.getActivities);
router.post('/activities', crmController.createActivity);

export default router;
