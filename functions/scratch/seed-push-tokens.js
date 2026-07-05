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

const appId = 'fe7fe278-1345-4777-a4bd-18f3bdcaf57b';
const customerId = '6b19700c-19e6-4e45-9c88-e4cc8d6ecac2';
const dummyHash = '$2b$10$89Jd/31p7n0dF3m6sX2/euZ2oJ3H1O2uG5g5T3b4c5d6e7f8g9h1i';

async function seed() {
  console.log('Seeding driver and customer tokens...');

  // First delete existing firebase_notification_tokens for this appId to start fresh
  await pool.query("DELETE FROM firebase_notification_tokens WHERE application_id = $1", [appId]);

  // Insert customer into customers table if it doesn't exist
  const custCheck = await pool.query("SELECT id FROM customers WHERE id = $1", [customerId]);
  if (custCheck.rowCount === 0) {
    await pool.query(
      "INSERT INTO customers (id, name, status) VALUES ($1, $2, 'active')",
      [customerId, 'AJR Mart']
    );
    console.log('Inserted customer into customers table.');
  }

  // Seed 9 Drivers
  for (let i = 1; i <= 9; i++) {
    const email = `driver${i}@ajrmart.com`;
    const userRes = await pool.query(
      "INSERT INTO users (id, email, password_hash, role, is_active) VALUES (gen_random_uuid(), $1, $2, $3, true) RETURNING id",
      [email, dummyHash, 'driver']
    );
    const userId = userRes.rows[0].id;

    const userData = {
      email,
      fullName: `Driver ${i}`,
      role: 'driver',
      status: 'active'
    };
    await pool.query(
      "INSERT INTO records (id, collection, data) VALUES ($1, 'users', $2)",
      [userId, JSON.stringify(userData)]
    );

    const token = `fcm_token_driver_${i}_${Math.random().toString(36).substring(2, 10)}`;
    await pool.query(
      `INSERT INTO firebase_notification_tokens 
        (user_id, application_id, customer_id, token, browser, device, os, platform, language, timezone, notification_enabled, token_status, last_active)
       VALUES ($1, $2, $3, $4, 'Chrome', 'Mobile Device', 'Android', 'Android', 'en', 'Asia/Kolkata', true, 'active', CURRENT_TIMESTAMP)`,
      [userId, appId, customerId, token]
    );
  }

  // Seed 15 Customers
  for (let i = 1; i <= 15; i++) {
    const email = `customer${i}@ajrmart.com`;
    const userRes = await pool.query(
      "INSERT INTO users (id, email, password_hash, role, is_active) VALUES (gen_random_uuid(), $1, $2, $3, true) RETURNING id",
      [email, dummyHash, 'customer']
    );
    const userId = userRes.rows[0].id;

    const userData = {
      email,
      fullName: `Customer ${i}`,
      role: 'customer',
      status: 'active'
    };
    await pool.query(
      "INSERT INTO records (id, collection, data) VALUES ($1, 'users', $2)",
      [userId, JSON.stringify(userData)]
    );

    const token = `fcm_token_customer_${i}_${Math.random().toString(36).substring(2, 10)}`;
    await pool.query(
      `INSERT INTO firebase_notification_tokens 
        (user_id, application_id, customer_id, token, browser, device, os, platform, language, timezone, notification_enabled, token_status, last_active)
       VALUES ($1, $2, $3, $4, 'Safari', 'iPhone', 'iOS', 'iOS', 'en', 'Asia/Kolkata', true, 'active', CURRENT_TIMESTAMP)`,
      [userId, appId, customerId, token]
    );
  }

  console.log('Seeded 9 drivers and 15 customers successfully.');
}

seed().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
