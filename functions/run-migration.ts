import fs from 'fs';
import path from 'path';
import { pool } from './src/config/db';

async function runMigration() {
  if (!pool) {
    console.error('Database pool is not initialized. Ensure .env has valid DATABASE_URL.');
    process.exit(1);
  }

  try {
    const sqlPath = path.join(__dirname, 'database.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration from database.sql...');
    await pool.query(sql);
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    pool.end();
  }
}

runMigration();
