import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Try to load from root and server directories
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), 'server/.env') });

const connectionString = process.env['DATABASE_URL'];
const pgConfig = {
  user: process.env['PG_USER'],
  host: process.env['PG_HOST'],
  database: process.env['PG_DATABASE'],
  password: process.env['PG_PASSWORD'],
  port: parseInt(process.env['PG_PORT'] || '5432'),
  ssl: process.env['PG_SSL'] === 'true' ? { rejectUnauthorized: false } : false
};

let hasBasePlaceholder = false;
if (connectionString) {
  try {
    // Robustly parse the URL to extract the hostname
    const parsed = new URL(connectionString);
    if (parsed.hostname === 'base' || parsed.hostname.startsWith('base.') || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      hasBasePlaceholder = true;
    }
  } catch (e) {
    if (connectionString.includes('base') || connectionString.includes('@base')) {
      hasBasePlaceholder = true;
    }
  }
}

const pgHost = pgConfig.host;
const isBaseHost = pgHost === 'base' || (pgHost && (pgHost.startsWith('base.') || pgHost.includes('base')));

export const isPostgresEnabled = !!(
  connectionString && 
  (connectionString.startsWith('postgres://') || connectionString.startsWith('postgresql://')) && 
  !connectionString.includes('your_') && 
  !hasBasePlaceholder
) || !!(
  pgConfig.user && 
  pgConfig.host && 
  pgConfig.password && 
  !pgConfig.password.includes('your_') && 
  !isBaseHost
);

if (!isPostgresEnabled) {
  console.warn('⚠️ No valid DATABASE_URL or PG_* config found. Modular backend will use in-memory fallback.');
}

export const pool = isPostgresEnabled ? new Pool(connectionString ? {
  connectionString,
  ssl: connectionString.includes('supabase.com') ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
} : {
  ...pgConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
}) : null;

export const query = async (text: string, params?: any[]) => {
  if (!pool) {
    throw new Error('Database pool not initialized. Use isPostgresEnabled to check before calling query.');
  }
  return pool.query(text, params);
};
