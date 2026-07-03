import { Request, Response } from 'express';
import { query } from '../db';
import { firebaseMessagingService } from '../services/firebase-messaging.service';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env['ENCRYPTION_KEY'] || 'ajr-encryption-key-32chars-2026';
const IV_LENGTH = 16;

function encryptValue(text: string): string {
  if (!text) return '';
  try {
    let key = ENCRYPTION_KEY;
    if (key.length < 32) key = key.padEnd(32, '0');
    else if (key.length > 32) key = key.substring(0, 32);

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (e) {
    return '';
  }
}

export const notificationController = {
  async getSettings(req: Request, res: Response) {
    try {
      const result = await query('SELECT id, enabled, firebase_config, vapid_key, default_title, default_icon, default_url, service_account FROM notification_settings LIMIT 1');
      if (result.rows.length === 0) {
        return res.json({ enabled: false, firebase_config: {}, vapid_key: '', hasServiceAccount: false });
      }
      const row = result.rows[0];
      res.json({
        id: row.id,
        enabled: row.enabled,
        firebase_config: row.firebase_config,
        vapid_key: row.vapid_key,
        default_title: row.default_title,
        default_icon: row.default_icon,
        default_url: row.default_url,
        hasServiceAccount: !!(row.service_account && row.service_account.encryptedData)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async saveSettings(req: Request, res: Response) {
    try {
      const { enabled, firebase_config, vapid_key, service_account, default_title, default_icon, default_url } = req.body;
      
      let saPayload = null;
      if (service_account) {
        const saString = typeof service_account === 'object' ? JSON.stringify(service_account) : service_account;
        saPayload = { encryptedData: encryptValue(saString) };
      }

      const check = await query('SELECT id, service_account FROM notification_settings LIMIT 1');
      if (check.rows.length === 0) {
        await query(
          `INSERT INTO notification_settings (enabled, firebase_config, vapid_key, service_account, default_title, default_icon, default_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [enabled ?? true, JSON.stringify(firebase_config || {}), vapid_key, JSON.stringify(saPayload || {}), default_title, default_icon, default_url]
        );
      } else {
        const existingSa = check.rows[0].service_account;
        const finalSa = saPayload ? JSON.stringify(saPayload) : JSON.stringify(existingSa || {});

        await query(
          `UPDATE notification_settings SET 
            enabled = $1, 
            firebase_config = $2, 
            vapid_key = $3, 
            service_account = $4, 
            default_title = $5, 
            default_icon = $6, 
            default_url = $7,
            updated_at = CURRENT_TIMESTAMP`,
          [enabled ?? true, JSON.stringify(firebase_config || {}), vapid_key, finalSa, default_title, default_icon, default_url]
        );
      }

      firebaseMessagingService.clearCachedApp();
      res.json({ success: true, message: 'FCM configurations saved successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async saveToken(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { token, browser, device, os, language, timezone } = req.body;
      if (!token) return res.status(400).json({ error: 'Token is required' });

      // Resolve organization context
      const userRes = await query('SELECT customer_id FROM users WHERE id = $1', [userId]);
      const customerId = userRes.rows[0]?.customer_id || null;

      let appId = null;
      if (customerId) {
        const appRes = await query('SELECT app_id FROM customer_profiles WHERE id = $1', [customerId]);
        appId = appRes.rows[0]?.app_id || null;
      }

      await query(
        `INSERT INTO notification_tokens (user_id, application_id, customer_id, token, browser, device, os, language, timezone, notification_enabled, last_seen)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, CURRENT_TIMESTAMP)
         ON CONFLICT (token) DO UPDATE SET 
           user_id = EXCLUDED.user_id,
           browser = COALESCE(EXCLUDED.browser, notification_tokens.browser),
           device = COALESCE(EXCLUDED.device, notification_tokens.device),
           os = COALESCE(EXCLUDED.os, notification_tokens.os),
           last_seen = CURRENT_TIMESTAMP`,
        [userId, appId, customerId, token, browser, device, os, language, timezone]
      );

      res.json({ success: true, message: 'FCM Token saved' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async deleteToken(req: Request, res: Response) {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ error: 'Token is required' });

      await query('DELETE FROM notification_tokens WHERE token = $1', [token]);
      res.json({ success: true, message: 'Token deleted' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async sendToUser(req: Request, res: Response) {
    try {
      const { userId, title, body, image, url, customData } = req.body;
      if (!userId || !title || !body) {
        return res.status(400).json({ error: 'userId, title, and body are required' });
      }

      const tokensRes = await query(
        'SELECT token FROM notification_tokens WHERE user_id = $1 AND notification_enabled = true',
        [userId]
      );
      const tokens = tokensRes.rows.map(r => r.token);

      if (tokens.length === 0) {
        return res.json({ success: false, message: 'No registered tokens found for user' });
      }

      const result = await firebaseMessagingService.sendToTokens(tokens, { title, body, image, url, customData });
      
      const senderId = (req as any).user?.id || null;
      await query(
        `INSERT INTO notification_history (title, body, image, url, sent_by, sent_to, status, response)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [title, body, image, url, senderId, userId, 'sent', JSON.stringify(result)]
      );

      res.json({ success: true, result });
    } catch (err: any) {
      // Log to notification logs table
      await query(
        'INSERT INTO notification_logs (level, message, stack) VALUES ($1, $2, $3)',
        ['error', err.message, err.stack || '']
      );
      res.status(500).json({ error: err.message });
    }
  },

  async sendBroadcast(req: Request, res: Response) {
    try {
      const { title, body, image, url, customData } = req.body;
      if (!title || !body) return res.status(400).json({ error: 'title and body are required' });

      const tokensRes = await query('SELECT token FROM notification_tokens WHERE notification_enabled = true');
      const tokens = tokensRes.rows.map(r => r.token);

      if (tokens.length === 0) {
        return res.json({ success: false, message: 'No active device tokens found' });
      }

      const result = await firebaseMessagingService.sendToTokens(tokens, { title, body, image, url, customData });
      
      const senderId = (req as any).user?.id || null;
      await query(
        `INSERT INTO notification_history (title, body, image, url, sent_by, status, response)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [title, body, image, url, senderId, 'sent', JSON.stringify(result)]
      );

      res.json({ success: true, result });
    } catch (err: any) {
      await query(
        'INSERT INTO notification_logs (level, message, stack) VALUES ($1, $2, $3)',
        ['error', err.message, err.stack || '']
      );
      res.status(500).json({ error: err.message });
    }
  },

  async getHistory(req: Request, res: Response) {
    try {
      const result = await query(`
        SELECT h.*, u.fullName as sender_name, u2.fullName as receiver_name
        FROM notification_history h
        LEFT JOIN users u ON h.sent_by = u.id
        LEFT JOIN users u2 ON h.sent_to = u2.id
        ORDER BY h.created_at DESC
        LIMIT 100
      `);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getLogs(req: Request, res: Response) {
    try {
      const result = await query('SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT 100');
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async testNotification(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const tokensRes = await query('SELECT token FROM notification_tokens WHERE user_id = $1 LIMIT 1', [userId]);
      if (tokensRes.rows.length === 0) {
        return res.status(404).json({ error: 'No active token registered. Please grant permission in browser first.' });
      }
      
      const token = tokensRes.rows[0].token;
      const result = await firebaseMessagingService.sendToTokens([token], {
        title: 'Test Notification',
        body: 'FCM Push Notifications are configured correctly!',
        url: 'https://ajrdigitalhub.com'
      });

      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
};
