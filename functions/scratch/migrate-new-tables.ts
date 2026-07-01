import { query } from '../src/config/db';

async function migrate() {
  try {
    // security_logs table
    await query(`
      CREATE TABLE IF NOT EXISTS security_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        severity TEXT DEFAULT 'warn',
        ip TEXT,
        user_agent TEXT,
        region TEXT,
        user_email TEXT,
        message TEXT NOT NULL,
        is_banned BOOLEAN DEFAULT false,
        is_revoked BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ security_logs table OK');

    await query(`CREATE INDEX IF NOT EXISTS idx_security_logs_app ON security_logs(app_id, created_at DESC)`);
    console.log('✅ security_logs index OK');

    // deployments table
    await query(`
      CREATE TABLE IF NOT EXISTS deployments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
        version TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        commit_id TEXT DEFAULT '000000',
        branch TEXT DEFAULT 'main',
        deployed_by TEXT DEFAULT 'System',
        logs TEXT DEFAULT '',
        progress INTEGER DEFAULT 0,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        finished_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ deployments table OK');

    await query(`CREATE INDEX IF NOT EXISTS idx_deployments_app ON deployments(app_id, created_at DESC)`);
    console.log('✅ deployments index OK');

    // method column on usage_logs (idempotent)
    await query(`ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS method TEXT DEFAULT 'GET'`);
    console.log('✅ usage_logs.method column OK');

    console.log('\n✅ All migrations applied successfully!');
  } catch (e: any) {
    console.error('Migration error:', e.message);
  }
  process.exit(0);
}

migrate();
