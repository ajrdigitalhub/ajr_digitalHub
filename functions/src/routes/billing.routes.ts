import { Router } from 'express';
import { billingController } from '../controllers/billing.controller';

const router = Router();

router.post('/run', billingController.runBilling);
router.post('/run-customer', billingController.runCustomerBilling);
router.get('/invoices', billingController.getInvoices);
router.get('/customer-invoices', billingController.getCustomerInvoices);
router.post('/invoice/send', billingController.sendInvoiceWhatsApp);
router.post('/invoice/mark-paid', billingController.markPaid);

export default router;
