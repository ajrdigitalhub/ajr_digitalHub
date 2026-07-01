import { Request, Response } from 'express';
import { query, isPostgresEnabled } from '../config/db';
import { EventEmitter } from 'events';

export const securityEmitter = new EventEmitter();

export const securityController = {
  /**
   * GET /api/admin/apps/:id/security/logs
   * Returns security summary + threat logs for an app.
   */
  async getLogs(req: Request, res: Response) {
    const { id } = req.params;
    try {
      if (!isPostgresEnabled) {
        return res.json({
          failedLogins: 0,
          suspiciousIps: 0,
          wafStatus: 'ACTIVE',
          logs: []
        });
      }

      const [countsRes, logsRes] = await Promise.all([
        query(`
          SELECT
            COUNT(*) FILTER (WHERE type = 'failed_login') AS failed_logins,
            COUNT(DISTINCT ip) FILTER (WHERE type = 'suspicious_ip' OR type = 'blocked') AS suspicious_ips
          FROM security_logs
          WHERE app_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
        `, [id]),
        query(`
          SELECT id, type, severity, ip, region, user_email, message, is_banned, is_revoked, created_at
          FROM security_logs
          WHERE app_id = $1
          ORDER BY created_at DESC
          LIMIT 50
        `, [id])
      ]);

      const counts = countsRes.rows[0] || {};
      return res.json({
        failedLogins: parseInt(counts.failed_logins || '0'),
        suspiciousIps: parseInt(counts.suspicious_ips || '0'),
        wafStatus: 'ACTIVE',
        logs: logsRes.rows
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  /**
   * POST /api/admin/apps/:id/security/ban-ip
   * Bans an IP address for the given app.
   */
  async banIp(req: Request, res: Response) {
    const { id } = req.params;
    const { ip, logId } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP address is required' });

    try {
      if (isPostgresEnabled) {
        // Mark all logs from this IP as banned
        await query(
          `UPDATE security_logs SET is_banned = true WHERE app_id = $1 AND ip = $2`,
          [id, ip]
        );
        // Insert a new banned event
        const insertRes = await query(
          `INSERT INTO security_logs (app_id, type, severity, ip, message)
           VALUES ($1, 'blocked', 'critical', $2, $3)
           RETURNING *`,
          [id, ip, `IP ${ip} has been manually banned by administrator.`]
        );
        const newLog = insertRes.rows[0];
        // Emit to live stream
        securityEmitter.emit(`security:${id}`, { ...newLog, action: 'ban_ip' });
      }
      return res.json({ success: true, message: `IP ${ip} has been banned.` });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  /**
   * POST /api/admin/apps/:id/security/revoke-session
   * Revokes a session / marks a log entry as revoked.
   */
  async revokeSession(req: Request, res: Response) {
    const { id } = req.params;
    const { logId, userEmail } = req.body;

    try {
      if (isPostgresEnabled && logId) {
        await query(
          `UPDATE security_logs SET is_revoked = true WHERE id = $1 AND app_id = $2`,
          [logId, id]
        );
        const newLog = {
          id: logId,
          app_id: id,
          type: 'session_revoked',
          severity: 'warn',
          message: `Session revoked for ${userEmail || 'unknown user'} by administrator.`,
          created_at: new Date().toISOString()
        };
        securityEmitter.emit(`security:${id}`, { ...newLog, action: 'revoke_session' });
      }
      return res.json({ success: true, message: `Session revoked.` });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  /**
   * GET /api/admin/apps/:id/security/live-stream (SSE)
   * Streams real-time security events.
   */
  async liveStream(req: Request, res: Response) {
    const { id } = req.params;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send last 10 events as initial payload
    if (isPostgresEnabled) {
      try {
        const recent = await query(
          `SELECT * FROM security_logs WHERE app_id = $1 ORDER BY created_at DESC LIMIT 10`,
          [id]
        );
        for (const log of [...recent.rows].reverse()) {
          res.write(`data: ${JSON.stringify(log)}\n\n`);
        }
      } catch (_) { /* non-fatal */ }
    }

    const onEvent = (log: any) => {
      res.write(`data: ${JSON.stringify(log)}\n\n`);
    };
    securityEmitter.on(`security:${id}`, onEvent);

    // Heartbeat every 15s
    const hb = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
    }, 15000);

    req.on('close', () => {
      securityEmitter.removeListener(`security:${id}`, onEvent);
      clearInterval(hb);
      res.end();
    });
  }
};
