-- AJR Digital Hub - PostgreSQL Schema
-- Database: postgres (Supabase)

-- 1. Main Records Table (Modular JSONB Storage)
CREATE TABLE IF NOT EXISTS records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Core Indexes
CREATE INDEX IF NOT EXISTS idx_records_collection ON records(collection);
CREATE INDEX IF NOT EXISTS idx_records_data ON records USING GIN (data);

-- Partial Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_marketplace_active 
ON records ((data->>'status')) 
WHERE collection = 'marketplace' AND data->>'status' = 'active';

CREATE INDEX IF NOT EXISTS idx_apps_status 
ON records ((data->>'status')) 
WHERE collection = 'apps';

CREATE INDEX IF NOT EXISTS idx_settings_key 
ON records ((data->>'key')) 
WHERE collection = 'settings';

-- 2. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    user_id TEXT,
    resource_type TEXT,
    resource_id TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_records_modtime
    BEFORE UPDATE ON records
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();
