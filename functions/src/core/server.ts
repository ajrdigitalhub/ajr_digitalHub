import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config(); // Fallback for standard .env

import app from './app';
import { isPostgresEnabled, pool } from '../config/db';
import { firebaseApp } from '../config/firebase';

const PORT = Number(process.env.PORT || process.env['DB_BACKEND_PORT'] || 4000);

async function bootstrap() {
  console.log('🚀 Starting Backend Server Development...');

  // 1. Check Database Connection
  if (isPostgresEnabled && pool) {
    try {
      const client = await pool.connect();
      console.log('✅ PostgreSQL Connected (Supabase)');
      client.release();

      // Seed database/run migrations
      const { seedDatabase } = require('../seed');
      await seedDatabase();
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

  // 2b. Start Firebase Sync Cron (Every 5 minutes)
  const { FirebaseService } = require('../services/firebase.service');
  const firebaseService = new FirebaseService();
  setTimeout(() => {
    firebaseService.syncAllFirebaseApps().catch((err: any) => console.error('Error in initial Firebase sync:', err.message));
  }, 10000); // Wait 10s after start to run initial sync
  
  setInterval(() => {
    firebaseService.syncAllFirebaseApps().catch((err: any) => console.error('Error in Firebase sync interval:', err.message));
  }, 300000); // 5 minutes

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
