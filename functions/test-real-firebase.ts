import { FirebaseService } from './src/services/firebase.service';

const svc = new FirebaseService();
const appId = 'f9b1681d-181f-4327-a90b-67e4c33541ce';

async function run() {
  console.log('\n--- Testing getBillingCost ---');
  try {
    const billing = await svc.getBillingCost(appId);
    console.log('Billing:', JSON.stringify(billing, null, 2));
  } catch (e: any) {
    console.error('Billing error:', e.message);
  }

  console.log('\n--- Testing getAppStatus ---');
  try {
    const status = await svc.getAppStatus(appId);
    console.log('Status:', JSON.stringify(status, null, 2));
  } catch (e: any) {
    console.error('Status error:', e.message);
  }

  console.log('\n--- Testing getStorageUsage ---');
  try {
    const storage = await svc.getStorageUsage(appId);
    console.log('Storage:', JSON.stringify(storage, null, 2));
  } catch (e: any) {
    console.error('Storage error:', e.message);
  }

  console.log('\n--- Testing getRealAnalyticsHistory ---');
  try {
    const analytics = await svc.getRealAnalyticsHistory(appId);
    console.log('Analytics totalHits:', analytics.totalHits, 'totalCost:', analytics.totalCost);
    console.log('History entries:', analytics.history.length);
    if (analytics.history.length > 0) {
      console.log('Sample history (last 3):', JSON.stringify(analytics.history.slice(-3), null, 2));
    }
  } catch (e: any) {
    console.error('Analytics error:', e.message);
  }

  process.exit(0);
}

run();
