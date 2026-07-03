-- AJR Digital Hub - PostgreSQL Schema
-- Database: postgres (Supabase)

CREATE EXTENSION IF NOT EXISTS "citext";

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

DROP TRIGGER IF EXISTS update_records_modtime ON records;
CREATE TRIGGER update_records_modtime
    BEFORE UPDATE ON records
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- 4. Applications (SaaS Multitenancy)
CREATE TABLE IF NOT EXISTS apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    environment TEXT DEFAULT 'Staging',
    domain TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    api_key TEXT UNIQUE NOT NULL,
    cpu_cores NUMERIC(4,2) DEFAULT 0.50,
    memory_mb INTEGER DEFAULT 512,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_integrations (
    app_id UUID PRIMARY KEY REFERENCES apps(id) ON DELETE CASCADE,
    firebase_config JSONB NOT NULL,
    cached_metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_app_id UNIQUE (app_id)
);

CREATE TABLE IF NOT EXISTS app_config (
    app_id UUID PRIMARY KEY REFERENCES apps(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'dark',
    features JSONB DEFAULT '{}'::jsonb,
    hero_config JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS app_rate_limits (
    app_id UUID PRIMARY KEY REFERENCES apps(id) ON DELETE CASCADE,
    rpm INTEGER DEFAULT 60,
    rph INTEGER DEFAULT 2000,
    burst_limit INTEGER DEFAULT 10
);

CREATE TABLE IF NOT EXISTS usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    method TEXT DEFAULT 'GET',
    hits INTEGER DEFAULT 1,
    latency INTEGER DEFAULT 0,
    status_code INTEGER DEFAULT 200,
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL,
    value NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS billing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
    usage_json JSONB DEFAULT '{}'::jsonb,
    amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending',
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS whatsapp_config (
    app_id UUID PRIMARY KEY REFERENCES apps(id) ON DELETE CASCADE,
    phone_number TEXT,
    waba_id TEXT,
    api_key TEXT,
    enabled BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS email_config (
    app_id UUID PRIMARY KEY REFERENCES apps(id) ON DELETE CASCADE,
    smtp_host TEXT,
    smtp_port INTEGER,
    "user" TEXT,
    pass TEXT,
    enabled BOOLEAN DEFAULT false
);

-- ============================================================
--  Migrations (idempotent - safe to run on existing databases)
-- ============================================================

-- Add cached_metrics column if missing (for older installs)
ALTER TABLE app_integrations ADD COLUMN IF NOT EXISTS cached_metrics JSONB DEFAULT '{}'::jsonb;

-- Ensure firebase_config defaults to empty JSON if missing data
ALTER TABLE app_integrations ALTER COLUMN firebase_config SET DEFAULT '{}'::jsonb;

-- Add firebase_config to apps table for quick access (optional denorm)
ALTER TABLE apps ADD COLUMN IF NOT EXISTS firebase_project_id TEXT;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'Spark';
ALTER TABLE apps ADD COLUMN IF NOT EXISTS current_spend NUMERIC(12,4) DEFAULT 0;

-- Add waba_id to whatsapp_config if missing
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS waba_id TEXT;

-- Index for fast lookup by app_id
CREATE INDEX IF NOT EXISTS idx_usage_logs_app_created ON usage_logs(app_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_status ON usage_logs(app_id, status_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_method ON usage_logs(app_id, method, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_endpoint ON usage_logs(app_id, endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_latency ON usage_logs(app_id, latency, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_logs_app_created ON analytics_logs(app_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_app_status ON billing(app_id, status);

-- 5. Multi-Tenant Organizations & Workspaces
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspace_users (
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'Super Admin', 'Agency Owner', 'Agency Manager', 'Client Admin', 'Marketing Manager', 'Sales Executive', 'Support', 'Viewer'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (workspace_id, user_id)
);

-- 6. CRM (Leads, Contacts, Companies, Deals, Activities)
CREATE TABLE IF NOT EXISTS crm_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    domain TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crm_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crm_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    company_name TEXT,
    status TEXT DEFAULT 'New', -- 'New', 'Contacted', 'Qualified', 'Lost'
    source TEXT DEFAULT 'Manual', -- 'Website Form', 'Marketplace', 'Landing Page', 'WhatsApp', 'Facebook Lead Ads', 'Google Ads', 'CSV Import', 'Manual'
    score INTEGER DEFAULT 0,
    assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crm_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    value NUMERIC(12,2) DEFAULT 0.00,
    stage TEXT DEFAULT 'Prospect', -- 'Prospect', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crm_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES crm_deals(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
    type TEXT NOT NULL, -- 'Note', 'Call', 'Email', 'Task', 'Meeting'
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Campaign Configurations & OAuth Credentials
CREATE TABLE IF NOT EXISTS campaign_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    channel TEXT NOT NULL, -- 'whatsapp', 'email', 'sms'
    name TEXT NOT NULL,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS oauth_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- 'google_ads', 'meta_ads', 'google_analytics'
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_workspace_provider UNIQUE (workspace_id, provider)
);

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Visual Automation Workflows
CREATE TABLE IF NOT EXISTS automation_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    actions_config JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Subscription Configuration & Billing Configuration
CREATE TABLE IF NOT EXISTS subscription_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_name TEXT UNIQUE NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS billing_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    payment_method JSONB DEFAULT '{}'::jsonb,
    billing_address JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS application_settings (
    app_id UUID PRIMARY KEY REFERENCES apps(id) ON DELETE CASCADE,
    settings_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Agency Management & Client Mapping
CREATE TABLE IF NOT EXISTS agency_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    client_workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    branding JSONB DEFAULT '{}'::jsonb,
    custom_domain TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_agency_client UNIQUE (agency_workspace_id, client_workspace_id)
);

-- =========================================================================
-- SAAS PORTAL & AUTOMATED BILLING ADDITIONS
-- =========================================================================

-- Customers table (Company Information)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100),
    gst_number VARCHAR(100),
    pan VARCHAR(100),
    website VARCHAR(255),
    industry VARCHAR(100),
    address TEXT,
    country VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'INR',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    logo TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_timestamp_customers ON customers;
CREATE TRIGGER set_timestamp_customers BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Link users to customers
ALTER TABLE users ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- Customer Contacts
CREATE TABLE IF NOT EXISTS customer_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(20),
    whatsapp VARCHAR(20),
    alternate_mobile VARCHAR(20),
    email CITEXT,
    designation VARCHAR(100),
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Billing Contacts
CREATE TABLE IF NOT EXISTS billing_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    billing_name VARCHAR(100) NOT NULL,
    billing_email CITEXT NOT NULL,
    billing_mobile VARCHAR(20),
    gst_details VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    plan VARCHAR(100) NOT NULL,
    billing_cycle VARCHAR(50) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    renewal_date DATE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    payment_method VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_timestamp_subscriptions ON subscriptions;
CREATE TRIGGER set_timestamp_subscriptions BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discounts NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'unpaid', 'overdue')),
    due_date DATE,
    pdf_url TEXT,
    qr_code_url TEXT,
    payment_link TEXT,
    whatsapp_status VARCHAR(50) DEFAULT 'pending' CHECK (whatsapp_status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    whatsapp_retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_timestamp_invoices ON invoices;
CREATE TRIGGER set_timestamp_invoices BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(12,4) DEFAULT 1.0000,
    rate NUMERIC(12,4) DEFAULT 0.0000,
    amount NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    payment_method VARCHAR(100),
    transaction_id VARCHAR(255),
    status VARCHAR(50) CHECK (status IN ('success', 'failed', 'pending'))
);

-- WhatsApp Usage
CREATE TABLE IF NOT EXISTS whatsapp_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    message_count INTEGER DEFAULT 0,
    charges NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Firebase Usage
CREATE TABLE IF NOT EXISTS firebase_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    read_writes_count INTEGER DEFAULT 0,
    storage_bytes BIGINT DEFAULT 0,
    charges NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Google Ads Usage
CREATE TABLE IF NOT EXISTS google_ads_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    ad_spend NUMERIC(12, 2) DEFAULT 0.00,
    charges NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notification Logs
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    channel VARCHAR(50) CHECK (channel IN ('whatsapp', 'email', 'in-app', 'push')),
    event_type VARCHAR(100) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    status VARCHAR(50) CHECK (status IN ('sent', 'failed', 'pending')),
    error_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cron Logs
CREATE TABLE IF NOT EXISTS cron_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'failed')),
    execution_time INTEGER,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customer Settings
CREATE TABLE IF NOT EXISTS customer_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    settings_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_timestamp_customer_settings ON customer_settings;
CREATE TRIGGER set_timestamp_customer_settings BEFORE UPDATE ON customer_settings FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Customer Integrations
CREATE TABLE IF NOT EXISTS customer_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    whatsapp_cloud_api JSONB DEFAULT '{}'::jsonb,
    meta_business JSONB DEFAULT '{}'::jsonb,
    google_ads JSONB DEFAULT '{}'::jsonb,
    firebase JSONB DEFAULT '{}'::jsonb,
    smtp JSONB DEFAULT '{}'::jsonb,
    payment_gateway JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_timestamp_customer_integrations ON customer_integrations;
CREATE TRIGGER set_timestamp_customer_integrations BEFORE UPDATE ON customer_integrations FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Customer Activity Logs
CREATE TABLE IF NOT EXISTS customer_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Documentation Pages
CREATE TABLE IF NOT EXISTS documentation_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    overview TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    benefits JSONB DEFAULT '[]'::jsonb,
    screenshots JSONB DEFAULT '[]'::jsonb,
    videos JSONB DEFAULT '[]'::jsonb,
    workflow_diagrams JSONB DEFAULT '[]'::jsonb,
    api_flow JSONB DEFAULT '[]'::jsonb,
    setup_guide TEXT,
    config_guide TEXT,
    pricing_details JSONB DEFAULT '{}'::jsonb,
    faqs JSONB DEFAULT '[]'::jsonb,
    common_errors JSONB DEFAULT '[]'::jsonb,
    best_practices JSONB DEFAULT '[]'::jsonb,
    related_products JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_timestamp_documentation_pages ON documentation_pages;
CREATE TRIGGER set_timestamp_documentation_pages BEFORE UPDATE ON documentation_pages FOR EACH ROW EXECUTE FUNCTION update_modified_column();


-- Compatibility trigger function for seed.ts migrations
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Documentation Portal Migration Alters & Additional Tables
ALTER TABLE documentation_pages ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE documentation_pages ADD COLUMN IF NOT EXISTS business_use_cases JSONB DEFAULT '[]'::jsonb;
ALTER TABLE documentation_pages ADD COLUMN IF NOT EXISTS security_recommendations JSONB DEFAULT '[]'::jsonb;
ALTER TABLE documentation_pages ADD COLUMN IF NOT EXISTS performance_tips JSONB DEFAULT '[]'::jsonb;
ALTER TABLE documentation_pages ADD COLUMN IF NOT EXISTS billing_explanation TEXT;
ALTER TABLE documentation_pages ADD COLUMN IF NOT EXISTS external_references JSONB DEFAULT '[]'::jsonb;
ALTER TABLE documentation_pages ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published';
ALTER TABLE documentation_pages ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE documentation_pages ADD COLUMN IF NOT EXISTS search_keywords JSONB DEFAULT '[]'::jsonb;
ALTER TABLE documentation_pages ADD COLUMN IF NOT EXISTS seo_settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE documentation_pages ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
ALTER TABLE documentation_pages ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
ALTER TABLE documentation_pages ADD COLUMN IF NOT EXISTS dislikes INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS documentation_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES documentation_pages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    helpful BOOLEAN NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documentation_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES documentation_pages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_bookmark UNIQUE (user_id, article_id)
);

CREATE TABLE IF NOT EXISTS documentation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES documentation_pages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(100),
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documentation_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES documentation_pages(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Financial, Billing Logs and Telemetry Tables
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    provider VARCHAR(50) NOT NULL,
    gateway_transaction_id VARCHAR(255),
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    gstin VARCHAR(50),
    amount NUMERIC(12,2) NOT NULL,
    tax_amount NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS billing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    previous_plan VARCHAR(100),
    new_plan VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    usage_count INTEGER DEFAULT 0,
    recorded_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customer Profiles & Billing Configuration Tables
CREATE TABLE IF NOT EXISTS customer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID UNIQUE REFERENCES apps(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    designation VARCHAR(100),
    primary_email CITEXT,
    secondary_email CITEXT,
    mobile_number VARCHAR(20),
    whatsapp_number VARCHAR(20),
    alternative_contact_number VARCHAR(20),
    billing_email CITEXT,
    billing_whatsapp_number VARCHAR(20),
    company_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    gst_number VARCHAR(100),
    pan_number VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    preferred_currency VARCHAR(10) DEFAULT 'INR',
    customer_status VARCHAR(20) DEFAULT 'active' CHECK (customer_status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_timestamp_customer_profiles ON customer_profiles;
CREATE TRIGGER set_timestamp_customer_profiles BEFORE UPDATE ON customer_profiles FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE IF NOT EXISTS billing_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID UNIQUE REFERENCES apps(id) ON DELETE CASCADE,
    monthly_billing_enabled BOOLEAN DEFAULT true,
    whatsapp_invoice_enabled BOOLEAN DEFAULT true,
    email_invoice_enabled BOOLEAN DEFAULT true,
    include_whatsapp_charges BOOLEAN DEFAULT true,
    include_firebase_charges BOOLEAN DEFAULT true,
    include_marketplace_purchases BOOLEAN DEFAULT true,
    include_subscription_charges BOOLEAN DEFAULT true,
    include_gst_tax BOOLEAN DEFAULT true,
    billing_day INTEGER DEFAULT 5,
    billing_time TIME DEFAULT '09:00:00',
    reminder_before_due_days INTEGER DEFAULT 2,
    due_date_days INTEGER DEFAULT 7,
    auto_retry_failed BOOLEAN DEFAULT true,
    enable_payment_link BOOLEAN DEFAULT true,
    enable_pdf_attachment BOOLEAN DEFAULT true,
    enable_detailed_usage_report BOOLEAN DEFAULT true,
    custom_billing_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_timestamp_billing_configuration ON billing_configuration;
CREATE TRIGGER set_timestamp_billing_configuration BEFORE UPDATE ON billing_configuration FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE IF NOT EXISTS notification_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID UNIQUE REFERENCES apps(id) ON DELETE CASCADE,
    whatsapp_enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT true,
    in_app_enabled BOOLEAN DEFAULT true,
    recipients TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_timestamp_notification_configuration ON notification_configuration;
CREATE TRIGGER set_timestamp_notification_configuration BEFORE UPDATE ON notification_configuration FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE IF NOT EXISTS pdf_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
    invoice_id UUID,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Column Extension Alters
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS app_id UUID REFERENCES apps(id) ON DELETE CASCADE;
ALTER TABLE customer_contacts ADD COLUMN IF NOT EXISTS app_id UUID REFERENCES apps(id) ON DELETE CASCADE;
ALTER TABLE customer_contacts ADD COLUMN IF NOT EXISTS customer_profile_id UUID REFERENCES customer_profiles(id) ON DELETE CASCADE;
ALTER TABLE billing_history ADD COLUMN IF NOT EXISTS app_id UUID REFERENCES apps(id) ON DELETE CASCADE;
ALTER TABLE customer_usage ADD COLUMN IF NOT EXISTS app_id UUID REFERENCES apps(id) ON DELETE CASCADE;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS app_id UUID REFERENCES apps(id) ON DELETE CASCADE;
ALTER TABLE cron_logs ADD COLUMN IF NOT EXISTS app_id UUID REFERENCES apps(id) ON DELETE CASCADE;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS app_id UUID REFERENCES apps(id) ON DELETE CASCADE;
ALTER TABLE notification_configuration ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT true;
ALTER TABLE notification_configuration ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS level VARCHAR(20) DEFAULT 'error';
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS stack TEXT;

-- Notification Settings & Token Tables
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enabled BOOLEAN DEFAULT true,
    firebase_config JSONB DEFAULT '{}'::jsonb,
    vapid_key TEXT,
    service_account JSONB DEFAULT '{}'::jsonb,
    default_title VARCHAR(255),
    default_icon TEXT,
    default_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_timestamp_notification_settings ON notification_settings;
CREATE TRIGGER set_timestamp_notification_settings BEFORE UPDATE ON notification_settings FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE IF NOT EXISTS notification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    application_id UUID REFERENCES apps(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    browser VARCHAR(100),
    device VARCHAR(100),
    os VARCHAR(100),
    language VARCHAR(50),
    timezone VARCHAR(100),
    notification_enabled BOOLEAN DEFAULT true,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    body TEXT,
    image TEXT,
    url TEXT,
    sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
    sent_to UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'sent',
    response JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Firebase Notification Settings, Tokens, Logs, Usage, Billing, Reports
CREATE TABLE IF NOT EXISTS firebase_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID UNIQUE REFERENCES apps(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT true,
    free_quota_enabled BOOLEAN DEFAULT true,
    free_notifications INTEGER DEFAULT 10000,
    price_per_1000 NUMERIC(10,4) DEFAULT 0.50,
    platform_service_charge NUMERIC(10,2) DEFAULT 10.00,
    gst_percentage NUMERIC(5,2) DEFAULT 18.00,
    currency VARCHAR(10) DEFAULT 'INR',
    billing_frequency VARCHAR(50) DEFAULT 'monthly',
    threshold_alerts JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_timestamp_firebase_notification_settings ON firebase_notification_settings;
CREATE TRIGGER set_timestamp_firebase_notification_settings BEFORE UPDATE ON firebase_notification_settings FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE IF NOT EXISTS firebase_notification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    application_id UUID REFERENCES apps(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    browser VARCHAR(100),
    device VARCHAR(100),
    os VARCHAR(100),
    platform VARCHAR(100) DEFAULT 'Web',
    language VARCHAR(50),
    timezone VARCHAR(100),
    notification_enabled BOOLEAN DEFAULT true,
    token_status VARCHAR(50) DEFAULT 'active',
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS firebase_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES apps(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    notification_id VARCHAR(255),
    title VARCHAR(255),
    body TEXT,
    notification_type VARCHAR(50) DEFAULT 'transactional',
    sent_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    delivery_status VARCHAR(50) DEFAULT 'pending',
    read_status VARCHAR(50) DEFAULT 'unread',
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS firebase_notification_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES apps(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    usage_date DATE DEFAULT CURRENT_DATE,
    sent_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_app_usage_date UNIQUE (application_id, usage_date)
);

CREATE TABLE IF NOT EXISTS firebase_notification_billing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES apps(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    total_notifications_sent INTEGER DEFAULT 0,
    free_quota_used INTEGER DEFAULT 0,
    billable_notifications INTEGER DEFAULT 0,
    notification_cost NUMERIC(10,2) DEFAULT 0.00,
    platform_charge NUMERIC(10,2) DEFAULT 0.00,
    gst NUMERIC(10,2) DEFAULT 0.00,
    total_amount NUMERIC(10,2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS firebase_notification_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_name VARCHAR(255) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    filters JSONB DEFAULT '{}'::jsonb,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Core Indexes
CREATE INDEX IF NOT EXISTS idx_customer_profiles_app ON customer_profiles(app_id);
CREATE INDEX IF NOT EXISTS idx_billing_config_app ON billing_configuration(app_id);
CREATE INDEX IF NOT EXISTS idx_notification_config_app ON notification_configuration(app_id);
CREATE INDEX IF NOT EXISTS idx_pdf_documents_invoice ON pdf_documents(invoice_id);
CREATE INDEX IF NOT EXISTS idx_notification_tokens_user ON notification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_tokens_app ON notification_tokens(application_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_to ON notification_history(sent_to);
CREATE INDEX IF NOT EXISTS idx_fb_tokens_app ON firebase_notification_tokens(application_id);
CREATE INDEX IF NOT EXISTS idx_fb_logs_app ON firebase_notification_logs(application_id);
CREATE INDEX IF NOT EXISTS idx_fb_billing_app ON firebase_notification_billing(application_id);

-- Migration to support audit_logs schema variants
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS event VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE audit_logs ALTER COLUMN action DROP NOT NULL;



