import axios from 'axios';
import { whatsappConfig } from '../config/whatsapp.config';

/**
 * Dispatch an outbound WhatsApp message using the Graph API
 * @param recipientPhone E.164 formatted phone number (e.g. "919988776655")
 * @param textBody The text content of the message
 * @returns Meta Cloud API response payload
 */
export async function sendWhatsAppTextMessage(recipientPhone: string, textBody: string): Promise<any> {
  const url = `${whatsappConfig.graphUrl}/${whatsappConfig.phoneNumberId}/messages`;
  
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipientPhone,
    type: 'text',
    text: {
      preview_url: false,
      body: textBody
    }
  };

  const headers = {
    'Authorization': `Bearer ${whatsappConfig.accessToken}`,
    'Content-Type': 'application/json'
  };

  try {
    const response = await axios.post(url, payload, { headers, timeout: 10000 });
    console.log(`[WhatsApp API Success] Message dispatched to ${recipientPhone}. ID: ${response.data.messages?.[0]?.id}`);
    return response.data;
  } catch (err: any) {
    if (err.response) {
      console.error('[WhatsApp API Outbound Error] Meta API rejected the payload:');
      console.error(JSON.stringify(err.response.data, null, 2));
      throw new Error(`Meta API error: ${err.response.data?.error?.message || 'Unknown error'}`);
    } else if (err.request) {
      console.error('[WhatsApp API Outbound Error] No response received from Graph API endpoint:', err.message);
      throw new Error('Network error connecting to Meta Graph API');
    } else {
      console.error('[WhatsApp API Outbound Error] Setup or execution error:', err.message);
      throw err;
    }
  }
}
