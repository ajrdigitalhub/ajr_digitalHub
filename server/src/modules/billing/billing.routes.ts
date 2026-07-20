import { Router } from 'express';
import { billingController } from './billing.controller';
import { authenticate, authorizeAdmin } from '../../middlewares/auth.middleware';

const router = Router();

// --- Admin Billing Endpoints ---
router.get('/admin/billing/customer-invoices', authenticate, authorizeAdmin, billingController.getCustomerInvoices);
router.get('/admin/billing/admin-stats', authenticate, authorizeAdmin, billingController.getAdminStats);
router.get('/admin/billing/transactions', authenticate, authorizeAdmin, billingController.getTransactions);
router.get('/admin/billing/global-config', authenticate, authorizeAdmin, billingController.getGlobalConfig);
router.post('/admin/billing/global-config', authenticate, authorizeAdmin, billingController.saveGlobalConfig);
router.get('/admin/billing/logs/cron', authenticate, authorizeAdmin, billingController.getCronLogs);
router.get('/admin/billing/logs/notifications', authenticate, authorizeAdmin, billingController.getNotificationLogs);
router.post('/admin/billing/invoice/manual', authenticate, authorizeAdmin, billingController.createManualInvoice);
router.post('/admin/billing/invoice/:id/refund', authenticate, authorizeAdmin, billingController.refundInvoice);
router.post('/admin/billing/run', authenticate, authorizeAdmin, billingController.runBillingJob);
router.post('/api/admin/billing/run', authenticate, authorizeAdmin, billingController.runBillingJob); // extra alias
router.post('/admin/billing/run-customer', authenticate, authorizeAdmin, billingController.runCustomerBillingJob);
router.post('/admin/billing/invoice/send', authenticate, authorizeAdmin, billingController.sendWhatsApp);
router.post('/admin/billing/invoice/mark-paid', authenticate, authorizeAdmin, billingController.markPaid);

// --- Customer / Public Billing Details ---
router.get('/billing/:invoiceId', authenticate, billingController.getInvoiceDetail);
router.get('/customers', authenticate, billingController.getCustomers);

export default router;
