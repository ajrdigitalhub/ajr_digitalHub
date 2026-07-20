import { Request, Response } from 'express';
import { marketplaceService } from '../services/marketplace.service';
import { compileTailwind } from '../utils/tailwind-compiler';

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
  async getItems(req: Request, res: Response): Promise<any> {
    try {
      const items = await marketplaceService.getAllItems();
      return res.json(items.map(mapItemToUI));
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async create(req: Request, res: Response): Promise<any> {
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

      const item = await marketplaceService.createItem(itemData);
      return res.status(201).json(mapItemToUI(item));
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async update(req: Request, res: Response): Promise<any> {
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

      const item = await marketplaceService.updateItem(id, itemData);
      if (!item) return res.status(404).json({ error: 'Item not found' });
      return res.json(mapItemToUI(item));
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async delete(req: Request, res: Response): Promise<any> {
    try {
      const id = req.params['id'] as string;
      const success = await marketplaceService.deleteItem(id);
      return res.json({ success });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
};
