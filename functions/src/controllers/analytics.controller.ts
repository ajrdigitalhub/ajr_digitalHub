import { Request, Response } from 'express';
import { query } from '../db';
import { EventEmitter } from 'events';
import { FirebaseService } from '../services/firebase.service';

// Global Event Emitter for SSE
export const streamEmitter = new EventEmitter();

const firebaseService = new FirebaseService();

export const analyticsController = {
  async getAnalytics(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const month = req.query['month'] as string;
      
      let startOfRange: Date;
      let endOfRange: Date;

      if (month && /^\d{4}-\d{2}$/.test(month)) {
        const [year, monthNum] = month.split('-').map(Number);
        startOfRange = new Date(Date.UTC(year, monthNum - 1, 1));
        endOfRange = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));
      } else {
        const now = new Date();
        startOfRange = new Date(now.getTime() - 30 * 24 * 3600000);
        endOfRange = now;
      }
      
      // ── PostgreSQL: aggregate from usage_logs within range ──
      const hitsRes = await query(`SELECT COALESCE(SUM(hits), 0) as total_hits FROM usage_logs WHERE app_id = $1 AND created_at >= $2 AND created_at <= $3`, [id, startOfRange, endOfRange]);
      const errRes = await query(`SELECT COALESCE(SUM(hits), 0) as errors FROM usage_logs WHERE app_id = $1 AND status_code >= 400 AND created_at >= $2 AND created_at <= $3`, [id, startOfRange, endOfRange]);
      const latRes = await query(`SELECT COALESCE(AVG(latency), 0) as avg_latency FROM usage_logs WHERE app_id = $1 AND created_at >= $2 AND created_at <= $3`, [id, startOfRange, endOfRange]);

      const dbHits = parseInt(hitsRes.rows[0].total_hits);
      const dbErrors = parseInt(errRes.rows[0].errors);
      const avg_latency = Math.round(parseFloat(latRes.rows[0].avg_latency || '0'));
      const error_rate = dbHits > 0 ? ((dbErrors / dbHits) * 100).toFixed(2) : 0;

      // Fetch daily hits, latency, errors for the specified range from DB
      const historyRes = await query(`
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM-DD') as date_str,
          COALESCE(SUM(hits), 0)::integer as daily_hits,
          COALESCE(SUM(CASE WHEN status_code >= 400 THEN hits ELSE 0 END), 0)::integer as daily_errors,
          COALESCE(AVG(latency), 0)::integer as daily_latency
        FROM usage_logs
        WHERE app_id = $1 AND created_at >= $2 AND created_at <= $3
        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
        ORDER BY date_str ASC
      `, [id, startOfRange, endOfRange]);

      let dbHistory = historyRes.rows.map(row => {
        const hitsVal = row.daily_hits;
        const extraHits = Math.max(0, hitsVal - 10);
        const costVal = Number((extraHits * 0.05).toFixed(2));
        return {
          date: row.date_str,
          hits: hitsVal,
          errors: row.daily_errors,
          avg_latency: row.daily_latency,
          cost: costVal
        };
      });

      // ── Real Firebase/Cloud Monitoring data ─────────────────
      let totalHits = dbHits;
      let history = dbHistory;
      let totalCost = 0;

      try {
        const firebaseAnalytics = await firebaseService.getRealAnalyticsHistory(id, month);

        if (firebaseAnalytics.history.length > 0) {
          // Merge Firebase Cloud Monitoring data with DB data
          const dbMap = new Map(dbHistory.map(h => [h.date, h]));
          const fbMap = new Map(firebaseAnalytics.history.map(h => [h.date, h]));

          // Union of all dates
          const allDates = new Set([...dbMap.keys(), ...fbMap.keys()]);
          const merged: typeof dbHistory = [];

          for (const date of Array.from(allDates).sort()) {
            const db = dbMap.get(date);
            const fb = fbMap.get(date);
            merged.push({
              date,
              hits: (db?.hits || 0) + (fb?.hits || 0),
              errors: (db?.errors || 0) + (fb?.errors || 0),
              avg_latency: db?.avg_latency || fb?.avg_latency || 0,
              cost: fb?.cost || db?.cost || 0, // Prefer Firebase cost (real pricing)
            });
          }

          history = merged;
          totalHits = dbHits + firebaseAnalytics.totalHits;
          totalCost = firebaseAnalytics.totalCost;
        }
      } catch (fbErr: any) {
        console.warn('Firebase analytics fetch failed, using DB-only data:', fbErr.message);
      }

      // If history is empty after both sources, check billing table for total cost
      if (history.length === 0) {
        const billingRes = await query(`SELECT COALESCE(SUM(amount::numeric), 0) as total FROM billing WHERE app_id = $1 AND status = 'pending'`, [id]);
        totalCost = parseFloat(billingRes.rows[0].total || '0');
      }

      if (totalCost === 0) {
        totalCost = history.reduce((sum, h) => sum + h.cost, 0);
      }

      // ── Real Billing Cost ───────────────────────────────────
      let realBillingCost: number | null = null;
      let firebaseBilling: any = null;
      try {
        firebaseBilling = await firebaseService.getBillingCost(id, month);
        if (firebaseBilling && firebaseBilling.billingEnabled && firebaseBilling.totalCost !== null) {
          realBillingCost = firebaseBilling.totalCost;
        }
      } catch (err: any) {
        console.warn('Failed to fetch detailed billing cost:', err.message);
      }

      // Sync the real billing cost to DB billing table
      if (realBillingCost !== null && realBillingCost > 0) {
        try {
          await query(`
            INSERT INTO billing (app_id, usage_json, amount, status, due_date)
            VALUES ($1, $2, $3, 'pending', NOW() + INTERVAL '30 days')
            ON CONFLICT DO NOTHING
          `, [id, JSON.stringify({ source: 'firebase_cloud_billing', month: month || new Date().toISOString().substring(0, 7) }), realBillingCost]);
        } catch { /* non-fatal */ }

        totalCost = realBillingCost;
      }

      // Final cost from DB if still 0 (project might be on free tier)
      if (totalCost === 0) {
        const dbBillingRes = await query(`SELECT COALESCE(SUM(amount::numeric), 0) as total FROM billing WHERE app_id = $1`, [id]);
        const dbBillingTotal = parseFloat(dbBillingRes.rows[0].total || '0');
        if (dbBillingTotal > 0) totalCost = dbBillingTotal;
      }

      res.json({
        hits: totalHits,
        error_rate: `${error_rate}%`,
        avg_latency: `${avg_latency}ms`,
        live_connections: streamEmitter.listenerCount(`log:${id}`),
        history,
        total_cost: totalCost.toFixed(2),
        firebase_billing: firebaseBilling,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  liveStream(req: Request, res: Response) {
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
