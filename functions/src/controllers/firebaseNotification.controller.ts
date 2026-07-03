import { Request, Response } from 'express';
import { query } from '../db';
import { firebaseAnalyticsService } from '../services/firebase-analytics.service';
import { firebaseBillingService } from '../services/firebase-billing.service';
import { notificationTokenService } from '../services/notification-token.service';
import { notificationLogsService } from '../services/notification-logs.service';
import { firebaseMessagingService } from '../services/firebase-messaging.service';

export const firebaseNotificationController = {
  // 1. Dashboard summary
  async getDashboard(req: Request, res: Response) {
    try {
      const customerId = (req as any).user?.role !== 'admin' ? (req as any).user?.customer_id : null;
      const stats = await firebaseAnalyticsService.getDashboardStats(customerId);
      const charts = await firebaseAnalyticsService.getDashboardCharts(customerId);
      
      res.json({ stats, charts });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  // 2. Real-time updates via Server-Sent Events (SSE)
  async getRealtimeStream(req: Request, res: Response) {
    try {
      const customerId = (req as any).user?.role !== 'admin' ? (req as any).user?.customer_id : null;
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      // Initial stats
      const stats = await firebaseAnalyticsService.getDashboardStats(customerId);
      res.write(`data: ${JSON.stringify(stats)}\n\n`);

      // Heartbeat / interval push
      const timer = setInterval(async () => {
        try {
          const freshStats = await firebaseAnalyticsService.getDashboardStats(customerId);
          res.write(`data: ${JSON.stringify(freshStats)}\n\n`);
        } catch (e) {
          // Ignore write failures if connection closed
        }
      }, 10000); // Send updates every 10 seconds

      req.on('close', () => {
        clearInterval(timer);
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  // 3. Applications monitoring list
  async getApplications(req: Request, res: Response) {
    try {
      const customerId = (req as any).user?.role !== 'admin' ? (req as any).user?.customer_id : null;
      
      let q = `SELECT a.*, cp.company_name as customer_name 
               FROM apps a
               LEFT JOIN customer_profiles cp ON cp.app_id = a.id`;
      const params: any[] = [];
      if (customerId) {
        q += ` WHERE cp.id = $1`;
        params.push(customerId);
      }

      const appsRes = await query(q, params);
      const results = [];

      for (const app of appsRes.rows) {
        const metrics = await firebaseAnalyticsService.getApplicationMetrics(app.id);
        const settings = await firebaseBillingService.getSettingsForApp(app.id);
        results.push({
          ...app,
          metrics,
          settings
        });
      }

      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  // 4. Single Application analytics
  async getApplicationDetails(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const metrics = await firebaseAnalyticsService.getApplicationMetrics(id);
      const settings = await firebaseBillingService.getSettingsForApp(id);
      const appRes = await query('SELECT * FROM apps WHERE id = $1', [id]);
      
      if (appRes.rows.length === 0) {
        return res.status(404).json({ error: 'Application not found' });
      }

      res.json({
        app: appRes.rows[0],
        metrics,
        settings
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  // 5. Subscribers list
  async getSubscribers(req: Request, res: Response) {
    try {
      const customerId = (req as any).user?.role !== 'admin' ? (req as any).user?.customer_id : undefined;
      const { appId, search, platform, status } = req.query;

      const subscribers = await notificationTokenService.getSubscribers({
        appId: appId as string,
        customerId: customerId as string,
        search: search as string,
        platform: platform as string,
        status: status as string
      });

      const distribution = await notificationTokenService.getSubscriberDistribution(customerId || null);

      res.json({ subscribers, distribution });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  // 5b. Revoke/Disable subscriber actions
  async revokeToken(req: Request, res: Response) {
    try {
      const { id } = req.body;
      await notificationTokenService.revokeToken(id);
      res.json({ success: true, message: 'Subscriber token revoked' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async disableNotifications(req: Request, res: Response) {
    try {
      const { id } = req.body;
      await notificationTokenService.disableNotifications(id);
      res.json({ success: true, message: 'Subscriber notifications disabled' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async refreshToken(req: Request, res: Response) {
    try {
      const { id } = req.body;
      await notificationTokenService.refreshToken(id);
      res.json({ success: true, message: 'Subscriber token refreshed' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  // 6. Billing metrics
  async getBilling(req: Request, res: Response) {
    try {
      const customerId = (req as any).user?.role !== 'admin' ? (req as any).user?.customer_id : null;
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const endOfMonth = new Date();

      let q = `SELECT a.id, a.name as app_name, cp.id as customer_id, cp.company_name as customer_name 
               FROM apps a
               LEFT JOIN customer_profiles cp ON cp.app_id = a.id`;
      const params: any[] = [];
      if (customerId) {
        q += ` WHERE cp.id = $1`;
        params.push(customerId);
      }

      const appsList = await query(q, params);
      const breakdowns = [];

      for (const app of appsList.rows) {
        const settings = await firebaseBillingService.getSettingsForApp(app.id);
        const calculation = await firebaseBillingService.calculateBilling(app.id, startOfMonth, endOfMonth);
        breakdowns.push({
          appId: app.id,
          appName: app.app_name,
          customerName: app.customer_name || 'N/A',
          settings,
          calculation
        });
      }

      const history = await firebaseBillingService.getBillingHistory(customerId);

      res.json({ breakdowns, history });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  // 7. Event logs
  async getLogs(req: Request, res: Response) {
    try {
      const customerId = (req as any).user?.role !== 'admin' ? (req as any).user?.customer_id : undefined;
      const { appId, status, startDate, endDate } = req.query;

      const logs = await notificationLogsService.getLogs({
        appId: appId as string,
        customerId: customerId as string,
        status: status as string,
        startDate: startDate as string,
        endDate: endDate as string
      });

      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  // 8. Reports Generation
  async getReports(req: Request, res: Response) {
    try {
      const customerId = (req as any).user?.role !== 'admin' ? (req as any).user?.customer_id : null;
      
      const reports = await query(`
        SELECT r.*, 
          COALESCE(r.filters->>'app_name', 'All Applications') as scope
        FROM firebase_notification_reports r
        ORDER BY r.created_at DESC
        LIMIT 50
      `);

      res.json(reports.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async createReport(req: Request, res: Response) {
    try {
      const { reportName, reportType, filters } = req.body;
      const resReport = await query(
        `INSERT INTO firebase_notification_reports (report_name, report_type, filters, file_url)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [reportName, reportType, JSON.stringify(filters || {}), `/reports/pdf_${Date.now()}.pdf`]
      );
      res.json(resReport.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  // 9. Configuration
  async saveConfiguration(req: Request, res: Response) {
    try {
      const { appId, settings } = req.body;
      if (!appId) return res.status(400).json({ error: 'appId is required' });

      await firebaseBillingService.saveSettingsForApp(appId, settings);
      res.json({ success: true, message: 'Configuration saved successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  // 10. Manual Test Notification
  async testNotification(req: Request, res: Response) {
    const { appId, token, title, body, image, url } = req.body || {};
    try {
      if (!appId || !token || !title || !body) {
        return res.status(400).json({ error: 'appId, token, title, and body are required' });
      }

      // Resolve customer context
      const appRes = await query('SELECT cp.id as customer_id FROM apps a LEFT JOIN customer_profiles cp ON cp.app_id = a.id WHERE a.id = $1', [appId]);
      const customerId = appRes.rows[0]?.customer_id || null;

      const result = await firebaseMessagingService.sendToTokens([token], { title, body, image, url });

      // Save log entry
      await notificationLogsService.addLog({
        appId,
        customerId,
        title,
        body,
        notificationType: 'transactional',
        deliveryStatus: result.successCount > 0 ? 'delivered' : 'failed',
        failureReason: result.failureCount > 0 ? 'FCM Rejected Token' : undefined
      });

      res.json({ success: true, result });
    } catch (err: any) {
      // Log failure
      await notificationLogsService.addLog({
        appId: appId || null,
        customerId: null,
        title: title || 'Error',
        body: body || 'FCM test notification request failed',
        deliveryStatus: 'failed',
        failureReason: err.message
      });
      res.status(500).json({ error: err.message });
    }
  },

  // 11. Bulk refresh token verification
  async refreshTokens(req: Request, res: Response) {
    try {
      const { appId } = req.body;
      await notificationTokenService.bulkRefreshTokens(appId);
      res.json({ success: true, message: 'Tokens refreshed' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
};
