import { query } from '../db';
import { whatsappService } from './whatsappService';

export const notificationService = {
  async sendNotification(
    customerId: string,
    channel: 'whatsapp' | 'email' | 'in-app' | 'push',
    eventType: string,
    recipient: string,
    payload: { title: string; message: string; data?: any }
  ) {
    let status: 'sent' | 'failed' | 'pending' = 'pending';
    let errorDetails: string | null = null;

    try {
      if (channel === 'whatsapp') {
        const templateData = {
          templateName: 'kall_me_deliveryalert',
          parameters: [
            { type: 'text', text: payload.title },
            { type: 'text', text: payload.message }
          ]
        };
        await whatsappService.sendWhatsAppMessage(recipient, templateData);
        status = 'sent';
      } else if (channel === 'email') {
        // Simple mock SMTP or console notification log for email
        console.log(`[Email Sent to ${recipient}]: ${payload.title} - ${payload.message}`);
        status = 'sent';
      } else if (channel === 'in-app') {
        // Save to notification_logs table (handles in-app naturally)
        status = 'sent';
      } else {
        // Push notification stub
        status = 'sent';
      }
    } catch (err: any) {
      status = 'failed';
      errorDetails = err.message || 'Unknown notification error';
      console.error(`Notification failed on channel ${channel}:`, err);
    }

    try {
      await query(
        `INSERT INTO notification_logs (customer_id, channel, event_type, recipient, status, error_details) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [customerId, channel, eventType, recipient, status, errorDetails]
      );
    } catch (dbErr) {
      console.error('Failed to log notification status:', dbErr);
    }

    return { status, errorDetails };
  }
};
