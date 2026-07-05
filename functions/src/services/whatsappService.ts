import { query } from '../db';
import { decryptValue } from '../utils/crypto';
import { whatsappCloudService } from './whatsappCloud.service';
import { firestore } from '../config/firebase';

const GLOBAL_TOKEN = process.env.WHATSAPP_TOKEN || '';
const GLOBAL_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';

export const whatsappService = {
  /**
   * Sends a template message to a recipient, dynamically resolving and loading tenant-specific credentials.
   */
  async sendWhatsAppMessage(phone: string, templateData: any, appId?: string) {
    let activeAppId = appId;

    // Resolve app ID by phone number if not provided
    if (!activeAppId && phone) {
      try {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const checkCust = await query(
          `SELECT app_id FROM customer_profiles 
           WHERE mobile_number = $1 OR whatsapp_number = $1 
              OR billing_whatsapp_number = $1 OR mobile_number LIKE $2 OR whatsapp_number LIKE $2
           LIMIT 1`,
          [phone, `%${cleanPhone}`]
        );
        if (checkCust.rows.length > 0 && checkCust.rows[0].app_id) {
          activeAppId = checkCust.rows[0].app_id;
        } else {
          const checkConfig = await query(
            `SELECT app_id FROM whatsapp_config WHERE phone_number = $1 OR phone_number LIKE $2 LIMIT 1`,
            [phone, `%${cleanPhone}`]
          );
          if (checkConfig.rows.length > 0 && checkConfig.rows[0].app_id) {
            activeAppId = checkConfig.rows[0].app_id;
          }
        }
      } catch (err) {
        console.error('Error resolving app ID in whatsappService:', err);
      }
    }

    let token = GLOBAL_TOKEN;
    let phoneId = GLOBAL_PHONE_ID;

    if (activeAppId) {
      try {
        const res = await query(
          `SELECT api_key, phone_number FROM whatsapp_config WHERE app_id = $1 AND enabled = true`,
          [activeAppId]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          const decToken = decryptValue(row.api_key || '');
          if (decToken) {
            token = decToken;
            phoneId = row.phone_number || phoneId;
          }
        }
      } catch (err) {
        console.error('Error loading app config in whatsappService:', err);
      }
    }

    if (!token || !phoneId) {
      console.warn('WhatsApp credentials missing. Skipping notification.');
      return;
    }

    const isArray = Array.isArray(templateData);
    const templateName = isArray ? 'kall_me_deliveryalert' : (templateData.templateName || 'kall_me_deliveryalert');
    const languageCode = isArray ? 'en' : (templateData.languageCode || 'en');
    const parameters = isArray ? templateData : (templateData.parameters || []);

    const components: any[] = [];

    // If document URL is supplied, add a header of type document
    if (!isArray && templateData.documentUrl) {
      components.push({
        type: 'header',
        parameters: [
          {
            type: 'document',
            document: {
              link: templateData.documentUrl,
              filename: templateData.documentFilename || 'invoice.pdf'
            }
          }
        ]
      });
    }

    components.push({
      type: 'body',
      parameters: parameters.map((p: any) => {
        if (typeof p === 'string') {
          return { type: 'text', text: p };
        }
        return p;
      })
    });

    try {
      const res = await whatsappCloudService.sendTemplateMessage(
        phoneId,
        token,
        phone,
        templateName,
        languageCode,
        components
      );

      const messageId = res?.messages?.[0]?.id;
      if (messageId && firestore) {
        try {
          const rates = {
            utility: 0.11255,
            marketing: 0.86,
            authentication: 0.09,
            service: 0.05
          };
          const cat = (templateName === 'task_status_update' || templateName === 'order_confirmation_admin' || templateName === 'welcome_message' || templateName === 'get_offers') ? 'marketing' : 'utility';
          const price = rates[cat] || 0.11255;

          await firestore.collection('whatsapp_message_logs').doc(messageId).set({
            messageId,
            appId: activeAppId,
            templateName,
            recipient: phone,
            status: 'sent',
            timestamp: new Date(),
            category: cat,
            cost: price
          });

          await firestore.collection('whatsapp_logs').add({
            appId: activeAppId,
            messageId,
            recipient: phone,
            status: 'sent',
            timestamp: new Date(),
            templateName,
            category: cat,
            cost: price
          });
        } catch (fsErr: any) {
          console.error('[whatsappService Firestore Log Error]:', fsErr.message);
        }
      }

      return res;
    } catch (err: any) {
      console.error('whatsappService send error:', err.message);
      throw new Error(`Failed to send WhatsApp message: ${err.message}`);
    }
  }
};
