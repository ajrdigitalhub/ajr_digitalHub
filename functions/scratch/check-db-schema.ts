import { query } from '../src/config/db';

async function run() {
  try {
    const cols = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'usage_logs'
    `);
    console.log('Columns in usage_logs:', cols.rows);
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

run();
