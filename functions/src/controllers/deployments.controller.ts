import { Request, Response } from 'express';
import { query, isPostgresEnabled } from '../config/db';
import { EventEmitter } from 'events';

export const deploymentEmitter = new EventEmitter();

// Simulated deployment log lines
const LOG_TEMPLATES = [
  { text: '[CI] Build container initiated. Target platform: Cloud Run.', delay: 0, color: 'muted' },
  { text: '[CI] Running npm install --production...', delay: 800, color: 'muted' },
  { text: '[CI] Running npm compile-applet... verified.', delay: 2000, color: 'muted' },
  { text: '[System] Dependency security validation complete. 0 vulnerabilities.', delay: 3500, color: 'indigo' },
  { text: '[System] Running unit tests...', delay: 4500, color: 'muted' },
  { text: '[System] All 47 tests passed (3 skipped).', delay: 6000, color: 'green' },
  { text: '[Deploy] Building Docker image...', delay: 7000, color: 'muted' },
  { text: '[Deploy] Pushing image to artifact registry...', delay: 9000, color: 'muted' },
  { text: '[Deploy] Deploying artifact revision... 100% active state achieved.', delay: 11000, color: 'green' },
  { text: '[Router] Rerouted domain records to active version.', delay: 12500, color: 'muted' },
  { text: '[Health] Health check passed. Status: 200 OK', delay: 13500, color: 'green' },
  { text: '[Done] Deployment completed successfully.', delay: 15000, color: 'green' },
];

export const deploymentsController = {
  /**
   * GET /api/admin/apps/:id/deployments
   */
  async getDeployments(req: Request, res: Response) {
    const { id } = req.params;
    try {
      if (!isPostgresEnabled) {
        return res.json([]);
      }
      const result = await query(
        `SELECT * FROM deployments WHERE app_id = $1 ORDER BY created_at DESC LIMIT 20`,
        [id]
      );
      return res.json(result.rows);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  /**
   * POST /api/admin/apps/:id/deployments/trigger
   * Creates a new deployment and starts simulated log streaming.
   */
  async triggerDeployment(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      // Generate version from date
      const now = new Date();
      const version = `v${now.getFullYear() % 100}.${now.getMonth() + 1}.${now.getDate()}_${now.getHours()}${now.getMinutes()}`;
      const commitId = Math.random().toString(36).substring(2, 8);

      let depId: string;
      if (isPostgresEnabled) {
        const insertRes = await query(
          `INSERT INTO deployments (app_id, version, status, commit_id, branch, deployed_by, logs, progress)
           VALUES ($1, $2, 'deploying', $3, 'main', 'Admin', '', 0)
           RETURNING *`,
          [id, version, commitId]
        );
        depId = insertRes.rows[0].id;
        res.json({ success: true, deploymentId: depId, version, commitId });
      } else {
        depId = `dep_${Date.now()}`;
        res.json({ success: true, deploymentId: depId, version, commitId });
      }

      // Simulate deployment log progression
      let logLines = '';
      for (const template of LOG_TEMPLATES) {
        setTimeout(async () => {
          logLines += `${new Date().toLocaleTimeString()} ${template.text}\n`;
          const progressIndex = LOG_TEMPLATES.indexOf(template);
          const progress = Math.round(((progressIndex + 1) / LOG_TEMPLATES.length) * 100);
          const isLast = progressIndex === LOG_TEMPLATES.length - 1;

          deploymentEmitter.emit(`dep:${id}:${depId}`, {
            line: `${new Date().toLocaleTimeString()} ${template.text}`,
            color: template.color,
            progress,
            done: isLast
          });

          // Update DB
          if (isPostgresEnabled) {
            await query(
              `UPDATE deployments SET logs = $1, progress = $2, status = $3, finished_at = $4 WHERE id = $5`,
              [
                logLines,
                progress,
                isLast ? 'success' : 'deploying',
                isLast ? new Date().toISOString() : null,
                depId
              ]
            ).catch(() => {});
          }

          // Also broadcast to overall deployment stream
          deploymentEmitter.emit(`dep:${id}`, {
            deploymentId: depId,
            version,
            status: isLast ? 'success' : 'deploying',
            progress
          });
        }, template.delay);
      }
      return;
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * GET /api/admin/apps/:id/deployments/:depId/logs (SSE)
   */
  async getDeploymentLogs(req: Request, res: Response) {
    const { id, depId } = req.params;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send existing logs from DB
    if (isPostgresEnabled) {
      try {
        const dep = await query(`SELECT logs, status FROM deployments WHERE id = $1 AND app_id = $2`, [depId, id]);
        if (dep.rows.length > 0 && dep.rows[0].logs) {
          const lines = dep.rows[0].logs.split('\n').filter(Boolean);
          for (const line of lines) {
            res.write(`data: ${JSON.stringify({ line, color: 'muted' })}\n\n`);
          }
          if (dep.rows[0].status !== 'deploying') {
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          }
        }
      } catch (_) { /* non-fatal */ }
    }

    const onLog = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (data.done) res.end();
    };
    deploymentEmitter.on(`dep:${id}:${depId}`, onLog);

    req.on('close', () => {
      deploymentEmitter.removeListener(`dep:${id}:${depId}`, onLog);
      res.end();
    });
  },

  /**
   * GET /api/admin/apps/:id/deployments/live-stream (SSE)
   * Streams overall deployment status updates.
   */
  async liveStream(req: Request, res: Response) {
    const { id } = req.params;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const onUpdate = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    deploymentEmitter.on(`dep:${id}`, onUpdate);

    const hb = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);
    }, 15000);

    req.on('close', () => {
      deploymentEmitter.removeListener(`dep:${id}`, onUpdate);
      clearInterval(hb);
      res.end();
    });
  }
};
