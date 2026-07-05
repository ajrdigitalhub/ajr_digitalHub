const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT || '5432'),
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function run() {
  try {
    const settings = await pool.query("SELECT * FROM notification_settings");
    console.log('Notification Settings Rows:', settings.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
