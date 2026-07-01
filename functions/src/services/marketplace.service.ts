import { BaseService } from '../core/base.service';

export class MarketplaceService extends BaseService {
  constructor() {
    super('marketplace');
  }

  async getAllItems() {
    const res = await this.findAll({ limit: 100 });
    return res.data;
  }

  async createItem(data: any) {
    return this.create(data);
  }

  async updateItem(id: string | number, data: any) {
    return this.update(id.toString(), data);
  }

  async deleteItem(id: string | number) {
    return this.delete(id.toString());
  }

  async getPublicList() {
    return this.findAll({ 
      limit: 50, 
      filters: { status: 'active' },
      sortBy: 'created_at',
      order: 'DESC'
    });
  }

  async getFeatured() {
    return this.findAll({
      limit: 6,
      filters: { featured: true, status: 'active' }
    });
  }
}

export const marketplaceService = new MarketplaceService();
