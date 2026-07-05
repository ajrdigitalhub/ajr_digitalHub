import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { whatsappConfig } from '../config/whatsapp.config';
import { query } from '../db';
import { decryptValue } from '../utils/crypto';

/**
 * Express middleware to validate x-hub-signature-256 from Meta Webhook requests.
 */
export async function validateWhatsAppSignature(req: Request, res: Response, next: NextFunction) {
  const signature = req.headers['x-hub-signature-256'] as string;

  if (!signature) {
    return res.status(401).json({ error: 'Missing x-hub-signature-256 header' });
  }

  const rawBody = (req as any).rawBody;
  if (!rawBody) {
    return res.status(400).json({ error: 'Raw body buffer missing. Verify rawBody middleware config.' });
  }

  try {
    let appSecret = whatsappConfig.appSecret;

    // Dynamically retrieve application-specific webhook secret if available in payload
    try {
      const bodyObj = JSON.parse(rawBody.toString('utf8'));
      const wabaId = bodyObj.entry?.[0]?.id;
      if (wabaId) {
        const resConfig = await query(
          `SELECT webhook_secret FROM whatsapp_config WHERE waba_id = $1 AND enabled = true`,
          [wabaId]
        );
        if (resConfig.rows.length > 0 && resConfig.rows[0].webhook_secret) {
          const decSecret = decryptValue(resConfig.rows[0].webhook_secret);
          if (decSecret) {
            appSecret = decSecret;
          }
        }
      }
    } catch (parseErr) {
      // Fail silently and use default secret
    }

    const hmac = crypto.createHmac('sha256', appSecret);
    hmac.update(rawBody);
    const expectedSignature = `sha256=${hmac.digest('hex')}`;

    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedSignatureBuffer = Buffer.from(expectedSignature, 'utf8');

    if (
      signatureBuffer.length !== expectedSignatureBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
    ) {
      console.warn('[Security Warn] WhatsApp webhook signature verification mismatch');
      return res.status(401).json({ error: 'Signature mismatch' });
    }

    return next();
  } catch (err: any) {
    console.error('Error during signature validation:', err.message);
    return res.status(500).json({ error: 'Internal signature verification error' });
  }
}
