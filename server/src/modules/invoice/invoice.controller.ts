import { Request, Response } from 'express';
import { BaseService } from '../../core/base.service';

const templatesService = new BaseService('invoice_templates');
const settingsService = new BaseService('settings');

export const DEFAULT_TEMPLATES = [
  {
    id: 'tpl-minimalist',
    name: 'Minimalist Clean',
    category: 'Minimal',
    primaryColor: '#1e293b', // Slate 800
    textColor: '#0f172a',
    fontFamily: 'Inter',
    logoPosition: 'left',
    showHeader: true,
    showLogo: true,
    showDates: true,
    showTable: true,
    showNotes: true,
    showSignature: false,
    premium: false,
    sectionsOrder: ['logo_header', 'bill_to', 'line_items', 'totals_notes']
  },
  {
    id: 'tpl-corporate',
    name: 'Corporate Classic',
    category: 'Corporate',
    primaryColor: '#0f172a', // Slate 900
    textColor: '#1e293b',
    fontFamily: 'Outfit',
    logoPosition: 'right',
    showHeader: true,
    showLogo: true,
    showDates: true,
    showTable: true,
    showNotes: true,
    showSignature: true,
    premium: false,
    sectionsOrder: ['logo_header', 'bill_to', 'line_items', 'totals_notes']
  },
  {
    id: 'tpl-modern-saas',
    name: 'Modern SaaS',
    category: 'Modern SaaS',
    primaryColor: '#4f46e5', // Indigo 600
    textColor: '#1e293b',
    fontFamily: 'Inter',
    logoPosition: 'left',
    showHeader: true,
    showLogo: true,
    showDates: true,
    showTable: true,
    showNotes: true,
    showSignature: false,
    premium: false,
    sectionsOrder: ['logo_header', 'bill_to', 'line_items', 'totals_notes']
  },
  {
    id: 'tpl-creative',
    name: 'Creative Agency',
    category: 'Creative Agency',
    primaryColor: '#db2777', // Pink 600
    textColor: '#0f172a',
    fontFamily: 'Outfit',
    logoPosition: 'left',
    showHeader: true,
    showLogo: true,
    showDates: true,
    showTable: true,
    showNotes: true,
    showSignature: true,
    premium: true,
    sectionsOrder: ['logo_header', 'bill_to', 'line_items', 'totals_notes']
  },
  {
    id: 'tpl-retail',
    name: 'Retail Quick',
    category: 'Retail',
    primaryColor: '#0284c7', // Sky 600
    textColor: '#1f2937',
    fontFamily: 'Inter',
    logoPosition: 'center',
    showHeader: true,
    showLogo: true,
    showDates: true,
    showTable: true,
    showNotes: true,
    showSignature: false,
    premium: false,
    sectionsOrder: ['logo_header', 'bill_to', 'line_items', 'totals_notes']
  },
  {
    id: 'tpl-emerald',
    name: 'Soft Emerald',
    category: 'Minimal',
    primaryColor: '#059669', // Emerald 600
    textColor: '#0f172a',
    fontFamily: 'Inter',
    logoPosition: 'left',
    showHeader: true,
    showLogo: true,
    showDates: true,
    showTable: true,
    showNotes: true,
    showSignature: false,
    premium: false,
    sectionsOrder: ['logo_header', 'bill_to', 'line_items', 'totals_notes']
  },
  {
    id: 'tpl-indigo-grid',
    name: 'Indigo Grid',
    category: 'Modern SaaS',
    primaryColor: '#6366f1', // Indigo 500
    textColor: '#1e293b',
    fontFamily: 'Outfit',
    logoPosition: 'right',
    showHeader: true,
    showLogo: true,
    showDates: true,
    showTable: true,
    showNotes: true,
    showSignature: true,
    premium: true,
    sectionsOrder: ['logo_header', 'bill_to', 'line_items', 'totals_notes']
  },
  {
    id: 'tpl-ledger',
    name: 'Professional Ledger',
    category: 'Corporate',
    primaryColor: '#2563eb', // Blue 600
    textColor: '#0f172a',
    fontFamily: 'JetBrains Mono',
    logoPosition: 'left',
    showHeader: true,
    showLogo: false,
    showDates: true,
    showTable: true,
    showNotes: true,
    showSignature: false,
    premium: true,
    sectionsOrder: ['logo_header', 'bill_to', 'line_items', 'totals_notes']
  },
  {
    id: 'tpl-serif',
    name: 'Elegant Serif',
    category: 'Corporate',
    primaryColor: '#7c2d12', // Orange 900
    textColor: '#1a1008',
    fontFamily: 'Georgia',
    logoPosition: 'left',
    showHeader: true,
    showLogo: true,
    showDates: true,
    showTable: true,
    showNotes: true,
    showSignature: true,
    premium: true,
    sectionsOrder: ['logo_header', 'bill_to', 'line_items', 'totals_notes']
  },
  {
    id: 'tpl-retro',
    name: 'Simple Retro',
    category: 'Creative Agency',
    primaryColor: '#ea580c', // Orange 600
    textColor: '#1f2937',
    fontFamily: 'Inter',
    logoPosition: 'center',
    showHeader: true,
    showLogo: true,
    showDates: true,
    showTable: true,
    showNotes: true,
    showSignature: true,
    premium: true,
    sectionsOrder: ['logo_header', 'bill_to', 'line_items', 'totals_notes']
  }
];

export const invoiceController = {
  // Get all templates
  async getTemplates(req: Request, res: Response): Promise<any> {
    try {
      const dbTemplates = await templatesService.findAll();
      
      // Merge seeded templates with user custom templates, preventing duplicates
      const userCustom = dbTemplates.data || [];
      const customOnly = userCustom.filter((u: any) => !DEFAULT_TEMPLATES.some((d: any) => d.id === u.id));
      const allTemplates = [...DEFAULT_TEMPLATES, ...customOnly];

      return res.json({
        success: true,
        data: allTemplates
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  // Save custom template layout
  async saveTemplate(req: Request, res: Response): Promise<any> {
    try {
      const templateData = req.body;
      if (!templateData.name) {
        return res.status(400).json({ success: false, error: 'Template name is required' });
      }

      // Check if this is an update of an existing custom template
      let savedResult;
      if (templateData.id && !templateData.id.startsWith('tpl-')) {
        savedResult = await templatesService.update(templateData.id, templateData);
      } else {
        // Generate new ID and mark as custom template
        const customData = {
          ...templateData,
          id: 'custom-' + Date.now(),
          premium: true // Custom saved templates are treated as premium config
        };
        savedResult = await templatesService.create(customData);
      }

      return res.status(201).json({
        success: true,
        data: savedResult
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  // Update shop branding config (supports signature, logo, position)
  async updateConfig(req: Request, res: Response): Promise<any> {
    try {
      const shopId = req.body.shopId || req.user?.id || 'demo-shop-1';
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
