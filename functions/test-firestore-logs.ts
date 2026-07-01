import { firestore } from './src/config/firebase';

async function test() {
  if (!firestore) {
    console.log('Firestore is not initialized.');
    process.exit(1);
  }

  try {
    console.log('Querying edge_apps...');
    const appsSnap = await firestore.collection('edge_apps').get();
    console.log(`Found ${appsSnap.size} apps in Firestore:`);
    appsSnap.forEach((doc: any) => {
      console.log(`App: ${doc.id} =>`, doc.data());
    });

    console.log('\nQuerying edge_logs...');
    const logsSnap = await firestore.collection('edge_logs').get();
    console.log(`Found ${logsSnap.size} logs in Firestore:`);
    logsSnap.forEach((doc: any) => {
      console.log(`Log: ${doc.id} =>`, doc.data());
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}
test();
