import { query } from '../src/config/db';

async function seed() {
  try {
    const appsRes = await query(`SELECT id, name FROM apps LIMIT 3`);
    if (appsRes.rows.length === 0) {
      console.log('No apps found, skipping seed');
      return;
    }

    for (const app of appsRes.rows) {
      const appId = app.id;
      console.log(`Seeding data for app: ${app.name} (${appId})`);

      // Seed security logs
      const secLogs = [
        { type: 'failed_login', severity: 'warn', ip: '45.33.22.11', user_email: '', message: 'Multiple failed login attempts detected. Source IP: 45.33.22.11 | Endpoint: POST /api/auth/login' },
        { type: 'suspicious_ip', severity: 'warn', ip: '113.161.44.2', user_email: 'admin@ajr.dev', region: 'VN', message: 'Unrecognized region access (VN). Source IP: 113.161.44.2' },
        { type: 'failed_login', severity: 'critical', ip: '192.168.99.200', user_email: '', message: 'Brute force attempt detected. 12 failed logins in 60 seconds. Source IP: 192.168.99.200' },
        { type: 'suspicious_ip', severity: 'warn', ip: '78.154.22.5', user_email: '', region: 'CN', message: 'Suspicious request pattern from unknown region CN. IP: 78.154.22.5' },
      ];

      // Check if already seeded
      const existing = await query(`SELECT COUNT(*) FROM security_logs WHERE app_id = $1`, [appId]);
      if (parseInt(existing.rows[0].count) === 0) {
        for (const log of secLogs) {
          await query(
            `INSERT INTO security_logs (app_id, type, severity, ip, user_email, region, message)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [appId, log.type, log.severity, log.ip, log.user_email, log.region || null, log.message]
          );
        }
        console.log(`  ✅ Seeded ${secLogs.length} security logs`);
      } else {
        console.log(`  ⏭️ Security logs already exist (${existing.rows[0].count}), skipping`);
      }

      // Seed deployments
      const now = Date.now();
      const depExisting = await query(`SELECT COUNT(*) FROM deployments WHERE app_id = $1`, [appId]);
      if (parseInt(depExisting.rows[0].count) === 0) {
        const deployments = [
          { version: 'v2.4.1', status: 'success', commitId: '8f3a2c', daysAgo: 0, logs: '[CI] Build started\n[CI] Dependencies OK\n[Deploy] Deployed successfully.\n' },
          { version: 'v2.4.0', status: 'failed', commitId: '3d91bf', daysAgo: 0.2, logs: '[CI] Build started\n[System] Test failed: TypeError at index.js:42\n[Deploy] Deployment aborted.\n' },
          { version: 'v2.3.9', status: 'success', commitId: 'a12e99', daysAgo: 1, logs: '[CI] Build started\n[Deploy] Deployed successfully.\n' },
        ];
        for (const dep of deployments) {
          const startTime = new Date(now - dep.daysAgo * 86400000 - 60000);
          const endTime = new Date(now - dep.daysAgo * 86400000);
          await query(
            `INSERT INTO deployments (app_id, version, status, commit_id, branch, deployed_by, logs, progress, started_at, finished_at)
             VALUES ($1, $2, $3, $4, 'main', 'Admin', $5, 100, $6, $7)`,
            [appId, dep.version, dep.status, dep.commitId, dep.logs, startTime.toISOString(), endTime.toISOString()]
          );
        }
        console.log(`  ✅ Seeded ${deployments.length} deployments`);
      } else {
        console.log(`  ⏭️ Deployments already exist (${depExisting.rows[0].count}), skipping`);
      }
    }

    console.log('\n✅ Seed complete!');
  } catch (e: any) {
    console.error('Seed error:', e.message);
  }
  process.exit(0);
}

seed();
