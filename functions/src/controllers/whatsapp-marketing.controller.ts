import { Request, Response } from 'express';
import { query, pool } from '../db';

// Mock templates and campaigns store
let mockTemplates = [
  { name: 'utility_payment_due', category: 'UTILITY', status: 'APPROVED', language: 'en_US', delivered: 1420, read: 1290, failed: 2 },
  { name: 'marketing_summer_sale', category: 'MARKETING', status: 'APPROVED', language: 'en_US', delivered: 5320, read: 4110, failed: 50 },
  { name: 'auth_otp_verification', category: 'AUTHENTICATION', status: 'APPROVED', language: 'en_US', delivered: 8900, read: 8700, failed: 0 }
];

let mockCampaigns = [
  { id: 'camp-1', name: 'Summer Campaign Red', status: 'COMPLETED', total_sent: 1500, delivered: 1480, read: 1200, failed: 20, cost: 42.50, created_at: new Date() },
  { id: 'camp-2', name: 'Billing Blast v2', status: 'PROCESSING', total_sent: 2500, delivered: 1100, read: 800, failed: 5, cost: 25.10, created_at: new Date() }
];

export const whatsappMarketingController = {
  async getTemplates(req: Request, res: Response) {
    try {
      // Simulate real-time fetch from Meta API if enabled, else return synced templates
      res.json(mockTemplates);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async syncTemplates(req: Request, res: Response) {
    try {
      // Logic would query Meta's whatsapp business API to import templates
      // For local testing, we sync successfully and add a new template
      mockTemplates.push({
        name: `marketing_flash_sale_${Date.now().toString().slice(-4)}`,
        category: 'MARKETING',
        status: 'PENDING',
        language: 'en_US',
        delivered: 0,
        read: 0,
        failed: 0
      });
      res.json({ success: true, message: 'Meta templates synchronized successfully', templates: mockTemplates });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getCampaigns(req: Request, res: Response) {
    try {
      res.json(mockCampaigns);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async createCampaign(req: Request, res: Response) {
    try {
      const { name, templateName, contacts, scheduleTime } = req.body;
      const workspace_id = req.tenantContext?.workspaceId || 'ws-default-sandbox-id';

      const newCampaign = {
        id: `camp_${Date.now()}`,
        name,
        templateName,
        status: scheduleTime ? 'SCHEDULED' : 'PROCESSING',
        total_sent: contacts?.length || 0,
        delivered: 0,
        read: 0,
        failed: 0,
        cost: 0.00,
        created_at: new Date()
      };

      mockCampaigns.push(newCampaign);

      if (pool) {
        await query(
          `INSERT INTO campaign_configs (workspace_id, channel, name, settings) VALUES ($1, $2, $3, $4)`,
          [workspace_id, 'whatsapp', name, JSON.stringify({ templateName, scheduleTime, contactsCount: contacts?.length })]
        );
      }

      res.status(201).json(newCampaign);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getAnalytics(req: Request, res: Response) {
    try {
      // Return total metrics, Cost Per Conversation (CPC) rates and conversation details
      res.json({
        sent: 15720,
        delivered: 15280,
        read: 14000,
        failed: 77,
        spendMonth: 189.50,
        spendToday: 12.40,
        avgCpc: 0.012, // $0.012 per conversation
        deliveryRate: 97.2,
        readRate: 91.6,
        errorRate: 0.49,
        liveFeed: [
          { time: 'Just now', event: 'Delivered', recipient: '+919988776655', template: 'marketing_summer_sale' },
          { time: '2m ago', event: 'Read', recipient: '+918877665544', template: 'utility_payment_due' },
          { time: '5m ago', event: 'Failed (User Offline)', recipient: '+917766554433', template: 'auth_otp_verification' }
        ]
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
};
