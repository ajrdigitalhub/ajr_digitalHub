import { query } from '../db';
import { sendWhatsAppTextMessage } from './whatsappClient';

export interface StructuredMessage {
  messageId: string;
  senderPhone: string;
  senderName: string;
  timestamp: Date;
  textBody: string;
  type: string;
}

export const hubProcessor = {
  /**
   * Process structured incoming text messages from Webhooks
   * @param message Object containing messageId, senderPhone, senderName, timestamp, and textBody
   */
  async processIncoming(message: StructuredMessage): Promise<void> {
    const { messageId, senderPhone, senderName, timestamp, textBody } = message;

    console.log(`[Live Webhook Message Received] From: ${senderName} (${senderPhone}) | Body: "${textBody}"`);

    // 1. Persist incoming message to database notification_logs
    try {
      await query(
        `INSERT INTO notification_logs (channel, event_type, recipient, status, error_details)
         VALUES ($1, $2, $3, $4, $5)`,
        ['whatsapp', 'incoming_text', senderPhone, 'sent', `Sender: ${senderName} | MsgId: ${messageId} | Body: ${textBody}`]
      );
      console.log(`[HubProcessor] Saved incoming log to Database for messageId: ${messageId}`);
    } catch (dbErr: any) {
      console.error('[HubProcessor Database Warn] Failed to save log:', dbErr.message);
    }

    // 2. Auto-responder trigger workflow (e.g. ping -> pong response)
    if (textBody.toLowerCase() === 'ping') {
      try {
        await sendWhatsAppTextMessage(senderPhone, `Hello ${senderName}! Pong 🏓`);
      } catch (clientErr: any) {
        console.error(`[HubProcessor Responder Fail] Failed auto-responding to ${senderPhone}:`, clientErr.message);
      }
    }
  }
};
