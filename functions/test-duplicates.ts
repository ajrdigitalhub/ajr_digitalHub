import { query } from './src/config/db';

async function check() {
  try {
    const apps = await query('SELECT id, name, domain FROM apps');
    console.log('--- APPS TABLE ---');
    console.log(apps.rows);

    const records = await query("SELECT id, data->>'name' as name, data->>'domain' as domain FROM records WHERE collection = 'apps'");
    console.log('--- RECORDS TABLE (collection = apps) ---');
    console.log(records.rows);

    const rateLimits = await query('SELECT app_id FROM app_rate_limits');
    console.log('--- RATE LIMITS ---');
    console.log(rateLimits.rows);

    const appConfigs = await query('SELECT app_id FROM app_config');
    console.log('--- APP CONFIGS ---');
    console.log(appConfigs.rows);

    const fullQuery = await query(`
      SELECT a.id, a.name, 
             r.app_id as rate_limit_app_id,
             c.app_id as config_app_id
      FROM apps a
      LEFT JOIN app_rate_limits r ON a.id = r.app_id
      LEFT JOIN app_config c ON a.id = c.app_id
    `);
    console.log('--- FULL JOIN QUERY ---');
    console.log(fullQuery.rows);
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

check();
