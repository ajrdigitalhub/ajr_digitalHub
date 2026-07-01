import { Request, Response } from 'express';
import { query, pool } from '../db';
import { firestore } from '../config/firebase';
import { BaseService } from '../core/base.service';
import { FirebaseService } from '../services/firebase.service';

const firebaseService = new FirebaseService();

export const saasController = {
  async getApps(req: Request, res: Response) {
    try {
      const result = await query(`
        SELECT a.*, 
               json_build_object('rpm', r.rpm, 'rph', r.rph) as rate_limits,
               c.theme, c.features,
               (SELECT amount FROM billing WHERE app_id = a.id AND status = 'pending' ORDER BY created_at DESC LIMIT 1) as current_spend
        FROM apps a
        LEFT JOIN app_rate_limits r ON a.id = r.app_id
        LEFT JOIN app_config c ON a.id = c.app_id
        ORDER BY a.created_at DESC
      `);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getAppById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const appRes = await query(`SELECT * FROM apps WHERE id = $1`, [id]);
      if (appRes.rows.length === 0) return res.status(404).json({ error: 'App not found' });
      
      const config = await query(`SELECT * FROM app_config WHERE app_id = $1`, [id]);
      const rateLimit = await query(`SELECT * FROM app_rate_limits WHERE app_id = $1`, [id]);
      const billing = await query(`SELECT * FROM billing WHERE app_id = $1 ORDER BY created_at DESC LIMIT 1`, [id]);
      const whatsapp = await query(`SELECT * FROM whatsapp_config WHERE app_id = $1`, [id]);
      const email = await query(`SELECT * FROM email_config WHERE app_id = $1`, [id]);
      const firebaseConfig = await firebaseService.getFirebaseConfig(id);

      res.json({
        ...appRes.rows[0],
        config: config.rows[0] || {},
        rate_limit: rateLimit.rows[0] || {},
        billing: billing.rows[0] || {},
        whatsapp: whatsapp.rows[0] || {},
        email: email.rows[0] || {},
        firebase_config: firebaseConfig || null
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async createApp(req: Request, res: Response) {
    if (!pool) return res.status(500).json({ error: 'Database pool unavailable' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { 
        name, 
        domain, 
        environment, 
        plan,
        firebase_project_id, 
        firebase_api_key, 
        firebase_auth_domain, 
        firebase_storage_bucket, 
        firebase_app_id, 
        firebase_measurement_id 
      } = req.body;
      
      // 1. Create App
      const apiKey = `sk_live_${Math.random().toString(36).substring(2, 15)}`;
      const appRes = await client.query(
        `INSERT INTO apps (name, domain, environment, status, api_key) VALUES ($1, $2, $3, 'active', $4) RETURNING *`,
        [name, domain || `${name.toLowerCase().replace(/\s+/g, '-')}.ajrdigital.com`, environment || 'Staging', apiKey]
      );
      const app = appRes.rows[0];

      // Insert into records table for generic compatibility
      await client.query(
        `INSERT INTO records (id, collection, data) VALUES ($1, 'apps', $2)`,
        [app.id, JSON.stringify(app)]
      );

      // 2. Default Configs
      await client.query(`INSERT INTO app_config (app_id, theme, features) VALUES ($1, 'dark', '{}'::jsonb)`, [app.id]);
      
      // 3. Default Rate Limits (Starter)
      await client.query(`INSERT INTO app_rate_limits (app_id, rpm, rph, burst_limit) VALUES ($1, 60, 2000, 10)`, [app.id]);

      // 4. Default Billing
      await client.query(
        `INSERT INTO billing (app_id, usage_json, amount, status) VALUES ($1, $2, 0, 'pending')`,
        [app.id, JSON.stringify({ api: 0, whatsapp: 0, plan: plan || 'Lite' })]
      );

      // 5. Integrations
      await client.query(`INSERT INTO whatsapp_config (app_id, enabled) VALUES ($1, false)`, [app.id]);
      await client.query(`INSERT INTO email_config (app_id, enabled) VALUES ($1, false)`, [app.id]);

      let fbConfig: any = null;
      if (firebase_project_id && firebase_api_key) {
        fbConfig = {
          projectId: firebase_project_id,
          apiKey: firebase_api_key,
          authDomain: firebase_auth_domain || `${firebase_project_id}.firebaseapp.com`,
          storageBucket: firebase_storage_bucket || `${firebase_project_id}.firebasestorage.app`,
          appId: firebase_app_id || '',
          measurementId: firebase_measurement_id || ''
        };
        await client.query(
          `INSERT INTO app_integrations (app_id, firebase_config) VALUES ($1, $2)`,
          [app.id, JSON.stringify(fbConfig)]
        );
      }

      await client.query('COMMIT');
      res.status(201).json({
        ...app,
        firebase_config: fbConfig
      });
    } catch (err: any) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  },

  async updateConfig(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { theme, features, hero_config } = req.body;
      const result = await query(
        `UPDATE app_config SET theme = COALESCE($1, theme), features = COALESCE($2, features), hero_config = COALESCE($3, hero_config) WHERE app_id = $4 RETURNING *`,
        [theme, features, hero_config, id]
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async updateRateLimit(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { rpm, rph, burst_limit } = req.body;
      const result = await query(
        `UPDATE app_rate_limits SET rpm = COALESCE($1, rpm), rph = COALESCE($2, rph), burst_limit = COALESCE($3, burst_limit) WHERE app_id = $4 RETURNING *`,
        [rpm, rph, burst_limit, id]
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async updateWhatsappConfig(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { phone_number, api_key, enabled, waba_id } = req.body;
      const result = await query(
        `UPDATE whatsapp_config SET phone_number = COALESCE($1, phone_number), api_key = COALESCE($2, api_key), enabled = COALESCE($3, enabled), waba_id = COALESCE($4, waba_id) WHERE app_id = $5 RETURNING *`,
        [phone_number, api_key, enabled, waba_id, id]
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async updateEmailConfig(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { smtp_host, smtp_port, user, pass, enabled } = req.body;
      const result = await query(
        `UPDATE email_config SET smtp_host = COALESCE($1, smtp_host), smtp_port = COALESCE($2, smtp_port), "user" = COALESCE($3, "user"), pass = COALESCE($4, pass), enabled = COALESCE($5, enabled) WHERE app_id = $6 RETURNING *`,
        [smtp_host, smtp_port, user, pass, enabled, id]
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async toggleService(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { service, enabled } = req.body;
      if (service === 'whatsapp') {
        await query(`UPDATE whatsapp_config SET enabled = $1 WHERE app_id = $2`, [enabled, id]);
      } else if (service === 'email') {
        await query(`UPDATE email_config SET enabled = $1 WHERE app_id = $2`, [enabled, id]);
      } else if (service === 'api') {
        await query(`UPDATE apps SET status = $1 WHERE id = $2`, [enabled ? 'active' : 'inactive', id]);
      }
      res.json({ success: true, service, enabled });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const appRes = await query(`SELECT status FROM apps WHERE id = $1`, [id]);
      if (appRes.rows.length === 0) return res.status(404).json({ error: 'App not found' });
      
      const uptime = Math.floor(process.uptime());
      res.json({
        status: appRes.rows[0].status,
        uptime,
        message: appRes.rows[0].status === 'active' ? 'Operational' : 'Offline'
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async syncToFirebase(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { collectionName = 'edge_apps' } = req.body;

      // 1. Fetch data from DB
      const appRes = await query('SELECT * FROM apps WHERE id = $1', [id]);
      if (appRes.rows.length === 0) {
        return res.status(404).json({ error: 'Application not found' });
      }
      const app = appRes.rows[0];

      const configRes = await query('SELECT * FROM app_config WHERE app_id = $1', [id]);
      const rateLimitRes = await query('SELECT * FROM app_rate_limits WHERE app_id = $1', [id]);
      const billingRes = await query('SELECT * FROM billing WHERE app_id = $1 AND status = $2', [id, 'pending']);

      const payload = {
        ...app,
        config: configRes.rows[0] || null,
        rateLimits: rateLimitRes.rows[0] || null,
        billing: billingRes.rows[0] || null,
        syncedAt: new Date().toISOString()
      };

      // Fetch deployments and logs for bootstrapping
      const depService = new BaseService('deployments');
      const deployments = await depService.findAll({ limit: 10, filters: { appId: id } });
      const logsRes = await query('SELECT * FROM usage_logs WHERE app_id = $1 ORDER BY created_at DESC LIMIT 10', [id]);

      // 2. Perform Sync
      if (firestore) {
        // A. Sync app details
        const docRef = firestore.collection(collectionName).doc(id);
        await docRef.set(payload, { merge: true });

        // B. Sync recent deployments
        for (const dep of deployments.data) {
          const depTime = dep.created_at || dep.timestamp || new Date().toISOString();
          await firestore.collection('edge_deployments').doc(dep.id).set({
            id: dep.id,
            appId: id,
            version: dep.version,
            status: dep.status,
            progress: dep.progress,
            created_at: depTime,
            timestamp: depTime // Keep for compatibility
          }, { merge: true });
        }

        // C. Sync recent logs
        for (const log of logsRes.rows) {
          const logTime = log.created_at || log.timestamp;
          const logId = `log_${new Date(logTime).getTime()}_${log.id}`;
          await firestore.collection('edge_logs').doc(logId).set({
            id: logId,
            appId: id,
            endpoint: log.endpoint,
            method: log.method || 'GET',
            statusCode: log.status_code || 200,
            responseTime: log.latency || log.response_time || 0,
            created_at: logTime ? new Date(logTime).toISOString() : new Date().toISOString(),
            timestamp: logTime ? new Date(logTime).toISOString() : new Date().toISOString() // Keep for compatibility
          }, { merge: true });
        }

        console.log(`✅ Synced app ${id}, deployments & logs to Firestore`);
        return res.json({ success: true, message: `Successfully synchronized application configuration, deployments, and logs to Firestore`, data: payload });
      } else {
        console.warn(`⚠️ Firestore not initialized. Simulating sync for app ${id}`);
        return res.json({
          success: true,
          message: `Firestore offline. Simulated successful synchronization (configurations, deployments, logs) to collection "${collectionName}"`,
          data: payload,
          simulated: true
        });
      }
    } catch (err: any) {
      console.error('Firebase sync failed:', err);
      return res.status(500).json({ error: err.message });
    }
  }
};
