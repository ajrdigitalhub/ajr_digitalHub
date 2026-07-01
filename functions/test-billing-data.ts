import { query } from './src/config/db';

async function test() {
  try {
    const apps = await query('SELECT id, name FROM apps');
    console.log('Apps:', apps.rows);

    for (const app of apps.rows) {
      const billing = await query('SELECT * FROM billing WHERE app_id = $1 ORDER BY created_at DESC', [app.id]);
      console.log(`App: ${app.name} (${app.id}) Billing:`, billing.rows);
      
      const usageCount = await query('SELECT COUNT(*) FROM usage_logs WHERE app_id = $1', [app.id]);
      console.log(`App: ${app.name} usage logs count:`, usageCount.rows[0]);
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}
test();
