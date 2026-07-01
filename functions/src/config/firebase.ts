import { initializeApp, cert, getApp, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';
import * as dotenv from 'dotenv';
import path from 'path';

// Try to load from root and server directories
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), 'server/.env') });

const serviceAccountJson = process.env['FIREBASE_SERVICE_ACCOUNT'];
const storageBucket = process.env['FIREBASE_STORAGE_BUCKET'];

let firebaseApp: any = null;
let bucket: any = null;
let firestore: any = null;
let rtdb: any = null;

function parseServiceAccount(jsonStr: string): any {
  let clean = jsonStr.trim();
  if (clean.startsWith("'") && clean.endsWith("'")) {
    clean = clean.substring(1, clean.length - 1).trim();
  }
  try {
    return JSON.parse(clean);
  } catch (err) {
    try {
      // Try resolving single quotes and escape sequences
      const fixed = clean.replace(/'/g, '"');
      return JSON.parse(fixed);
    } catch {
      try {
        // Fallback for JS object literal formats (e.g. unquoted keys, unescaped quotes)
        const fn = new Function(`return (${clean});`);
        const obj = fn();
        if (obj && typeof obj === 'object') {
          return obj;
        }
        throw new Error('Not an object');
      } catch {
        try {
          // Unescape escaped quotes if stringified literally
          if (clean.startsWith('"') && clean.endsWith('"')) {
            const parsedStr = JSON.parse(clean);
            return typeof parsedStr === 'string' ? JSON.parse(parsedStr) : parsedStr;
          }
          const unescaped = clean.replace(/\\"/g, '"');
          return JSON.parse(unescaped);
        } catch {
          throw err; // throw original JSON.parse error if fallback fails
        }
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
      const dbUrl = process.env['FIREBASE_DATABASE_URL'] || `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`;
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        storageBucket,
        databaseURL: dbUrl
      });
    } else {
      firebaseApp = getApp();
    }
    
    bucket = getStorage().bucket();
    firestore = getFirestore();
    try {
      rtdb = getDatabase();
      console.log('✅ Firebase Realtime Database initialized successfully');
    } catch (dbErr: any) {
      console.warn('⚠️ Firebase Realtime Database not initialized:', dbErr.message);
    }
    console.log('✅ Firebase Admin initialized successfully');
  } catch (err) {
    console.error('❌ Failed to initialize Firebase Admin:', err);
    // Explicitly set to null if it failed
    firebaseApp = null;
    bucket = null;
    firestore = null;
    rtdb = null;
  }
} else {
  console.warn('⚠️ Firebase credentials missing. Uploads and Firestore sync will not work.');
}

export { firebaseApp, bucket, firestore, rtdb };
