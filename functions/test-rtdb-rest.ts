import { FirebaseService } from './src/services/firebase.service';
import axios from 'axios';

const firebaseService = new FirebaseService();

async function test() {
  // Get access token
  const getGoogleAccessToken = (firebaseService as any).constructor.name; // wait, let's just copy the logic or import getGoogleAccessToken if exported.
  // getGoogleAccessToken is not exported, let's check how we can import it.
  // Actually, firebaseService has methods like getAppStatus, which calls getGoogleAccessToken.
  // Let's copy getGoogleAccessToken code or import the module.
  // Wait, firebase.service.ts has getGoogleAccessToken but not exported. We can extract it or call a method that uses it.
  // Or we can just import fs, path and read the token directly from firebase-tools.json in the test script!
  const fs = require('fs');
  const path = require('path');
  const userProfile = process.env.USERPROFILE || process.env.HOME || '';
  const configPath = path.join(userProfile, '.config', 'configstore', 'firebase-tools.json');

  if (!fs.existsSync(configPath)) {
    console.error('firebase-tools.json not found');
    return;
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const tokens = config.tokens;
  if (!tokens || !tokens.access_token) {
    console.error('No access token');
    return;
  }

  const accessToken = tokens.access_token;
  const projectIds = ['godofmobil', 'ajrdigitalhubb', 'ajr3dgalaxy'];
  const urls: string[] = [];
  for (const pid of projectIds) {
    urls.push(
      `https://${pid}-default-rtdb.firebaseio.com/api_hits.json`,
      `https://${pid}-default-rtdb.asia-southeast1.firebasedatabase.app/api_hits.json`,
      `https://${pid}.firebaseio.com/api_hits.json`
    );
  }

  for (const url of urls) {
    try {
      console.log(`Trying GET to ${url}...`);
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 5000
      });
      console.log(`✅ Success GET:`, res.status, JSON.stringify(res.data).substring(0, 200));

      // Try PUT to write a dummy log
      const testLogId = `test_log_${Date.now()}`;
      console.log(`Trying PUT to ${url.replace('.json', `/${testLogId}.json`)}...`);
      const putRes = await axios.put(url.replace('.json', `/${testLogId}.json`), {
        appId: 'test-app',
        timestamp: new Date().toISOString(),
        endpoint: '/test-rtdb-rest',
        method: 'GET',
        statusCode: 200,
        responseTime: 10
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 5000
      });
      console.log(`✅ Success PUT:`, putRes.status, putRes.data);
    } catch (e: any) {
      console.error(`❌ Failed:`, e.response?.status || e.message, e.response?.data);
    }
  }
}

test();
