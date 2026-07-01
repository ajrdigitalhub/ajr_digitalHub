import { randomUUID } from 'node:crypto';
import { query, isPostgresEnabled } from '../config/db';

// Static memory store shared across all instances of BaseService
const mockStorage = new Map<string, any[]>();

export class BaseService {
  protected collection: string;

  constructor(collection: string) {
    this.collection = collection;
    if (!mockStorage.has(this.collection)) {
      mockStorage.set(this.collection, []);
    }
  }

  async findAll(options: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    sortBy?: string; 
    order?: 'ASC' | 'DESC';
    filters?: Record<string, any>;
  } = {}) {
    const { page = 1, limit = 10, search, sortBy = 'created_at', order = 'DESC', filters } = options;
    const offset = (page - 1) * limit;

    if (!isPostgresEnabled) {
      let list = [...(mockStorage.get(this.collection) || [])];
      
      // Filter
      if (filters) {
        list = list.filter(item => {
          return Object.entries(filters).every(([key, val]) => item.data[key] === val);
        });
      }

      // Search
      if (search) {
        const s = search.toLowerCase();
        list = list.filter(item => JSON.stringify(item.data).toLowerCase().includes(s));
      }

      // Sort
      list.sort((a, b) => {
        const valA = a.data[sortBy] || a[sortBy];
        const valB = b.data[sortBy] || b[sortBy];
        if (valA < valB) return order === 'ASC' ? -1 : 1;
        if (valA > valB) return order === 'ASC' ? 1 : -1;
        return 0;
      });

      const total = list.length;
      const data = list.slice(offset, offset + limit).map(r => ({ ...r.data, id: r.id }));
      
      return { 
        data, 
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    }

    let queryText = 'SELECT id, data, created_at FROM records WHERE collection = $1';
    const params: any[] = [this.collection];
    let paramIdx = 2;

    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          queryText += ` AND data->>'${key}' = $${paramIdx++}`;
          params.push(val);
        }
      });
    }

    if (search) {
      queryText += ` AND data::text ILIKE $${paramIdx++}`;
      params.push(`%${search}%`);
    }

    // Get Total Count
    const countRes = await query(`SELECT COUNT(*) FROM (${queryText}) as filtered`, params);
    const total = parseInt(countRes.rows[0].count);

    // Sorting & Pagination
    const validSortFields = ['created_at', 'updated_at', 'id'];
    const actualSort = validSortFields.includes(sortBy) ? sortBy : `data->>'${sortBy}'`;
    queryText += ` ORDER BY ${actualSort} ${order} LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);

    const res = await query(queryText, params);
    const data = res.rows.map(r => ({ ...r.data, id: r.id }));

    return { 
      data, 
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findOne(id: string) {
    if (!isPostgresEnabled) {
      const list = mockStorage.get(this.collection) || [];
      const item = list.find(r => r.id === id || r.data?.key === id || r.data?.slug === id || r.data?.name === id);
      return item ? { ...item.data, id: item.id } : null;
    }
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    if (isUuid) {
      const res = await query('SELECT id, data FROM records WHERE collection = $1 AND id = $2', [this.collection, id]);
      return res.rows[0] ? { ...res.rows[0].data, id: res.rows[0].id } : null;
    }

    const fallbackRes = await query(
      'SELECT id, data FROM records WHERE collection = $1 AND (data->>\'key\' = $2 OR data->>\'slug\' = $2 OR data->>\'name\' = $2)',
      [this.collection, id]
    );
    return fallbackRes.rows[0] ? { ...fallbackRes.rows[0].data, id: fallbackRes.rows[0].id } : null;
  }

  async create(data: any) {
    if (!isPostgresEnabled) {
      const list = mockStorage.get(this.collection) || [];
      const id = randomUUID();
      const record = { id, data, created_at: new Date().toISOString() };
      list.push(record);
      return { ...data, id };
    }
    const res = await query(
      'INSERT INTO records (collection, data) VALUES ($1, $2) RETURNING id, data',
      [this.collection, JSON.stringify(data)]
    );
    return { ...res.rows[0].data, id: res.rows[0].id };
  }

  async update(id: string, data: any) {
    if (!isPostgresEnabled) {
      const list = mockStorage.get(this.collection) || [];
      const idx = list.findIndex(r => r.id === id || r.data?.key === id || r.data?.slug === id);
      if (idx > -1) {
        list[idx].data = { ...list[idx].data, ...data };
        list[idx].updated_at = new Date().toISOString();
        return { ...list[idx].data, id: list[idx].id };
      }
      return null;
    }
    const res = await query(
      'UPDATE records SET data = data || $1, updated_at = NOW() WHERE collection = $2 AND id = $3 RETURNING id, data',
      [JSON.stringify(data), this.collection, id]
    );
    return res.rows[0] ? { ...res.rows[0].data, id: res.rows[0].id } : null;
  }

  async delete(id: string) {
    if (!isPostgresEnabled) {
      const list = mockStorage.get(this.collection) || [];
      const initialLen = list.length;
      const newList = list.filter(r => r.id !== id && r.data?.key !== id);
      mockStorage.set(this.collection, newList);
      return newList.length < initialLen;
    }
    const res = await query('DELETE FROM records WHERE collection = $1 AND id = $2', [this.collection, id]);
    return (res.rowCount || 0) > 0;
  }
}
