import { query } from './src/config/db';

async function test() {
  try {
    const result = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'apps';
    `);
    console.log('Columns:', result.rows);
  } catch (error) {
    console.error('Error:', error);
  }
}
test();
