import { Router } from 'express';
import { billingController } from '../controllers/billing.controller';

const router = Router();

router.post('/run', billingController.runBilling);
router.post('/run-customer', billingController.runCustomerBilling);
router.get('/invoices', billingController.getInvoices);
router.get('/customer-invoices', billingController.getCustomerInvoices);
router.post('/invoice/send', billingController.sendInvoiceWhatsApp);
router.post('/invoice/mark-paid', billingController.markPaid);

// New Admin Billing & Transaction dashboard routes
router.get('/admin-stats', billingController.getAdminStats);
router.post('/invoice/manual', billingController.createInvoiceManual);
router.post('/invoice/:id/refund', billingController.refundInvoice);
router.get('/transactions', billingController.getTransactions);

// Global Automation Settings & Logging
router.get('/global-config', billingController.getGlobalConfig);
router.post('/global-config', billingController.saveGlobalConfig);
router.get('/logs/cron', billingController.getCronLogs);
router.get('/logs/notifications', billingController.getNotificationLogs);

export default router;
