import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env['DATABASE_URL'];
const isValidPostgres = !!(
  connectionString && 
  (connectionString.startsWith('postgres://') || connectionString.startsWith('postgresql://')) && 
  !connectionString.includes('your_') &&
  !connectionString.includes('base')
);
const pool = isValidPostgres ? new Pool({ 
  connectionString,
  connectionTimeoutMillis: 3000,
  query_timeout: 3000
}) : null;

// In-memory fallback for preview environments missing a connection string
interface MockLandingConfig {
  heroText: string;
  buttonText: string;
  buttonLink: string;
  stats: { value: string; label: string }[];
}

const mockDb = new Map<string, unknown>();

export interface TestimonialModel {
  id: number;
  name: string;
  role: string;
  rating: number;
  comment: string;
  image_url: string;
  active: boolean;
  created_at?: Date;
}

export interface MenuItemModel {
  id?: number;
  label: string;
  link: string;
  parent_id: number | null;
  menu_order: number;
  is_active: boolean;
}

export interface CategoryModel {
  id?: number;
  name: string;
  parent_id: number | null;
  icon: string | null;
  type: string; // 'marketplace' | 'services' | 'resources'
}

export interface PageModel {
  slug: string;
  title: string;
  description: string;
  sections: Array<{
    type: 'hero' | 'features' | 'testimonials' | 'pricing';
    title?: string;
    subtitle?: string;
    content?: string;
    items?: any[];
  }>;
}

export let mockMenuItems: MenuItemModel[] = [
  { id: 1, label: 'Marketplace', link: '/marketplace', parent_id: null, menu_order: 1, is_active: true },
  { id: 2, label: 'Services', link: '/services', parent_id: null, menu_order: 2, is_active: true },
  { id: 3, label: 'Solutions', link: '#', parent_id: null, menu_order: 3, is_active: true },
  { id: 4, label: 'Resources', link: '#', parent_id: null, menu_order: 4, is_active: true },
  
  // Children of Solutions (id: 3)
  { id: 5, label: 'SaaS Development', link: '/services?type=saas', parent_id: 3, menu_order: 1, is_active: true },
  { id: 6, label: 'WhatsApp Automation', link: '/services?type=whatsapp', parent_id: 3, menu_order: 2, is_active: true },
  { id: 7, label: 'Analytics Systems', link: '/services?type=analytics', parent_id: 3, menu_order: 3, is_active: true },
  { id: 8, label: 'Invoice Systems', link: '/invoice-builder', parent_id: 3, menu_order: 4, is_active: true },
  
  // Children of Resources (id: 4)
  { id: 9, label: 'Documentation', link: '/themes', parent_id: 4, menu_order: 1, is_active: true },
  { id: 10, label: 'Tutorials', link: '/invoice-builder', parent_id: 4, menu_order: 2, is_active: true },
  { id: 11, label: 'Templates', link: '/marketplace', parent_id: 4, menu_order: 3, is_active: true },
  { id: 12, label: 'API Reference', link: '/seller', parent_id: 4, menu_order: 4, is_active: true }
];

export let mockCategories: CategoryModel[] = [
  { id: 1, name: 'UI Templates', parent_id: null, icon: 'view_quilt', type: 'marketplace' },
  { id: 2, name: 'SaaS Dashboards', parent_id: 1, icon: 'dashboard', type: 'marketplace' },
  { id: 3, name: 'E-commerce API', parent_id: null, icon: 'code', type: 'marketplace' },
  { id: 4, name: 'WhatsApp Automations', parent_id: null, icon: 'quickreply', type: 'services' },
  { id: 5, name: 'Analytics Setup', parent_id: null, icon: 'query_stats', type: 'services' }
];

export let mockPages: PageModel[] = [
  {
    slug: 'solutions',
    title: 'Solutions Overview',
    description: 'Bespoke high-performance SaaS solutions constructed for dynamic workflows.',
    sections: [
      {
        type: 'hero',
        title: 'Bespoke Digital Formations',
        subtitle: 'Crafted with extreme attention to margin performance and technical scaling',
        content: 'Our core integrations deliver sub-millisecond conversion telemetry, complete WhatsApp automation setups, and next-generation invoicing pipelines globally.'
      }
    ]
  }
];

const mockTestimonials: TestimonialModel[] = [
  { id: 1, name: "Sarah Jenkins", role: "Co-Founder & Chief Product Officer", rating: 5.0, comment: "I know I can completely rely on AJR DIGITAL HUB to deliver.", image_url: "https://picsum.photos/seed/user1/100/100", active: true },
  { id: 2, name: "Marcus Chen", role: "Head of Operations", rating: 4.5, comment: "They're very available to us whenever we need them.", image_url: "https://picsum.photos/seed/user2/100/100", active: true },
  { id: 3, name: "Elena Rodriguez", role: "Consultant", rating: 5.0, comment: "I switched from a clunky legacy system to AJR. The UI is gorgeous.", image_url: "https://picsum.photos/seed/user3/100/100", active: true },
];

const defaultLandingConfig: MockLandingConfig = {
  heroText: "We design and develop high-converting, mobile-friendly eCommerce stores that turn visitors into customers.",
  buttonText: "Get Free Consultation ↗",
  buttonLink: "/contact",
  stats: [
    { value: "350+", label: "Stores\nDelivered" },
    { value: "90+", label: "IT\nProfessionals" },
    { value: "96%", label: "Client\nRetention Rate" },
    { value: "15+", label: "Years\nExpertise" }
  ]
};

const defaultWebsiteConfig = {
  siteName: "AJR Hub",
  logoUrl: "",
  theme: "light",
  globalFeatures: { maintenanceMode: false, userRegistration: true },
  features: { marketplace: true, services: true, analytics: true }
};

const defaultRateLimiter = {
  rpm: 1000,
  rph: 50000,
  burst: 200,
  enabled: true,
  status: "safe"
};

// --- Multi-Tenant SaaS Interfaces ---
export interface PlanModel {
  id: number;
  name: string;
  api_limit: number;
  whatsapp_limit: number;
  storage_limit: number; // in MB
  features: Record<string, boolean>;
  created_at?: Date;
}

export interface AppModel {
  id: number;
  name: string;
  domain: string;
  api_key: string;
  active: boolean;
  plan_id: number | null;
  plan_name?: string;
  api_limit?: number;
  whatsapp_limit?: number;
  created_at?: Date;
}

export interface SubscriptionModel {
  id: number;
  app_id: number;
  plan_id: number;
  status: string;
  start_date: Date;
  end_date: Date | null;
  created_at?: Date;
  app_name?: string;
  plan_name?: string;
}

export interface UsageLogModel {
  id: number;
  app_id: number;
  endpoint: string;
  method: string;
  status_code: number;
  response_time: number;
  device_info: string;
  timestamp: Date;
}

export interface WhatsappLogModel {
  id: number;
  app_id: number;
  message_type: string; // 'sent' or 'received'
  status: string; // 'sent', 'delivered', 'failed'
  estimated_cost: number;
  error_message: string | null;
  timestamp: Date;
}

export interface HtmlTemplateModel {
  id: number;
  app_id: number;
  name: string;
  html_content: string;
  css_content: string;
  is_published: boolean;
  created_at: Date;
}

export interface UserModel {
  id: number;
  username: string;
  password_hash: string;
  role: 'admin' | 'client' | 'seller';
  created_at?: Date;
}

