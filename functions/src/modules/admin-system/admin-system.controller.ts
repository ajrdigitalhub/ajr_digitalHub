import { Request, Response } from 'express';
import { BaseService } from '../../core/base.service';
import { successResponse, errorResponse } from '../../utils/response';
import { query } from '../../db';
import { isPostgresEnabled } from '../../config/db';
import { firestore } from '../../config/firebase';
import { FirebaseService } from '../../services/firebase.service';

const firebaseService = new FirebaseService();

// In-Memory/Real SSE client registry
export const sseClients: Set<Response> = new Set();

export function broadcastToSse(data: any) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// Lazy Seeder helper
async function ensureSeeded(service: BaseService, collection: string) {
  const exists = await service.findAll({ limit: 1 });
  if (exists.data && exists.data.length > 0) {
    return;
  }

  if (collection === 'apps') {
    const appsToSeed = [
      {
        id: '33333333-3333-4333-a333-333333333333',
        name: 'AJR Commerce',
        domain: 'ajr-commerce.vercel.app',
        status: 'live',
        plan: 'Pro',
        apiUsage: 45200,
        lastUpdated: new Date().toISOString(),
        environment: 'Production',
        features: { marketplace: true, services: true, analytics: true },
        apiKey: 'sk_live_abc123123asdjkl',
        policies: {
          api: { rpmLimit: 1000, rpHourLimit: 50000, allowedOrigins: '*', ipWhitelist: '', endpointLimits: [{ endpoint: '/api/checkout', maxRpm: 100 }] },
          security: { authRequired: true, tokenExpiryMinutes: 60, accessRoles: 'admin,user', geoRestrictions: 'None', sessionLimits: 5 },
          usage: { maxDailyCalls: 100000, maxUsers: 5000, storageLimitGb: 50 }
        },
        logs: [
          { id: '1', timestamp: new Date().toISOString(), type: 'API', severity: 'Info', message: 'API usage standard normal' },
          { id: '2', timestamp: new Date(Date.now() - 50000).toISOString(), type: 'Deploy', severity: 'Info', message: 'Deployment v2.4.1 successful' },
          { id: '3', timestamp: new Date(Date.now() - 100000).toISOString(), type: 'Error', severity: 'Warning', message: 'High latency on /api/auth' }
        ],
        users: [
          { id: 'u1', name: 'Admin One', email: 'admin@ajr.dev', role: 'Owner', status: 'Active', lastActive: new Date().toISOString() },
          { id: 'u2', name: 'Dev Team', email: 'dev@ajr.dev', role: 'Developer', status: 'Active', lastActive: new Date(Date.now() - 86400000).toISOString() }
        ],
        apiKeys: [
          { id: 'k1', name: 'Production Main', keyPrefix: 'sk_live_abc...', created: new Date(Date.now() - 30 * 86400000).toISOString(), lastUsed: new Date().toISOString(), permissions: ['Read', 'Write'] },
          { id: 'k2', name: 'ReadOnly Integration', keyPrefix: 'sk_live_xyz...', created: new Date(Date.now() - 10 * 86400000).toISOString(), lastUsed: new Date(Date.now() - 3600000).toISOString(), permissions: ['Read'] }
        ],
        alerts: [
          { id: 'a1', name: 'High Error Rate', condition: 'Error rate > 5% for 5m', action: 'Email: admin@ajr.dev', enabled: true },
          { id: 'a2', name: 'DB Connection Limit', condition: 'Connections > 90%', action: 'Slack: #ops', enabled: true }
        ],
        backups: [
          { id: 'b1', date: new Date().toISOString(), sizeMb: 245, status: 'Completed' },
          { id: 'b2', date: new Date(Date.now() - 86400000).toISOString(), sizeMb: 242, status: 'Completed' }
        ],
        auditLogs: [
          { id: 'al1', timestamp: new Date().toISOString(), user: 'admin@ajr.dev', action: 'Updated Policy', resource: 'API Rate Limits', ip: '10.0.0.1' },
          { id: 'al2', timestamp: new Date(Date.now() - 3600000).toISOString(), user: 'System', action: 'Auto-Scaling', resource: 'Database Pool', ip: 'internal' }
        ],
        plugins: [
          { id: 'p1', name: 'Advanced Analytics', type: 'Monitoring', enabled: true, status: 'Active' },
          { id: 'p2', name: 'Stripe Billing', type: 'Payments', enabled: true, status: 'Active' }
        ],
        billing: {
          plan: 'Pro Plan',
          currentSpend: 145.50,
          estimatedSpend: 299.00,
          apiCalls: 45200,
          apiLimit: 100000,
          storageGb: 42,
          storageLimit: 50
        }
      },
      {
        id: '33333333-3333-4333-a333-333333333334',
        name: 'Internal Tools',
        domain: 'internal.ajr.dev',
        status: 'deploying',
        plan: 'Enterprise',
        apiUsage: 1205,
        lastUpdated: new Date().toISOString(),
        environment: 'Staging',
        features: { marketplace: false, services: false, analytics: true },
        apiKey: 'sk_test_def456...',
        policies: {
          api: { rpmLimit: 5000, rpHourLimit: 250000, allowedOrigins: 'internal.ajr.dev', ipWhitelist: '10.0.0.1', endpointLimits: [] },
          security: { authRequired: true, tokenExpiryMinutes: 120, accessRoles: 'admin', geoRestrictions: 'Internal', sessionLimits: 1 },
          usage: { maxDailyCalls: 1000000, maxUsers: 500, storageLimitGb: 200 }
        },
        logs: [
          { id: '1', timestamp: new Date().toISOString(), type: 'Deploy', severity: 'Info', message: 'Build started' },
          { id: '2', timestamp: new Date(Date.now() - 50000).toISOString(), type: 'API', severity: 'Warning', message: 'Rate limit tripped on /api/sync' }
        ],
        users: [],
        apiKeys: [],
        alerts: [],
        backups: [],
        auditLogs: [],
        plugins: [],
        billing: {
          plan: 'Enterprise',
          currentSpend: 2000,
          estimatedSpend: 2000,
          apiCalls: 1205,
          apiLimit: 1000000,
          storageGb: 10,
          storageLimit: 200
        }
      },
      {
        id: '33333333-3333-4333-a333-333333333335',
        name: 'Legacy CRM',
        domain: 'crm.ajr.io',
        status: 'failed',
        plan: 'Starter',
        apiUsage: 0,
        lastUpdated: new Date().toISOString(),
        environment: 'Production',
        features: { marketplace: false, services: true, analytics: false },
        apiKey: 'sk_live_ghi789...',
        policies: {
          api: { rpmLimit: 100, rpHourLimit: 5000, allowedOrigins: '*', ipWhitelist: '', endpointLimits: [] },
          security: { authRequired: true, tokenExpiryMinutes: 15, accessRoles: 'crm_user', geoRestrictions: '', sessionLimits: 10 },
          usage: { maxDailyCalls: 1000, maxUsers: 100, storageLimitGb: 10 }
        },
        logs: [
          { id: '1', timestamp: new Date().toISOString(), type: 'Error', severity: 'Critical', message: 'Database connection timeout' },
          { id: '2', timestamp: new Date(Date.now() - 50000).toISOString(), type: 'Deploy', severity: 'Critical', message: 'Deploy failed' }
        ],
        users: [],
        apiKeys: [],
        alerts: [],
        backups: [],
        auditLogs: [],
        plugins: [],
        billing: {
          plan: 'Starter',
          currentSpend: 0,
          estimatedSpend: 0,
          apiCalls: 0,
          apiLimit: 10000,
          storageGb: 0,
          storageLimit: 10
        }
      }
    ];
    for (const app of appsToSeed) {
      await service.create(app);

      if (isPostgresEnabled) {
        try {
          const checkApp = await query('SELECT id FROM apps WHERE id = $1', [app.id]);
          if (checkApp.rowCount === 0) {
            await query(
              `INSERT INTO apps (id, name, domain, api_key, status, environment) VALUES ($1, $2, $3, $4, $5, $6)`,
              [app.id, app.name, app.domain, app.apiKey, app.status, app.environment]
            );
            await query(`INSERT INTO app_config (app_id, theme, features) VALUES ($1, 'dark', $2)`, [app.id, JSON.stringify(app.features)]);
            await query(`INSERT INTO app_rate_limits (app_id, rpm, rph, burst_limit) VALUES ($1, $2, $3, 10)`, [app.id, app.policies.api.rpmLimit, app.policies.api.rpHourLimit]);
            await query(
              `INSERT INTO billing (app_id, usage_json, amount, status) VALUES ($1, $2, $3, 'pending')`,
              [app.id, JSON.stringify({ api: app.apiUsage, whatsapp: 0, plan: app.plan }), app.billing.currentSpend]
            );
            await query(`INSERT INTO whatsapp_config (app_id, enabled) VALUES ($1, false)`, [app.id]);
            await query(`INSERT INTO email_config (app_id, enabled) VALUES ($1, false)`, [app.id]);
            await query(`
              INSERT INTO app_integrations (app_id, firebase_config) 
              VALUES ($1, $2)
              ON CONFLICT (app_id) DO NOTHING
            `, [
              app.id,
              JSON.stringify({
                projectId: 'ajrdigitalhubb',
                apiKey: 'AIzaSyBtWfHieFNNu6w1suumi95v_ysxNn1ezpM',
                authDomain: 'ajrdigitalhubb.firebaseapp.com',
                storageBucket: 'ajrdigitalhubb.firebasestorage.app',
                appId: '1:79343567176:web:a868a770a260bec337b37d',
                measurementId: ''
              })
            ]);
          }
        } catch (e) {
          console.error('Failed to seed relational data for app:', app.name, e);
        }
      }
    }
  }

  if (collection === 'db_config') {
    await service.create({
      id: 'db_config_main',
      maxPoolSize: 100,
      queryTimeout: 5000,
      health: 'Excellent',
      clusterLoad: 19,
      connections: 37
    });
  }

  if (collection === 'deployments') {
    const deploys = [
      { id: 'd1', appId: '33333333-3333-4333-a333-333333333333', version: 'v2.4.1', status: 'success', progress: 100, timestamp: new Date(Date.now() - 3600 * 1000).toISOString() },
      { id: 'd2', appId: '33333333-3333-4333-a333-333333333334', version: 'v1.1.0-beta', status: 'building', progress: 65, timestamp: new Date().toISOString() }
    ];
    for (const d of deploys) {
      await service.create(d);
    }
  }

  if (collection === 'services') {
    const services = [
      { id: 's1', name: 'API Server', description: 'Main REST API backend services and JWT authentication gate', status: 'running', metrics: '98 ms avg' },
      { id: 's2', name: 'Database Service', description: 'PostgreSQL instance storing dynamic form configuration schemas and submissions', status: 'running', metrics: '37 active pools' },
      { id: 's3', name: 'WhatsApp API', description: 'Outbound communications gateway for customer mobile invoice alerts', status: 'running', metrics: '450 requests' },
      { id: 's4', name: 'Email Service', description: 'SMTP and SendGrid integration for PDF receipt notifications', status: 'running', metrics: '1.25K sent' }
    ];
    for (const s of services) {
      await service.create(s);
    }
  }

  if (collection === 'onboarding') {
    await service.create({
      id: 'admin_onboarding',
      showTour: true,
      steps: [
        { title: 'Dashboard', description: 'View global telemetry, CPU loads and memory workloads.', target: '#tour-dashboard' },
        { title: 'Applications', description: 'Provision, scale and direct edge routing.', target: '#tour-applications' },
        { title: 'Analytics', description: 'Observe latency and request streams.', target: '#tour-analytics' },
        { title: 'Database', description: 'Assess connection topology and backup schedules.', target: '#tour-database' },
        { title: 'Services', description: 'Leverage plug-and-play auxiliary subsystems.', target: '#tour-services' }
      ]
    });
  }
}

