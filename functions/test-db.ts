import { query } from './src/db';

async function run() {
  try {
    const res = await query('SELECT * FROM app_integrations');
    console.log('App Integrations count:', res.rows.length);
    console.log('App Integrations data:', JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error querying database:', err);
  }
  process.exit(0);
}
run();
