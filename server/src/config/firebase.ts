import { initializeApp, cert, getApp, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import * as dotenv from 'dotenv';
import path from 'path';

// Try to load from root and server directories
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), 'server/.env') });

const serviceAccountJson = process.env['FIREBASE_SERVICE_ACCOUNT'];
const storageBucket = process.env['FIREBASE_STORAGE_BUCKET'];

let firebaseApp: any = null;
let bucket: any = null;

function parseServiceAccount(jsonStr: string): any {
  const clean = jsonStr.trim();
  try {
    return JSON.parse(clean);
  } catch (err) {
    try {
      // Try resolving single quotes and escape sequences
      const fixed = clean.replace(/'/g, '"');
      return JSON.parse(fixed);
    } catch {
      try {
        // Fallback for JS object literal formats (e.g. unquoted keys, single quotes, trailing commas)
        const fn = new Function(`return (${clean});`);
        const obj = fn();
        if (obj && typeof obj === 'object') {
          return obj;
        }
        throw new Error('Not an object');
      } catch {
        throw err; // throw original JSON.parse error if fallback fails
      }
    }
  }
}

if (serviceAccountJson && storageBucket) {
  try {
    const serviceAccount = parseServiceAccount(serviceAccountJson);
    
    // Check if app already initialized to avoid "Duplicate App" error
    const apps = getApps();
    if (apps.length === 0) {
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        storageBucket
      });
    } else {
      firebaseApp = getApp();
    }
    
    bucket = getStorage().bucket();
    console.log('✅ Firebase Admin initialized successfully');
  } catch (err) {
    console.error('❌ Failed to initialize Firebase Admin:', err);
    // Explicitly set to null if it failed
    firebaseApp = null;
    bucket = null;
  }
} else {
  console.warn('⚠️ Firebase credentials missing. Uploads will not work.');
}

export { firebaseApp, bucket };
