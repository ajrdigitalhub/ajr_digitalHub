import { Request, Response } from 'express';
import { FirebaseService } from '../services/firebase.service';
import { query, isPostgresEnabled } from '../config/db';
import { BaseService } from '../core/base.service';
import { streamEmitter } from './analytics.controller';
import { firebaseBillingService } from '../services/firebase-billing.service';

const firebaseService = new FirebaseService();

export const firebaseController = {
  async getStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const status = await firebaseService.getAppStatus(id);
      return res.json(status);
    } catch (err: any) {
      return res.status(err.message.includes('not configured') ? 404 : 500).json({ error: err.message });
    }
  },

  async getLogs(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const logs = await firebaseService.getFirebaseLogs(id);
      return res.json(logs);
    } catch (err: any) {
      return res.status(err.message.includes('not configured') ? 404 : 500).json({ error: err.message });
    }
  },

  async getAnalytics(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const analytics = await firebaseService.getAnalytics(id);
      return res.json(analytics);
    } catch (err: any) {
      return res.status(err.message.includes('not configured') ? 404 : 500).json({ error: err.message });
    }
  },

  async getStorage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const storage = await firebaseService.getStorageUsage(id);
      return res.json(storage);
    } catch (err: any) {
      return res.status(err.message.includes('not configured') ? 404 : 500).json({ error: err.message });
    }
  },

  /**
   * GET /api/admin/apps/:id/firebase/billing
   * Returns real billing cost from Cloud Billing API using per-app projectId.
   */
  async getBilling(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const month = req.query['month'] as string;
      const billing = await firebaseBillingService.getDetailedBilling(id, month);
      return res.json(billing);
    } catch (err: any) {
      return res.status(err.message.includes('not configured') ? 404 : 500).json({ error: err.message });
    }
  },

  /**
   * GET /api/admin/apps/:id/firebase/realtime-analytics
   * Returns real Cloud Monitoring analytics history for the app's Firebase project.
   */
  async getRealtimeAnalytics(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const month = req.query['month'] as string;
      const data = await firebaseService.getRealAnalyticsHistory(id, month);
      return res.json(data);
    } catch (err: any) {
      return res.status(err.message.includes('not configured') ? 404 : 500).json({ error: err.message });
    }
  },

  /**
   * GET /api/admin/apps/:id/firebase/api-hits
   * Returns historical API hits from Firebase Realtime Database.
   */
  async getFirebaseApiHits(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const hits = await firebaseService.getFirebaseApiHits(id);
      return res.json(hits);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  /**
   * GET /api/admin/apps/:id/firebase/live-api-hits
   * Serves a live SSE stream of API hits from Realtime Database.
   */
  async liveApiHits(req: Request, res: Response) {
    const { id } = req.params;
    const { rtdb } = require('../config/firebase');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let onChildAdded: any = null;
    let onLog: any = null;
    let fallbackInterval: any = null;
    let rtdbActive = false;

    // Send initial hits
    try {
      if (rtdb) {
        const snapshot = await rtdb.ref(`api_hits/${id}`).orderByChild('timestamp').limitToLast(20).once('value');
        const val = snapshot.val();
        if (val) {
          rtdbActive = true;
          const list = Object.values(val);
          list.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          for (const hit of list) {
            res.write(`data: ${JSON.stringify(hit)}\n\n`);
          }
        }
      } else {
        // Try REST API RTDB Fallback
        const config = await firebaseService.getFirebaseConfig(id);
        if (config && config.projectId) {
          const token = await firebaseService.getAccessToken(config.projectId, config.serviceAccount);
          if (token) {
            const axios = require('axios');
            const urls = [
              `https://${config.projectId}-default-rtdb.firebaseio.com/api_hits/${id}.json`,
              `https://${config.projectId}-default-rtdb.asia-southeast1.firebasedatabase.app/api_hits/${id}.json`,
              `https://${config.projectId}.firebaseio.com/api_hits/${id}.json`
            ];
            for (const url of urls) {
              try {
                const resRest = await axios.get(url, {
                  headers: { Authorization: `Bearer ${token}` },
                  timeout: 2000
                });
                if (resRest.data) {
                  rtdbActive = true;
                  const list = Object.values(resRest.data);
                  list.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                  for (const hit of list) {
                    res.write(`data: ${JSON.stringify(hit)}\n\n`);
                  }
                  break;
                }
              } catch (e: any) {
                // try next
              }
            }
          }
        }
      }
    } catch (e) {
      // non-fatal
    }

    if (rtdbActive && rtdb) {
      const ref = rtdb.ref(`api_hits/${id}`);
      const startTime = new Date().toISOString();
      onChildAdded = ref.orderByChild('timestamp').startAt(startTime).on('child_added', (snapshot: any) => {
        const hit = snapshot.val();
        if (hit) {
          res.write(`data: ${JSON.stringify(hit)}\n\n`);
        }
      });
    } else {
      // Local fallback telemetry:
      // 1. Initial hits from Postgres
      if (isPostgresEnabled) {
        try {
          const logsRes = await query(
            'SELECT id, app_id as "appId", endpoint, method, status_code as "statusCode", latency as "responseTime", created_at as timestamp FROM usage_logs WHERE app_id = $1 ORDER BY created_at DESC LIMIT 20',
            [id]
          );
          const list = [...logsRes.rows].reverse();
          for (const hit of list) {
            res.write(`data: ${JSON.stringify(hit)}\n\n`);
          }
        } catch (e) {
          // non-fatal
        }
      }

      // 2. Subscribe to local streamEmitter for live hits
      onLog = (log: any) => {
        const hit = {
          id: log.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          appId: id,
          endpoint: log.endpoint,
          method: log.method,
          statusCode: log.statusCode || log.status,
          responseTime: log.responseTime || log.latency,
          timestamp: log.timestamp || new Date().toISOString()
        };
        res.write(`data: ${JSON.stringify(hit)}\n\n`);
      };
      streamEmitter.on(`log:${id}`, onLog);

      // Keep connection alive with heartbeat (especially useful if no logs are triggered)
      fallbackInterval = setInterval(() => {
        res.write(`data: ${JSON.stringify({ timestamp: new Date().toISOString(), method: 'INFO', endpoint: 'RTDB connection inactive (Using Local Telemetry Fallback)', statusCode: 200, responseTime: 0 })}\n\n`);
      }, 15000);
    }

    req.on('close', () => {
      if (rtdb && onChildAdded) {
        rtdb.ref(`api_hits/${id}`).off('child_added', onChildAdded);
      }
      if (onLog) {
        streamEmitter.removeListener(`log:${id}`, onLog);
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
      res.end();
    });
  },

  async saveConfig(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { projectId, apiKey, authDomain, storageBucket, appId, measurementId, serviceAccount } = req.body;
      if (!projectId || !apiKey) {
        return res.status(400).json({ error: 'Project ID and API Key are required' });
      }

      // Validate app_id exists in apps table
      let appExists = false;
      if (isPostgresEnabled) {
        const appCheck = await query('SELECT 1 FROM apps WHERE id = $1', [id]);
        appExists = appCheck.rows.length > 0;
      } else {
        const appsService = new BaseService('apps');
        const app = await appsService.findOne(id);
        appExists = !!app;
      }

      if (!appExists) {
        return res.status(404).json({ error: `Application with ID ${id} does not exist` });
      }

      await firebaseService.saveFirebaseConfig(id, {
        projectId,
        apiKey,
        authDomain: authDomain || `${projectId}.firebaseapp.com`,
        storageBucket: storageBucket || `${projectId}.firebasestorage.app`,
        appId,
        measurementId: measurementId || '',
        serviceAccount
      });
      return res.json({ success: true, message: 'Firebase configuration saved successfully' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async testConnection(req: Request, res: Response) {
    try {
      const { projectId, apiKey, authDomain, storageBucket, appId, serviceAccount } = req.body;
      if (!projectId || !apiKey) {
        return res.status(400).json({ error: 'Project ID and API Key are required for connection test' });
      }
      const success = await firebaseService.testConnection({
        projectId,
        apiKey,
        authDomain: authDomain || '',
        storageBucket: storageBucket || '',
        appId: appId || '',
        serviceAccount
      });
      return res.json({ success });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async liveLogs(req: Request, res: Response) {
    const { id } = req.params;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send initial logs from the real API
    firebaseService.getFirebaseLogs(id).then(logs => {
      for (const log of logs.slice(0, 5)) {
        res.write(`data: ${JSON.stringify(log)}\n\n`);
      }
    }).catch(() => {
      // Non-fatal
    });

    // Keep SSE connection alive with heartbeats
    const intervalTimer = setInterval(async () => {
      try {
        const logs = await firebaseService.getFirebaseLogs(id);
        if (logs.length > 0) {
          // Send the most recent log as a live event
          const latestLog = logs[0];
          res.write(`data: ${JSON.stringify(latestLog)}\n\n`);
        }
      } catch {
        // Keep sending heartbeats even on error
        const fallback = {
          timestamp: new Date().toISOString(),
          severity: 'INFO',
          message: '[Firebase] Heartbeat - monitoring active'
        };
        res.write(`data: ${JSON.stringify(fallback)}\n\n`);
      }
    }, 5000);

    req.on('close', () => {
      clearInterval(intervalTimer);
      res.end();
    });
  },

  /**
   * GET /api/admin/apps/:id/smart-insights
   * Aggregates data from usage_logs, security_logs, deployments, and Firebase.
   */
  async getSmartInsights(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const results = await Promise.allSettled([
        // Usage stats
        isPostgresEnabled ? query(`
          SELECT 
            COALESCE(SUM(hits),0)::int as total_hits,
            COALESCE(AVG(latency),0)::int as avg_latency,
            COALESCE(SUM(CASE WHEN status_code >= 400 THEN hits ELSE 0 END),0)::int as error_count
          FROM usage_logs WHERE app_id = $1
        `, [id]) : Promise.resolve({ rows: [{}] }),
        // Security stats (last 24h)
        isPostgresEnabled ? query(`
          SELECT 
            COUNT(*) FILTER (WHERE type='failed_login')::int as failed_logins,
            COUNT(DISTINCT ip) FILTER (WHERE type='suspicious_ip' OR type='blocked')::int as suspicious_ips,
            COUNT(*) FILTER (WHERE severity='critical')::int as critical_events
          FROM security_logs WHERE app_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
        `, [id]) : Promise.resolve({ rows: [{}] }),
        // Latest deployment
        isPostgresEnabled ? query(`
          SELECT version, status, created_at FROM deployments
          WHERE app_id = $1 ORDER BY created_at DESC LIMIT 1
        `, [id]) : Promise.resolve({ rows: [] }),
        // Firebase analytics from cached metrics
        isPostgresEnabled ? query(`
          SELECT cached_metrics FROM app_integrations WHERE app_id = $1
        `, [id]) : Promise.resolve({ rows: [] })
      ]);

      const usage = (results[0] as any).value?.rows?.[0] || {};
      const security = (results[1] as any).value?.rows?.[0] || {};
      const deployment = (results[2] as any).value?.rows?.[0] || null;
      const integration = (results[3] as any).value?.rows?.[0] || {};
      const cachedMetrics = integration.cached_metrics || {};

      // Smart AI insight text
      const totalHits = usage.total_hits || 0;
      const errorCount = usage.error_count || 0;
      const errorRate = totalHits > 0 ? Math.round((errorCount / totalHits) * 100) : 0;
      const failedLogins = security.failed_logins || 0;
      const criticalEvents = security.critical_events || 0;

      let insightText = 'System is operating normally. All services are healthy.';
      if (criticalEvents > 0) {
        insightText = `⚠️ ${criticalEvents} critical security events detected in the last 24h. Immediate review recommended.`;
      } else if (failedLogins > 5) {
        insightText = `${failedLogins} failed login attempts detected. Consider enabling stricter IP rate limiting.`;
      } else if (errorRate > 10) {
        insightText = `API error rate is ${errorRate}%. Average latency: ${usage.avg_latency}ms. ${totalHits} total requests processed.`;
      } else if (totalHits > 0) {
        insightText = `API traffic healthy — ${totalHits} total requests. Error rate: ${errorRate}%. Avg latency: ${usage.avg_latency}ms.`;
      }

      return res.json({
        insight: insightText,
        totalHits,
        avgLatency: usage.avg_latency || 0,
        errorCount,
        errorRate,
        failedLogins,
        suspiciousIps: security.suspicious_ips || 0,
        criticalEvents,
        lastDeployment: deployment,
        firebaseActiveUsers: cachedMetrics?.analytics?.activeUsers || 0,
        firebaseStatus: cachedMetrics?.status?.status || 'UNKNOWN',
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
};

