import { query } from '../src/config/db';

async function run() {
  try {
    await query(`ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS method TEXT DEFAULT 'GET'`);
    console.log('✅ Added method column to usage_logs');
  } catch (err) {
    console.error('Error adding column:', err);
  }
  process.exit(0);
}

run();
