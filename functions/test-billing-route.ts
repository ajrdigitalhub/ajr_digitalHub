const jwt = require('jsonwebtoken');
const http = require('http');

const token = jwt.sign(
  { id: 'test-admin', role: 'admin', email: 'admin@test.com' },
  'super_secret_ajr_key_2026',
  { expiresIn: '1h' }
);

const appId = '823f62b4-0b98-4f96-aae3-071f3ab99aef';

async function testRoute(path: string) {
  return new Promise<void>((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    };
    const req = http.request(options, (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => data += chunk);
      res.on('end', () => {
        console.log(`\n[${res.statusCode}] ${path}`);
        try {
          console.log(JSON.stringify(JSON.parse(data), null, 2));
        } catch {
          console.log(data.substring(0, 200));
        }
        resolve();
      });
    });
    req.on('error', (e: any) => {
      console.error(`\n[ERROR] ${path}:`, e.message);
      resolve();
    });
    req.end();
  });
}

async function run() {
  await testRoute(`/api/admin/apps/${appId}/firebase/billing`);
  await testRoute(`/api/admin/apps/${appId}/analytics`);
  await testRoute(`/api/admin/apps/${appId}`);
  process.exit(0);
}

run();
