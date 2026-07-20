import { pool as configPool, query as configQuery, isPostgresEnabled as configIsEnabled } from '../config/db';

export const pool = configPool;
export const isPostgresEnabled = configIsEnabled;
export const query = (text: string, params?: any[]) => {
  if (!pool) {
    // Return empty result gracefully when postgres fallback is active
    return Promise.resolve({ rows: [], rowCount: 0 });
  }
  return configQuery(text, params);
};

