import { saasController } from './src/controllers/saas.controller';

async function test() {
  const req = {} as any;

  const res = {
    status: (code: number) => {
      console.log('Status:', code);
      return res;
    },
    json: (data: any) => {
      console.log('JSON:', JSON.stringify(data, null, 2));
      return res;
    }
  } as any;

  await saasController.getApps(req, res);
}

test();
