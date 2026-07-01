import { query } from '../db';

export const analyticsService = {
  async getOverview(appId?: number, daysRange: number = 30) {
    // This is a simplified version of the analytics logic from the original server.ts
    // In a real app we'd have aggregation queries here
    const res = await query(
      'SELECT COUNT(*) as total FROM dynamic_records WHERE collection_name = $1 AND (created_at > NOW() - INTERVAL \'$2 days\')',
      ['usage_logs', daysRange]
    );
    return {
      totalRequests: parseInt(res.rows[0]?.total || '0'),
      period: daysRange
    };
  },

  async logUsage(data: { appId: number, path: string, method: string, status: number, responseTime: number, deviceInfo: string }) {
    return query(
      'INSERT INTO dynamic_records (collection_name, data) VALUES ($1, $2)',
      ['usage_logs', JSON.stringify(data)]
    );
  }
};
