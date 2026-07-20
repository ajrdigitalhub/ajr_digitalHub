import { Request, Response } from 'express';
import { BaseService } from '../../core/base.service';
import { compileTailwind } from '../../utils/tailwind-compiler';

const marketplaceService = new BaseService('marketplace');

export function mapItemToUI(item: any) {
  return {
    id: item.id,
    title: item.title || item.name || '',
    name: item.name || item.title || '',
    description: item.description || '',
    price: parseFloat(item.price as any) || 0,
    category: item.category || 'Uncategorized',
    html_content: item.html || item.html_content || '',
    html: item.html || item.html_content || '',
    css_content: item.css || item.css_content || '',
    css: item.css || item.css_content || '',
    js: item.js || '',
    meta: item.meta || {},
    version: item.version || '1.0.0',
    image_url: item.image || item.image_url || 'https://picsum.photos/seed/placeholder/800/600',
    image: item.image || item.image_url || 'https://picsum.photos/seed/placeholder/800/600',
    status: item.status || 'active',
    created_at: item.created_at || item.createdAt || new Date().toISOString(),
    createdAt: item.created_at || item.createdAt || new Date().toISOString()
  };
}

export const marketplaceController = {
  async listActive(req: Request, res: Response): Promise<any> {
    try {
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 100;
      const search = req.query['search'] as string;
      const category = req.query['category'] as string;

      const filters: any = { status: 'active' };
      if (category) {
        filters.category = category;
      }

      const { data, meta } = await marketplaceService.findAll({ 
        page, 
        limit, 
        search, 
        filters 
      });

      const items = data.map(mapItemToUI);

      return res.json({
        success: true,
        data: items,
        meta
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  async listAdmin(req: Request, res: Response): Promise<any> {
    try {
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 100;
      const search = req.query['search'] as string;

      const { data, meta } = await marketplaceService.findAll({ 
        page, 
        limit, 
        search
      });

      const items = data.map(mapItemToUI);

      return res.json({
        success: true,
        data: items,
        meta
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  async getOne(req: Request, res: Response): Promise<any> {
    try {
      const id = req.params['id'] as string;
      const item = await marketplaceService.findOne(id);
      if (!item) return res.status(404).json({ success: false, error: 'Product not found' });
      return res.json({
        success: true,
        data: mapItemToUI(item)
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  async createAdmin(req: Request, res: Response): Promise<any> {
    try {
      const body = req.body;
      const htmlCode = body.html || body.html_content || '';
      const customCss = body.css || body.css_content || '';
      const compiledCss = compileTailwind(htmlCode, customCss);

      const itemData = {
        title: body.title || body.name || 'Unnamed Asset',
        name: body.name || body.title || 'Unnamed Asset',
        description: body.description || '',
        price: parseFloat(body.price as any) || 0,
        category: body.category || 'Uncategorized',
        html: htmlCode,
        html_content: htmlCode,
        css: compiledCss,
        css_content: compiledCss,
        js: body.js || '',
        meta: body.meta || {},
        version: body.version || '1.0.0',
        image: body.image || body.image_url || 'https://picsum.photos/seed/placeholder/800/600',
        image_url: body.image || body.image_url || 'https://picsum.photos/seed/placeholder/800/600',
        status: body.status || 'active',
        created_at: body.created_at || body.createdAt || new Date().toISOString(),
        createdAt: body.created_at || body.createdAt || new Date().toISOString()
      };

      const result = await marketplaceService.create(itemData);
      return res.status(201).json({
        success: true,
        data: mapItemToUI(result)
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  async updateAdmin(req: Request, res: Response): Promise<any> {
    try {
      const id = req.params['id'] as string;
      const body = req.body;
      const htmlCode = body.html || body.html_content || '';
      const customCss = body.css || body.css_content || '';
      const compiledCss = compileTailwind(htmlCode, customCss);

      const itemData = {
        title: body.title || body.name || 'Unnamed Asset',
        name: body.name || body.title || 'Unnamed Asset',
        description: body.description || '',
        price: parseFloat(body.price as any) || 0,
        category: body.category || 'Uncategorized',
        html: htmlCode,
        html_content: htmlCode,
        css: compiledCss,
        css_content: compiledCss,
        js: body.js || '',
        meta: body.meta || {},
        version: body.version || '1.0.0',
        image: body.image || body.image_url || 'https://picsum.photos/seed/placeholder/800/600',
        image_url: body.image || body.image_url || 'https://picsum.photos/seed/placeholder/800/600',
        status: body.status || 'active',
        updated_at: new Date().toISOString()
      };

      const result = await marketplaceService.update(id, itemData);
      if (!result) return res.status(404).json({ success: false, error: 'Product not found' });
      return res.json({
        success: true,
        data: mapItemToUI(result)
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  async deleteAdmin(req: Request, res: Response): Promise<any> {
    try {
      const id = req.params['id'] as string;
      const success = await marketplaceService.delete(id);
      return res.json({
        success,
        data: { id }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
};
