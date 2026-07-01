import { Request, Response } from 'express';
import { BaseService } from '../../core/base.service';

const settingsService = new BaseService('settings');

export const shopsController = {
  async getInvoiceConfig(req: Request, res: Response): Promise<any> {
    try {
      const { shopId } = req.params;
      const key = `invoice_config_${shopId}`;
      const data = await settingsService.findOne(key);
      if (!data) {
        // Return default config
        const defaultConfig = {
          company_name: 'AJR DIGITAL HUB',
          company_address: '123 Design Blvd, Suite 400\nSan Francisco, CA 94107\nhello@ajrdigital.hub',
          tax_rate: 0,
          notes_template: ''
        };
        return res.json({
          success: true,
          data: defaultConfig
        });
      }
      return res.json({
        success: true,
        data
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  async updateInvoiceConfig(req: Request, res: Response): Promise<any> {
    try {
      const { shopId } = req.params;
      const key = `invoice_config_${shopId}`;
      const existing = await settingsService.findOne(key);
      
      let result;
      if (existing) {
        result = await settingsService.update(existing.id, req.body);
      } else {
        result = await settingsService.create({ ...req.body, key });
      }
      
      return res.json({
        success: true,
        data: result
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
};
