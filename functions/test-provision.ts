import { saasController } from './src/controllers/saas.controller';

async function test() {
  const req = {
    body: {
      name: 'Test App',
      domain: 'test.ajrdigital.com',
      environment: 'Staging',
      plan: 'Lite'
    }
  } as any;

  const res = {
    status: (code: number) => {
      console.log('Status:', code);
      return res;
    },
    json: (data: any) => {
      console.log('JSON:', data);
      return res;
    }
  } as any;

  await saasController.createApp(req, res);
}

test();
