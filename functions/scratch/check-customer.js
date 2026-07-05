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

pool.query("SELECT * FROM customer_profiles WHERE app_id = 'fe7fe278-1345-4777-a4bd-18f3bdcaf57b'")
  .then(res => {
    console.log('Customer Profile:', res.rows);
    return pool.query("SELECT * FROM customers LIMIT 5");
  })
  .then(res => {
    console.log('Customers in customers table:', res.rows);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
