const { FirebaseService } = require('../dist/services/firebase.service.js');
const { firebaseBillingService } = require('../dist/services/firebase-billing.service.js');

async function run() {
  const service = new FirebaseService();
  const appId = '63ab429b-76db-4a94-97e0-284c91a0124c';
  const month = '2026-06';
  
  console.log('Fetching billing cost details from firebase.service...');
  try {
    const cost = await service.getBillingCost(appId, month);
    console.log('Firebase getBillingCost output:', cost);
  } catch (err) {
    console.error('Error fetching billing cost:', err);
  }

  console.log('\nFetching detailed billing from firebase-billing.service...');
  try {
    const detailed = await firebaseBillingService.getDetailedBilling(appId, month);
    console.log('FirebaseDetailedBilling output:', detailed);
  } catch (err) {
    console.error('Error fetching detailed billing:', err);
  }
}

run();
