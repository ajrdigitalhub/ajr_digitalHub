import { query } from '../db';
import crypto from 'crypto';
import admin from 'firebase-admin';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env['ENCRYPTION_KEY'] || 'ajr-encryption-key-32chars-2026';

function decryptValue(text: string): string {
  if (!text) return '';
  try {
    let key = ENCRYPTION_KEY;
    if (key.length < 32) key = key.padEnd(32, '0');
    else if (key.length > 32) key = key.substring(0, 32);

    const parts = text.split(':');
    if (parts.length < 2) return text;
    const iv = Buffer.from(parts.shift() || '', 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    return text;
  }
}

let cachedFCMApp: admin.app.App | null = null;

async function getFCMAdminApp(): Promise<admin.app.App | null> {
  try {
    const settingsRes = await query('SELECT service_account, enabled FROM notification_settings LIMIT 1');
    if (settingsRes.rows.length === 0) {
      return admin.apps.length > 0 ? admin.app() : null;
    }

    const settings = settingsRes.rows[0];
    if (!settings.enabled) {
      return null;
    }

    const serviceAccountObj = settings.service_account;
    if (!serviceAccountObj || !serviceAccountObj.encryptedData) {
      return admin.apps.length > 0 ? admin.app() : null;
    }

    const decryptedStr = decryptValue(serviceAccountObj.encryptedData);
    const serviceAccount = JSON.parse(decryptedStr);

    if (cachedFCMApp) {
      return cachedFCMApp;
    }

    const existingApp = admin.apps.find(a => a?.name === 'FCM_DYNAMIC_APP');
    if (existingApp) {
      cachedFCMApp = existingApp;
      return cachedFCMApp;
    }

    cachedFCMApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    }, 'FCM_DYNAMIC_APP');

    return cachedFCMApp;
  } catch (err) {
    console.error('[FCM] Dynamic credentials load failed, fallback to main app:', err);
    return admin.apps.length > 0 ? admin.app() : null;
  }
}

export const firebaseMessagingService = {
  clearCachedApp() {
    cachedFCMApp = null;
  },

  async sendToTokens(tokens: string[], payload: { title: string; body: string; image?: string; url?: string; customData?: any }) {
    const fcmApp = await getFCMAdminApp();
    if (!fcmApp) {
      throw new Error('Firebase Cloud Messaging is not initialized or disabled.');
    }

    const messaging = admin.messaging(fcmApp);
    const messagePayload: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.image ? { imageUrl: payload.image } : {})
      },
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.customData?.icon || '/assets/icons/icon-72x72.png',
          badge: '/assets/icons/icon-72x72.png',
          clickAction: payload.url || 'https://ajrdigitalhub.com',
          ...(payload.image ? { image: payload.image } : {})
        },
        fcmOptions: {
          link: payload.url || 'https://ajrdigitalhub.com'
        }
      },
      data: {
        url: payload.url || 'https://ajrdigitalhub.com',
        ...(payload.customData || {})
      }
    };

    try {
      const response = await messaging.sendEachForMulticast(messagePayload);
      const invalidTokens: string[] = [];

      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const code = resp.error.code;
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      // Cleanup inactive tokens in background
      if (invalidTokens.length > 0) {
        query('DELETE FROM notification_tokens WHERE token = ANY($1)', [invalidTokens]).catch(err => {
          console.error('[FCM] Failed to cleanup inactive tokens:', err);
        });
      }

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses
      };
    } catch (err: any) {
      console.error('[FCM] Multicast delivery failed:', err);
      throw err;
    }
  }
};
