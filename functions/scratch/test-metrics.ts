import { FirebaseService } from '../src/services/firebase.service';

const config = {
  appId: '1:931861232347:web:66548d2b392522a7f1aafe',
  apiKey: 'AIzaSyD7UuQFdDN6GTST3ReUaiFxiqmHwsuvS',
  projectId: 'ajrdigitalhubin',
  authDomain: 'ajrdigitalhubin.firebaseapp.com',
  measurementId: '',
  storageBucket: 'ajrdigitalhubin.firebasestorage.app',
  serviceAccount: {
    client_email: "firebase-adminsdk-d4szh@ajrdigitalhubin.iam.gserviceaccount.com",
    // We can read it from the database or load it from process.env if it's there
  }
};

async function run() {
  const service = new FirebaseService();
  const appId = '63ab429b-76db-4a94-97e0-284c91a0124c';
  
  // Since we want to test metrics retrieval, let's load config from the database but using a direct connection or let's mock getFirebaseConfig on the service.
  const originalGetConfig = service.getFirebaseConfig;
  
  // Let's first read the service account from db config so we have the full private key
  const { Pool } = require('pg');
  require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
  const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: parseInt(process.env.PG_PORT || '5432'),
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false
  });
  
  try {
    const res = await pool.query('SELECT firebase_config FROM app_integrations WHERE app_id = $1', [appId]);
    const fbConfig = res.rows[0].firebase_config;
    
    service.getFirebaseConfig = async () => fbConfig;
    
    console.log('Querying metrics...');
    const result = await service.getBillingCost(appId, '2026-06');
    console.log('Metrics result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
