import { Request, Response } from 'express';

export const aiAssistantController = {
  async generateCopy(req: Request, res: Response) {
    try {
      const { topic = 'SaaS Form Builder', channel = 'google', audience = 'Developers' } = req.body;

      let generatedContent = {
        headline: '',
        bodyCopy: '',
        callToAction: 'Learn More',
        keywords: [] as string[],
        recommendations: [] as string[]
      };

      const cleanTopic = topic.trim();
      
      if (channel === 'google') {
        generatedContent = {
          headline: `Best ${cleanTopic} | Save 50% Coding Time`,
          bodyCopy: `Create secure, enterprise-grade forms in minutes. Dynamic JSONB schemas, Postgres support, and drag-and-drop visuals for ${audience}. Start free now!`,
          callToAction: 'Start Free Trial',
          keywords: [cleanTopic.toLowerCase(), 'saas form builder', 'dynamic forms API', 'custom forms Postgres'],
          recommendations: [
            'Target exact match keywords for high conversion.',
            'Include the pricing advantage directly in the second headline.'
          ]
        };
      } else if (channel === 'meta') {
        generatedContent = {
          headline: `Build SaaS Forms in Seconds! 🚀`,
          bodyCopy: `Hey ${audience}! Stop wasting time coding inputs. Use our Enterprise visual builder to instantly generate responsive components, invoices, and databases. Join 10,000+ developers scaling today.`,
          callToAction: 'Sign Up',
          keywords: ['saas forms', 'app builder', 'no-code databases'],
          recommendations: [
            'Use high-contrast dark-mode preview visuals for your ad creative.',
            'Target custom lookalike audiences of tech leads.'
          ]
        };
      } else if (channel === 'whatsapp') {
        generatedContent = {
          headline: `Hello from AJR Digital Hub! 👋`,
          bodyCopy: `Hi there! We noticed you are setting up forms for *${cleanTopic}*. Need help optimizing your multi-tenant configurations? Reply 'HELP' to chat live with an expert now.`,
          callToAction: 'Reply HELP',
          keywords: ['whatsapp message', 'saas support'],
          recommendations: [
            'Keep messages short to maintain higher readability.',
            'Send during local active business hours (10:00 AM - 4:00 PM).'
          ]
        };
      } else {
        generatedContent = {
          headline: `Revolutionizing ${cleanTopic} with AJR Digital Hub`,
          bodyCopy: `Dear Team,\n\nWe are excited to share a customized guide to scaling ${cleanTopic} for ${audience}.\n\nAJR Digital Hub offers ready-to-use billing, CRM pipelines, and WhatsApp dispatches out-of-the-box.\n\nBest Regards,\nAJR Hub Team`,
          callToAction: 'Read SaaS Guide',
          keywords: ['email newsletter', 'saas guide'],
          recommendations: [
            'Optimize subject line length below 50 characters.',
            'Ensure clear visual spacing between features list.'
          ]
        };
      }

      res.json(generatedContent);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
};