// Relational details fetch helper
async function fetchAppProjectData(appId: string, reqIp: string): Promise<any> {
  const appsService = new BaseService('apps');
  await ensureSeeded(appsService, 'apps');

  if (isPostgresEnabled) {
    const appRes = await query('SELECT * FROM apps WHERE id = $1', [appId]);
    if (appRes.rows.length === 0) {
      return null;
    }
    const app = appRes.rows[0];

    const configRes = await query('SELECT * FROM app_config WHERE app_id = $1', [appId]);
    const rateLimitRes = await query('SELECT * FROM app_rate_limits WHERE app_id = $1', [appId]);
    const billingRes = await query('SELECT * FROM billing WHERE app_id = $1 ORDER BY created_at DESC LIMIT 1', [appId]);
    const whatsappRes = await query('SELECT * FROM whatsapp_config WHERE app_id = $1', [appId]);
    const emailRes = await query('SELECT * FROM email_config WHERE app_id = $1', [appId]);

    const logsRes = await query(
      `SELECT id, created_at as timestamp, 'API' as type, 
              CASE WHEN status_code >= 400 THEN 'Warning' ELSE 'Info' END as severity,
              'Endpoint: ' || endpoint || ' | Latency: ' || latency || 'ms | Status: ' || status_code as message
       FROM usage_logs 
       WHERE app_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [appId]
    );

    const integrationRes = await query('SELECT firebase_config, cached_metrics FROM app_integrations WHERE app_id = $1', [appId]);
    const integration = integrationRes.rows[0] || {};

    const usageStatsRes = await query(`
      SELECT 
        COALESCE(SUM(hits), 0)::integer as total_hits,
        COALESCE(AVG(latency), 0)::integer as avg_latency,
        COALESCE(SUM(CASE WHEN status_code >= 400 THEN hits ELSE 0 END), 0)::integer as error_count
      FROM usage_logs
      WHERE app_id = $1
    `, [appId]);
    const usageStats = usageStatsRes.rows[0] || { total_hits: 0, avg_latency: 0, error_count: 0 };

    const config = configRes.rows[0] || {};
    const rateLimit = rateLimitRes.rows[0] || {};
    const billing = billingRes.rows[0] || {};
    const whatsapp = whatsappRes.rows[0] || {};
    const email = emailRes.rows[0] || {};

    const plan = billing.usage_json?.plan || 'Pro';
    const apiUsage = billing.usage_json?.api || 0;

    return {
      id: app.id,
      name: app.name,
      domain: app.domain,
      status: app.status || 'live',
      plan: plan,
      apiUsage: usageStats.total_hits || apiUsage,
      lastUpdated: app.updated_at || app.created_at || new Date().toISOString(),
      environment: app.environment || 'Production',
      features: config.features || { marketplace: true, services: true, analytics: true },
      apiKey: app.api_key || 'sk_live_' + app.id,
      policies: {
        api: { 
          rpmLimit: rateLimit.rpm || 1000, 
          rpHourLimit: rateLimit.rph || 50000, 
          allowedOrigins: '*', 
          ipWhitelist: '', 
          borderLimit: 10,
          endpointLimits: [] 
        },
        security: { 
          authRequired: true, 
          tokenExpiryMinutes: 60, 
          accessRoles: 'admin,user', 
          geoRestrictions: 'None', 
          sessionLimits: 5 
        },
        usage: { 
          maxDailyCalls: 100000, 
          maxUsers: 5000, 
          storageLimitGb: 50 
        }
      },
      billing: {
        plan: plan + ' Plan',
        currentSpend: Number(billing.amount || 0),
        estimatedSpend: Number(billing.amount || 0) + 150.00,
        apiCalls: usageStats.total_hits || apiUsage,
        avgLatency: usageStats.avg_latency || 0,
        errorCount: usageStats.error_count || 0,
        apiLimit: rateLimit.rph || 100000,
        storageGb: 42,
        storageLimit: 50
      },
      logs: logsRes.rows.map(r => ({
        id: r.id,
        timestamp: r.timestamp,
        type: r.type,
        severity: r.severity,
        message: r.message
      })),
      users: [
        { id: 'u1', name: 'Admin One', email: 'admin@ajr.dev', role: 'Owner', status: 'Active', lastActive: new Date().toISOString() }
      ],
      apiKeys: [
        { id: 'k1', name: 'Root API Key', keyPrefix: app.api_key ? app.api_key.substring(0, 10) + '...' : 'sk_live...', created: app.created_at, lastUsed: new Date().toISOString(), permissions: ['Read', 'Write'] }
      ],
      backups: [
        { id: 'b1', date: new Date().toISOString(), sizeMb: 120.5, status: 'Completed' }
      ],
      auditLogs: [
        { id: 'al1', timestamp: new Date().toISOString(), user: 'admin@ajr.com', action: 'Config Load', resource: 'System', ip: reqIp }
      ],
      whatsapp: {
        phone_number: whatsapp.phone_number || '',
        waba_id: whatsapp.waba_id || '',
        api_key: whatsapp.api_key || '',
        enabled: whatsapp.enabled || false
      },
      email: {
        smtp_host: email.smtp_host || '',
        smtp_port: email.smtp_port || 587,
        user: email.user || '',
        pass: email.pass || '',
        enabled: email.enabled || false
      },
      firebase_config: integration.firebase_config || null,
      cached_metrics: integration.cached_metrics || null
    };
  }

  const app = await appsService.findOne(appId);
  if (app) {
    const integrationService = new BaseService('app_integrations');
    const integrationList = await integrationService.findAll({ limit: 1, filters: { app_id: appId } });
    if (integrationList.data.length > 0) {
      app.firebase_config = integrationList.data[0].firebase_config || null;
      app.cached_metrics = integrationList.data[0].cached_metrics || null;
    } else {
      app.firebase_config = null;
      app.cached_metrics = null;
    }
  }
  return app;
}

export const adminSystemController = {
  // 1. GET /api/admin/system/overview
  async getSystemOverview(req: Request, res: Response): Promise<any> {
    try {
      const appsService = new BaseService('apps');
      await ensureSeeded(appsService, 'apps');
      
      const appsResult = await appsService.findAll({ limit: 100 });
      
      const overview = {
        apps: appsResult.data.map(app => ({
          id: app.id,
          name: app.name,
          status: app.status || 'live',
          health: app.status === 'live' ? '98%' : app.status === 'deploying' ? '92%' : '0%',
          uptime: app.status === 'live' ? '99.98%' : '0.00%',
          apiHits: app.apiUsage || 12000,
          traffic: app.status === 'live' ? '4.82 GB/s' : '0 GB/s',
          errorRate: app.status === 'live' ? '0.02%' : '0.00%',
          url: app.domain || ''
        })),
        systemUptime: '99.999%',
        cpuLoad: '24%',
        memoryUsage: '7.3 / 32 GB'
      };
      
      return res.json(overview);
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  // 2. GET /api/admin/analytics
  async getAnalytics(req: Request, res: Response): Promise<any> {
    try {
      const logsService = new BaseService('logs');
      const totalCountRes = await logsService.findAll({ limit: 100, sortBy: 'created_at' });
      
      // Calculate top routes and avg latency
      const endpointMap: Record<string, { hits: number; totalLatency: number }> = {};
      let totalLatency = 0;
      let errorCount = 0;

      totalCountRes.data.forEach((log: any) => {
        const path = log.path || log.endpoint || '/unknown';
        const ms = Number(log.response_time) || 12;
        const status = Number(log.status) || 200;

        totalLatency += ms;
        if (status >= 400) {
          errorCount++;
        }

        if (!endpointMap[path]) {
          endpointMap[path] = { hits: 0, totalLatency: 0 };
        }
        endpointMap[path].hits++;
        endpointMap[path].totalLatency += ms;
      });

      const endpointStats = Object.entries(endpointMap).map(([endpoint, val]) => ({
        endpoint,
        hits: val.hits,
        avgLatencyMs: Math.round(val.totalLatency / val.hits)
      }));

      return res.json({
        totalRequests: totalCountRes.meta?.total || totalCountRes.data.length,
        endpointStats,
        avgLatencyMs: Math.round(totalLatency / (totalCountRes.data.length || 1)),
        errorsCount: errorCount,
        recentErrors: totalCountRes.data.filter((l: any) => Number(l.status) >= 400).slice(0, 5)
      });
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  // 2. LIVE STREAM (SSE)
  getLiveStream(req: Request, res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseClients.add(res);

    // Send positive handshake
    res.write(`data: ${JSON.stringify({ type: 'handshake', message: 'Connection established with Master Control Tower.' })}\n\n`);

    // Setup heartbeat interval to prevent Cloud Run proxy disconnects
    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch (e) {
        clearInterval(heartbeat);
        sseClients.delete(res);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
  },

  // 3. GET /api/admin/db/config & PUT /api/admin/db/config
  async getDbConfig(req: Request, res: Response): Promise<any> {
    try {
      const dbConfigService = new BaseService('db_config');
      await ensureSeeded(dbConfigService, 'db_config');
      
      const config = await dbConfigService.findOne('db_config_main');
      return res.json(config);
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  async updateDbConfig(req: Request, res: Response): Promise<any> {
    try {
      const dbConfigService = new BaseService('db_config');
      await ensureSeeded(dbConfigService, 'db_config');

      const updated = await dbConfigService.update('db_config_main', req.body);
      return res.json(successResponse(updated));
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  // 3. GET/POST /api/admin/db/backups & POST backup/restore
  async getBackups(req: Request, res: Response): Promise<any> {
    try {
      const backupsService = new BaseService('backups');
      await ensureSeeded(backupsService, 'apps');
      
      const backups = await backupsService.findAll({ limit: 100 });
      if (backups.data.length === 0) {
        // Fallback default backups
        const initialBackups = [
          { id: 'b1', timestamp: new Date(Date.now() - 3600 * 1000 * 5).toISOString(), format: 'pg_dump (gzip)', sizeMb: 245, status: 'AVAILABLE' },
          { id: 'b2', timestamp: new Date(Date.now() - 86400 * 1000).toISOString(), format: 'pg_dump (gzip)', sizeMb: 242, status: 'AVAILABLE' }
        ];
        for (const b of initialBackups) {
          await backupsService.create(b);
        }
        return res.json(initialBackups);
      }
      return res.json(backups.data);
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  async createBackup(req: Request, res: Response): Promise<any> {
    try {
      const backupsService = new BaseService('backups');
      const newBackup = {
        timestamp: new Date().toISOString(),
        format: 'pg_dump (gzip)',
        sizeMb: Math.round(230 + Math.random() * 20),
        status: 'AVAILABLE'
      };
      const createdObj = await backupsService.create(newBackup);
      
      // Notify SSE clients
      broadcastToSse({
        type: 'log',
        time: new Date().toLocaleTimeString(),
        method: 'SYS',
        endpoint: 'DATABASE_BACKUP',
        status: 200,
        latency: 1800,
        message: `Manual backup Snapshot created successfully. Size: ${newBackup.sizeMb}MB`
      });

      return res.json(successResponse(createdObj));
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  async restoreBackup(req: Request, res: Response): Promise<any> {
    try {
      // Restore simulation
      broadcastToSse({
        type: 'log',
        time: new Date().toLocaleTimeString(),
        method: 'SYS',
        endpoint: 'DATABASE_RESTORE',
        status: 200,
        latency: 4500,
        message: 'Point-in-time Database Rollback complete. Connection pools reset.'
      });

      return res.json(successResponse({ restored: true, timestamp: new Date() }));
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  // 4. GET/POST /api/admin/deployments & POST deploy
  async getDeployments(req: Request, res: Response): Promise<any> {
    try {
      const depService = new BaseService('deployments');
      await ensureSeeded(depService, 'deployments');
      const list = await depService.findAll({ limit: 100 });
      return res.json(list.data);
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  async triggerDeployment(req: Request, res: Response): Promise<any> {
    try {
      const depService = new BaseService('deployments');
      const newDeployment = {
        appId: req.body.appId || 'app_1',
        version: req.body.version || `v1.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 20)}`,
        status: 'building',
        progress: 0,
        timestamp: new Date().toISOString()
      };
      const created = await depService.create(newDeployment);

      // Write initial deployment record to Firestore if active
      if (firestore) {
        await firestore.collection('edge_deployments').doc(created.id).set({
          id: created.id,
          appId: newDeployment.appId,
          version: newDeployment.version,
          status: 'building',
          progress: 0,
          timestamp: newDeployment.timestamp
        });
      }

      // Async step-by-step progress simulation in server side
      let progress = 10;
      const intervalTimer = setInterval(async () => {
        progress += 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(intervalTimer);
          await depService.update(created.id, { status: 'success', progress });
          
          if (firestore) {
            await firestore.collection('edge_deployments').doc(created.id).set({
              id: created.id,
              appId: newDeployment.appId,
              version: newDeployment.version,
              status: 'success',
              progress: 100,
              timestamp: newDeployment.timestamp
            }, { merge: true });
          }

          broadcastToSse({
            type: 'deploy-update',
            appId: newDeployment.appId,
            version: newDeployment.version,
            status: 'success',
            progress: 100
          });
        } else {
          await depService.update(created.id, { status: 'building', progress });

          if (firestore) {
            await firestore.collection('edge_deployments').doc(created.id).set({
              id: created.id,
              appId: newDeployment.appId,
              version: newDeployment.version,
              status: 'building',
              progress,
              timestamp: newDeployment.timestamp
            }, { merge: true });
          }

          broadcastToSse({
            type: 'deploy-update',
            appId: newDeployment.appId,
            version: newDeployment.version,
            status: 'building',
            progress
          });
        }
      }, 3000);

      return res.json(successResponse(created));
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  // 5. GET/POST /api/admin/services & POST /api/admin/services/toggle
  async getServices(req: Request, res: Response): Promise<any> {
    try {
      const saasService = new BaseService('services');
      await ensureSeeded(saasService, 'services');
      const s = await saasService.findAll({ limit: 100 });
      return res.json(s.data);
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  async toggleService(req: Request, res: Response): Promise<any> {
    try {
      const saasService = new BaseService('services');
      await ensureSeeded(saasService, 'services');

      const { id } = req.body;
      const ex = await saasService.findOne(id);
      if (!ex) return res.status(404).json(errorResponse('Service not found', 404));

      const newStatus = ex.status === 'running' ? 'stopped' : 'running';
      const updated = await saasService.update(ex.id, { status: newStatus });
      
      broadcastToSse({
        type: 'log',
        time: new Date().toLocaleTimeString(),
        method: 'SYS',
        endpoint: ex.name.replace(/\s+/g, '_').toUpperCase(),
        status: 200,
        latency: 10,
        message: `Microservice state toggled: ${ex.name} is now ${newStatus}`
      });

      return res.json(successResponse(updated));
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  // 6. GET /api/admin/users
  async getUsers(req: Request, res: Response): Promise<any> {
    try {
      // Return custom user lists dynamically managed
      const usersService = new BaseService('users_config');
      const usersRes = await usersService.findAll({ limit: 100 });
      if (usersRes.data.length === 0) {
        const listToSeed = [
          { id: 'u1', name: 'Admin One', email: 'admin@ajr.dev', role: 'Owner', status: 'Active', lastActive: new Date().toISOString() },
          { id: 'u2', name: 'Dev Team', email: 'dev@ajr.dev', role: 'Developer', status: 'Active', lastActive: new Date(Date.now() - 3600000).toISOString() },
          { id: 'u3', name: 'Dev Ops Agent', email: 'ops@ajr.dev', role: 'Admin', status: 'Active', lastActive: new Date().toISOString() }
        ];
        for (const u of listToSeed) {
          await usersService.create(u);
        }
        return res.json(listToSeed);
      }
      return res.json(usersRes.data);
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  async createUser(req: Request, res: Response): Promise<any> {
    try {
      const usersService = new BaseService('users_config');
      const newUser = {
        ...req.body,
        status: 'Active',
        lastActive: new Date().toISOString()
      };
      const created = await usersService.create(newUser);
      return res.status(201).json(successResponse(created));
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  async updateUser(req: Request, res: Response): Promise<any> {
    try {
      const usersService = new BaseService('users_config');
      const { id } = req.params;
      const updated = await usersService.update(id as string, req.body);
      return res.json(successResponse(updated));
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  // 7. GET/POST /api/admin/api-keys
  async getApiKeys(req: Request, res: Response): Promise<any> {
    try {
      const keysService = new BaseService('api_keys');
      const list = await keysService.findAll({ limit: 100 });
      if (list.data.length === 0) {
        const seedKeys = [
          { id: 'k1', name: 'Production Main', keyPrefix: 'sk_live_abc...', created: new Date(Date.now() - 30 * 86400000).toISOString(), lastUsed: new Date().toISOString(), permissions: ['Read', 'Write'] },
          { id: 'k2', name: 'ReadOnly Integration', keyPrefix: 'sk_live_xyz...', created: new Date(Date.now() - 10 * 86400000).toISOString(), lastUsed: new Date(Date.now() - 3600000).toISOString(), permissions: ['Read'] }
        ];
        for (const val of seedKeys) {
          await keysService.create(val);
        }
        return res.json(seedKeys);
      }
      return res.json(list.data);
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  async createApiKey(req: Request, res: Response): Promise<any> {
    try {
      const keysService = new BaseService('api_keys');
      const randomPrefix = 'sk_live_' + Math.random().toString(36).substring(2, 7) + '...';
      const newKey = {
        name: req.body.name || 'Sandbox Key',
        keyPrefix: randomPrefix,
        created: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        permissions: req.body.permissions || ['Read']
      };
      const created = await keysService.create(newKey);
      return res.status(201).json(successResponse(created));
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  // 8. GET/POST /api/admin/policies
  async getPolicies(req: Request, res: Response): Promise<any> {
    try {
      const policyService = new BaseService('global_policies');
      const existing = await policyService.findAll({ limit: 1 });
      if (existing.data.length === 0) {
        const def = {
          id: 'global_policy_single',
          rpmLimit: 1000,
          allowedOrigins: '*',
          ipWhitelist: '',
          authRequired: true,
          tokenExpiryMinutes: 60,
          sessionLimits: 5,
          geoRestrictions: 'None',
          endpointLimits: [{ endpoint: '/api/checkout', maxRpm: 100 }]
        };
        await policyService.create(def);
        return res.json(def);
      }
      return res.json(existing.data[0]);
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  async createOrUpdatePolicies(req: Request, res: Response): Promise<any> {
    try {
      const policyService = new BaseService('global_policies');
      const existing = await policyService.findAll({ limit: 1 });
      if (existing.data.length > 0) {
        const updated = await policyService.update(existing.data[0].id, req.body);
        return res.json(successResponse(updated));
      } else {
        const created = await policyService.create(req.body);
        return res.json(successResponse(created));
      }
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  // 9. GET /api/admin/logs
  async getLogs(req: Request, res: Response): Promise<any> {
    try {
      const logsService = new BaseService('logs');
      const list = await logsService.findAll({ limit: 50, sortBy: 'created_at' });
      return res.json(list.data);
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  // 10. Tour persistence onboarding
  async getOnboardingStatus(req: Request, res: Response): Promise<any> {
    try {
      const onboardingService = new BaseService('onboarding');
      await ensureSeeded(onboardingService, 'onboarding');
      const data = await onboardingService.findOne('admin_onboarding');
      return res.json(data);
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  async completeOnboarding(req: Request, res: Response): Promise<any> {
    try {
      const onboardingService = new BaseService('onboarding');
      await ensureSeeded(onboardingService, 'onboarding');
      await onboardingService.update('admin_onboarding', { showTour: false });
      return res.json(successResponse({ success: true }));
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  // 11. GET /api/admin/apps/:id (Application detail info)
  async getAppDetail(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const app = await fetchAppProjectData(id as string, req.ip || '127.0.0.1');
      if (!app) {
        return res.status(404).json(errorResponse('Application not found', 404));
      }
      return res.json(app);
    } catch (err: any) {
         return res.status(500).json(errorResponse(err.message));
    }
  },

  // PUT /api/admin/apps/:id (Save App Config or fields)
  async updateApp(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const appsService = new BaseService('apps');
      await ensureSeeded(appsService, 'apps');

      if (isPostgresEnabled) {
        const { name, domain, environment, status, features, policies } = req.body;
        
        // 1. Update apps table
        if (name !== undefined || domain !== undefined || environment !== undefined || status !== undefined) {
          await query(
            `UPDATE apps 
             SET name = COALESCE($1, name), 
                 domain = COALESCE($2, domain), 
                 environment = COALESCE($3, environment), 
                 status = COALESCE($4, status),
                 updated_at = NOW() 
             WHERE id = $5`,
            [name, domain, environment, status, id]
          );
        }

        // 2. Update app_config table
        if (features !== undefined) {
          await query(
            `UPDATE app_config 
             SET features = $1 
             WHERE app_id = $2`,
            [JSON.stringify(features), id]
          );
        }

        // 3. Update app_rate_limits table
        if (policies?.api?.rpmLimit !== undefined || policies?.api?.rpHourLimit !== undefined) {
          const rpm = policies.api.rpmLimit;
          const rph = policies.api.rpHourLimit || (rpm * 60);
          await query(
            `UPDATE app_rate_limits 
             SET rpm = COALESCE($1, rpm), 
                 rph = COALESCE($2, rph) 
             WHERE app_id = $3`,
            [rpm, rph, id]
          );
        }
      }

      const updated = await appsService.update(id as string, req.body);
      return res.json(successResponse(updated));
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  async getApps(req: Request, res: Response): Promise<any> {
    try {
      const appsService = new BaseService('apps');
      await ensureSeeded(appsService, 'apps');
      const result = await appsService.findAll({ limit: 100 });
      return res.json(result.data);
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  async getAppUsage(req: Request, res: Response): Promise<any> {
    try {
      const { appId } = req.params;
      const app = await fetchAppProjectData(appId as string, req.ip || '127.0.0.1');
      if (!app) {
        return res.status(404).json(errorResponse('Application not found', 404));
      }
      return res.json(app);
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  },

  async deleteApp(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const appsService = new BaseService('apps');
      await ensureSeeded(appsService, 'apps');
      
      if (isPostgresEnabled) {
        await query('DELETE FROM apps WHERE id = $1', [id]);
      }

      const success = await appsService.delete(id as string);
      return res.json(successResponse({ success }));
    } catch (err: any) {
      return res.status(500).json(errorResponse(err.message));
    }
  }
};
