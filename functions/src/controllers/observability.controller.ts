import { Request, Response } from 'express';
import { query, isPostgresEnabled } from '../config/db';
import { streamEmitter } from './analytics.controller';

export const observabilityController = {
  async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { timeRange, endpoint, status, method, limit = 50, offset = 0 } = req.query;

      if (!isPostgresEnabled) {
        res.json({ logs: [], total: 0 });
        return;
      }

      let timeInterval = '24 hours';
      if (timeRange === '1h') timeInterval = '1 hour';
      else if (timeRange === '6h') timeInterval = '6 hours';
      else if (timeRange === '24h') timeInterval = '24 hours';
      else if (timeRange === '7d') timeInterval = '7 days';

      const queryParams: any[] = [id];
      let sqlCount = `SELECT COUNT(*) FROM usage_logs WHERE app_id = $1 AND created_at >= NOW() - INTERVAL '${timeInterval}'`;
      let sql = `SELECT id, app_id as "appId", endpoint, method, status_code as status, latency, source, created_at as "createdAt"
                 FROM usage_logs
                 WHERE app_id = $1 AND created_at >= NOW() - INTERVAL '${timeInterval}'`;

      let paramIdx = 2;
      const filtersSql: string[] = [];

      if (endpoint) {
        filtersSql.push(`endpoint LIKE $${paramIdx}`);
        queryParams.push(`%${endpoint}%`);
        paramIdx++;
      }
      if (method && method !== 'ALL') {
        filtersSql.push(`method = $${paramIdx}`);
        queryParams.push(method);
        paramIdx++;
      }
      if (status && status !== 'ALL') {
        if (status === '2xx') {
          filtersSql.push(`status_code >= 200 AND status_code < 300`);
        } else if (status === '3xx') {
          filtersSql.push(`status_code >= 300 AND status_code < 400`);
        } else if (status === '4xx') {
          filtersSql.push(`status_code >= 400 AND status_code < 500`);
        } else if (status === '5xx') {
          filtersSql.push(`status_code >= 500`);
        } else {
          filtersSql.push(`status_code = $${paramIdx}`);
          queryParams.push(parseInt(status as string));
          paramIdx++;
        }
      }

      if (filtersSql.length > 0) {
        const filterStr = ' AND ' + filtersSql.join(' AND ');
        sqlCount += filterStr;
        sql += filterStr;
      }

      sql += ` ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
      queryParams.push(parseInt(limit as string));
      queryParams.push(parseInt(offset as string));

      const countRes = await query(sqlCount, queryParams.slice(0, paramIdx - 1));
      const logsRes = await query(sql, queryParams);

      res.json({
        logs: logsRes.rows,
        total: parseInt(countRes.rows[0].count)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { timeRange } = req.query;

      if (!isPostgresEnabled) {
        res.json({
          hits: 0,
          error_rate: '0%',
          success_rate: '100%',
          avg_latency: '0ms',
          p50: 0,
          p95: 0,
          p99: 0,
          rps: 0,
          hits_today: 0,
          breakdown: { hits_2xx: 0, hits_3xx: 0, hits_4xx: 0, hits_5xx: 0 }
        });
        return;
      }

      let timeInterval = '24 hours';
      if (timeRange === '1h') timeInterval = '1 hour';
      else if (timeRange === '6h') timeInterval = '6 hours';
      else if (timeRange === '24h') timeInterval = '24 hours';
      else if (timeRange === '7d') timeInterval = '7 days';

      const statsQuery = `
        SELECT
          COUNT(*)::integer as total_hits,
          COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300)::integer as hits_2xx,
          COUNT(*) FILTER (WHERE status_code >= 300 AND status_code < 400)::integer as hits_3xx,
          COUNT(*) FILTER (WHERE status_code >= 400 AND status_code < 500)::integer as hits_4xx,
          COUNT(*) FILTER (WHERE status_code >= 500)::integer as hits_5xx,
          COALESCE(AVG(latency), 0)::integer as avg_latency,
          COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY latency), 0)::integer as p50,
          COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY latency), 0)::integer as p95,
          COALESCE(percentile_cont(0.99) WITHIN GROUP (ORDER BY latency), 0)::integer as p99
        FROM usage_logs
        WHERE app_id = $1 AND created_at >= NOW() - INTERVAL '${timeInterval}'
      `;
      const statsRes = await query(statsQuery, [id]);
      const stats = statsRes.rows[0];

      // Requests per second (last 60s)
      const rpsRes = await query(
        `SELECT COUNT(*)::float / 60.0 as rps
         FROM usage_logs
         WHERE app_id = $1 AND created_at >= NOW() - INTERVAL '1 minute'`,
        [id]
      );
      const rps = parseFloat(rpsRes.rows[0].rps || '0');

      // Hits today (since midnight)
      const todayRes = await query(
        `SELECT COUNT(*)::integer as hits_today
         FROM usage_logs
         WHERE app_id = $1 AND created_at >= date_trunc('day', NOW())`,
        [id]
      );
      const hitsToday = todayRes.rows[0].hits_today || 0;

      const totalHits = stats.total_hits || 0;
      const successRate = totalHits > 0 ? (stats.hits_2xx / totalHits) * 100 : 100;
      const errorRate = totalHits > 0 ? (stats.hits_5xx / totalHits) * 100 : 0;

      res.json({
        hits: totalHits,
        error_rate: `${errorRate.toFixed(1)}%`,
        success_rate: `${successRate.toFixed(1)}%`,
        avg_latency: `${stats.avg_latency}ms`,
        p50: stats.p50,
        p95: stats.p95,
        p99: stats.p99,
        rps: parseFloat(rps.toFixed(2)),
        hits_today: hitsToday,
        breakdown: {
          hits_2xx: stats.hits_2xx,
          hits_3xx: stats.hits_3xx,
          hits_4xx: stats.hits_4xx,
          hits_5xx: stats.hits_5xx
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getChartData(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { timeRange } = req.query;

      if (!isPostgresEnabled) {
        res.json([]);
        return;
      }

      let timeInterval = '24 hours';
      let bucketSeconds = 1800; // 30 minutes
      if (timeRange === '1h') {
        timeInterval = '1 hour';
        bucketSeconds = 60; // 1 minute
      } else if (timeRange === '6h') {
        timeInterval = '6 hours';
        bucketSeconds = 300; // 5 minutes
      } else if (timeRange === '24h') {
        timeInterval = '24 hours';
        bucketSeconds = 1800; // 30 minutes
      } else if (timeRange === '7d') {
        timeInterval = '7 days';
        bucketSeconds = 21600; // 6 hours
      }

      const chartRes = await query(
        `SELECT 
          to_timestamp(floor(extract(epoch from created_at) / $2) * $2) as bucket,
          COUNT(*)::integer as hits,
          COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300)::integer as c2xx,
          COUNT(*) FILTER (WHERE status_code >= 300 AND status_code < 400)::integer as c3xx,
          COUNT(*) FILTER (WHERE status_code >= 400 AND status_code < 500)::integer as c4xx,
          COUNT(*) FILTER (WHERE status_code >= 500)::integer as c5xx,
          COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY latency), 0)::integer as p50,
          COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY latency), 0)::integer as p95,
          COALESCE(percentile_cont(0.99) WITHIN GROUP (ORDER BY latency), 0)::integer as p99
        FROM usage_logs
        WHERE app_id = $1 AND created_at >= NOW() - INTERVAL '${timeInterval}'
        GROUP BY bucket
        ORDER BY bucket ASC`,
        [id, bucketSeconds]
      );

      // Map response to include simulated instance scale and e2e network latencies
      const mappedData = chartRes.rows.map(row => {
        const hits = row.hits || 0;
        // Scale instances dynamically based on requests per interval
        const simulatedInstances = Math.max(1, Math.min(12, Math.ceil(hits / (bucketSeconds * 0.4))));
        return {
          timestamp: row.bucket,
          hits,
          c2xx: row.c2xx || 0,
          c3xx: row.c3xx || 0,
          c4xx: row.c4xx || 0,
          c5xx: row.c5xx || 0,
          p50: row.p50,
          p95: row.p95,
          p99: row.p99,
          e2e_p50: row.p50 + 12,
          e2e_p95: row.p95 + 24,
          e2e_p99: row.p99 + 48,
          instances: simulatedInstances
        };
      });

      res.json(mappedData);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!isPostgresEnabled) {
        res.json([]);
        return;
      }

      const alerts: any[] = [];
      const now = new Date().toISOString();

      // Check 1: 5xx spike in last 5 minutes
      const errorSpikeRes = await query(
        `SELECT 
          COUNT(*)::integer as total,
          COUNT(*) FILTER (WHERE status_code >= 500)::integer as errors_5xx
         FROM usage_logs
         WHERE app_id = $1 AND created_at >= NOW() - INTERVAL '5 minutes'`,
        [id]
      );
      const spike = errorSpikeRes.rows[0];
      if (spike.total >= 5 && (spike.errors_5xx / spike.total) > 0.1) {
        alerts.push({
          id: 'err-spike',
          type: 'critical',
          message: `High 5xx error rate: ${((spike.errors_5xx / spike.total) * 100).toFixed(1)}% of requests failed in the last 5 minutes.`,
          timestamp: now
        });
      }

      // Check 2: Average latency in last 5 minutes > 1000ms
      const latSpikeRes = await query(
        `SELECT COALESCE(AVG(latency), 0)::integer as avg_lat
         FROM usage_logs
         WHERE app_id = $1 AND created_at >= NOW() - INTERVAL '5 minutes'`,
        [id]
      );
      const avgLat = latSpikeRes.rows[0].avg_lat;
      if (avgLat > 1000) {
        alerts.push({
          id: 'latency-spike',
          type: 'warning',
          message: `High response latency detected: average latency is ${avgLat}ms over the last 5 minutes.`,
          timestamp: now
        });
      }

      // Check 3: Burst traffic (requests in last 1 minute > 100)
      const burstRes = await query(
        `SELECT COUNT(*)::integer as count_1m
         FROM usage_logs
         WHERE app_id = $1 AND created_at >= NOW() - INTERVAL '1 minute'`,
        [id]
      );
      const count1m = burstRes.rows[0].count_1m;
      if (count1m > 100) {
        alerts.push({
          id: 'burst-traffic',
          type: 'info',
          message: `Traffic burst: ${count1m} requests processed in the last 60 seconds.`,
          timestamp: now
        });
      }

      res.json(alerts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  liveStream(req: Request, res: Response): void {
    const { id } = req.params;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const onLog = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    streamEmitter.on(`log:${id}`, onLog);

    req.on('close', () => {
      streamEmitter.removeListener(`log:${id}`, onLog);
    });
  }
};
