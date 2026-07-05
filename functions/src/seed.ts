import { query, isPostgresEnabled } from './config/db';
import { DEFAULT_TEMPLATES } from './modules/invoice/invoice.controller';
import { BaseService } from './core/base.service';
import bcrypt from 'bcryptjs';

export const seedDatabase = async () => {
  if (!isPostgresEnabled) {
    console.log('🌱 Seeding in-memory database fallback...');
    
    // Admin and User
    const authService = new BaseService('users');
    await authService.create({ email: 'admin@ajr.com', password: await bcrypt.hash('admin123', 10), role: 'admin', fullName: 'System Administrator' });
    await authService.create({ email: 'user@ajr.com', password: await bcrypt.hash('user123', 10), role: 'user', fullName: 'Standard User' });

    // Marketplace
    const marketService = new BaseService('marketplace');
    await marketService.create({ 
      title: 'Premium SaaS Dashboard', 
      description: 'A complete admin interface for digital products', 
      price: 149.99,
      html: '<div class="p-8 bg-slate-900 rounded-3xl text-white"><h1>Dashboard Template</h1></div>',
      status: 'active',
      image: 'https://picsum.photos/seed/dashboard/800/600'
    });

    // App Config
    const appService = new BaseService('apps');
    const coreApp = await appService.create({ name: 'AJR Hub Core', domain: 'hub.ajr.digital', apiKey: 'ajr_primary_7788', status: 'active', environment: 'Production' });

    // App Integrations
    const integrationService = new BaseService('app_integrations');
    await integrationService.create({
      app_id: coreApp.id,
      firebase_config: {
        projectId: 'ajrdigitalhubb',
        apiKey: 'AIzaSyBtWfHieFNNu6w1suumi95v_ysxNn1ezpM',
        authDomain: 'ajrdigitalhubb.firebaseapp.com',
        storageBucket: 'ajrdigitalhubb.firebasestorage.app',
        appId: '1:79343567176:web:a868a770a260bec337b37d',
        measurementId: ''
      }
    });

    // Settings
    const settingsService = new BaseService('settings');
    await settingsService.create({ 
      key: 'landing_config', 
      heroTitle: 'Welcome to AJR Digital HUB',
      cta: 'Provision App Now',
      maintenance: false 
    });
    await settingsService.create({ key: 'rate_limits_demo', appId: 'demo_app', limits: { rpm: 100, rph: 1000 } });

    // Menus
    const menuService = new BaseService('menus');
    const existingMenus = await menuService.findAll();
    if (existingMenus.data.length === 0 || existingMenus.data.some((m: any) => m.key === 'global_menus')) {
      // Clear if old format
      if (existingMenus.data.some((m: any) => m.key === 'global_menus')) {
        for (const m of existingMenus.data) {
          if (m.key === 'global_menus') await menuService.delete(m.id);
        }
      }
      await menuService.create({ id: 'm1', label: 'Marketplace', link: '/marketplace', is_active: true, parent_id: null });
      await menuService.create({ id: 'm2', label: 'Solutions', link: '#', is_active: true, parent_id: null });
      await menuService.create({ label: 'SaaS Development', link: '/services/saas', is_active: true, parent_id: 'm2' });
      await menuService.create({ label: 'WhatsApp Automation', link: '/services/whatsapp', is_active: true, parent_id: 'm2' });
    }

    // Testimonials
    const tService = new BaseService('testimonials');
    await tService.create({ name: 'Alex Rivera', role: 'CEO, TechFlow', rating: 5, comment: 'AJR Digital HUB revolutionized our multi-app management.', avatar: 'A' });
    await tService.create({ name: 'Sarah Chen', role: 'Lead Architect', rating: 5, comment: 'Scaling was seamless with the Master Control panel.', avatar: 'S' });

    // Invoice Templates
    const templatesService = new BaseService('invoice_templates');
    const existingTemplates = await templatesService.findAll({ limit: 100 });
    if (existingTemplates.data.length === 0) {
      for (const tpl of DEFAULT_TEMPLATES) {
        await templatesService.create(tpl);
      }
      console.log('🌱 Seeded: In-memory Invoice Templates');
    }

    console.log('✅ In-memory seeding complete.');
    return;
  }

  try {
    // 1. Ensure Tables Exist
    await query(`
      CREATE TABLE IF NOT EXISTS records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        collection TEXT NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_collection ON records(collection);
      CREATE INDEX IF NOT EXISTS idx_data ON records USING GIN (data);

      CREATE TABLE IF NOT EXISTS apps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        environment VARCHAR(50) DEFAULT 'Staging',
        domain VARCHAR(255) NOT NULL,
        api_key VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        cpu_cores NUMERIC DEFAULT 0.5,
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
        theme VARCHAR(50) DEFAULT 'dark',
        features JSONB DEFAULT '{}'::jsonb,
        hero_config JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS app_rate_limits (
        app_id UUID PRIMARY KEY REFERENCES apps(id) ON DELETE CASCADE,
        rpm INTEGER DEFAULT 60,
        rph INTEGER DEFAULT 2000,
        burst_limit INTEGER DEFAULT 10,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS usage_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL,
        hits INTEGER DEFAULT 1,
        latency INTEGER DEFAULT 0,
        status_code INTEGER DEFAULT 200,
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
        enabled BOOLEAN DEFAULT false,
        permanent_token TEXT,
        business_name TEXT,
        webhook_verify_token TEXT,
        webhook_secret TEXT,
        api_version TEXT,
        currency TEXT,
        country TEXT,
        business_manager_id TEXT,
        display_name TEXT,
        timezone TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS email_config (
        app_id UUID PRIMARY KEY REFERENCES apps(id) ON DELETE CASCADE,
        smtp_host TEXT,
        smtp_port INTEGER,
        "user" TEXT,
        pass TEXT,
        enabled BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 1b. Schema Migrations (Rename column timestamp to created_at in analytics_logs if exists)
    try {
      await query(`
        ALTER TABLE analytics_logs RENAME COLUMN timestamp TO created_at;
      `);
      console.log('🌱 Schema Migration: Renamed analytics_logs.timestamp to created_at');
    } catch (err: any) {
      // Ignore error if column RENAME failed (already renamed or doesn't exist)
    }

    // Migration: Add new columns to whatsapp_config if missing
    try {
      await query(`
        ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS waba_id TEXT;
        ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS permanent_token TEXT;
        ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS business_name TEXT;
        ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS webhook_verify_token TEXT;
        ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS webhook_secret TEXT;
        ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS api_version TEXT;
        ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS currency TEXT;
        ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS country TEXT;
        ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS business_manager_id TEXT;
        ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS display_name TEXT;
        ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS timezone TEXT;
      `);
      console.log('🌱 Schema Migration: Added missing columns to whatsapp_config');
    } catch (err: any) {
      console.error('Failed to run schema migrations for whatsapp_config:', err.message);
    }

    // 1c. Add UNIQUE constraint to app_integrations if somehow missing on exists
    try {
      await query(`
        ALTER TABLE app_integrations ADD CONSTRAINT unique_app_id UNIQUE (app_id);
      `);
    } catch (err) {
      // Ignore if constraint already exists
    }

    // Migration: Setup Documentation tables and extend columns
    try {
      await query(`
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
      `);
      console.log('🌱 Schema Migration: Created/updated documentation portal tables');
    } catch (err: any) {
      console.error('Failed schema migration for documentation tables:', err);
    }

    // Migration: Setup Transactions, Receipts, Billing logs, and Telemetry
    try {
      await query(`
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

        CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            event VARCHAR(100) NOT NULL,
            details JSONB DEFAULT '{}'::jsonb,
            ip_address INET,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('🌱 Schema Migration: Created/updated billing, transactions, and audit tables');
    } catch (err: any) {
      console.error('Failed schema migration for transactional tables:', err);
    }

    // Migration: Setup Customer Profiles, Billing Configuration, Notification Configuration, and PDF Documents
    try {
      await query(`
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

        CREATE TABLE IF NOT EXISTS pdf_documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
            invoice_id UUID,
            file_name VARCHAR(255) NOT NULL,
            file_url TEXT NOT NULL,
            file_size INTEGER,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

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

        CREATE INDEX IF NOT EXISTS idx_customer_profiles_app ON customer_profiles(app_id);
        CREATE INDEX IF NOT EXISTS idx_billing_config_app ON billing_configuration(app_id);
        CREATE INDEX IF NOT EXISTS idx_notification_config_app ON notification_configuration(app_id);
        CREATE INDEX IF NOT EXISTS idx_pdf_documents_invoice ON pdf_documents(invoice_id);
      `);

      // Auto-update triggers
      try {
        await query(`DROP TRIGGER IF EXISTS set_timestamp_customer_profiles ON customer_profiles`);
        await query(`CREATE TRIGGER set_timestamp_customer_profiles BEFORE UPDATE ON customer_profiles FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp()`);
      } catch (triggerErr) {}

      try {
        await query(`DROP TRIGGER IF EXISTS set_timestamp_billing_configuration ON billing_configuration`);
        await query(`CREATE TRIGGER set_timestamp_billing_configuration BEFORE UPDATE ON billing_configuration FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp()`);
      } catch (triggerErr) {}

      try {
        await query(`DROP TRIGGER IF EXISTS set_timestamp_notification_configuration ON notification_configuration`);
        await query(`CREATE TRIGGER set_timestamp_notification_configuration BEFORE UPDATE ON notification_configuration FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp()`);
      } catch (triggerErr) {}

      console.log('🌱 Schema Migration: Created/updated billing automation and customer profile tables');
    } catch (err: any) {
      console.error('Failed schema migration for billing automation tables:', err);
    }

    // Migration: Setup Firebase Cloud Messaging Web Push Notification tables
    try {
      await query(`
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

        CREATE TABLE IF NOT EXISTS notification_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            level VARCHAR(20) DEFAULT 'error',
            message TEXT,
            stack TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Enforce columns if table existed prior
        ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS level VARCHAR(20) DEFAULT 'error';
        ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS message TEXT;
        ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS stack TEXT;

        CREATE INDEX IF NOT EXISTS idx_notification_tokens_user ON notification_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_notification_tokens_app ON notification_tokens(application_id);
        CREATE INDEX IF NOT EXISTS idx_notification_history_to ON notification_history(sent_to);
      `);

      // Seed default notification settings row
      const nsCheck = await query('SELECT id FROM notification_settings LIMIT 1');
      if (nsCheck.rowCount === 0) {
        await query(`
          INSERT INTO notification_settings (enabled, default_title, default_icon, default_url)
          VALUES (true, 'AJR Digital HUB', '/assets/icons/icon-72x72.png', 'https://ajrdigitalhub.com')
        `);
        console.log('🌱 Seeded: Default FCM notification settings');
      }

      console.log('🌱 Schema Migration: Created Firebase Messaging tables');
    } catch (err: any) {
      console.error('Failed schema migration for Firebase Messaging tables:', err);
    }

    // Migration: Setup Notification Events Configuration and History Extensions
    try {
      await query(`
        ALTER TABLE notification_history ADD COLUMN IF NOT EXISTS event_code VARCHAR(100);
        ALTER TABLE notification_history ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE notification_history ADD COLUMN IF NOT EXISTS read_status VARCHAR(20) DEFAULT 'unread';
        ALTER TABLE notification_history ADD COLUMN IF NOT EXISTS read_time TIMESTAMP WITH TIME ZONE;
        ALTER TABLE notification_history ADD COLUMN IF NOT EXISTS click_time TIMESTAMP WITH TIME ZONE;

        CREATE TABLE IF NOT EXISTS notification_events_config (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            type VARCHAR(50) DEFAULT 'push',
            event_code VARCHAR(100) UNIQUE NOT NULL,
            api_endpoint VARCHAR(255) NOT NULL,
            http_method VARCHAR(10) DEFAULT 'POST',
            enabled BOOLEAN DEFAULT true,
            title_template VARCHAR(255) NOT NULL,
            body_template TEXT NOT NULL,
            navigation_url VARCHAR(255),
            priority VARCHAR(20) DEFAULT 'normal',
            user_role_mapping JSONB DEFAULT '[]'::jsonb,
            target_type VARCHAR(50) DEFAULT 'role',
            target_value VARCHAR(255),
            schedule VARCHAR(100),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Seed default configs if empty
      const configCheck = await query('SELECT id FROM notification_events_config LIMIT 1');
      if (configCheck.rowCount === 0) {
        await query(
          "INSERT INTO notification_events_config (name, type, event_code, api_endpoint, http_method, enabled, title_template, body_template, navigation_url, priority, user_role_mapping, target_type, target_value) " +
          "VALUES " +
          "('Task Assigned Notification', 'push', 'TASK_ASSIGNED', '/api/tasks', 'POST', true, 'New Task Assigned', 'A new task \"{{response.body.taskName}}\" has been assigned to you.', '/dashboard/tasks', 'high', '[\"user\"]', 'user', '{{response.body.assignedTo}}'), " +
          "('Invoice Paid Notification', 'push', 'INVOICE_PAID', '/api/invoices/pay', 'POST', true, 'Invoice Paid', 'Invoice {{response.body.invoiceNumber}} for {{response.body.amount}} has been paid successfully.', '/dashboard/billing', 'normal', '[\"admin\"]', 'role', 'admin')"
        );
        console.log('🌱 Seeded: Default notification events configurations');
      }
    } catch (err: any) {
      console.error('Failed schema migration for notification events config:', err);
    }

    // Migration: Setup Firebase Cloud Messaging Push Notification Monitoring & Billing tables
    try {
      await query(`
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

        CREATE INDEX IF NOT EXISTS idx_fb_tokens_app ON firebase_notification_tokens(application_id);
        CREATE INDEX IF NOT EXISTS idx_fb_logs_app ON firebase_notification_logs(application_id);
        CREATE INDEX IF NOT EXISTS idx_fb_billing_app ON firebase_notification_billing(application_id);
      `);

      // Seed settings for apps
      const appsResult = await query('SELECT id FROM apps');
      for (const app of appsResult.rows) {
        const checkSetting = await query('SELECT id FROM firebase_notification_settings WHERE app_id = $1', [app.id]);
        if (checkSetting.rowCount === 0) {
          await query(`
            INSERT INTO firebase_notification_settings (app_id, enabled, free_quota_enabled, free_notifications, price_per_1000, platform_service_charge, gst_percentage, currency, billing_frequency)
            VALUES ($1, true, true, 10000, 0.50, 10.00, 18.00, 'INR', 'monthly')
          `, [app.id]);
        }
      }

      // Populate firebase_notification_tokens from notification_tokens
      await query(`
        INSERT INTO firebase_notification_tokens (user_id, application_id, customer_id, token, browser, device, os, platform, language, timezone, notification_enabled, token_status, last_active, created_at)
        SELECT user_id, application_id, customer_id, token, browser, device, os, 
               CASE WHEN os IN ('Android', 'iOS') THEN os ELSE 'Web' END,
               language, timezone, notification_enabled, 'active', last_seen, created_at
        FROM notification_tokens
        ON CONFLICT (token) DO NOTHING
      `);

      console.log('🌱 Schema Migration: Created Firebase Push Notification Monitoring & Billing tables');
    } catch (err: any) {
      console.error('Failed schema migration for Firebase Push Notification Monitoring & Billing tables:', err);
    }




    // 2. Check and Seed Admin and User
    const adminCheck = await query('SELECT id FROM records WHERE collection = $1 AND data->>\'email\' = $2', ['users', 'admin@ajr.com']);
    if (adminCheck.rowCount === 0) {
      await query('INSERT INTO records (collection, data) VALUES ($1, $2)', [
        'users',
        JSON.stringify({ 
          email: 'admin@ajr.com', 
          password: await bcrypt.hash('admin123', 10), 
          role: 'admin', 
          fullName: 'System Administrator',
          status: 'active'
        })
      ]);
      console.log('🌱 Seeded: Admin User');
    }

    const userCheck = await query('SELECT id FROM records WHERE collection = $1 AND data->>\'email\' = $2', ['users', 'user@ajr.com']);
    if (userCheck.rowCount === 0) {
      await query('INSERT INTO records (collection, data) VALUES ($1, $2)', [
        'users',
        JSON.stringify({ 
          email: 'user@ajr.com', 
          password: await bcrypt.hash('user123', 10), 
          role: 'user', 
          fullName: 'Standard User',
          status: 'active'
        })
      ]);
      console.log('🌱 Seeded: Standard User');
    }

    // 3. Check and Seed Marketplace (Expanded)
    const marketCheck = await query('SELECT id FROM records WHERE collection = $1 LIMIT 1', ['marketplace']);
    if (marketCheck.rowCount === 0) {
       const products = [
         { 
           title: 'Premium SaaS Dashboard', 
           description: 'A complete admin interface for digital products', 
           price: 149.99,
           html: '<div class="p-8 bg-slate-900 rounded-3xl text-white"><h1>Dashboard Template</h1></div>',
           status: 'active',
           image: 'https://picsum.photos/seed/dashboard/800/600'
         },
         { 
           title: 'Clean E-commerce Template', 
           description: 'Minimalist shop layout with advanced filtering', 
           price: 89.00,
           html: '<div class="p-8 bg-white rounded-3xl text-slate-900"><h1>Shop Interface</h1></div>',
           status: 'active',
           image: 'https://picsum.photos/seed/shop/800/600'
         }
       ];
       for (const product of products) {
         await query('INSERT INTO records (collection, data) VALUES ($1, $2)', ['marketplace', JSON.stringify(product)]);
       }
       console.log('🌱 Seeded: Marketplace Data');
    }

    // 4. Check and Seed App Config
    const appCheck = await query('SELECT id FROM records WHERE collection = $1 LIMIT 1', ['apps']);
    if (appCheck.rowCount === 0) {
       const apps = [
         { name: 'AJR Hub Core', domain: 'hub.ajr.digital', apiKey: 'ajr_primary_7788', status: 'active', environment: 'Production' },
         { name: 'Demo Application', domain: 'demo.com', apiKey: 'demo_key_123', status: 'active', environment: 'Sandbox' }
       ];
       for (const app of apps) {
         await query('INSERT INTO records (collection, data) VALUES ($1, $2)', ['apps', JSON.stringify(app)]);
       }
       console.log('🌱 Seeded: App Config Data');
    }

    // 5. Seed Settings
    const configsToSeed = [
      { 
        key: 'landing_config', 
        heroTitle: 'Welcome to AJR Digital HUB',
        cta: 'Provision App Now',
        maintenance: false
      },
      { 
        key: 'website_config',
        siteName: 'AJR Hub',
        logoUrl: '',
        theme: 'light',
        globalFeatures: { maintenanceMode: false, userRegistration: true },
        features: { marketplace: true, services: true, analytics: true }
      },
      { 
        key: 'rate_limiter',
        rpm: 1000,
        rph: 50000,
        burst: 200,
        enabled: true,
        status: 'safe'
      },
      { 
        key: 'rate_limits_demo', 
        appId: 'demo_app',
        limits: { rpm: 100, rph: 1000 }
      }
    ];

    for (const config of configsToSeed) {
      const check = await query('SELECT id FROM records WHERE collection = $1 AND data->>\'key\' = $2', ['settings', config.key]);
      if (check.rowCount === 0) {
        await query('INSERT INTO records (collection, data) VALUES ($1, $2)', ['settings', JSON.stringify(config)]);
        console.log(`🌱 Seeded Setting: ${config.key}`);
      }
    }

    // 6. Seed Menus
    const menuCheck = await query('SELECT id FROM records WHERE collection = $1', ['menus']);
    const hasOldMenu = await query("SELECT id FROM records WHERE collection = 'menus' AND data->>'key' = 'global_menus'");
    
    if ((menuCheck.rowCount ?? 0) === 0 || (hasOldMenu.rowCount ?? 0) > 0) {
      if ((hasOldMenu.rowCount ?? 0) > 0) {
        await query("DELETE FROM records WHERE collection = 'menus' AND data->>'key' = 'global_menus'");
        console.log('🗑️ Cleaned up old menu structure');
      }
      const marketplaceId = 'menu_marketplace';
      const solutionsId = 'menu_solutions';
      
      const items = [
        { id: marketplaceId, label: 'Marketplace', link: '/marketplace', is_active: true, parent_id: null },
        { id: solutionsId, label: 'Solutions', link: '#', is_active: true, parent_id: null },
        { label: 'SaaS Development', link: '/services/saas', is_active: true, parent_id: solutionsId },
        { label: 'WhatsApp Automation', link: '/services/whatsapp', is_active: true, parent_id: solutionsId },
        { label: 'Analytics Systems', link: '/services/analytics', is_active: true, parent_id: solutionsId },
        { label: 'Invoice Systems', link: '/invoice-builder', is_active: true, parent_id: solutionsId }
      ];

      for (const item of items) {
        await query('INSERT INTO records (collection, data) VALUES ($1, $2)', [
          'menus',
          JSON.stringify(item)
        ]);
      }
      console.log('🌱 Seeded: Global Menus (Flat Structure)');
    }

    // 7. Seed Testimonials
    const tCheck = await query('SELECT id FROM records WHERE collection = $1 LIMIT 1', ['testimonials']);
    if (tCheck.rowCount === 0) {
      const items = [
        { name: 'Marcus Aurelius', role: 'CEO, Roman Tech', comment: 'The Master Dashboard is simply the best in class.', rating: 5, avatar: 'M' },
        { name: 'Julia Roberts', role: 'DevOps Lead', comment: 'Scaling our modules across 5 sites was effortless.', rating: 5, avatar: 'J' }
      ];
      for (const item of items) {
        await query('INSERT INTO records (collection, data) VALUES ($1, $2)', ['testimonials', JSON.stringify(item)]);
      }
      console.log('🌱 Seeded: Testimonials');
    }

    // 8. Seed Invoice Templates
    const tplCheck = await query('SELECT id FROM records WHERE collection = $1 LIMIT 1', ['invoice_templates']);
    if (tplCheck.rowCount === 0) {
      for (const tpl of DEFAULT_TEMPLATES) {
        await query('INSERT INTO records (collection, data) VALUES ($1, $2)', ['invoice_templates', JSON.stringify(tpl)]);
      }
      console.log('🌱 Seeded: Postgres Invoice Templates');
    }

    console.log('✅ Database verification and seeding complete.');
  } catch (err) {
    console.error('❌ Database seeding failed:', err);
  }
};
