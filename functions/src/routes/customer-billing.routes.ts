import { Router } from 'express';
import { billingController } from '../controllers/billing.controller';
import { firebaseNotificationController } from '../controllers/firebaseNotification.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/invoices', billingController.getCustomerInvoices);
router.get('/stats', billingController.getBillingStats);
router.get('/firebase-stats', firebaseNotificationController.getDashboard);
router.get('/transactions', billingController.getTransactions);
router.post('/checkout/:invoiceId', billingController.checkoutInvoice);
router.get('/automation-config', billingController.getCustomerBillingConfig);
router.put('/automation-config', billingController.updateCustomerBillingConfig);

export default router;
