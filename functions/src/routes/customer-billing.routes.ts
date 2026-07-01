import { Router } from 'express';
import { billingController } from '../controllers/billing.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/invoices', billingController.getCustomerInvoices);
router.get('/stats', billingController.getBillingStats);

export default router;
