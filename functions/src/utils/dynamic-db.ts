import { pool } from '../config/db';
// In-memory fallback
const mockRecords = new Map<string, any[]>();

export interface DynamicRecord {
  id: number;
  collection_name: string;
  data: any;
  metadata: any;
  created_at: Date;
  updated_at: Date;
}

export const initDynamicDb = async () => {
  if (!pool) {
    console.warn('⚠️ Dynamic DB: No database configuration found. Using in-memory fallback.');
    if (!mockRecords.has('landing_config')) {
      mockRecords.set('landing_config', [{
        id: 1,
        data: {
          heroText: 'Supercharge Your Digital Ecosystem',
          buttonText: 'Explore Marketplace',
          buttonLink: '/marketplace',
          stats: [
            { value: '1.2M+', label: 'API Calls / Day' },
            { value: '99.9%', label: 'Uptime SLA' },
            { value: '42+', label: 'Integrated Modules' }
          ]
        }
      }]);
    }
    if (!mockRecords.has('testimonials')) {
      mockRecords.set('testimonials', [
        { id: 1, data: { name: 'Alex Rivera', role: 'CEO, TechFlow', rating: 5, comment: 'AJR Digital HUB revolutionized our multi-app management. The dynamic schema is a lifesaver!', image_url: 'https://picsum.photos/seed/alex/100/100' } },
        { id: 2, data: { name: 'Sarah Chen', role: 'Lead Architect', rating: 5, comment: 'Scaling from one to fifty apps was seamless with the Master Control panel.', image_url: 'https://picsum.photos/seed/sarah/100/100' } }
      ]);
    }
    if (!mockRecords.has('marketplace')) {
      mockRecords.set('marketplace', [
        {
          id: 1,
          data: {
            title: 'Premium SaaS Dashboard',
            description: 'A complete admin interface for digital products',
            price: 149.99,
            html: '<div class="p-8 bg-slate-900 rounded-3xl text-white"><h1>Dashboard Template</h1></div>',
            status: 'active',
            image: 'https://picsum.photos/seed/dashboard/800/600'
          }
        },
        {
          id: 2,
          data: {
            title: 'Clean E-commerce Template',
            description: 'Minimalist shop layout with advanced filtering',
            price: 89.00,
            html: '<div class="p-8 bg-white rounded-3xl text-slate-900"><h1>Shop Interface</h1></div>',
            status: 'active',
            image: 'https://picsum.photos/seed/shop/800/600'
          }
        }
      ]);
    }
    return;
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dynamic_records (
        id SERIAL PRIMARY KEY,
        collection_name VARCHAR(255) NOT NULL,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_dynamic_collection ON dynamic_records(collection_name);
    `);
    
    // Seed basic landing config if not exists
    const configCheck = await pool.query("SELECT id FROM dynamic_records WHERE collection_name = 'landing_config' LIMIT 1");
    if (configCheck.rowCount === 0) {
      const defaultLanding = {
        heroText: 'Supercharge Your Digital Ecosystem',
        buttonText: 'Explore Marketplace',
        buttonLink: '/marketplace',
        stats: [
          { value: '1.2M+', label: 'API Calls / Day' },
          { value: '99.9%', label: 'Uptime SLA' },
          { value: '42+', label: 'Integrated Modules' }
        ]
      };
      await pool.query("INSERT INTO dynamic_records (collection_name, data) VALUES ('landing_config', $1)", [JSON.stringify(defaultLanding)]);
      console.log('🌱 Seeded default landing_config');
    }

    // Seed some basic testimonials
    const tCheck = await pool.query("SELECT id FROM dynamic_records WHERE collection_name = 'testimonials' LIMIT 1");
    if (tCheck.rowCount === 0) {
      const defaultTestimonials = [
        { name: 'Alex Rivera', role: 'CEO, TechFlow', rating: 5, comment: 'AJR Digital HUB revolutionized our multi-app management. The dynamic schema is a lifesaver!', image_url: 'https://picsum.photos/seed/alex/100/100' },
        { name: 'Sarah Chen', role: 'Lead Architect', rating: 5, comment: 'Scaling from one to fifty apps was seamless with the Master Control panel.', image_url: 'https://picsum.photos/seed/sarah/100/100' }
      ];
      for (const t of defaultTestimonials) {
        await pool.query("INSERT INTO dynamic_records (collection_name, data) VALUES ('testimonials', $1)", [JSON.stringify(t)]);
      }
      console.log('🌱 Seeded default testimonials');
    }

    // Seed marketplace if not exists
    const mCheck = await pool.query("SELECT id FROM dynamic_records WHERE collection_name = 'marketplace' LIMIT 1");
    if (mCheck.rowCount === 0) {
      const defaultMarketplace = [
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
      for (const item of defaultMarketplace) {
        await pool.query("INSERT INTO dynamic_records (collection_name, data) VALUES ('marketplace', $1)", [JSON.stringify(item)]);
      }
      console.log('🌱 Seeded default marketplace items');
    }

    console.log('✅ Dynamic Records table initialized.');
  } catch (err) {
    console.error('❌ Failed to initialize Dynamic DB:', err);
  }
};

export const getRecords = async (collection: string): Promise<any[]> => {
  if (!pool) {
    return (mockRecords.get(collection) || []).map(r => ({ ...r.data, id: r.id }));
  }
  const res = await pool.query(
    'SELECT id, data FROM dynamic_records WHERE collection_name = $1 ORDER BY id DESC',
    [collection]
  );
  return res.rows.map(row => ({ ...row.data, id: row.id }));
};

export const getRecordById = async (collection: string, id: number): Promise<any | null> => {
  if (!pool) {
    const list = mockRecords.get(collection) || [];
    const item = list.find(r => r.id === id);
    return item ? { ...item.data, id: item.id } : null;
  }
  const res = await pool.query(
    'SELECT id, data FROM dynamic_records WHERE collection_name = $1 AND id = $2',
    [collection, id]
  );
  return res.rows[0] ? { ...res.rows[0].data, id: res.rows[0].id } : null;
};

export const createRecord = async (collection: string, data: any): Promise<any> => {
  if (!pool) {
    const list = mockRecords.get(collection) || [];
    const newId = Date.now();
    const record = { id: newId, collection_name: collection, data, metadata: {}, created_at: new Date(), updated_at: new Date() };
    list.push(record);
    mockRecords.set(collection, list);
    return { ...record.data, id: record.id };
  }
  const res = await pool.query(
    'INSERT INTO dynamic_records (collection_name, data) VALUES ($1, $2) RETURNING id, data',
    [collection, JSON.stringify(data)]
  );
  return { ...res.rows[0].data, id: res.rows[0].id };
};

export const updateRecord = async (collection: string, id: number, data: any): Promise<any | null> => {
  if (!pool) {
    const list = mockRecords.get(collection) || [];
    const idx = list.findIndex(r => r.id === id);
    if (idx > -1) {
      list[idx].data = { ...list[idx].data, ...data };
      list[idx].updated_at = new Date();
      return { ...list[idx].data, id: list[idx].id };
    }
    return null;
  }
  const res = await pool.query(
    'UPDATE dynamic_records SET data = data || $1, updated_at = CURRENT_TIMESTAMP WHERE collection_name = $2 AND id = $3 RETURNING id, data',
    [JSON.stringify(data), collection, id]
  );
  return res.rows[0] ? { ...res.rows[0].data, id: res.rows[0].id } : null;
};

export const deleteRecord = async (collection: string, id: number): Promise<boolean> => {
  if (!pool) {
    const list = mockRecords.get(collection) || [];
    const idx = list.findIndex(r => r.id === id);
    if (idx > -1) {
      list.splice(idx, 1);
      return true;
    }
    return false;
  }
  const res = await pool.query(
    'DELETE FROM dynamic_records WHERE collection_name = $1 AND id = $2',
    [collection, id]
  );
  return (res.rowCount || 0) > 0;
};