export interface ProductModel {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  file_url: string;
  seller_id: number;
  created_at?: Date;
}

export interface OrderModel {
  id: number;
  user_id: number;
  product_id: number;
  amount: number;
  status: string;
  created_at?: Date;
  product_title?: string;
  user_name?: string;
}

export interface TicketModel {
  id: number;
  user_id: number;
  subject: string;
  status: 'open' | 'closed' | 'pending';
  priority: 'low' | 'medium' | 'high';
  created_at?: Date;
}

export interface KanbanTaskModel {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  position: number;
  created_at?: Date;
}

// In-Memory SaaS Mock Arrays
const mockUsers: UserModel[] = [
  { id: 1, username: 'admin', password_hash: 'admin123', role: 'admin' },
  { id: 2, username: 'seller1', password_hash: 'seller123', role: 'seller' },
  { id: 3, username: 'client1', password_hash: 'client123', role: 'client' }
];

const mockProducts: ProductModel[] = [
  { id: 1, title: 'Premium E-commerce UI Kit', description: 'A complete UI kit for modern stores.', price: 49.99, category: 'Design', file_url: '/assets/products/ui-kit.zip', seller_id: 2 },
  { id: 2, title: 'E-commerce API Template', description: 'Node.js backend template.', price: 79.00, category: 'Code', file_url: '/assets/products/api.zip', seller_id: 2 }
];

const mockOrders: OrderModel[] = [];
const mockTickets: TicketModel[] = [];
const mockKanbanTasks: KanbanTaskModel[] = [
  { id: 1, user_id: 3, title: 'Setup landing page', status: 'completed', position: 0 },
  { id: 2, user_id: 3, title: 'Integrate payment gateway', status: 'in_progress', position: 0 },
  { id: 3, user_id: 3, title: 'Configure shipping rules', status: 'pending', position: 0 }
];

const mockPlans: PlanModel[] = [
  { id: 1, name: "Free", api_limit: 1000, whatsapp_limit: 100, storage_limit: 5, features: { custom_domain: false, analytics: true, live_builder: true } },
  { id: 2, name: "Starter", api_limit: 10000, whatsapp_limit: 1000, storage_limit: 50, features: { custom_domain: true, analytics: true, live_builder: true } },
  { id: 3, name: "Pro", api_limit: 100000, whatsapp_limit: 10000, storage_limit: 500, features: { custom_domain: true, analytics: true, live_builder: true } },
  { id: 4, name: "Enterprise", api_limit: 1000000, whatsapp_limit: 100000, storage_limit: 5000, features: { custom_domain: true, analytics: true, live_builder: true } }
];

const mockApps: AppModel[] = [
  { id: 1, name: "AJR Digital Storefront", domain: "store.ajrdigital.com", api_key: "ajr_key_free_abc123", active: true, plan_id: 1 },
  { id: 2, name: "SaaS Mobile Backend", domain: "api.saasapp.io", api_key: "ajr_key_pro_xyz789", active: true, plan_id: 3 }
];

const mockSubscriptions: SubscriptionModel[] = [
  { id: 1, app_id: 1, plan_id: 1, status: "active", start_date: new Date(Date.now() - 30 * 24 * 3600000), end_date: null },
  { id: 2, app_id: 2, plan_id: 3, status: "active", start_date: new Date(Date.now() - 15 * 24 * 3600000), end_date: null }
];

const mockUsageLogs: UsageLogModel[] = [];
const mockWhatsappLogs: WhatsappLogModel[] = [];

// Seed historical usage & whatsapp log records in memory
const seedInMemoryLogs = () => {
  const endpoints = ['/api/shops/demo-shop-1/invoice-config', '/api/testimonials', '/api/settings/landing_config', '/api/checkout', '/api/products'];
  const devices = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) Safari/604.1',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/119.0.0.0'
  ];

  const now = Date.now();
  for (let i = 0; i < 240; i++) {
    const minAgo = i * 40; // spaced out logs
    const timestamp = new Date(now - minAgo * 60 * 1000);
    const appId = i % 3 === 0 ? 2 : 1;
    const isError = i % 18 === 0;

    mockUsageLogs.push({
      id: i + 1,
      app_id: appId,
      endpoint: endpoints[i % endpoints.length],
      method: i % 5 === 0 ? 'POST' : 'GET',
      status_code: isError ? 500 : 200,
      response_time: Math.floor(Math.random() * 220) + 15,
      device_info: devices[i % devices.length],
      timestamp
    });
  }

  for (let i = 0; i < 80; i++) {
    const hrAgo = i * 2;
    const timestamp = new Date(now - hrAgo * 3600 * 1000);
    const appId = i % 2 === 0 ? 1 : 2;
    const isFailed = i % 15 === 0;

    mockWhatsappLogs.push({
      id: i + 1,
      app_id: appId,
      message_type: i % 4 === 0 ? 'received' : 'sent',
      status: isFailed ? 'failed' : 'delivered',
      estimated_cost: isFailed ? 0 : 0.0055,
      error_message: isFailed ? 'Provider connection retry timeout' : null,
      timestamp
    });
  }
};

seedInMemoryLogs();

const mockHtmlTemplates: HtmlTemplateModel[] = [
  { id: 1, app_id: 1, name: "Summer Campaign Landing Page", html_content: `<div class="bg-indigo-900 text-white p-8 rounded-xl text-center shadow-lg"><h1 class="text-3xl font-extrabold mb-4">☀️ HERO SUMMER BLOWOUT! ☀️</h1><p class="text-indigo-200 text-lg mb-6">Gain instant access to top-performing digital assets and customized support plans.</p><button class="bg-amber-400 text-slate-950 font-bold px-6 py-3 rounded-lg hover:bg-amber-300 transition shadow">Take Action Now</button></div>`, css_content: ``, is_published: true, created_at: new Date(Date.now() - 5 * 24 * 3600000) },
  { id: 2, app_id: 1, name: "Tech Launch Page v1", html_content: `<div class="bg-slate-950 border border-slate-800 text-slate-100 p-8 rounded-xl"><div class="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2"><span>Special Feature</span></div><h2 class="text-2xl font-bold mb-3">Enterprise Suite Core</h2><p class="text-slate-400 text-sm mb-6">Our flagship API management suite with zero configurations. Perfect for small businesses.</p><div class="flex justify-between items-center"><span class="text-xl font-bold font-mono">$150/mo</span><button class="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded hover:bg-indigo-500 transition">Get Started</button></div></div>`, css_content: ``, is_published: false, created_at: new Date(Date.now() - 2 * 24 * 3600000) }
];


