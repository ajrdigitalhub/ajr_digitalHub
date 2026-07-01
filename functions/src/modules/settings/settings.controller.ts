import { Request, Response } from 'express';
import { BaseService } from '../../core/base.service';

const settingsService = new BaseService('settings');

function getDefaultSettings(key: string): any {
  if (key === 'website_config') {
    return {
      key: 'website_config',
      siteName: 'AJR Hub',
      logoUrl: '',
      theme: 'light',
      globalFeatures: { maintenanceMode: false, userRegistration: true },
      features: { marketplace: true, services: true, analytics: true }
    };
  }
  if (key === 'rate_limiter') {
    return {
      key: 'rate_limiter',
      rpm: 1000,
      rph: 50000,
      burst: 200,
      enabled: true,
      status: 'safe'
    };
  }
  if (key === 'landing_config') {
    return {
      key: 'landing_config',
      heroTitle: 'Welcome to AJR Digital HUB',
      cta: 'Provision App Now',
      maintenance: false
    };
  }
  if (key === 'growth_config') {
    return {
      key: 'growth_config',
      activeUsersOverride: 1284,
      apiCallsOverride: 98234,
      revenueOverride: 1240000,
      appsDeployedOverride: 342,
      useRealData: false,
      fomoMessage: "Only 3 license bundles remaining for today!",
      countdownEndTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      fomoEnabled: true,
      countdownEnabled: true,
      socialProofEnabled: true,
      socialProofMessage: "Used by 1,200+ developers across 80+ companies",
      activeHeroVersion: 'AB',
      heroTitleA: 'Orchestrate Your Enterprise Workspace',
      heroSubTitleA: 'The Premier Digital Hub',
      heroCtaA: 'Deploy SaaS Now',
      heroTitleB: 'Scale Your Digital Product Sales Automatically',
      heroSubTitleB: 'Psychological High-Conversion Engine',
      heroCtaB: 'Explore Marketplace Now',
      conversionsA: 0,
      viewsA: 0,
      conversionsB: 0,
      viewsB: 0
    };
  }
  if (key === 'comms_config') {
    return {
      key: 'comms_config',
      whatsappApiKey: 'wa_live_abc123123asdjkl',
      whatsappUsageCount: 450,
      whatsappFailureCount: 2,
      emailApiKey: 'sg_live_xyz789789asdjkl',
      emailUsageCount: 1250,
      emailFailureCount: 5,
      smtpHost: 'smtp.sendgrid.net',
      smtpPort: 587
    };
  }
  return null;
}

export const settingsController = {
  async getByKey(req: Request, res: Response): Promise<any> {
    try {
      const key = req.params['key'] as string;
      let data = await settingsService.findOne(key);
      if (!data) {
        const defaultVal = getDefaultSettings(key);
        if (defaultVal) {
          data = await settingsService.create(defaultVal);
        } else {
          return res.status(404).json({ success: false, error: 'Settings not found' });
        }
      }
      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  async updateAdmin(req: Request, res: Response): Promise<any> {
    try {
      const key = req.params['key'] as string;
      const existing = await settingsService.findOne(key);
      
      let result;
      if (existing) {
        result = await settingsService.update(existing.id, req.body);
      } else {
        result = await settingsService.create({ ...req.body, key });
      }
      
      return res.json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  async trackGrowth(req: Request, res: Response): Promise<any> {
    try {
      const { type, version } = req.body;
      if (!type || !version) {
        return res.status(400).json({ success: false, error: 'Type and version are required' });
      }

      const key = 'growth_config';
      let existing = await settingsService.findOne(key);
      if (!existing) {
        const defaultVal = getDefaultSettings(key);
        existing = await settingsService.create(defaultVal);
      }

      const field = type === 'view' ? `views${version}` : `conversions${version}`;
      const currentVal = Number(existing[field]) || 0;

      const updated = await settingsService.update(existing.id, {
        [field]: currentVal + 1
      });

      return res.json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
};
