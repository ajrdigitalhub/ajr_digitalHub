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

      const response = await axios.post(
        `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            components
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
