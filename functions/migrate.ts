import { query } from './src/config/db';

async function migrate() {
  try {
    await query(`ALTER TABLE app_integrations ADD COLUMN IF NOT EXISTS cached_metrics JSONB DEFAULT '{}'::jsonb`);
    console.log('✅ cached_metrics column OK');

    await query(`ALTER TABLE apps ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'Spark'`);
    console.log('✅ plan column OK');

    await query(`ALTER TABLE apps ADD COLUMN IF NOT EXISTS current_spend NUMERIC(12,4) DEFAULT 0`);
    console.log('✅ current_spend column OK');

    await query(`ALTER TABLE apps ADD COLUMN IF NOT EXISTS firebase_project_id TEXT`);
    console.log('✅ firebase_project_id column OK');

    await query(`ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS method TEXT DEFAULT 'GET'`);
    console.log('✅ usage_logs method column OK');

    await query(`ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS source TEXT`);
    console.log('✅ usage_logs source column OK');

    await query(`CREATE INDEX IF NOT EXISTS idx_usage_logs_app_created ON usage_logs(app_id, created_at DESC)`);
    console.log('✅ usage_logs index OK');

    await query(`CREATE INDEX IF NOT EXISTS idx_usage_logs_status ON usage_logs(app_id, status_code, created_at DESC)`);
    console.log('✅ usage_logs status index OK');

    await query(`CREATE INDEX IF NOT EXISTS idx_usage_logs_method ON usage_logs(app_id, method, created_at DESC)`);
    console.log('✅ usage_logs method index OK');

    await query(`CREATE INDEX IF NOT EXISTS idx_usage_logs_endpoint ON usage_logs(app_id, endpoint, created_at DESC)`);
    console.log('✅ usage_logs endpoint index OK');

    await query(`CREATE INDEX IF NOT EXISTS idx_usage_logs_latency ON usage_logs(app_id, latency, created_at DESC)`);
    console.log('✅ usage_logs latency index OK');

    await query(`CREATE INDEX IF NOT EXISTS idx_billing_app_status ON billing(app_id, status)`);
    console.log('✅ billing index OK');

    console.log('\n✅ All migrations applied successfully!');
  } catch (e: any) {
    console.error('Migration error:', e.message);
  }
  process.exit(0);
}

migrate();
