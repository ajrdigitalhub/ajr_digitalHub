import { Router } from 'express';
import { shopsController } from './shops.controller';

const router = Router();

router.get('/:shopId/invoice-config', shopsController.getInvoiceConfig);
router.put('/:shopId/invoice-config', shopsController.updateInvoiceConfig);

export default router;