export const dbInit = async () => {
  if (!pool) {
    console.warn('⚠️ No DATABASE_URL found. Postgres disabled. Using in-memory fallback for preview.');
    mockDb.set('landing_config', defaultLandingConfig);
    mockDb.set('website_config', defaultWebsiteConfig);
    mockDb.set('rate_limiter', defaultRateLimiter);
    return;
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) DEFAULT 'client',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category VARCHAR(100),
        file_url TEXT,
        seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'open',
        priority VARCHAR(50) DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS kanban_tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        position INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS invoice_configs (
        shop_id VARCHAR(255) PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        company_address TEXT,
        tax_rate DECIMAL(5,2) DEFAULT 0.00,
        notes_template TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS testimonials (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        comment TEXT NOT NULL,
        image_url TEXT,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS role VARCHAR(255) DEFAULT '';
      ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 5.0;

      CREATE TABLE IF NOT EXISTS app_settings (
        key VARCHAR(255) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      /* SaaS Addition Tables */
      CREATE TABLE IF NOT EXISTS plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        api_limit INTEGER DEFAULT 1000,
        whatsapp_limit INTEGER DEFAULT 1000,
        storage_limit INTEGER DEFAULT 100,
        features JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS apps (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        domain VARCHAR(255) UNIQUE NOT NULL,
        api_key VARCHAR(255) UNIQUE NOT NULL,
        active BOOLEAN DEFAULT true,
        plan_id INTEGER REFERENCES plans(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        app_id INTEGER REFERENCES apps(id) ON DELETE CASCADE,
        plan_id INTEGER REFERENCES plans(id) ON DELETE RESTRICT,
        status VARCHAR(50) DEFAULT 'active',
        start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS usage_logs (
        id SERIAL PRIMARY KEY,
        app_id INTEGER REFERENCES apps(id) ON DELETE CASCADE,
        endpoint VARCHAR(255) NOT NULL,
        method VARCHAR(10) NOT NULL,
        status_code INTEGER DEFAULT 200,
        response_time INTEGER DEFAULT 0,
        device_info TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS whatsapp_logs (
        id SERIAL PRIMARY KEY,
        app_id INTEGER REFERENCES apps(id) ON DELETE CASCADE,
        message_type VARCHAR(50),
        status VARCHAR(50) DEFAULT 'sent',
        estimated_cost DECIMAL(10,4) DEFAULT 0.0055,
        error_message TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS html_templates (
        id SERIAL PRIMARY KEY,
        app_id INTEGER REFERENCES apps(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        html_content TEXT,
        css_content TEXT DEFAULT '',
        is_published BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS menu_items (
        id SERIAL PRIMARY KEY,
        label VARCHAR(255) NOT NULL,
        link VARCHAR(255) NOT NULL,
        parent_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
        menu_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS marketplace_items (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        html_content TEXT,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
        icon VARCHAR(100),
        type VARCHAR(100) DEFAULT 'marketplace'
      );
    `);

    // Create Indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_usage_logs_app_id ON usage_logs(app_id);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_app_id ON whatsapp_logs(app_id);
    `);
    
    // Seed initial app_settings if empty
    const { rowCount: settingsCount } = await pool.query('SELECT 1 FROM app_settings WHERE key = $1', ['landing_config']);
    if (settingsCount === 0) {
      await pool.query(
        'INSERT INTO app_settings (key, value) VALUES ($1, $2)',
        ['landing_config', JSON.stringify(defaultLandingConfig)]
      );
    }
    
    const { rowCount: websiteConfigCount } = await pool.query('SELECT 1 FROM app_settings WHERE key = $1', ['website_config']);
    if (websiteConfigCount === 0) {
      await pool.query(
        'INSERT INTO app_settings (key, value) VALUES ($1, $2)',
        ['website_config', JSON.stringify(defaultWebsiteConfig)]
      );
    }

    const { rowCount: rateLimiterCount } = await pool.query('SELECT 1 FROM app_settings WHERE key = $1', ['rate_limiter']);
    if (rateLimiterCount === 0) {
      await pool.query(
        'INSERT INTO app_settings (key, value) VALUES ($1, $2)',
        ['rate_limiter', JSON.stringify(defaultRateLimiter)]
      );
    }
    
    // Seed initial testimonials if empty
    const { rowCount } = await pool.query('SELECT 1 FROM testimonials LIMIT 1');
    if (rowCount === 0) {
       await pool.query(`
         INSERT INTO testimonials (name, role, rating, comment, image_url, active) VALUES
         ('Sarah Jenkins', 'Co-Founder & Chief Product Officer', 5.0, 'I know I can completely rely on AJR DIGITAL HUB to deliver.', 'https://picsum.photos/seed/user1/100/100', true),
         ('Marcus Chen', 'Head of Operations', 4.5, 'They''re very available to us whenever we need them.', 'https://picsum.photos/seed/user2/100/100', true),
         ('Elena Rodriguez', 'Consultant', 5.0, 'I switched from a clunky legacy system to AJR. The UI is gorgeous.', 'https://picsum.photos/seed/user3/100/100', true)
       `);
    }

    // Seed SaaS plans if empty
    const { rowCount: plansCount } = await pool.query('SELECT 1 FROM plans LIMIT 1');
    if (plansCount === 0) {
      await pool.query(`
        INSERT INTO plans (name, api_limit, whatsapp_limit, storage_limit, features) VALUES
        ('Free', 1000, 100, 5, '{"custom_domain": false, "analytics": true, "live_builder": true}'),
        ('Starter', 10000, 1000, 50, '{"custom_domain": true, "analytics": true, "live_builder": true}'),
        ('Pro', 100000, 10000, 500, '{"custom_domain": true, "analytics": true, "live_builder": true}'),
        ('Enterprise', 1000000, 100000, 5000, '{"custom_domain": true, "analytics": true, "live_builder": true}')
      `);
    }

    // Seed SaaS apps if empty
    const { rowCount: appsCount } = await pool.query('SELECT 1 FROM apps LIMIT 1');
    if (appsCount === 0) {
      await pool.query(`
        INSERT INTO apps (name, domain, api_key, plan_id) VALUES
        ('AJR Digital Storefront', 'store.ajrdigital.com', 'ajr_key_free_abc123', (SELECT id FROM plans WHERE name='Free')),
        ('SaaS Mobile Backend', 'api.saasapp.io', 'ajr_key_pro_xyz789', (SELECT id FROM plans WHERE name='Pro'))
      `);
      await pool.query(`
        INSERT INTO subscriptions (app_id, plan_id, status) VALUES
        ((SELECT id FROM apps WHERE name='AJR Digital Storefront'), (SELECT id FROM plans WHERE name='Free'), 'active'),
        ((SELECT id FROM apps WHERE name='SaaS Mobile Backend'), (SELECT id FROM plans WHERE name='Pro'), 'active')
      `);
    }

    // Seed users if empty
    const { rowCount: usersCount } = await pool.query('SELECT 1 FROM users LIMIT 1');
    if (usersCount === 0) {
      await pool.query(`
        INSERT INTO users (username, password_hash, role) VALUES
        ('admin', 'admin123', 'admin'),
        ('seller1', 'seller123', 'seller'),
        ('client1', 'client123', 'client')
      `);
    }

    // Seed products if empty
    const { rowCount: productsCount } = await pool.query('SELECT 1 FROM products LIMIT 1');
    if (productsCount === 0) {
      await pool.query(`
        INSERT INTO products (title, description, price, category, file_url, seller_id) VALUES
        ('Premium E-commerce UI Kit', 'A complete UI kit for modern stores.', 49.99, 'Design', '/assets/products/ui-kit.zip', (SELECT id FROM users WHERE username='seller1')),
        ('E-commerce API Template', 'Node.js backend template.', 79.00, 'Code', '/assets/products/api.zip', (SELECT id FROM users WHERE username='seller1'))
      `);
    }

    // Seed kanban if empty
    const { rowCount: kanbanCount } = await pool.query('SELECT 1 FROM kanban_tasks LIMIT 1');
    if (kanbanCount === 0) {
      await pool.query(`
        INSERT INTO kanban_tasks (user_id, title, status, position) VALUES
        ((SELECT id FROM users WHERE username='client1'), 'Setup landing page', 'completed', 0),
        ((SELECT id FROM users WHERE username='client1'), 'Integrate payment gateway', 'in_progress', 0),
        ((SELECT id FROM users WHERE username='client1'), 'Configure shipping rules', 'pending', 0)
      `);
    }

    // Seed menu items if empty in postgres
    const { rowCount: menuCount } = await pool.query('SELECT 1 FROM menu_items LIMIT 1');
    if (menuCount === 0) {
      await pool.query(`INSERT INTO menu_items (id, label, link, parent_id, menu_order, is_active) VALUES (1, 'Marketplace', '/marketplace', NULL, 1, true)`);
      await pool.query(`INSERT INTO menu_items (id, label, link, parent_id, menu_order, is_active) VALUES (2, 'Services', '/services', NULL, 2, true)`);
      await pool.query(`INSERT INTO menu_items (id, label, link, parent_id, menu_order, is_active) VALUES (3, 'Solutions', '#', NULL, 3, true)`);
      await pool.query(`INSERT INTO menu_items (id, label, link, parent_id, menu_order, is_active) VALUES (4, 'Resources', '#', NULL, 4, true)`);
      
      await pool.query(`
        INSERT INTO menu_items (label, link, parent_id, menu_order, is_active) VALUES
        ('SaaS Development', '/services?type=saas', 3, 1, true),
        ('WhatsApp Automation', '/services?type=whatsapp', 3, 2, true),
        ('Analytics Systems', '/services?type=analytics', 3, 3, true),
        ('Invoice Systems', '/invoice-builder', 3, 4, true),
        ('Documentation', '/themes', 4, 1, true),
        ('Tutorials', '/invoice-builder', 4, 2, true),
        ('Templates', '/marketplace', 4, 3, true),
        ('API Reference', '/seller', 4, 4, true)
      `);
      await pool.query(`SELECT setval(pg_get_serial_sequence('menu_items', 'id'), COALESCE((SELECT MAX(id) FROM menu_items), 1))`);
    }

    // Seed categories if empty
    const { rowCount: catCount } = await pool.query('SELECT 1 FROM categories LIMIT 1');
    if (catCount === 0) {
      await pool.query(`
        INSERT INTO categories (id, name, parent_id, icon, type) VALUES
        (1, 'UI Templates', NULL, 'view_quilt', 'marketplace'),
        (2, 'SaaS Dashboards', 1, 'dashboard', 'marketplace'),
        (3, 'E-commerce API', NULL, 'code', 'marketplace'),
        (4, 'WhatsApp Automations', NULL, 'quickreply', 'services'),
        (5, 'Analytics Setup', NULL, 'query_stats', 'services')
      `);
      await pool.query(`SELECT setval(pg_get_serial_sequence('categories', 'id'), COALESCE((SELECT MAX(id) FROM categories), 1))`);
    }
    
    console.log('✅ Postgres tables initialized.');
  } catch (err) {
    console.error('❌ Failed to initialize Postgres DB:', err);
  }
};

interface InvoiceConfig {
  company_name: string;
  company_address: string;
  tax_rate: number;
  notes_template: string;
}

export const getInvoiceConfig = async (shopId: string) => {
  if (!pool) return mockDb.get(shopId) || null;
  const res = await pool.query('SELECT * FROM invoice_configs WHERE shop_id = $1', [shopId]);
  return res.rows[0];
};

export const saveInvoiceConfig = async (shopId: string, config: InvoiceConfig) => {
  const { company_name, company_address, tax_rate, notes_template } = config;
  if (!pool) {
    const entry = { shop_id: shopId, company_name, company_address, tax_rate, notes_template };
    mockDb.set(shopId, entry);
    return entry;
  }
  const res = await pool.query(
    `INSERT INTO invoice_configs (shop_id, company_name, company_address, tax_rate, notes_template, updated_at) 
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
     ON CONFLICT (shop_id) 
     DO UPDATE SET 
      company_name = EXCLUDED.company_name, 
      company_address = EXCLUDED.company_address, 
      tax_rate = EXCLUDED.tax_rate, 
      notes_template = EXCLUDED.notes_template,
      updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [shopId, company_name, company_address, tax_rate, notes_template]
  );
  return res.rows[0];
};

export const getTestimonials = async () => {
  if (!pool) return mockTestimonials.filter(t => t.active);
  const res = await pool.query('SELECT * FROM testimonials WHERE active = true ORDER BY id DESC');
  return res.rows;
};

export const getAllTestimonials = async () => {
  if (!pool) return mockTestimonials;
  const res = await pool.query('SELECT * FROM testimonials ORDER BY id DESC');
  return res.rows;
};

export const addTestimonial = async (testimonial: Omit<TestimonialModel, 'id'>) => {
  const { name, role, rating, comment, image_url, active = true } = testimonial;
  if (!pool) {
    const newTestimonial = { id: Date.now(), name, role, rating, comment, image_url, active };
    mockTestimonials.push(newTestimonial);
    return newTestimonial;
  }
  const res = await pool.query(
    `INSERT INTO testimonials (name, role, rating, comment, image_url, active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [name, role, rating, comment, image_url, active]
  );
  return res.rows[0];
};

export const updateTestimonial = async (id: number, testimonial: Omit<TestimonialModel, 'id'>) => {
  const { name, role, rating, comment, image_url, active } = testimonial;
  if (!pool) {
    const idx = mockTestimonials.findIndex(t => t.id === id);
    if (idx > -1) {
      mockTestimonials[idx] = { ...mockTestimonials[idx], name, role, rating, comment, image_url, active };
      return mockTestimonials[idx];
    }
    return null;
  }
  const res = await pool.query(
    `UPDATE testimonials SET name = $1, role = $2, rating = $3, comment = $4, image_url = $5, active = $6 WHERE id = $7 RETURNING *`,
    [name, role, rating, comment, image_url, active, id]
  );
  return res.rows[0];
};

export const deleteTestimonial = async (id: number) => {
  if (!pool) {
    const idx = mockTestimonials.findIndex(t => t.id === id);
    if (idx > -1) {
      mockTestimonials.splice(idx, 1);
    }
    return true;
  }
  await pool.query('DELETE FROM testimonials WHERE id = $1', [id]);
  return true;
};

export const updateAnyTable = async (table: string, id: number, data: any): Promise<any> => {
  if (!pool) return data;
  
  // Safe listing of allowed tables
  const allowed = ['users', 'products', 'orders', 'tickets', 'kanban_tasks', 'subscriptions', 'app_settings'];
  if (!allowed.includes(table)) throw new Error('Unauthorized table update');

  const keys = Object.keys(data).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
  const values = keys.map(k => data[k]);
  const setString = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  
  const query = `UPDATE ${table} SET ${setString} WHERE id = $${keys.length + 1} RETURNING *`;
  const res = await pool.query(query, [...values, id]);
  return res.rows[0];
};

export const getAppSettings = async (key: string) => {
  if (!pool) return mockDb.get(key) || null;
  const res = await pool.query('SELECT value FROM app_settings WHERE key = $1', [key]);
  return res.rows[0]?.value || null;
};

export const saveAppSettings = async (key: string, value: unknown) => {
  if (!pool) {
    mockDb.set(key, value);
    return value;
  }
  const res = await pool.query(
    `INSERT INTO app_settings (key, value, updated_at) 
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
     RETURNING value`,
    [key, JSON.stringify(value)]
  );
  return res.rows[0].value;
};

// -----------------------------------------------------------------
// SaaS Add-On Core Database Methods
// -----------------------------------------------------------------

// --- Apps CRUD ---
export const getApps = async (): Promise<AppModel[]> => {
  if (!pool) {
    return mockApps.map(app => {
      const plan = mockPlans.find(p => p.id === app.plan_id);
      return {
        ...app,
        plan_name: plan?.name || 'No Plan',
        api_limit: plan?.api_limit || 0,
        whatsapp_limit: plan?.whatsapp_limit || 0
      };
    });
  }
  const res = await pool.query(`
    SELECT apps.*, plans.name as plan_name, plans.api_limit, plans.whatsapp_limit 
    FROM apps 
    LEFT JOIN plans ON apps.plan_id = plans.id 
    ORDER BY apps.id DESC
  `);
  return res.rows;
};

export const createApp = async (app: Omit<AppModel, 'id'>): Promise<AppModel> => {
  const { name, domain, api_key, plan_id, active = true } = app;
  if (!pool) {
    const newApp = { id: Date.now(), name, domain, api_key, active, plan_id };
    mockApps.push(newApp);

    // Create a mock default subscription automatically as well
    if (plan_id) {
      mockSubscriptions.push({
        id: Date.now() + 1,
        app_id: newApp.id,
        plan_id: plan_id,
        status: 'active',
        start_date: new Date(),
        end_date: null
      });
    }

    return newApp;
  }

  const res = await pool.query(
    `INSERT INTO apps (name, domain, api_key, plan_id, active) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, domain, api_key, plan_id, active]
  );
  const createdApp = res.rows[0];

  if (plan_id) {
    await pool.query(
      `INSERT INTO subscriptions (app_id, plan_id, status) VALUES ($1, $2, 'active')`,
      [createdApp.id, plan_id]
    );
  }

  return createdApp;
};

export const updateApp = async (id: number, app: Omit<AppModel, 'id'>): Promise<AppModel | null> => {
  const { name, domain, api_key, active, plan_id } = app;
  if (!pool) {
    const idx = mockApps.findIndex(a => a.id === id);
    if (idx > -1) {
      const prevPlanId = mockApps[idx].plan_id;
      mockApps[idx] = { ...mockApps[idx], name, domain, api_key, active, plan_id };
      
      // Upgrade / downgrade logic inside memory store
      if (plan_id && plan_id !== prevPlanId) {
        // Cancel old sub
        const subIdx = mockSubscriptions.findIndex(s => s.app_id === id && s.status === 'active');
        if (subIdx > -1) {
          mockSubscriptions[subIdx].status = 'canceled';
          mockSubscriptions[subIdx].end_date = new Date();
        }
        // Add new
        mockSubscriptions.push({
          id: Date.now(),
          app_id: id,
          plan_id: plan_id,
          status: 'active',
          start_date: new Date(),
          end_date: null
        });
      }
      return mockApps[idx];
    }
    return null;
  }

  // Transaction or simple update + sub upgrade
  const res = await pool.query(
    `UPDATE apps SET name = $1, domain = $2, api_key = $3, active = $4, plan_id = $5 WHERE id = $6 RETURNING *`,
    [name, domain, api_key, active, plan_id, id]
  );
  const updatedApp = res.rows[0];

  if (plan_id) {
    // Upsert or insert a subscription audit log
    await pool.query(
      `UPDATE subscriptions SET status = 'canceled', end_date = CURRENT_TIMESTAMP WHERE app_id = $1 AND status = 'active'`,
      [id]
    );
    await pool.query(
      `INSERT INTO subscriptions (app_id, plan_id, status) VALUES ($1, $2, 'active')`,
      [id, plan_id]
    );
  }

  return updatedApp;
};

export const deleteApp = async (id: number): Promise<boolean> => {
  if (!pool) {
    const idx = mockApps.findIndex(a => a.id === id);
    if (idx > -1) {
      mockApps.splice(idx, 1);
      return true;
    }
    return false;
  }
  await pool.query('DELETE FROM apps WHERE id = $1', [id]);
  return true;
};

// --- Plans CRUD ---
export const getPlans = async (): Promise<PlanModel[]> => {
  if (!pool) return mockPlans;
  const res = await pool.query('SELECT * FROM plans ORDER BY id ASC');
  return res.rows;
};

export const createPlan = async (plan: Omit<PlanModel, 'id'>): Promise<PlanModel> => {
  const { name, api_limit, whatsapp_limit, storage_limit, features } = plan;
  if (!pool) {
    const newPlan = { id: Date.now(), name, api_limit, whatsapp_limit, storage_limit, features };
    mockPlans.push(newPlan);
    return newPlan;
  }
  const res = await pool.query(
    `INSERT INTO plans (name, api_limit, whatsapp_limit, storage_limit, features) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, api_limit, whatsapp_limit, storage_limit, JSON.stringify(features)]
  );
  return res.rows[0];
};

export const updatePlan = async (id: number, plan: Omit<PlanModel, 'id'>): Promise<PlanModel | null> => {
  const { name, api_limit, whatsapp_limit, storage_limit, features } = plan;
  if (!pool) {
    const idx = mockPlans.findIndex(p => p.id === id);
    if (idx > -1) {
      mockPlans[idx] = { ...mockPlans[idx], name, api_limit, whatsapp_limit, storage_limit, features };
      return mockPlans[idx];
    }
    return null;
  }
  const res = await pool.query(
    `UPDATE plans SET name = $1, api_limit = $2, whatsapp_limit = $3, storage_limit = $4, features = $5 WHERE id = $6 RETURNING *`,
    [name, api_limit, whatsapp_limit, storage_limit, JSON.stringify(features), id]
  );
  return res.rows[0];
};

// --- Subscriptions System ---
export const getSubscriptions = async (): Promise<SubscriptionModel[]> => {
  if (!pool) {
    return mockSubscriptions.map(sub => {
      const app = mockApps.find(a => a.id === sub.app_id);
      const plan = mockPlans.find(p => p.id === sub.plan_id);
      return {
        ...sub,
        app_name: app?.name || 'Deleted App',
        plan_name: plan?.name || 'Deleted Plan'
      };
    });
  }
  const res = await pool.query(`
    SELECT s.*, a.name as app_name, p.name as plan_name 
    FROM subscriptions s
    JOIN apps a ON s.app_id = a.id
    JOIN plans p ON s.plan_id = p.id
    ORDER BY s.id DESC
  `);
  return res.rows;
};

export const subscribeApp = async (appId: number, planId: number): Promise<SubscriptionModel> => {
  if (!pool) {
    // cancel existing active subscriptions first
    mockSubscriptions.forEach(s => {
      if (s.app_id === appId && s.status === 'active') {
        s.status = 'canceled';
        s.end_date = new Date();
      }
    });
    const sub = {
      id: Date.now(),
      app_id: appId,
      plan_id: planId,
      status: 'active',
      start_date: new Date(),
      end_date: null
    };
    mockSubscriptions.push(sub);
    
    // Update app's plan link
    const app = mockApps.find(a => a.id === appId);
    if (app) app.plan_id = planId;

    return sub;
  }

  await pool.query(
    `UPDATE subscriptions SET status = 'canceled', end_date = CURRENT_TIMESTAMP WHERE app_id = $1 AND status = 'active'`,
    [appId]
  );
  const res = await pool.query(
    `INSERT INTO subscriptions (app_id, plan_id, status) VALUES ($1, $2, 'active') RETURNING *`,
    [appId, planId]
  );
  await pool.query(
    `UPDATE apps SET plan_id = $1 WHERE id = $2`,
    [planId, appId]
  );
  return res.rows[0];
};

// --- Usage Tracking Middleware Inserters ---
export const addUsageLog = async (
  appId: number, 
  endpoint: string, 
  method: string, 
  statusCode: number, 
  responseTime: number, 
  deviceInfo: string
): Promise<UsageLogModel> => {
  if (!pool) {
    const entry = {
      id: Date.now(),
      app_id: appId,
      endpoint,
      method,
      status_code: statusCode,
      response_time: responseTime,
      device_info: deviceInfo,
      timestamp: new Date()
    };
    mockUsageLogs.push(entry);
    return entry;
  }
  const res = await pool.query(
    `INSERT INTO usage_logs (app_id, endpoint, method, status_code, response_time, device_info)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [appId, endpoint, method, statusCode, responseTime, deviceInfo]
  );
  return res.rows[0];
};

export const getUsageLogsByApp = async (appId: number): Promise<UsageLogModel[]> => {
  if (!pool) {
    return mockUsageLogs.filter(log => log.app_id === appId).slice(-100);
  }
  const res = await pool.query('SELECT * FROM usage_logs WHERE app_id = $1 ORDER BY timestamp DESC LIMIT 100', [appId]);
  return res.rows;
};

// --- WhatsApp API Logging Helpers ---
export const addWhatsappLog = async (
  appId: number,
  messageType: string,
  status: string,
  estimatedCost: number,
  errorMessage: string | null
): Promise<WhatsappLogModel> => {
  if (!pool) {
    const entry = {
      id: Date.now(),
      app_id: appId,
      message_type: messageType,
      status,
      estimated_cost: estimatedCost,
      error_message: errorMessage,
      timestamp: new Date()
    };
    mockWhatsappLogs.push(entry);
    return entry;
  }
  const res = await pool.query(
    `INSERT INTO whatsapp_logs (app_id, message_type, status, estimated_cost, error_message)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [appId, messageType, status, estimatedCost, errorMessage]
  );
  return res.rows[0];
};

export const getWhatsappLogsByApp = async (appId: number): Promise<WhatsappLogModel[]> => {
  if (!pool) {
    return mockWhatsappLogs.filter(log => log.app_id === appId).slice(-100);
  }
  const res = await pool.query('SELECT * FROM whatsapp_logs WHERE app_id = $1 ORDER BY timestamp DESC LIMIT 100', [appId]);
  return res.rows;
};

// --- User & Auth ---
export const getAllUsers = async (): Promise<UserModel[]> => {
  if (!pool) return mockUsers;
  const res = await pool.query('SELECT id, username, role, created_at FROM users ORDER BY id ASC');
  return res.rows;
};

export const getAllProductsExtended = async (): Promise<any[]> => {
  if (!pool) return mockProducts;
  const res = await pool.query('SELECT p.*, u.username as seller_name FROM products p LEFT JOIN users u ON p.seller_id = u.id ORDER BY p.id ASC');
  return res.rows;
};

export const getAllOrdersExtended = async (): Promise<any[]> => {
  if (!pool) return mockOrders;
  const res = await pool.query('SELECT o.*, u.username as user_name, p.title as product_title FROM orders o LEFT JOIN users u ON o.user_id = u.id LEFT JOIN products p ON o.product_id = p.id ORDER BY o.id DESC');
  return res.rows;
};

export const getAllTicketsExtended = async (): Promise<any[]> => {
  if (!pool) return mockTickets;
  const res = await pool.query('SELECT t.*, u.username FROM tickets t LEFT JOIN users u ON t.user_id = u.id ORDER BY t.id DESC');
  return res.rows;
};

export const getAllKanbanTasksExtended = async (): Promise<any[]> => {
  if (!pool) return mockKanbanTasks;
  const res = await pool.query('SELECT k.*, u.username FROM kanban_tasks k LEFT JOIN users u ON k.user_id = u.id ORDER BY k.id DESC');
  return res.rows;
};

export const getUserByUsername = async (username: string): Promise<UserModel | null> => {
  if (!pool) return mockUsers.find(u => u.username === username) || null;
  const res = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  return res.rows[0];
};

export const getUserById = async (id: number): Promise<UserModel | null> => {
  if (!pool) return mockUsers.find(u => u.id === id) || null;
  const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return res.rows[0];
};

// --- Products CRUD ---
export const getProducts = async (category?: string, searchTerm?: string): Promise<ProductModel[]> => {
  if (!pool) {
    let filtered = [...mockProducts];
    if (category) filtered = filtered.filter(p => p.category === category);
    if (searchTerm) filtered = filtered.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
    return filtered;
  }
  let query = 'SELECT * FROM products WHERE 1=1';
  const params: unknown[] = [];
  if (category) {
    params.push(category);
    query += ` AND category = $${params.length}`;
  }
  if (searchTerm) {
    params.push(`%${searchTerm}%`);
    query += ` AND (title ILIKE $${params.length} OR description ILIKE $${params.length})`;
  }
  const res = await pool.query(query, params);
  return res.rows;
};

export const createProduct = async (product: Omit<ProductModel, 'id'>): Promise<ProductModel> => {
  const { title, description, price, category, file_url, seller_id } = product;
  if (!pool) {
    const newProduct = { id: Date.now(), title, description, price, category, file_url, seller_id };
    mockProducts.push(newProduct);
    return newProduct;
  }
  const res = await pool.query(
    'INSERT INTO products (title, description, price, category, file_url, seller_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [title, description, price, category, file_url, seller_id]
  );
  return res.rows[0];
};

// --- Orders CRUD ---
export const getOrdersByUser = async (userId: number): Promise<OrderModel[]> => {
  if (!pool) return mockOrders.filter(o => o.user_id === userId);
  const res = await pool.query(`
    SELECT o.*, p.title as product_title 
    FROM orders o 
    JOIN products p ON o.product_id = p.id 
    WHERE o.user_id = $1
  `, [userId]);
  return res.rows;
};

export const createOrder = async (order: Omit<OrderModel, 'id'>): Promise<OrderModel> => {
  const { user_id, product_id, amount, status } = order;
  if (!pool) {
    const newOrder = { id: Date.now(), user_id, product_id, amount, status };
    mockOrders.push(newOrder);
    return newOrder;
  }
  const res = await pool.query(
    'INSERT INTO orders (user_id, product_id, amount, status) VALUES ($1, $2, $3, $4) RETURNING *',
    [user_id, product_id, amount, status]
  );
  return res.rows[0];
};

// --- Tickets CRUD ---
export const getTicketsByUser = async (userId: number): Promise<TicketModel[]> => {
  if (!pool) return mockTickets.filter(t => t.user_id === userId);
  const res = await pool.query('SELECT * FROM tickets WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  return res.rows;
};

// --- Kanban Tasks CRUD ---
export const getKanbanTasks = async (userId: number): Promise<KanbanTaskModel[]> => {
  if (!pool) return mockKanbanTasks.filter(t => t.user_id === userId);
  const res = await pool.query('SELECT * FROM kanban_tasks WHERE user_id = $1 ORDER BY position ASC', [userId]);
  return res.rows;
};

export const updateKanbanTaskStatus = async (id: number, status: string): Promise<boolean> => {
  if (!pool) {
    const idx = mockKanbanTasks.findIndex(t => t.id === id);
    if (idx > -1) {
      mockKanbanTasks[idx].status = status as any;
      return true;
    }
    return false;
  }
  await pool.query('UPDATE kanban_tasks SET status = $1 WHERE id = $2', [status, id]);
  return true;
};

// --- HTML Builder Templates Operations ---
export const getHtmlTemplates = async (appId: number): Promise<HtmlTemplateModel[]> => {
  if (!pool) {
    return mockHtmlTemplates.filter(t => t.app_id === appId);
  }
  const res = await pool.query('SELECT * FROM html_templates WHERE app_id = $1 ORDER BY created_at DESC', [appId]);
  return res.rows;
};

export const saveHtmlTemplate = async (
  appId: number, 
  id: number, 
  name: string, 
  htmlContent: string, 
  cssContent: string
): Promise<HtmlTemplateModel> => {
  if (!pool) {
    if (id > 0) {
      const idx = mockHtmlTemplates.findIndex(t => t.id === id && t.app_id === appId);
      if (idx > -1) {
        mockHtmlTemplates[idx] = { ...mockHtmlTemplates[idx], name, html_content: htmlContent, css_content: cssContent };
        return mockHtmlTemplates[idx];
      }
    }
    const newTemplate = { id: Date.now(), app_id: appId, name, html_content: htmlContent, css_content: cssContent, is_published: false, created_at: new Date() };
    mockHtmlTemplates.push(newTemplate);
    return newTemplate;
  }

  if (id > 0) {
    const res = await pool.query(
      `UPDATE html_templates SET name = $1, html_content = $2, css_content = $3 WHERE id = $4 AND app_id = $5 RETURNING *`,
      [name, htmlContent, cssContent, id, appId]
    );
    return res.rows[0];
  } else {
    const res = await pool.query(
      `INSERT INTO html_templates (app_id, name, html_content, css_content, is_published)
       VALUES ($1, $2, $3, $4, false) RETURNING *`,
      [appId, name, htmlContent, cssContent]
    );
    return res.rows[0];
  }
};

export const publishHtmlTemplate = async (id: number, appId: number): Promise<boolean> => {
  if (!pool) {
    mockHtmlTemplates.forEach(t => {
      if (t.app_id === appId) {
        t.is_published = (t.id === id);
      }
    });
    return true;
  }
  await pool.query('UPDATE html_templates SET is_published = false WHERE app_id = $1', [appId]);
  await pool.query('UPDATE html_templates SET is_published = true WHERE id = $1 AND app_id = $2', [id, appId]);
  return true;
};

// --- Firebase-style Analytics Pipeline Aggregator ---
export const getAnalyticsOverview = async (appId?: number, daysRange = 7) => {
  const activeAppId = appId ? Number(appId) : 1; // default to first app
  const interval = `${daysRange} days`;

  if (!pool) {
    // Aggregate memory arrays
    const isMatchedLog = (log: { app_id: number }) => log.app_id === activeAppId;
    const appLogs = mockUsageLogs.filter(isMatchedLog);
    const waLogs = mockWhatsappLogs.filter(isMatchedLog);

    const totalRequests = appLogs.length;
    const errors = appLogs.filter(l => l.status_code >= 400).length;
    const totalResponseTime = appLogs.reduce((acc, l) => acc + l.response_time, 0);
    const avgResponseTime = totalRequests > 0 ? Math.round(totalResponseTime / totalRequests) : 45;
    const errorRate = totalRequests > 0 ? parseFloat(((errors / totalRequests) * 100).toFixed(2)) : 0;
    
    // Unique user simulation base on device signatures
    const activeUsersSet = new Set(appLogs.map(l => l.device_info));
    const activeUsers = activeUsersSet.size || 12;

    // Timeline traffic grouped hourly/daily
    // Let's create dynamic days breakdown for visual line chart components
    const timelineData = [];
    const now = Date.now();
    for (let d = daysRange - 1; d >= 0; d--) {
      const dayDate = new Date(now - d * 24 * 3600 * 1000);
      const label = dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      
      const dayStart = new Date(dayDate.setHours(0,0,0,0)).getTime();
      const dayEnd = new Date(dayDate.setHours(23,59,59,999)).getTime();

      const dayLogs = appLogs.filter(l => {
        const time = new Date(l.timestamp).getTime();
        return time >= dayStart && time <= dayEnd;
      });

      timelineData.push({
        date: label,
        requests: dayLogs.length,
        errors: dayLogs.filter(l => l.status_code >= 400).length
      });
    }

    // Endpoints breakdown
    const endpointFreq: Record<string, number> = {};
    appLogs.forEach(l => {
      endpointFreq[l.endpoint] = (endpointFreq[l.endpoint] || 0) + 1;
    });
    const endpointData = Object.entries(endpointFreq).map(([endpoint, count]) => ({ endpoint, count })).sort((a,b) => b.count - a.count).slice(0, 5);

    // Whatsapp figures
    const waSent = waLogs.filter(l => l.message_type === 'sent').length;
    const waReceived = waLogs.filter(l => l.message_type === 'received').length;
    const waFailed = waLogs.filter(l => l.status === 'failed').length;
    const waCost = waLogs.reduce((acc, l) => acc + Number(l.estimated_cost), 0);

    return {
      activeAppId,
      totalRequests,
      activeUsers,
      errorRate,
      avgResponseTime,
      timelineData,
      endpointData,
      whatsapp: {
        sent: waSent,
        received: waReceived,
        failed: waFailed,
        cost: parseFloat(waCost.toFixed(4))
      }
    };
  }

  // Postgres Live aggregates
  const appFilter = activeAppId;
  
  // Total Requests, average latency, errors
  const summaryRes = await pool.query(`
    SELECT 
      COUNT(*) as total_requests,
      COALESCE(AVG(response_time), 0) as avg_latency,
      COUNT(CASE WHEN status_code >= 400 THEN 1 END) as errors,
      COUNT(DISTINCT device_info) as active_users
    FROM usage_logs
    WHERE app_id = $1 AND timestamp >= NOW() - CAST($2 AS INTERVAL)
  `, [appFilter, interval]);

  const summary = summaryRes.rows[0];
  const reqCount = parseInt(summary.total_requests) || 0;
  const errCount = parseInt(summary.errors) || 0;
  const errorRate = reqCount > 0 ? parseFloat(((errCount / reqCount) * 100).toFixed(2)) : 0.0;

  // Timeline
  const timelineRes = await pool.query(`
    SELECT 
      TO_CHAR(timestamp, 'Dy MM/DD') as date,
      COUNT(*) as requests,
      COUNT(CASE WHEN status_code >= 400 THEN 1 END) as errors
    FROM usage_logs
    WHERE app_id = $1 AND timestamp >= NOW() - CAST($2 AS INTERVAL)
    GROUP BY TO_CHAR(timestamp, 'Dy MM/DD'), DATE_TRUNC('day', timestamp)
    ORDER BY DATE_TRUNC('day', timestamp) ASC
  `, [appFilter, interval]);

  // Endpoint Frequency
  const endpointRes = await pool.query(`
    SELECT endpoint, COUNT(*) as count
    FROM usage_logs
    WHERE app_id = $1 AND timestamp >= NOW() - CAST($2 AS INTERVAL)
    GROUP BY endpoint
    ORDER BY count DESC
    LIMIT 10
  `, [appFilter, interval]);

  // Whatsapp summary
  const waRes = await pool.query(`
    SELECT
      COUNT(CASE WHEN message_type = 'sent' THEN 1 END) as sent,
      COUNT(CASE WHEN message_type = 'received' THEN 1 END) as received,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
      COALESCE(SUM(estimated_cost), 0.0) as cost
    FROM whatsapp_logs
    WHERE app_id = $1 AND timestamp >= NOW() - CAST($2 AS INTERVAL)
  `, [appFilter, interval]);

  const waSummary = waRes.rows[0];

  return {
    activeAppId,
    totalRequests: reqCount,
    activeUsers: parseInt(summary.active_users) || 12,
    errorRate,
    avgResponseTime: Math.round(parseFloat(summary.avg_latency)) || 45,
    timelineData: timelineRes.rows,
    endpointData: endpointRes.rows,
    whatsapp: {
      sent: parseInt(waSummary.sent) || 0,
      received: parseInt(waSummary.received) || 0,
      failed: parseInt(waSummary.failed) || 0,
      cost: parseFloat(parseFloat(waSummary.cost).toFixed(4))
    }
  };
};

// -------------------------------------------------------------
// Core Upgrade: Global Menus, Categories and Custom Pages Setup
// -------------------------------------------------------------

export const getMenuItems = async (): Promise<MenuItemModel[]> => {
  if (!pool) {
    return mockMenuItems;
  }
  const res = await pool.query('SELECT * FROM menu_items ORDER BY menu_order ASC, id ASC');
  return res.rows;
};

export const addMenuItem = async (item: MenuItemModel): Promise<MenuItemModel> => {
  if (!pool) {
    const id = mockMenuItems.reduce((max, m) => Math.max(max, m.id || 0), 0) + 1;
    const newItem = { ...item, id };
    mockMenuItems.push(newItem);
    return newItem;
  }
  const res = await pool.query(
    `INSERT INTO menu_items (label, link, parent_id, menu_order, is_active)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [item.label, item.link, item.parent_id, item.menu_order || 0, item.is_active !== false]
  );
  return res.rows[0];
};

export const updateMenuItem = async (id: number, item: MenuItemModel): Promise<MenuItemModel> => {
  if (!pool) {
    const index = mockMenuItems.findIndex(m => m.id === id);
    if (index !== -1) {
      mockMenuItems[index] = { ...mockMenuItems[index], ...item, id };
      return mockMenuItems[index];
    }
    throw new Error('Menu item not found');
  }
  const res = await pool.query(
    `UPDATE menu_items 
     SET label = $1, link = $2, parent_id = $3, menu_order = $4, is_active = $5
     WHERE id = $6 RETURNING *`,
    [item.label, item.link, item.parent_id, item.menu_order || 0, item.is_active !== false, id]
  );
  return res.rows[0];
};

export const deleteMenuItem = async (id: number): Promise<boolean> => {
  if (!pool) {
    const initialLen = mockMenuItems.length;
    mockMenuItems = mockMenuItems.filter(m => m.id !== id && m.parent_id !== id);
    return mockMenuItems.length < initialLen;
  }
  await pool.query('DELETE FROM menu_items WHERE id = $1', [id]);
  return true;
};

export const getCategories = async (): Promise<CategoryModel[]> => {
  if (!pool) {
    return mockCategories;
  }
  const res = await pool.query('SELECT * FROM categories ORDER BY id ASC');
  return res.rows;
};

export const addCategory = async (cat: CategoryModel): Promise<CategoryModel> => {
  if (!pool) {
    const id = mockCategories.reduce((max, c) => Math.max(max, c.id || 0), 0) + 1;
    const newCat = { ...cat, id };
    mockCategories.push(newCat);
    return newCat;
  }
  const res = await pool.query(
    `INSERT INTO categories (name, parent_id, icon, type)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [cat.name, cat.parent_id, cat.icon || null, cat.type || 'marketplace']
  );
  return res.rows[0];
};

export const getPages = async (): Promise<PageModel[]> => {
  const pagesList = await getAppSettings('custom_pages');
  if (pagesList) return pagesList as PageModel[];
  return mockPages;
};

export const getPageBySlug = async (slug: string): Promise<PageModel | null> => {
  const pages = await getPages();
  return pages.find(p => p.slug === slug) || null;
};

export const savePage = async (page: PageModel): Promise<PageModel> => {
  const pages = await getPages();
  const index = pages.findIndex(p => p.slug === page.slug);
  if (index !== -1) {
    pages[index] = page;
  } else {
    pages.push(page);
  }
  await saveAppSettings('custom_pages', pages);
  return page;
};

export interface MarketplaceItemModel {
  id: number;
  title: string;
  description: string;
  price: number;
  html_content: string;
  status: string;
  created_at?: Date;
}
const mockMarketplaceItems: MarketplaceItemModel[] = [];
export const getMarketplaceItems = async (): Promise<MarketplaceItemModel[]> => {
  if (!pool) return mockMarketplaceItems;
  const res = await pool.query('SELECT * FROM marketplace_items ORDER BY id DESC');
  return res.rows;
};
export const getMarketplaceItemById = async (id: number): Promise<MarketplaceItemModel | null> => {
  if (!pool) return mockMarketplaceItems.find(i => i.id === id) || null;
  const res = await pool.query('SELECT * FROM marketplace_items WHERE id = $1', [id]);
  return res.rows[0];
};
export const addMarketplaceItem = async (item: Omit<MarketplaceItemModel, 'id' | 'created_at'>): Promise<MarketplaceItemModel> => {
  if (!pool) {
    const newItem = { id: Date.now(), ...item, created_at: new Date() };
    mockMarketplaceItems.push(newItem);
    return newItem;
  }
  const res = await pool.query(
    'INSERT INTO marketplace_items (title, description, price, html_content, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [item.title, item.description, item.price, item.html_content, item.status]
  );
  return res.rows[0];
};
export const updateMarketplaceItem = async (id: number, item: Partial<MarketplaceItemModel>): Promise<MarketplaceItemModel> => {
  if (!pool) {
    const idx = mockMarketplaceItems.findIndex(i => i.id === id);
    if (idx > -1) mockMarketplaceItems[idx] = { ...mockMarketplaceItems[idx], ...item };
    return mockMarketplaceItems[idx];
  }
  let updates = [];
  let values = [];
  let count = 1;
  for (let key in item) {
    if (key !== 'id' && key !== 'created_at') {
      updates.push(`${key} = $${count}`);
      values.push(item[key as keyof MarketplaceItemModel]);
      count++;
    }
  }
  values.push(id);
  const query = `UPDATE marketplace_items SET ${updates.join(', ')} WHERE id = $${count} RETURNING *`;
  const res = await pool.query(query, values);
  return res.rows[0];
};
export const deleteMarketplaceItem = async (id: number): Promise<boolean> => {
  if (!pool) {
    const idx = mockMarketplaceItems.findIndex(i => i.id === id);
    if (idx > -1) mockMarketplaceItems.splice(idx, 1);
    return true;
  }
  await pool.query('DELETE FROM marketplace_items WHERE id = $1', [id]);
  return true;
};
