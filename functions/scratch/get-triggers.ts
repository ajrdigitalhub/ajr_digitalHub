import { query } from '../src/config/db';

async function run() {
  try {
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables:', tables.rows.map(t => t.table_name));

    const userCols = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    const recordsUsers = await query(`
      SELECT id, data FROM records WHERE collection = 'users' LIMIT 5
    `);
    console.log('records users:', recordsUsers.rows);

    const usersRows = await query(`
      SELECT * FROM public.users LIMIT 5
    `);
    console.log('users rows:', usersRows.rows);
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

run();
