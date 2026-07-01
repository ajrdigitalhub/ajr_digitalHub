import { query, pool } from '../db';

export const analyticsService = {
  async aggregateLogs() {
    if (!pool) return;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Calculate hits and error rate per app for the past minute
      const aggQuery = `
        SELECT app_id,
               COUNT(*) as total_hits,
               AVG(latency) as avg_latency,
               SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as errors
        FROM usage_logs
        WHERE created_at >= NOW() - INTERVAL '1 minute'
        GROUP BY app_id
      `;
      const result = await client.query(aggQuery);

      for (const row of result.rows) {
        // Insert aggregated metrics
        await client.query(
          `INSERT INTO analytics_logs (app_id, metric_type, value) VALUES ($1, 'hits', $2)`,
          [row.app_id, row.total_hits]
        );
        await client.query(
          `INSERT INTO analytics_logs (app_id, metric_type, value) VALUES ($1, 'latency', $2)`,
          [row.app_id, row.avg_latency || 0]
        );
        const errorRate = row.total_hits > 0 ? (row.errors / row.total_hits) * 100 : 0;
        await client.query(
          `INSERT INTO analytics_logs (app_id, metric_type, value) VALUES ($1, 'error_rate', $2)`,
          [row.app_id, errorRate]
        );
      }

      // We can keep usage_logs for a while instead of deleting instantly, 
      // but let's clear out ones older than 30 days to save space.
      await client.query(`DELETE FROM usage_logs WHERE created_at < NOW() - INTERVAL '30 days'`);

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('Failed to aggregate logs', e);
    } finally {
      client.release();
    }
  }
};
