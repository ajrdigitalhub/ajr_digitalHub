import { Request, Response } from 'express';
import { marketplaceService } from '../services/marketplace.service';

export const marketplaceController = {
  async getItems(req: Request, res: Response): Promise<any> {
    try {
      const items = await marketplaceService.getAllItems();
      return res.json(items);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async create(req: Request, res: Response): Promise<any> {
    try {
      const item = await marketplaceService.createItem(req.body);
      return res.status(201).json(item);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async update(req: Request, res: Response): Promise<any> {
    try {
      const id = parseInt(req.params['id'] as string);
      const item = await marketplaceService.updateItem(id, req.body);
      if (!item) return res.status(404).json({ error: 'Item not found' });
      return res.json(item);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async delete(req: Request, res: Response): Promise<any> {
    try {
      const id = parseInt(req.params['id'] as string);
      const success = await marketplaceService.deleteItem(id);
      return res.json({ success });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
};
