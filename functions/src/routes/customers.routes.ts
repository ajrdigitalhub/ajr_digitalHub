import { Router } from 'express';
import { customersController } from '../controllers/customers.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', customersController.getCustomers);
router.get('/search', customersController.searchCustomers);
router.get('/:id', customersController.getCustomerById);
router.post('/', customersController.createCustomer);
router.put('/:id', customersController.updateCustomer);
router.delete('/:id', customersController.deleteCustomer);
router.get('/:id/activity', customersController.getCustomerActivity);

export default router;
