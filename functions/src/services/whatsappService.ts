import axios from 'axios';

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';

export const whatsappService = {
  async sendWhatsAppMessage(phone: string, templateData: any) {
    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
      console.warn('WhatsApp credentials missing. Skipping notification.');
      return;
    }

    try {
      const response = await axios.post(
        `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'template',
          template: {
            name: templateData.templateName || 'kall_me_deliveryalert',
            language: { code: templateData.languageCode || 'en' },
            components: [
              {
                type: 'body',
                parameters: templateData.parameters || templateData
              }
            ]
          }
        },
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (err: any) {
      console.error('WhatsApp API Error:', err.response?.data || err.message);
      throw new Error(`Failed to send WhatsApp message: ${err.message}`);
    }
  }
};
