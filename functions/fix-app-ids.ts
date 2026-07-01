import { query } from './src/db';

async function run() {
  try {
    console.log('Running migration to sync records table IDs with apps IDs...');
    const result = await query(
      `UPDATE records 
       SET id = (data->>'id')::uuid 
       WHERE collection = 'apps' 
       AND id != (data->>'id')::uuid 
       RETURNING id, data->>'name' as name`
    );
    console.log(`Migration complete. Updated ${result.rowCount} records:`);
    console.log(result.rows);
  } catch (err: any) {
    console.error('Migration failed:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
