import { query } from './src/config/db';

async function test() {
  try {
    const result = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'rate_limits';
    `);
    console.log('Columns:', result.rows);
  } catch (error) {
    console.error('Error:', error);
  }
}
test();
