import { Request, Response, NextFunction } from 'express';
import { query, isPostgresEnabled } from '../config/db';
import { streamEmitter } from '../controllers/analytics.controller';
import { firestore, rtdb } from '../config/firebase';
import { securityEmitter } from '../controllers/security.controller';

export const usageTracker = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (
    req.path.includes('.') || 
    req.path.startsWith('/_angular') || 
    req.path.startsWith('/media') || 
    req.path.startsWith('/assets') ||
    req.path.startsWith('/api/internal/log')
  ) {
    return next();
  }

  const startTime = Date.now();
  
  res.on('finish', async () => {
    const responseTime = Date.now() - startTime;
    const appId = req.headers['x-app-identifier'] as string || req.query['appId'] as string;
    
    // Only log if we have a valid UUID-like app_id, to avoid foreign key errors
    if (!appId || appId.length < 10) return;

    try {
      // 1. Insert into usage_logs
      if (isPostgresEnabled) {
        await query(
          `INSERT INTO usage_logs (app_id, endpoint, method, hits, latency, status_code, source) VALUES ($1, $2, $3, 1, $4, $5, $6)`,
          [appId, req.path, req.method, responseTime, res.statusCode, req.headers['user-agent'] || 'Unknown']
        );
      }

      const userAgent = req.headers['user-agent'] || 'Unknown';
      const browser = userAgent.includes('Chrome') ? 'Chrome' : 
                      userAgent.includes('Firefox') ? 'Firefox' :
                      userAgent.includes('Safari') && !userAgent.includes('Chrome') ? 'Safari' :
                      userAgent.includes('Edge') ? 'Edge' : 'Other';

      // 2. Broadcast to SSE Live Stream
      streamEmitter.emit(`log:${appId}`, {
        timestamp: new Date().toISOString(),
        method: req.method,
        endpoint: req.path,
        status: res.statusCode,
        latency: responseTime,
        source: browser,
        type: res.statusCode >= 400 ? 'error' : 'success'
      });

      // 3. Auto-detect security threats from 401/403 responses
      if ((res.statusCode === 401 || res.statusCode === 403) && isPostgresEnabled) {
        const ip = (req.headers['x-forwarded-for'] as string || req.ip || '').split(',')[0].trim();
        const isAuthEndpoint = req.path.includes('/auth') || req.path.includes('/login') || req.path.includes('/token');
        const logType = isAuthEndpoint ? 'failed_login' : 'suspicious_ip';
        const severity = res.statusCode === 403 ? 'critical' : 'warn';
        const message = isAuthEndpoint
          ? `Failed login attempt. Source IP: ${ip} | Endpoint: ${req.method} ${req.path}`
          : `Unauthorized access attempt from ${ip} on ${req.path}`;

        try {
          const insertRes = await query(
            `INSERT INTO security_logs (app_id, type, severity, ip, user_agent, message)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [appId, logType, severity, ip, req.headers['user-agent'] || 'Unknown', message]
          );
          // Emit to security live stream
          securityEmitter.emit(`security:${appId}`, insertRes.rows[0]);
        } catch (_) { /* non-fatal */ }
      }

      // 4. Sync to Firestore if active
      if (firestore) {
        const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await firestore.collection('api_logs').doc(logId).set({
          appId,
          endpoint: req.path,
          method: req.method,
          status: res.statusCode,
          latency: responseTime,
          source: browser,
          timestamp: Date.now()
        });

        // Update aggregated metrics document
        try {
          const metricDocRef = firestore.collection('metrics').doc(appId);
          await firestore.runTransaction(async (transaction: any) => {
            const doc = await transaction.get(metricDocRef);
            const data = doc.exists ? doc.data() : { hits: 0, errors: 0, totalLatency: 0 };
            const hits = (data.hits || 0) + 1;
            const errors = (data.errors || 0) + (res.statusCode >= 400 ? 1 : 0);
            const totalLatency = (data.totalLatency || 0) + responseTime;
            const avgLatency = Math.round(totalLatency / hits);
            transaction.set(metricDocRef, {
              hits,
              errors,
              totalLatency,
              avgLatency,
              last_updated: new Date().toISOString()
            }, { merge: true });
          });
        } catch (_) { /* non-fatal metrics update */ }
      }

      // 5. Sync to Realtime Database if active
      if (rtdb) {
        try {
          const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          await rtdb.ref(`api_hits/${appId}/${logId}`).set({
            id: logId,
            appId,
            endpoint: req.path,
            method: req.method,
            statusCode: res.statusCode,
            responseTime,
            timestamp: new Date().toISOString()
          });
        } catch (_) {
          // Silent fail for Realtime DB
        }
      }
    } catch (e) {
      // Silent fail for usage log
    }
  });

  next();
};
