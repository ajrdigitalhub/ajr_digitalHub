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
    await appService.create({ name: 'AJR Hub Core', domain: 'hub.ajr.digital', apiKey: 'ajr_primary_7788', status: 'active', environment: 'Production' });

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
    // 1. Ensure Table
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
    `);

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
