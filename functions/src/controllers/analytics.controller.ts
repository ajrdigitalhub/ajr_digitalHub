import { Request, Response } from 'express';
import { query } from '../db';
import { EventEmitter } from 'events';
import { FirebaseService } from '../services/firebase.service';
import { firebaseBillingService } from '../services/firebase-billing.service';

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

      // 1. WhatsApp charges daily
      const dailyWhatsappMap = new Map<string, number>();
      try {
        const { getCountryCode } = require('./whatsapp-billing.controller');
        const { METADATA_PRICING_TABLE } = require('./whatsapp-billing.controller');
        
        const configRes = await query(`SELECT phone_number FROM whatsapp_config WHERE app_id = $1 LIMIT 1`, [id]);
        const phone = configRes.rows[0]?.phone_number || '';
        const country = getCountryCode(phone);
        const rates = METADATA_PRICING_TABLE[country] || METADATA_PRICING_TABLE['IN'];

        const waRes = await query(`
          SELECT 
            TO_CHAR(created_at, 'YYYY-MM-DD') as date_str, 
            event_type, 
            COUNT(*)::integer as count
          FROM notification_logs
          WHERE channel = 'whatsapp'
            AND (app_id = $1 OR customer_id = (SELECT id FROM customer_profiles WHERE app_id = $1))
            AND created_at >= $2 AND created_at <= $3
            AND status != 'failed'
          GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD'), event_type
        `, [id, startOfRange, endOfRange]);

        for (const row of waRes.rows) {
          const name = row.event_type || '';
          const count = row.count;
          const dateStr = row.date_str;
          
          let cost = 0;
          const cat = (name === 'task_status_update' || name === 'order_confirmation_admin' || name === 'welcome_message' || name === 'get_offers') ? 'marketing' : 'utility';
          if (cat === 'marketing') cost = count * rates.marketing.price;
          else if (cat === 'utility') cost = count * rates.utility.price;
          else if (cat === 'authentication') cost = count * rates.authentication.price;
          else cost = count * rates.service.price;

          const current = dailyWhatsappMap.get(dateStr) || 0;
          dailyWhatsappMap.set(dateStr, current + cost * 1.1);
        }
      } catch (e) {
        console.warn('Failed to query daily whatsapp costs:', e);
      }

      // 2. Push notifications charges daily
      const dailyPushMap = new Map<string, number>();
      try {
        const config = await firebaseBillingService.getSettingsForApp(id);
        const pricePer1000 = parseFloat(config.price_per_1000 || '0.50');
        const platformCharge = parseFloat(config.platform_service_charge || '10.00');
        const gstPercent = parseFloat(config.gst_percentage || '18.00');

        const pushRes = await query(`
          SELECT 
            TO_CHAR(sent_time, 'YYYY-MM-DD') as date_str,
            COUNT(*)::integer as count
          FROM firebase_notification_logs
          WHERE application_id = $1 AND sent_time >= $2 AND sent_time <= $3 AND delivery_status != 'failed'
          GROUP BY TO_CHAR(sent_time, 'YYYY-MM-DD')
        `, [id, startOfRange, endOfRange]);

        for (const row of pushRes.rows) {
          const dateStr = row.date_str;
          const count = row.count;
          const rawCost = (count / 1000) * pricePer1000;
          const dailyPlatform = platformCharge / 30;
          const subtotal = rawCost + dailyPlatform;
          const totalDaily = subtotal * (1 + gstPercent / 100);
          dailyPushMap.set(dateStr, totalDaily);
        }
      } catch (e) {
        console.warn('Failed to query daily push notifications costs:', e);
      }

      try {
        const firebaseAnalytics = await firebaseService.getRealAnalyticsHistory(id, month);

        if (firebaseAnalytics.history.length > 0) {
          // Merge Firebase Cloud Monitoring data with DB data
          const dbMap = new Map(dbHistory.map(h => [h.date, h]));
          const fbMap = new Map(firebaseAnalytics.history.map(h => [h.date, h]));

          // Union of all dates
          const allDates = new Set([...dbMap.keys(), ...fbMap.keys()]);
          const merged: any[] = [];

          for (const date of Array.from(allDates).sort()) {
            const db = dbMap.get(date);
            const fb = fbMap.get(date);

            const functionsCost = fb?.functionsCost || 0;
            const hostingCost = fb?.hostingCost || 0;

            const dbApiCost = db?.cost || 0;
            const waCost = dailyWhatsappMap.get(date) || 0;
            const pushCost = dailyPushMap.get(date) || 0;
            const nonFirebaseCost = Math.round((dbApiCost + waCost + pushCost) * 100) / 100;

            merged.push({
              date,
              hits: (db?.hits || 0) + (fb?.hits || 0),
              errors: (db?.errors || 0) + (fb?.errors || 0),
              avg_latency: db?.avg_latency || fb?.avg_latency || 0,
              functionsCost: Math.round(functionsCost * 100) / 100,
              hostingCost: Math.round(hostingCost * 100) / 100,
              nonFirebaseCost: Math.round(nonFirebaseCost * 100) / 100,
              cost: Math.round((functionsCost + hostingCost + nonFirebaseCost) * 100) / 100,
            });
          }

          history = merged;
          totalHits = dbHits + firebaseAnalytics.totalHits;
          totalCost = history.reduce((sum, h) => sum + h.cost, 0);
        } else {
          // No firebase history, but still populate nonFirebaseCost for PostgreSQL standard logs
          history = dbHistory.map(h => {
            const waCost = dailyWhatsappMap.get(h.date) || 0;
            const pushCost = dailyPushMap.get(h.date) || 0;
            const nonFirebaseCost = Math.round((h.cost + waCost + pushCost) * 100) / 100;
            return {
              ...h,
              functionsCost: 0,
              hostingCost: 0,
              nonFirebaseCost,
              cost: nonFirebaseCost
            };
          });
        }
      } catch (fbErr: any) {
        console.warn('Firebase analytics fetch failed, using DB-only data:', fbErr.message);
        history = dbHistory.map(h => {
          const waCost = dailyWhatsappMap.get(h.date) || 0;
          const pushCost = dailyPushMap.get(h.date) || 0;
          const nonFirebaseCost = Math.round((h.cost + waCost + pushCost) * 100) / 100;
          return {
            ...h,
            functionsCost: 0,
            hostingCost: 0,
            nonFirebaseCost,
            cost: nonFirebaseCost
          };
        });
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
         firebaseBilling = await firebaseBillingService.getDetailedBilling(id, month);
         if (firebaseBilling && firebaseBilling.totalCost !== null) {
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
