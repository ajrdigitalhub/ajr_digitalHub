import { Router } from 'express';
import { invoiceController } from './invoice.controller';
import { requireAuth } from '../../middlewares/auth.middleware';

const router = Router();

// Retrieve list of invoice templates
router.get('/templates', invoiceController.getTemplates);

// Save custom template configuration (Authenticated)
router.post('/save', requireAuth, invoiceController.saveTemplate);

// Save global user / shop invoice branding configurations (Authenticated/Optional fallback)
router.put('/config', invoiceController.updateConfig);

export default router;
