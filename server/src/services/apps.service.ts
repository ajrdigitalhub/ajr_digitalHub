import { randomUUID, randomBytes } from 'node:crypto';
import { BaseService } from '../core/base.service';

export class AppsService extends BaseService {
  constructor() {
    super('apps');
  }

  async findByDomain(domain: string) {
    const { data } = await this.findAll({ filters: { domain } });
    return data[0] || null;
  }

  async getSummary() {
    const { data, meta } = await this.findAll({ limit: 1000 });
    const total = meta.total;
    const active = data.filter((m: any) => m.status === 'active').length;
    return { total, active, inactive: total - active };
  }

  async provisionApp(payload: { name: string; domain: string; description?: string }) {
    const { name, domain, description } = payload;

    // 1. Validation
    if (!name || !domain) {
      throw new Error('Name and domain are required');
    }

    // 2. Prevent duplicates
    const existing = await this.findByDomain(domain);
    if (existing) {
      throw new Error('An application with this domain already exists');
    }

    // 3. Generate secure tokens
    const appId = `app_${randomBytes(4).toString('hex')}`;
    const apiKey = `ajr_${randomBytes(16).toString('hex')}`;

    // 4. Create App Record
    const app = await this.create({
      name,
      domain,
      description,
      appId,
      apiKey,
      status: 'active',
      plan: 'free',
      createdAt: new Date().toISOString()
    });

    // 5. Auto-Initialize related data
    const rateLimitService = new BaseService('rate_limits');
    await rateLimitService.create({
      appId,
      rpm: 60,
      rph: 1000,
      enabled: true
    });

    const configService = new BaseService('configs');
    await configService.create({
      appId,
      theme: 'default',
      features: { analytics: true, backup: false }
    });

    const usageService = new BaseService('usage');
    await usageService.create({
      appId,
      currentMonthlyRequests: 0,
      limit: 10000,
      lastReset: new Date().toISOString()
    });

    return {
      id: app.id,
      appId,
      name,
      apiKey,
      status: 'active',
      createdAt: app.createdAt
    };
  }
}

export const appsService = new AppsService();
