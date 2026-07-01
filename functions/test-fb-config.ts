import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

async function test() {
  const userProfile = process.env.USERPROFILE || '';
  const configPath = path.join(userProfile, '.config', 'configstore', 'firebase-tools.json');
  
  if (!fs.existsSync(configPath)) {
    console.error('Config file not found');
    return;
  }
  
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const tokens = config.tokens;
  if (!tokens || !tokens.access_token) {
    console.error('No access token found');
    return;
  }

  console.log('Using stored access_token:', tokens.access_token.substring(0, 10) + '...');
  console.log('Expires at:', tokens.expires_at);
  console.log('Current time:', new Date().toISOString());

  const accessToken = tokens.access_token;
  const projectId = 'godofmobil';

  try {
    console.log(`\nQuerying Billing Info for project ${projectId}...`);
    const billingRes = await axios.get(
      `https://cloudbilling.googleapis.com/v1/projects/${projectId}/billingInfo`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    console.log('Billing Info SUCCESS:', JSON.stringify(billingRes.data, null, 2));
  } catch (e: any) {
    console.error('Billing Info error:', e.response?.data || e.message);
  }
}

test();
