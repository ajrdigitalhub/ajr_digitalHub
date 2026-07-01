import { Request, Response } from 'express';
import { query, pool } from '../db';

// Mock active campaigns for Google Ads and Meta Ads
let mockGoogleCampaigns = [
  { id: 'g-camp-1', name: 'Search - SaaS FormBuilder Global', status: 'ENABLED', budget: 150.00, impressions: 45000, clicks: 3200, ctr: 7.11, cpc: 0.45, conversions: 240, spend: 1440.00, roas: 3.2, optimization_score: 89.5 },
  { id: 'g-camp-2', name: 'Display - Retargeting Suite', status: 'PAUSED', budget: 50.00, impressions: 120000, clicks: 1100, ctr: 0.92, cpc: 0.15, conversions: 45, spend: 165.00, roas: 1.8, optimization_score: 94.2 }
];

let mockMetaCampaigns = [
  { id: 'm-camp-1', name: 'Meta - Custom Conversions Core', status: 'ACTIVE', reach: 98000, impressions: 140000, spend: 890.00, clicks: 5400, ctr: 3.85, cpc: 0.16, conversions: 195, frequency: 1.43 },
  { id: 'm-camp-2', name: 'Meta - Lead Capture Canvas', status: 'PAUSED', reach: 24000, impressions: 31000, spend: 220.00, clicks: 900, ctr: 2.90, cpc: 0.24, conversions: 50, frequency: 1.29 }
];

export const adsController = {
  async getGoogleCampaigns(req: Request, res: Response) {
    try {
      res.json(mockGoogleCampaigns);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async updateGoogleCampaignStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body; // 'ENABLED' or 'PAUSED'
      const campaign = mockGoogleCampaigns.find(c => c.id === id);
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
      campaign.status = status;
      res.json(campaign);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async updateGoogleCampaignBudget(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { budget } = req.body;
      const campaign = mockGoogleCampaigns.find(c => c.id === id);
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
      campaign.budget = parseFloat(budget) || campaign.budget;
      res.json(campaign);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getMetaCampaigns(req: Request, res: Response) {
    try {
      res.json(mockMetaCampaigns);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async updateMetaCampaignStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body; // 'ACTIVE' or 'PAUSED'
      const campaign = mockMetaCampaigns.find(c => c.id === id);
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
      campaign.status = status;
      res.json(campaign);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async saveOAuthCredentials(req: Request, res: Response) {
    try {
      const { provider, access_token, refresh_token, expires_in } = req.body;
      const workspace_id = req.tenantContext?.workspaceId || 'ws-default-sandbox-id';

      const expires_at = expires_in ? new Date(Date.now() + parseInt(expires_in) * 1000) : null;

      if (pool) {
        await query(
          `INSERT INTO oauth_credentials (workspace_id, provider, access_token, refresh_token, expires_at) 
           VALUES ($1, $2, $3, $4, $5) 
           ON CONFLICT ON CONSTRAINT unique_workspace_provider 
           DO UPDATE SET access_token = EXCLUDED.access_token, refresh_token = EXCLUDED.refresh_token, expires_at = EXCLUDED.expires_at`,
          [workspace_id, provider, access_token, refresh_token, expires_at]
        );
      }

      res.json({ success: true, message: `OAuth credentials for ${provider} saved successfully.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
};
