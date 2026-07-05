import { Router } from 'express';
import { whatsappWebhookController } from '../controllers/whatsapp-webhook.controller';
import { validateWhatsAppSignature } from '../middlewares/whatsapp-security.middleware';

const router = Router();

/**
 * Handshake endpoint (GET /webhook)
 */
router.get('/', whatsappWebhookController.handleHandshake);

/**
 * Event updates endpoint (POST /webhook)
 */
router.post('/', validateWhatsAppSignature, whatsappWebhookController.handleEvent);

export default router;
