const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ajrhub',
  password: '12345678',
  port: 5432
});

const ddl = `
CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  gst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partially paid', 'overdue', 'cancelled')),
  due_date DATE NOT NULL,
  pdf_url TEXT,
  whatsapp_status VARCHAR(50) DEFAULT 'pending',
  whatsapp_retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES billing_invoices(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  quantity NUMERIC(12, 4) DEFAULT 1.0000,
  rate NUMERIC(12, 4) DEFAULT 0.0000,
  amount NUMERIC(12, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS billing_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES billing_invoices(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  error_details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES billing_invoices(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  error_details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES billing_invoices(id) ON DELETE SET NULL,
  provider VARCHAR(50) NOT NULL,
  gateway_transaction_id VARCHAR(255),
  amount NUMERIC(12, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cron_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL,
  execution_time INTEGER,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

async function main() {
  try {
    await pool.query(ddl);
    console.log("✅ Successfully created database tables!");
    
    // Check tables now
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log("Current DB Tables:", res.rows.map(r => r.table_name));
  } catch (err) {
    console.error("❌ Error creating database tables:", err);
  } finally {
    await pool.end();
  }
}

main();
