import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config(); // Fallback for standard .env

import app from './app';
import { isPostgresEnabled, pool } from '../config/db';
import { firebaseApp } from '../config/firebase';
import { billingCronService } from '../services/billing-cron.service';

const PORT = Number(process.env.PORT || process.env['DB_BACKEND_PORT'] || 4000);

async function bootstrap() {
  console.log('🚀 Starting Backend Server Development...');

  // Start Billing Cron Scheduler
  billingCronService.start();

  // 1. Check Database Connection
  if (isPostgresEnabled && pool) {
    try {
      const client = await pool.connect();
      console.log('✅ PostgreSQL Connected (Supabase)');
      client.release();
    } catch (err) {
      console.error('❌ PostgreSQL Connection Failed:', err);
    }
  } else {
    console.warn('⚠️ Running with In-Memory fallback (No SQLite/Postgres)');
  }

  // 2. Check Firebase Connection
  if (firebaseApp) {
    console.log('✅ Firebase Admin Initialized');
  } else {
    console.warn('⚠️ Firebase Admin not initialized (Check FIREBASE_SERVICE_ACCOUNT)');
  }

  // 3. Start Express Server
  app.listen(PORT, () => {
    console.log(`
  --------------------------------------------------
  📡 Server is running independently
  🔗 URL: http://localhost:${PORT}
  🛠️ Environment: ${process.env['NODE_ENV'] || 'development'}
  --------------------------------------------------
    `);
  });
}

bootstrap().catch(err => {
  console.error('🔥 Fatal error during server startup:', err);
  process.exit(1);
});
